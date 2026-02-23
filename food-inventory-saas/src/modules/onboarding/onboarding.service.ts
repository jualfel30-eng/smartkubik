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
  SubscribeDto,
} from "./dto/onboarding.dto";
import { SeedingService } from "../seeding/seeding.service";
import { LoggerSanitizer } from "../../utils/logger-sanitizer.util";
import { getDefaultModulesForVertical } from "../../config/vertical-features.config";
import { subscriptionPlans } from "../../config/subscriptions.config";
import { TokenService } from "../../auth/token.service";
import { MailService } from "../mail/mail.service";
import { isTenantConfirmationEnforced } from "../../config/tenant-confirmation";
import {
  MembershipsService,
  MembershipSummary,
} from "../memberships/memberships.service";
import { getVerticalProfileKey } from "../../utils/vertical-profile-mapper.util";
import { BillingService } from "../billing/billing.service";
import { WhapiService } from "../whapi/whapi.service";

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
    private billingService: BillingService,
    private whapiService: WhapiService,
    @InjectConnection() private readonly connection: Connection,
  ) { }

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
    let savedMembership: UserTenantMembershipDocument | undefined;

    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        // Normalizar el nombre del plan usando el config como fuente de verdad
        const requestedPlanId = (dto.subscriptionPlan || "trial").toLowerCase();
        const configPlan = subscriptionPlans[requestedPlanId];
        const planName = configPlan?.name || "Trial";

        // Calculate trial dates if plan is trial
        const isTrial = requestedPlanId === "trial" || !dto.subscriptionPlan;
        const trialStartDate = isTrial ? new Date() : undefined;
        const trialEndDate = isTrial
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          : undefined;

        this.logger.log(
          `Requested plan: "${dto.subscriptionPlan}" -> Normalized to: "${planName}"${isTrial ? ` (trial until ${trialEndDate?.toISOString()})` : ""}`,
        );

        let selectedPlan: SubscriptionPlan | null = null;
        try {
          selectedPlan =
            await this.subscriptionPlansService.findOneByName(planName);
          this.logger.log(`✅ Plan "${planName}" found in database`);
        } catch (error) {
          this.logger.warn(
            `❌ Plan "${planName}" not found in database. Falling back to Trial.`,
          );
          try {
            selectedPlan =
              await this.subscriptionPlansService.findOneByName("Trial");
          } catch (trialError) {
            this.logger.error(
              `❌ CRITICAL: Trial plan not found in database. This should never happen!`,
            );
            throw new InternalServerErrorException(
              "No se pudo encontrar ningún plan de suscripción válido.",
            );
          }
        }

        if (!selectedPlan) {
          throw new InternalServerErrorException(
            "No se pudo determinar un plan de suscripción.",
          );
        }

        const vertical = dto.vertical || "FOOD_SERVICE";
        const enabledModules = getDefaultModulesForVertical(vertical);

        // Gate marketing for Trial and Starter plans (only Fundamental+)
        if (requestedPlanId === "trial" || requestedPlanId === "starter") {
          enabledModules.marketing = false;
        }

        const enabledModuleNames = Object.keys(enabledModules).filter(
          (key) => enabledModules[key],
        );

        // Determinar el verticalProfile.key correcto basado en vertical + businessType
        const verticalProfileKey = getVerticalProfileKey(
          vertical,
          dto.businessType,
        );

        this.logger.log(`Creating tenant with vertical: ${vertical}`);
        this.logger.log(`Business type: ${dto.businessType}`);
        this.logger.log(`Vertical profile key: ${verticalProfileKey}`);
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
          verticalProfile: {
            key: verticalProfileKey,
            overrides: {},
          },
          ...(isTrial && {
            trialStartDate,
            trialEndDate,
            subscriptionExpiresAt: trialEndDate,
          }),
        });
        savedTenant = await newTenant.save({ session });
        this.logger.log(`Paso 1/7: Tenant creado con ID: ${savedTenant._id}`);

        await this.seedingService.seedChartOfAccounts(
          savedTenant._id.toString(),
          session,
        );
        this.logger.log(
          `Paso 2/7: Plan de cuentas creado para el tenant: ${savedTenant._id}`,
        );

        await this.seedingService.seedTipsDistributionRules(
          savedTenant._id.toString(),
          session,
        );
        this.logger.log(
          `Paso 3/7: Reglas de distribución de propinas creadas para el tenant: ${savedTenant._id}`,
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
          `Paso 4/7: Rol de administrador asignado para el tenant: ${savedTenant._id}`,
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
          `Paso 5/7: Usuario administrador creado con ID: ${savedUser._id}`,
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
          `Paso 6/7: Membresía creada para el usuario en el tenant.`,
        );

        // Crear series de facturación por defecto
        await this.billingService.createDefaultSequencesForTenant(
          savedTenant._id.toString(),
          session,
        );
        this.logger.log(
          `Paso 7/7: Series de facturación creadas para el tenant: ${savedTenant._id}`,
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
          businessType: tenantDoc.businessType,
          vertical: tenantDoc.vertical,
          enabledModules: tenantDoc.enabledModules,
          subscriptionPlan: tenantDoc.subscriptionPlan,
          isConfirmed: tenantDoc.isConfirmed,
          verticalProfile: tenantDoc.verticalProfile,
          trialStartDate: tenantDoc.trialStartDate,
          trialEndDate: tenantDoc.trialEndDate,
        },
        memberships,
        ...tokens,
      };

      this.logger.log(
        `[DEBUG] Registration successful for tenant: ${finalResponse.tenant.name}`,
      );

      // Enviar correo de bienvenida con código de confirmación
      try {
        this.logger.log(
          `[ONBOARDING] Intentando enviar correo de bienvenida a ${dto.email}`,
        );
        this.logger.log(
          `[ONBOARDING] Confirmation code: ${tenantDoc.confirmationCode}`,
        );
        this.logger.log(
          `[ONBOARDING] Business name: ${dto.businessName}`,
        );

        await this.mailService.sendTenantWelcomeEmail(dto.email, {
          businessName: dto.businessName,
          planName: tenantDoc.subscriptionPlan,
          confirmationCode: tenantDoc.confirmationCode || "",
        });

        this.logger.log(
          `[ONBOARDING] ✅ Correo de bienvenida enviado exitosamente a ${dto.email}`,
        );
      } catch (error) {
        this.logger.error(
          `[ONBOARDING] ❌ ERROR al enviar correo de bienvenida a ${dto.email}:`,
        );
        this.logger.error(`[ONBOARDING] Error message: ${error.message}`);
        this.logger.error(`[ONBOARDING] Error stack: ${error.stack}`);
        // No lanzamos el error para no bloquear el registro del tenant
        // pero sí lo registramos para debugging
      }

      // Day 0: Send WhatsApp welcome message (fire-and-forget)
      if (dto.phone && savedTenant) {
        const tenantId = savedTenant._id.toString();
        const welcomeMsg =
          `¡Hola${dto.firstName ? ` ${dto.firstName}` : ""}! 🎉\n\n` +
          `¡Bienvenido a SmartKubik! Tu cuenta para *${dto.businessName}* está lista.\n\n` +
          `Tu prueba gratuita de 14 días acaba de comenzar. Aquí van 3 pasos rápidos para arrancar:\n\n` +
          `1️⃣ Agrega tu primer producto en *Inventario → Productos*\n` +
          `2️⃣ Configura tus categorías en *Configuración*\n` +
          `3️⃣ Explora el Dashboard para ver métricas en tiempo real\n\n` +
          `¿Necesitas ayuda? Solo responde este mensaje — estoy aquí para ti. 💬`;

        this.whapiService
          .sendWhatsAppMessage(tenantId, dto.phone, welcomeMsg)
          .then(() => {
            this.logger.log(`[ONBOARDING] ✅ WhatsApp welcome sent to ${dto.phone}`);
            this.tenantModel.updateOne(
              { _id: tenantId },
              { $push: { whatsappFollowUpsSent: "day0_welcome" } },
            ).exec().catch(() => {});
          })
          .catch((err) => {
            this.logger.warn(`[ONBOARDING] WhatsApp welcome failed: ${err.message}`);
          });
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

  async subscribeToPlan(tenantId: string, dto: SubscribeDto) {
    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) {
      throw new NotFoundException("Tenant no encontrado.");
    }

    const planKey = dto.planId.toLowerCase();
    const configPlan = subscriptionPlans[planKey];
    if (!configPlan || planKey === "trial") {
      throw new BadRequestException(
        `Plan "${dto.planId}" no es un plan de pago válido.`,
      );
    }

    tenant.subscriptionPlan = configPlan.name;
    tenant.limits = configPlan.limits;
    tenant.subscriptionExpiresAt = undefined;
    tenant.trialStartDate = undefined;
    tenant.trialEndDate = undefined;

    if (dto.isFounder) {
      tenant.featureFlags = {
        ...(tenant.featureFlags || {}),
        founderTier: true,
      };
    }

    await tenant.save();

    this.logger.log(
      `Tenant ${tenant.name} upgraded from trial to ${configPlan.name}${dto.isFounder ? " (Founder)" : ""}`,
    );

    return {
      success: true,
      message: `Suscripción activada: ${configPlan.name}`,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        subscriptionPlan: tenant.subscriptionPlan,
        limits: tenant.limits,
      },
    };
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
