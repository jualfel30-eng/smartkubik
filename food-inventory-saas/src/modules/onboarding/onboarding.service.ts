import {
  Injectable,
  Logger,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Connection } from "mongoose";
import * as bcrypt from "bcrypt";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import {
  UserTenantMembership,
  UserTenantMembershipDocument,
} from "../../schemas/user-tenant-membership.schema";
import { RolesService } from "../roles/roles.service";
import { SubscriptionPlan } from "../../schemas/subscription-plan.schema";
import { SubscriptionPlansService } from "../subscription-plans/subscription-plans.service";
import {
  CreateTenantWithAdminDto,
  ConfirmTenantDto,
} from "./dto/onboarding.dto";
import { SeedingService } from "../seeding/seeding.service";
import { LoggerSanitizer } from "../../utils/logger-sanitizer.util";
import { getDefaultModulesForVertical } from "../../config/vertical-features.config";
import { TokenService } from "../../auth/token.service";
import { MailService } from "../mail/mail.service";
import { isTenantConfirmationEnforced } from "../../config/tenant-confirmation";
import {
  MembershipsService,
  MembershipSummary,
} from "../memberships/memberships.service";

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserTenantMembership.name)
    private userTenantMembershipModel: Model<UserTenantMembershipDocument>,
    private rolesService: RolesService,
    private subscriptionPlansService: SubscriptionPlansService,
    private seedingService: SeedingService,
    private tokenService: TokenService,
    private mailService: MailService,
    private membershipsService: MembershipsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async createTenantAndAdmin(dto: CreateTenantWithAdminDto) {
    this.logger.log(
      `Iniciando proceso de onboarding para el tenant: ${dto.businessName}`,
    );

    const existingUser = await this.userModel
      .findOne({ email: dto.email })
      .exec();
    if (existingUser) {
      throw new ConflictException("El email ya está registrado.");
    }

    let savedTenant: TenantDocument | undefined;
    let savedUser: UserDocument | undefined;
    let savedMembership:
      | UserTenantMembershipDocument
      | undefined;

    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        const requestedPlanName = dto.subscriptionPlan || "Trial";
        let selectedPlan: SubscriptionPlan | null = null;
        try {
          selectedPlan =
            await this.subscriptionPlansService.findOneByName(
              requestedPlanName,
            );
        } catch (error) {
          this.logger.warn(
            `Plan "${requestedPlanName}" no encontrado. Se utilizará el Trial.`,
          );
          selectedPlan =
            await this.subscriptionPlansService.findOneByName("Trial");
        }

        if (!selectedPlan) {
          throw new InternalServerErrorException(
            "No se pudo determinar un plan de suscripción.",
          );
        }

        const vertical = dto.vertical || "FOOD_SERVICE";
        const enabledModules = getDefaultModulesForVertical(vertical);
        const enabledModuleNames = Object.keys(enabledModules).filter(
          (key) => enabledModules[key],
        );

        this.logger.log(`Creating tenant with vertical: ${vertical}`);
        this.logger.log(
          `Enabled modules: ${JSON.stringify(enabledModuleNames)}`,
        );

        const confirmationEnforced = isTenantConfirmationEnforced();
        // Generamos siempre un código para poder enviar el correo de bienvenida,
        // aunque la confirmación no sea obligatoria en todos los entornos.
        const confirmationCode = Math.floor(100000 + Math.random() * 900000)
          .toString()
          .padStart(6, "0");
        const confirmationCodeExpiresAt = new Date(Date.now() + 1000 * 60 * 60);

        const newTenant = new this.tenantModel({
          name: dto.businessName,
          businessType: dto.businessType,
          vertical: vertical,
          enabledModules: enabledModules,
          contactInfo: { email: dto.email, phone: dto.phone },
          status: "active",
          subscriptionPlan: selectedPlan.name,
          isConfirmed: !confirmationEnforced,
          confirmationCode,
          confirmationCodeExpiresAt,
          limits: selectedPlan.limits,
          usage: {
            currentUsers: 1,
            currentProducts: 0,
            currentOrders: 0,
            currentStorage: 0,
          },
        });
        savedTenant = await newTenant.save({ session });
        this.logger.log(`Paso 1/5: Tenant creado con ID: ${savedTenant._id}`);

        await this.seedingService.seedChartOfAccounts(
          savedTenant._id.toString(),
          session,
        );
        this.logger.log(
          `Paso 2/5: Plan de cuentas creado para el tenant: ${savedTenant._id}`,
        );

        const adminRole =
          await this.rolesService.findOrCreateAdminRoleForTenant(
            savedTenant._id,
            enabledModuleNames,
            session,
          );
        if (!adminRole) {
          throw new InternalServerErrorException(
            "No se pudo crear el rol de administrador.",
          );
        }
        this.logger.log(
          `Paso 3/5: Rol de administrador asignado para el tenant: ${savedTenant._id}`,
        );

        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const newUser = new this.userModel({
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          tenantId: savedTenant._id,
          role: adminRole._id,
          isEmailVerified: false,
        });
        savedUser = await newUser.save({ session });
        this.logger.log(
          `Paso 4/5: Usuario administrador creado con ID: ${savedUser._id}`,
        );

        const newMembership = new this.userTenantMembershipModel({
          userId: savedUser._id,
          tenantId: savedTenant._id,
          roleId: adminRole._id,
          status: "active",
          isDefault: true,
        });
        savedMembership = await newMembership.save({ session });
        this.logger.log(
          `Paso 5/5: Membresía creada para el usuario en el tenant.`,
        );
      });

      if (!savedTenant || !savedUser) {
        this.logger.error(
          "FATAL: Transacción completada sin referencias a tenant o usuario.",
        );
        throw new InternalServerErrorException(
          "No se pudo completar el proceso de registro.",
        );
      }

      this.logger.log(
        `Onboarding completado exitosamente para ${dto.businessName}`,
      );

      const tenantDoc = savedTenant as TenantDocument;
      const userDoc = savedUser as UserDocument;

      const userWithRole = await this.userModel
        .findById(userDoc._id)
        .populate({
          path: "role",
          populate: { path: "permissions", select: "name" },
        })
        .exec();

      if (!userWithRole) {
        this.logger.error(
          `FATAL: User ${userDoc._id} not found immediately after creation.`,
        );
        throw new InternalServerErrorException(
          "No se pudo recuperar el usuario recién creado.",
        );
      }

      this.logger.log("[DEBUG] User and tenant created. Generating tokens...");
      const tokens = await this.tokenService.generateTokens(
        userWithRole,
        tenantDoc,
      );
      this.logger.log(
        "[DEBUG] Tokens generated. Preparing final response object.",
      );

      const memberships: MembershipSummary[] = [];
      if (savedMembership) {
        try {
          const membershipSummary =
            await this.membershipsService.buildMembershipSummary(
              savedMembership,
            );
          memberships.push(membershipSummary);
        } catch (membershipError) {
          this.logger.warn(
            `No se pudo construir el resumen de membresía: ${membershipError instanceof Error ? membershipError.message : membershipError}`,
          );
        }
      }

      const finalResponse = {
        user: {
          id: userWithRole._id,
          email: userWithRole.email,
          firstName: userWithRole.firstName,
          lastName: userWithRole.lastName,
          role: userWithRole.role,
        },
        tenant: {
          id: tenantDoc._id,
          name: tenantDoc.name,
          isConfirmed: tenantDoc.isConfirmed,
        },
        memberships,
        ...tokens,
      };

      const safeLogResponse = {
        user: {
          id: finalResponse.user.id,
          email: finalResponse.user.email,
          roleId: (finalResponse.user.role as any)?._id,
        },
        tenant: finalResponse.tenant,
      };
      this.logger.log(
        `[DEBUG] Returning response: ${JSON.stringify(LoggerSanitizer.sanitize(safeLogResponse))}`,
      );

      try {
        if (tenantDoc.confirmationCode) {
          await this.mailService.sendTenantWelcomeEmail(dto.email, {
            businessName: dto.businessName,
            planName: tenantDoc.subscriptionPlan,
            confirmationCode: tenantDoc.confirmationCode,
          });
        } else if (isTenantConfirmationEnforced()) {
          this.logger.warn(
            `No se envió correo de bienvenida para ${dto.email} porque no se encontró código de confirmación.`,
          );
        } else {
          this.logger.log(
            `La confirmación de tenant está deshabilitada. Se omite el envío de correo para ${dto.email}.`,
          );
        }
      } catch (error) {
        this.logger.error(
          `No se pudo enviar el correo de bienvenida: ${error.message}`,
        );
      }

      return finalResponse;
    } catch (error) {
      this.logger.error(
        "Error durante el proceso de onboarding, revirtiendo transacción.",
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Ocurrió un error inesperado durante el registro.",
      );
    } finally {
      await session.endSession();
    }
  }

  async confirmTenant(dto: ConfirmTenantDto) {
    const identifier: Record<string, any> = {};

    if (dto.tenantId) {
      identifier._id = dto.tenantId;
    } else if (dto.tenantCode) {
      identifier.code = dto.tenantCode;
    } else {
      throw new BadRequestException(
        "Debe proporcionar el identificador del tenant (tenantId o tenantCode).",
      );
    }

    const tenant = await this.tenantModel.findOne(identifier).exec();

    if (!tenant) {
      throw new NotFoundException("Tenant no encontrado.");
    }

    if (tenant.isConfirmed) {
      this.logger.log(
        `Tenant ${tenant.name} ya estaba confirmado. Ignorando nueva confirmación para ${dto.email}.`,
      );
      return {
        success: true,
        message: "La cuenta ya estaba confirmada.",
        tenant: {
          id: tenant._id,
          name: tenant.name,
          isConfirmed: tenant.isConfirmed,
        },
      } as const;
    }

    if (!tenant.confirmationCode) {
      this.logger.warn(
        `Tenant ${tenant._id} no tiene código de confirmación activo registrado.`,
      );
      throw new BadRequestException(
        "No hay un código de confirmación activo para este tenant.",
      );
    }

    if (
      tenant.confirmationCodeExpiresAt &&
      tenant.confirmationCodeExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        "El código de confirmación ha expirado. Solicita uno nuevo.",
      );
    }

    if (tenant.confirmationCode !== dto.confirmationCode) {
      throw new BadRequestException("Código de confirmación inválido.");
    }

    const trimmedEmail = dto.email.trim();
    const emailCandidates = Array.from(
      new Set([trimmedEmail, trimmedEmail.toLowerCase()]),
    );
    const user = await this.userModel
      .findOne({ email: { $in: emailCandidates }, tenantId: tenant._id })
      .populate({
        path: "role",
        populate: { path: "permissions", select: "name" },
      })
      .exec();

    if (!user) {
      this.logger.warn(
        `No se encontró usuario con email ${dto.email} asociado al tenant ${tenant._id} durante la confirmación.`,
      );
      throw new NotFoundException("Usuario no encontrado para este tenant.");
    }

    tenant.isConfirmed = true;
    tenant.confirmedAt = new Date();
    tenant.confirmationCode = undefined;
    tenant.confirmationCodeExpiresAt = undefined;
    await tenant.save();

    user.isEmailVerified = true;
    const tokens = await this.tokenService.generateTokens(user, tenant);
    await user.save();

    return {
      success: true,
      message: "Cuenta confirmada exitosamente.",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: tenant._id,
        name: tenant.name,
        isConfirmed: tenant.isConfirmed,
      },
      ...tokens,
    } as const;
  }
}
