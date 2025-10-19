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
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddMemberDto,
} from "../../dto/organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

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

    // Crear la organización base
    const organization = new this.organizationModel({
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

    // Clonar cada producto
    const clonedProducts = sourceProducts.map((product) => {
      const { _id, createdAt, updatedAt, __v, ...productData } = product as any;

      return {
        ...productData,
        tenantId: targetOrgId,
        // Generar nuevo SKU único agregando sufijo
        sku: `${product.sku}-CLONED-${Date.now()}`,
        // Actualizar SKUs de variantes
        variants:
          product.variants?.map((variant) => ({
            ...variant,
            sku: `${variant.sku}-CLONED-${Date.now()}`,
            barcode: `${variant.barcode}-CLONED`,
          })) || [],
        // Resetear información de inventario
        inventoryConfig: {
          ...product.inventoryConfig,
          minimumStock: 0,
          maximumStock: 0,
          reorderPoint: 0,
          reorderQuantity: 0,
        },
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
