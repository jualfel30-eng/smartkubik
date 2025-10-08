import { Injectable, Logger, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, ClientSession } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { RolesService } from '../roles/roles.service';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';
import { CreateTenantWithAdminDto } from './dto/onboarding.dto';
import { SeedingService } from '../seeding/seeding.service';
import { LoggerSanitizer } from '../../utils/logger-sanitizer.util';
import { getDefaultModulesForVertical } from '../../config/vertical-features.config';
import { TokenService } from '../../auth/token.service';


@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private rolesService: RolesService,
    private subscriptionPlansService: SubscriptionPlansService,
    private seedingService: SeedingService, // Injected SeedingService
    private tokenService: TokenService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async createTenantAndAdmin(dto: CreateTenantWithAdminDto) {
    this.logger.log(`Iniciando proceso de onboarding para el tenant: ${dto.businessName}`);

    const existingUser = await this.userModel.findOne({ email: dto.email }).exec();
    if (existingUser) {
      throw new ConflictException('El email ya está registrado.');
    }

    // Helper to generate a unique code from the business name
    const generateTenantCode = async (name: string): Promise<string> => {
      const baseCode = name
        .toUpperCase()
        .replace(/&/g, 'AND')
        .replace(/\s+/g, '-')
        .replace(/[^A-Z0-9-]/g, '')
        .substring(0, 30);
      
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
        const trialPlan = await this.subscriptionPlansService.findOneByName('Trial');

        // Determine vertical (default to FOOD_SERVICE if not provided)
        const vertical = dto.vertical || 'FOOD_SERVICE';

        // Get default enabled modules for the vertical
        const enabledModules = getDefaultModulesForVertical(vertical);
        const enabledModuleNames = Object.keys(enabledModules).filter(key => enabledModules[key]);

        this.logger.log(`Creating tenant with vertical: ${vertical}`);
        this.logger.log(`Enabled modules: ${JSON.stringify(enabledModuleNames)}`);

        const newTenant = new this.tenantModel({
          name: dto.businessName,
          code: tenantCode,
          businessType: dto.businessType,
          vertical: vertical,
          enabledModules: enabledModules,
          contactInfo: {
            email: dto.email,
            phone: dto.phone,
          },
          status: 'active',
          subscriptionPlan: trialPlan.name,
          limits: trialPlan.limits,
          usage: {
            currentUsers: 1,
            currentProducts: 0,
            currentOrders: 0,
            currentStorage: 0,
          },
        });
        this.logger.log(`Categorías recibidas: ${dto.categories}`);
        this.logger.log(`Subcategorías recibidas: ${dto.subcategories}`);
        savedTenant = await newTenant.save({ session });
        this.logger.log(`Paso 1/4: Tenant creado con ID: ${savedTenant._id}`);

        // 2. Seed Chart of Accounts
        await this.seedingService.seedChartOfAccounts(savedTenant._id.toString(), session);
        this.logger.log(`Paso 2/4: Plan de cuentas creado para el tenant: ${savedTenant._id}`);

        // 3. Create Admin Role for the new Tenant
        const adminRole = await this.rolesService.findOrCreateAdminRoleForTenant(savedTenant._id, enabledModuleNames, session);
        if (!adminRole) {
          throw new InternalServerErrorException('No se pudo crear el rol de administrador.');
        }
        this.logger.log(`Paso 3/4: Rol de administrador asignado para el tenant: ${savedTenant._id}`);

        // 4. Create Admin User
        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const newUser = new this.userModel({
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          tenantId: savedTenant._id,
          role: adminRole._id,
          isEmailVerified: true, // Assume verified on creation for simplicity
        });
        savedUser = await newUser.save({ session });
        this.logger.log(`Paso 4/4: Usuario administrador creado con ID: ${savedUser._id}`);
      }, {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
      });

      if (!savedTenant || !savedUser) {
        this.logger.error('FATAL: Transacción completada sin referencias a tenant o usuario.');
        throw new InternalServerErrorException('No se pudo completar el proceso de registro.');
      }

      this.logger.log(`Onboarding completado exitosamente para ${dto.businessName}`);

      const tenantDoc = savedTenant as TenantDocument;
      const userDoc = savedUser as UserDocument;

      const userWithRole = await this.userModel.findById(userDoc._id).populate({
        path: 'role',
        populate: { path: 'permissions', select: 'name' },
      }).exec();

      if (!userWithRole) {
        this.logger.error(`FATAL: User ${userDoc._id} not found immediately after creation.`);
        throw new InternalServerErrorException('No se pudo recuperar el usuario recién creado.');
      }

      this.logger.log('[DEBUG] User and tenant created. Generating tokens...');
      const tokens = await this.tokenService.generateTokens(userWithRole, tenantDoc);
      this.logger.log('[DEBUG] Tokens generated. Preparing final response object.');

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
          code: tenantDoc.code,
        },
        ...tokens,
      };

      // Sanitizar y loggear una versión segura del response
      const safeLogResponse = {
        user: {
          id: finalResponse.user.id,
          email: finalResponse.user.email,
          roleId: (finalResponse.user.role as any)?._id,
        },
        tenant: finalResponse.tenant,
      };
      this.logger.log(`[DEBUG] Returning response: ${JSON.stringify(LoggerSanitizer.sanitize(safeLogResponse))}`);

      return finalResponse;

    } catch (error) {
      this.logger.error('Error durante el proceso de onboarding, revirtiendo transacción.', error instanceof Error ? error.stack : undefined);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Ocurrió un error inesperado durante el registro.');
    }
    finally {
      await session.endSession();
    }
  }
}
