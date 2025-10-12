import { Injectable, Logger, ConflictException, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { UserTenantMembership, UserTenantMembershipDocument } from '../../schemas/user-tenant-membership.schema';
import { RolesService } from '../roles/roles.service';
import { SubscriptionPlan } from '../../schemas/subscription-plan.schema';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';
import { CreateTenantWithAdminDto, ConfirmTenantDto } from './dto/onboarding.dto';
import { SeedingService } from '../seeding/seeding.service';
import { LoggerSanitizer } from '../../utils/logger-sanitizer.util';
import { getDefaultModulesForVertical } from '../../config/vertical-features.config';
import { TokenService } from '../../auth/token.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserTenantMembership.name) private userTenantMembershipModel: Model<UserTenantMembershipDocument>,
    private rolesService: RolesService,
    private subscriptionPlansService: SubscriptionPlansService,
    private seedingService: SeedingService,
    private tokenService: TokenService,
    private mailService: MailService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async createTenantAndAdmin(dto: CreateTenantWithAdminDto) {
    this.logger.log(`Iniciando proceso de onboarding para el tenant: ${dto.businessName}`);

    const existingUser = await this.userModel.findOne({ email: dto.email }).exec();
    if (existingUser) {
      throw new ConflictException('El email ya está registrado.');
    }

    const generateTenantCode = async (name: string): Promise<string> => {
      const baseCode = name.toUpperCase().replace(/&/g, 'AND').replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').substring(0, 30);
      let code = baseCode;
      let counter = 1;
      while (await this.tenantModel.findOne({ code }).exec()) {
        counter++;
        code = `${baseCode}-${counter}`;
      }
      return code;
    };

    const tenantCode = await generateTenantCode(dto.businessName);

    let savedTenant: TenantDocument | undefined;
    let savedUser: UserDocument | undefined;

    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        const requestedPlanName = dto.subscriptionPlan || 'Trial';
        let selectedPlan: SubscriptionPlan | null = null;
        try {
          selectedPlan = await this.subscriptionPlansService.findOneByName(requestedPlanName);
        } catch (error) {
          this.logger.warn(`Plan "${requestedPlanName}" no encontrado. Se utilizará el Trial.`);
          selectedPlan = await this.subscriptionPlansService.findOneByName('Trial');
        }

        if (!selectedPlan) {
          throw new InternalServerErrorException('No se pudo determinar un plan de suscripción.');
        }

        const vertical = dto.vertical || 'FOOD_SERVICE';
        const enabledModules = getDefaultModulesForVertical(vertical);
        const enabledModuleNames = Object.keys(enabledModules).filter(key => enabledModules[key]);

        this.logger.log(`Creating tenant with vertical: ${vertical}`);
        this.logger.log(`Enabled modules: ${JSON.stringify(enabledModuleNames)}`);

        const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const confirmationCodeExpiresAt = new Date(Date.now() + 1000 * 60 * 60);

        const newTenant = new this.tenantModel({
          name: dto.businessName,
          code: tenantCode,
          businessType: dto.businessType,
          vertical: vertical,
          enabledModules: enabledModules,
          contactInfo: { email: dto.email, phone: dto.phone },
          status: 'active',
          subscriptionPlan: selectedPlan.name,
          isConfirmed: false,
          confirmationCode,
          confirmationCodeExpiresAt,
          limits: selectedPlan.limits,
          usage: { currentUsers: 1, currentProducts: 0, currentOrders: 0, currentStorage: 0 },
        });
        savedTenant = await newTenant.save({ session });
        this.logger.log(`Paso 1/5: Tenant creado con ID: ${savedTenant._id}`);

        await this.seedingService.seedChartOfAccounts(savedTenant._id.toString(), session);
        this.logger.log(`Paso 2/5: Plan de cuentas creado para el tenant: ${savedTenant._id}`);

        const adminRole = await this.rolesService.findOrCreateAdminRoleForTenant(savedTenant._id, enabledModuleNames, session);
        if (!adminRole) {
          throw new InternalServerErrorException('No se pudo crear el rol de administrador.');
        }
        this.logger.log(`Paso 3/5: Rol de administrador asignado para el tenant: ${savedTenant._id}`);

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
        this.logger.log(`Paso 4/5: Usuario administrador creado con ID: ${savedUser._id}`);

        const newMembership = new this.userTenantMembershipModel({
          userId: savedUser._id,
          tenantId: savedTenant._id,
          roleId: adminRole._id,
          status: 'active',
          isDefault: true,
        });
        await newMembership.save({ session });
        this.logger.log(`Paso 5/5: Membresía creada para el usuario en el tenant.`);
      });

      if (!savedTenant || !savedUser) {
        this.logger.error('FATAL: Transacción completada sin referencias a tenant o usuario.');
        throw new InternalServerErrorException('No se pudo completar el proceso de registro.');
      }

      this.logger.log(`Onboarding completado exitosamente para ${dto.businessName}`);

      const tenantDoc = savedTenant as TenantDocument;
      const userDoc = savedUser as UserDocument;

      const userWithRole = await this.userModel.findById(userDoc._id).populate({ path: 'role', populate: { path: 'permissions', select: 'name' } }).exec();

      if (!userWithRole) {
        this.logger.error(`FATAL: User ${userDoc._id} not found immediately after creation.`);
        throw new InternalServerErrorException('No se pudo recuperar el usuario recién creado.');
      }

      this.logger.log('[DEBUG] User and tenant created. Generating tokens...');
      const tokens = await this.tokenService.generateTokens(userWithRole, tenantDoc);
      this.logger.log('[DEBUG] Tokens generated. Preparing final response object.');

      const finalResponse = {
        user: { id: userWithRole._id, email: userWithRole.email, firstName: userWithRole.firstName, lastName: userWithRole.lastName, role: userWithRole.role },
        tenant: { id: tenantDoc._id, name: tenantDoc.name, code: tenantDoc.code, isConfirmed: tenantDoc.isConfirmed },
        ...tokens,
      };

      const safeLogResponse = {
        user: { id: finalResponse.user.id, email: finalResponse.user.email, roleId: (finalResponse.user.role as any)?._id },
        tenant: finalResponse.tenant,
      };
      this.logger.log(`[DEBUG] Returning response: ${JSON.stringify(LoggerSanitizer.sanitize(safeLogResponse))}`);

      try {
        if (tenantDoc.confirmationCode) {
          await this.mailService.sendTenantWelcomeEmail(dto.email, {
            businessName: dto.businessName,
            planName: tenantDoc.subscriptionPlan,
            confirmationCode: tenantDoc.confirmationCode,
          });
        } else {
          this.logger.warn(`No se envió correo de bienvenida para ${dto.email} porque no se encontró código de confirmación.`);
        }
      } catch (error) {
        this.logger.error(`No se pudo enviar el correo de bienvenida: ${error.message}`);
      }

      return finalResponse;
    } catch (error) {
      this.logger.error('Error durante el proceso de onboarding, revirtiendo transacción.', error instanceof Error ? error.stack : undefined);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Ocurrió un error inesperado durante el registro.');
    } finally {
      await session.endSession();
    }
  }


  async confirmTenant(dto: ConfirmTenantDto) {
    this.logger.log(`Confirmación solicitada para tenant ${dto.tenantCode}`);

    const tenant = await this.tenantModel.findOne({ code: dto.tenantCode }).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado.');
    }

    if (tenant.isConfirmed) {
      return { message: 'El tenant ya se encuentra confirmado.' };
    }

    if (!tenant.confirmationCode || tenant.confirmationCode !== dto.confirmationCode) {
      throw new BadRequestException('Código de confirmación inválido.');
    }

    if (tenant.confirmationCodeExpiresAt && tenant.confirmationCodeExpiresAt < new Date()) {
      throw new BadRequestException('El código de confirmación ha expirado. Solicita uno nuevo.');
    }

    const adminUser = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
      tenantId: tenant._id,
    }).exec();

    if (!adminUser) {
      throw new NotFoundException('No se encontró un usuario asociado a ese correo para este tenant.');
    }

    tenant.isConfirmed = true;
    tenant.confirmedAt = new Date();
    tenant.confirmationCode = undefined;
    tenant.confirmationCodeExpiresAt = undefined;
    await tenant.save();

    if (!adminUser.isEmailVerified) {
      adminUser.isEmailVerified = true;
      await adminUser.save();
    }

    this.logger.log(`Tenant ${tenant.code} confirmado exitosamente.`);

    return {
      message: 'Cuenta confirmada exitosamente. ¡Bienvenido!',
    };
  }
}
