import { Injectable, Logger, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { RolesService } from '../roles/roles.service';
import { CreateTenantWithAdminDto } from './dto/onboarding.dto';
import { JwtService } from '@nestjs/jwt';
import { SeedingService } from '../seeding/seeding.service';
import { RoleDocument } from '../../schemas/role.schema';
import { subscriptionPlans } from '../../config/subscriptions.config';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private rolesService: RolesService,
    private seedingService: SeedingService, // Injected SeedingService
    private jwtService: JwtService,
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

    // const session = await this.connection.startSession();
    // session.startTransaction();

    try {
      // 1. Create Tenant
      const trialPlan = subscriptionPlans.trial;
      const newTenant = new this.tenantModel({
        name: dto.businessName,
        code: tenantCode,
        businessType: dto.businessType,
        contactInfo: {
          email: dto.email,
          phone: dto.phone,
        },
        status: 'active',
        subscriptionPlan: 'trial',
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
      const savedTenant = await newTenant.save(/*{ session }*/);
      this.logger.log(`Paso 1/4: Tenant creado con ID: ${savedTenant._id}`);

      // 2. Seed Chart of Accounts
      await this.seedingService.seedChartOfAccounts(savedTenant._id);
      this.logger.log(`Paso 2/4: Plan de cuentas creado para el tenant: ${savedTenant._id}`);

      // 3. Create Admin Role for the new Tenant
      const adminRole = await this.rolesService.findOrCreateAdminRoleForTenant(savedTenant._id);
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
      const savedUser = await newUser.save(/*{ session }*/);
      this.logger.log(`Paso 4/4: Usuario administrador creado con ID: ${savedUser._id}`);

      // await session.commitTransaction();
      this.logger.log(`Onboarding completado exitosamente para ${dto.businessName}`);

      const userWithRole = await this.userModel.findById(savedUser._id).populate('role').exec();

      if (!userWithRole) {
        this.logger.error(`FATAL: User ${savedUser._id} not found immediately after creation.`);
        throw new InternalServerErrorException('No se pudo recuperar el usuario recién creado.');
      }

      // 4. Generate Tokens
      this.logger.log('[DEBUG] User and tenant created. Generating tokens...');
      const tokens = await this._generateTokens(userWithRole, savedTenant);
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
          id: savedTenant._id,
          name: savedTenant.name,
          code: savedTenant.code,
        },
        ...tokens,
      };

      this.logger.log(`[DEBUG] Returning response object keys: ${JSON.stringify(Object.keys(finalResponse))}`);

      return finalResponse;

    } catch (error) {
      this.logger.error('Error durante el proceso de onboarding, revirtiendo transacción.', error.stack);
      // await session.abortTransaction();
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Ocurrió un error inesperado durante el registro.');
    } finally {
      // session.endSession();
    }
  }

  private async _generateTokens(user: UserDocument, tenant: TenantDocument) {
    const role = user.role as unknown as RoleDocument;

    const payload = {
      sub: user._id,
      email: user.email,
      role: {
        name: role.name,
        permissions: role.permissions,
      },
      tenantId: tenant._id,
      tenantCode: tenant.code,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      }),
      this.jwtService.signAsync({ sub: user._id }, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}