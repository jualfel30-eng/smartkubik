import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Organization,
  OrganizationDocument,
} from "../../schemas/organization.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddMemberDto,
} from "../../dto/organization.dto";
import { MembershipsService } from "../memberships/memberships.service";
import { RolesService } from "../roles/roles.service";

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(Tenant.name)
    private tenantModel: Model<TenantDocument>,
    private membershipsService: MembershipsService,
    private rolesService: RolesService,
  ) { }

  async create(
    createOrganizationDto: CreateOrganizationDto,
    ownerId: string,
  ): Promise<Organization> {
    const {
      parentOrganizationId,
      cloneData,
      type,
      vertical,
      businessType,
      ...organizationData
    } = createOrganizationDto;

    // Generate a unified ID for both Organization and Tenant
    const unifiedId = new Types.ObjectId();

    // Crear la organización base
    const organization = new this.organizationModel({
      _id: unifiedId,
      ...organizationData,
      owner: new Types.ObjectId(ownerId),
      type: type || "new-business",
      vertical,
      businessType,
      parentOrganization: parentOrganizationId
        ? new Types.ObjectId(parentOrganizationId)
        : undefined,
      members: [
        {
          userId: new Types.ObjectId(ownerId),
          role: "admin",
          joinedAt: new Date(),
        },
      ],
    });

    const savedOrganization = await organization.save();

    // CRITICAL FIX: Create companion Tenant and Membership to ensure Auth works
    try {
      // If this is a subsidiary (new-location), load parent tenant to inherit config
      let parentTenant: TenantDocument | null = null;
      if (type === "new-location" && parentOrganizationId) {
        parentTenant = await this.tenantModel
          .findById(parentOrganizationId)
          .lean()
          .exec();
      }

      // 1. Create Tenant (using same ID)
      const tenantData: any = {
        _id: unifiedId,
        name: organizationData.name,
        businessType: businessType || parentTenant?.businessType || "Generic",
        vertical: vertical || parentTenant?.vertical || "FOOD_SERVICE",
        status: "active",
        isConfirmed: true,
        confirmedAt: new Date(),
        usage: {
          currentUsers: 1,
          currentProducts: 0,
          currentOrders: 0,
          currentStorage: 0,
        },
        limits: {
          maxUsers: parentTenant?.limits?.maxUsers || 5,
          maxProducts: parentTenant?.limits?.maxProducts || 100,
          maxOrders: parentTenant?.limits?.maxOrders || 1000,
          maxStorage: parentTenant?.limits?.maxStorage || 1024,
        },
      };

      // Inherit from parent if this is a subsidiary
      if (parentTenant) {
        tenantData.parentTenantId = new Types.ObjectId(parentOrganizationId);
        tenantData.isSubsidiary = true;
        tenantData.subscriptionPlan = parentTenant.subscriptionPlan || "trial";
        tenantData.countryCode = parentTenant.countryCode;
        tenantData.timezone = parentTenant.timezone;
        tenantData.language = parentTenant.language;
        if (parentTenant.taxInfo) tenantData.taxInfo = { ...parentTenant.taxInfo };
        if (parentTenant.enabledModules) tenantData.enabledModules = { ...parentTenant.enabledModules };
        if (parentTenant.settings) {
          tenantData.settings = {};
          if (parentTenant.settings.currency) tenantData.settings.currency = { ...parentTenant.settings.currency };
          if (parentTenant.settings.taxes) tenantData.settings.taxes = { ...parentTenant.settings.taxes };
          if (parentTenant.settings.inventory) tenantData.settings.inventory = { ...parentTenant.settings.inventory };
          if (parentTenant.settings.orders) tenantData.settings.orders = { ...parentTenant.settings.orders };
          if (parentTenant.settings.notifications) tenantData.settings.notifications = { ...parentTenant.settings.notifications };
          if (parentTenant.settings.paymentMethods) tenantData.settings.paymentMethods = [...parentTenant.settings.paymentMethods];
          if (parentTenant.settings.billingPreferences) tenantData.settings.billingPreferences = { ...parentTenant.settings.billingPreferences };
        }
        // Set contact info from the form (address, phone, email) rather than parent
        if (organizationData.address || organizationData.phone || organizationData.email) {
          tenantData.contactInfo = {
            email: organizationData.email || parentTenant.contactInfo?.email || "",
            phone: organizationData.phone || parentTenant.contactInfo?.phone || "",
            address: {
              street: organizationData.address || parentTenant.contactInfo?.address?.street || "",
              city: parentTenant.contactInfo?.address?.city || "",
              state: parentTenant.contactInfo?.address?.state || "",
              country: parentTenant.contactInfo?.address?.country || "",
            },
          };
        }
      } else {
        tenantData.subscriptionPlan = "trial";
      }

      const newTenant = new this.tenantModel(tenantData);
      await newTenant.save();

      // 2. Create/Find Admin Role for this new Tenant
      // We pass empty enabledModules or derive them from vertical if needed.
      // RolesService.findOrCreateAdminRoleForTenant logic usually handles defaults via permissionsService lookup.
      // We might want to pass 'all' or standard modules based on vertical.
      // For simplicity, passing [] triggers finding permissions for assumed modules in the service or we trust it creates a basic admin.
      const adminRole = await this.rolesService.findOrCreateAdminRoleForTenant(
        unifiedId,
        []
      );

      // 3. Create Membership (User <-> Tenant)
      await this.membershipsService.createDefaultMembershipIfMissing(
        new Types.ObjectId(ownerId),
        unifiedId,
        adminRole._id
      );

      console.log(`Synced Tenant and Membership for Organization ${unifiedId}`);

    } catch (error) {
      console.error("Error creating companion Tenant/Membership:", error);
      // We log but don't fail the Organization creation to strictly preserve legacy behavior if any,
      // although ideally we should rollback. For now, proceeding as Organization is primary return.
    }

    // Si es una nueva sede y se debe clonar datos
    if (type === "new-location" && parentOrganizationId && cloneData) {
      await this.cloneOrganizationData(
        parentOrganizationId,
        savedOrganization._id.toString(),
      );
    }

    return savedOrganization;
  }

  /**
   * Clona productos y configuraciones de una organización padre a una nueva sede
   */
  private async cloneOrganizationData(
    sourceOrgId: string,
    targetOrgId: string,
  ): Promise<void> {
    try {
      // Verificar que la organización fuente existe
      const sourceOrg = await this.organizationModel
        .findById(sourceOrgId)
        .exec();
      if (!sourceOrg) {
        throw new NotFoundException("Source organization not found");
      }

      const sourceOrgObjectId = new Types.ObjectId(sourceOrgId);
      const targetOrgObjectId = new Types.ObjectId(targetOrgId);

      // Clonar productos
      await this.cloneProducts(sourceOrgObjectId, targetOrgObjectId);

      console.log(
        `Successfully cloned data from ${sourceOrgId} to ${targetOrgId}`,
      );
    } catch (error) {
      console.error("Error cloning organization data:", error);
      // No lanzamos el error para no bloquear la creación de la organización
      // La organización se crea aunque falle el clonado
    }
  }

  /**
   * Clona todos los productos de una organización a otra
   */
  private async cloneProducts(
    sourceOrgId: Types.ObjectId,
    targetOrgId: Types.ObjectId,
  ): Promise<void> {
    // Obtener todos los productos activos de la organización fuente
    const sourceProducts = await this.productModel
      .find({
        tenantId: sourceOrgId,
        isActive: true,
      })
      .lean()
      .exec();

    if (sourceProducts.length === 0) {
      return;
    }

    // Clone each product — keep original SKU (each tenant has its own namespace)
    const clonedProducts = sourceProducts.map((product) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, createdAt, updatedAt, __v, importJobId, importedAt, ...productData } = product as any;

      return {
        ...productData,
        tenantId: targetOrgId,
        // Keep original SKU — SKU uniqueness is per-tenant, so no conflict
        sku: product.sku,
        // Keep original variant SKUs and barcodes
        variants:
          product.variants?.map((variant) => {
            const { _id: variantId, ...variantData } = variant;
            return {
              ...variantData,
              _id: new Types.ObjectId(),
            };
          }) || [],
        createdBy: null,
        updatedBy: null,
      };
    });

    // Insertar productos clonados en la nueva organización
    if (clonedProducts.length > 0) {
      await this.productModel.insertMany(clonedProducts);
      console.log(
        `Cloned ${clonedProducts.length} products to organization ${targetOrgId}`,
      );
    }
  }

  async findAllByUser(userId: string): Promise<Organization[]> {
    const userObjectId = new Types.ObjectId(userId);

    return this.organizationModel
      .find({
        $or: [{ owner: userObjectId }, { "members.userId": userObjectId }],
        isActive: true,
        // Exclude sedes — they are subsidiary tenants, not standalone organizations
        type: { $ne: "new-location" },
      })
      .populate("owner", "firstName lastName email")
      .populate("members.userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<Organization> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid organization ID");
    }

    const organization = await this.organizationModel
      .findById(id)
      .populate("owner", "firstName lastName email")
      .populate("members.userId", "firstName lastName email")
      .exec();

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    // Verificar que el usuario tiene acceso
    this.verifyUserAccess(organization, userId);

    return organization;
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    userId: string,
  ): Promise<Organization> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid organization ID");
    }

    const organization = await this.organizationModel.findById(id).exec();

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    // Solo el owner o admins pueden actualizar
    this.verifyAdminAccess(organization, userId);

    Object.assign(organization, updateOrganizationDto);
    organization.updatedAt = new Date();

    return organization.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid organization ID");
    }

    const organization = await this.organizationModel.findById(id).exec();

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    // Solo el owner puede eliminar
    if (organization.owner.toString() !== userId) {
      throw new ForbiddenException(
        "Only the organization owner can delete the organization",
      );
    }

    await this.organizationModel.findByIdAndDelete(id).exec();
  }

  async addMember(
    organizationId: string,
    addMemberDto: AddMemberDto,
    requestingUserId: string,
  ): Promise<Organization> {
    if (!Types.ObjectId.isValid(organizationId)) {
      throw new BadRequestException("Invalid organization ID");
    }

    const organization = await this.organizationModel
      .findById(organizationId)
      .exec();

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    // Solo admins pueden agregar miembros
    this.verifyAdminAccess(organization, requestingUserId);

    // Verificar si el usuario ya es miembro
    const isMember = organization.members.some(
      (m) => m.userId.toString() === addMemberDto.userId,
    );

    if (isMember) {
      throw new BadRequestException(
        "User is already a member of this organization",
      );
    }

    organization.members.push({
      userId: new Types.ObjectId(addMemberDto.userId),
      role: addMemberDto.role || "member",
      joinedAt: new Date(),
    });

    organization.updatedAt = new Date();

    return organization.save();
  }

  async removeMember(
    organizationId: string,
    memberUserId: string,
    requestingUserId: string,
  ): Promise<Organization> {
    if (!Types.ObjectId.isValid(organizationId)) {
      throw new BadRequestException("Invalid organization ID");
    }

    const organization = await this.organizationModel
      .findById(organizationId)
      .exec();

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    // Solo admins pueden remover miembros (o uno mismo)
    if (memberUserId !== requestingUserId) {
      this.verifyAdminAccess(organization, requestingUserId);
    }

    // No se puede remover al owner
    if (organization.owner.toString() === memberUserId) {
      throw new BadRequestException("Cannot remove the organization owner");
    }

    organization.members = organization.members.filter(
      (m) => m.userId.toString() !== memberUserId,
    );

    organization.updatedAt = new Date();

    return organization.save();
  }

  /**
   * Find all subsidiary tenants for a parent tenant
   */
  async findSubsidiaries(parentTenantId: string): Promise<TenantDocument[]> {
    return this.tenantModel
      .find({
        parentTenantId: new Types.ObjectId(parentTenantId),
        status: { $ne: "suspended" },
      })
      .select("name contactInfo status usage parentTenantId isSubsidiary vertical businessType")
      .lean()
      .exec();
  }

  /**
   * Check if a tenant has subsidiaries (is a parent)
   */
  async hasSubsidiaries(tenantId: string): Promise<boolean> {
    const count = await this.tenantModel.countDocuments({
      parentTenantId: new Types.ObjectId(tenantId),
    });
    return count > 0;
  }

  /**
   * Get the parent tenant for a subsidiary
   */
  async getParentTenant(tenantId: string): Promise<TenantDocument | null> {
    const tenant = await this.tenantModel.findById(tenantId).lean().exec();
    if (!tenant?.parentTenantId) return null;
    return this.tenantModel.findById(tenant.parentTenantId).lean().exec();
  }

  /**
   * Get all tenant IDs in a family group (parent + all children)
   */
  async getFamilyTenantIds(tenantId: string): Promise<Types.ObjectId[]> {
    const tenant = await this.tenantModel.findById(tenantId).lean().exec();
    if (!tenant) return [];

    // Determine the parent ID
    const parentId = tenant.parentTenantId
      ? tenant.parentTenantId
      : new Types.ObjectId(tenantId);

    // Get all children
    const children = await this.tenantModel
      .find({ parentTenantId: parentId })
      .select("_id")
      .lean()
      .exec();

    return [parentId, ...children.map((c) => c._id as Types.ObjectId)];
  }

  private verifyUserAccess(organization: Organization, userId: string): void {
    const isOwner = organization.owner.toString() === userId;
    const isMember = organization.members.some(
      (m) => m.userId.toString() === userId,
    );

    if (!isOwner && !isMember) {
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }
  }

  private verifyAdminAccess(organization: Organization, userId: string): void {
    const isOwner = organization.owner.toString() === userId;
    const isAdmin = organization.members.some(
      (m) => m.userId.toString() === userId && m.role === "admin",
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        "Only organization owner or admins can perform this action",
      );
    }
  }
}
