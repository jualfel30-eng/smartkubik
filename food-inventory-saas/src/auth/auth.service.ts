import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { User, UserDocument } from "../schemas/user.schema";
import { Tenant, TenantDocument } from "../schemas/tenant.schema";
import { LoggerSanitizer } from "../utils/logger-sanitizer.util";
import {
  LoginDto,
  RegisterDto,
  CreateUserDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from "../dto/auth.dto";
import { RolesService } from "../modules/roles/roles.service";
import { Role, RoleDocument } from '../schemas/role.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private jwtService: JwtService,
    private rolesService: RolesService,
  ) {}

  async login(loginDto: LoginDto | UserDocument | string, isImpersonation: boolean = false, impersonatorId?: string) {
    if (isImpersonation) {
      // When impersonating, loginDto is actually a User document or userId
      const userId = typeof loginDto === 'string' ? loginDto : (loginDto as any)._id || (loginDto as any).id;
      const user = await this.userModel.findById(userId).populate({
        path: 'role',
        populate: { path: 'permissions', select: 'name' }
      }).exec();
      if (!user) {
        throw new NotFoundException('Usuario a impersonar no encontrado');
      }
      const tenant = await this.tenantModel.findById(user.tenantId).exec();
      const tokens = await this.generateTokens(user, tenant, true, impersonatorId);
      return {
        user,
        tenant,
        ...tokens,
      };
    }

    const { email, password, tenantCode, ip } = loginDto as LoginDto;
    this.logger.log(`Login attempt for email: ${email} - Tenant: ${tenantCode || 'SUPER_ADMIN'}`);

    let user: UserDocument | null;

    // Handle Super Admin Login
    if (!tenantCode) {
      user = await this.userModel.findOne({ email: email.trim(), tenantId: null }).populate('role').exec();
      if (!user) {
        this.logger.warn(`Super admin login failed: User not found for email ${email}`);
        throw new UnauthorizedException("Credenciales inválidas");
      }
      const userRole = user.role as unknown as Role;
      if (userRole.name !== 'super_admin') {
        throw new UnauthorizedException("Se requiere un código de tenant para este usuario.");
      }

    } else {
      // Handle Tenant User Login
      const tenant = await this.tenantModel.findOne({ code: tenantCode });
      if (!tenant) {
        this.logger.warn(`Login failed: Tenant not found for code ${tenantCode}`);
        throw new UnauthorizedException("Credenciales inválidas");
      }
      this.logger.log(`✅ Tenant found: ${tenant.name} (${tenant._id})`);

      user = await this.userModel.findOne({ email: email.trim(), tenantId: tenant._id }).populate({
        path: 'role',
        populate: { path: 'permissions', select: 'name' }
      }).exec();
      if (!user) {
        this.logger.warn(`Login failed: User not found for email ${email} in tenant ${tenantCode}`);
        throw new UnauthorizedException("Credenciales inválidas");
      }
      this.logger.log(`✅ User found: ${user.firstName} ${user.lastName} (${user._id})`);

      if (tenant.status !== "active") {
        this.logger.warn(`Tenant ${tenantCode} is not active: ${tenant.status}`);
        throw new UnauthorizedException("La organización (tenant) está inactiva");
      }
    }

    // Common logic for both user types
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      this.logger.warn(`User ${email} is locked until ${user.lockUntil}`);
      throw new UnauthorizedException(`Cuenta bloqueada. Intente en ${remainingTime} minutos.`);
    }

    this.logger.log(`🔐 Verifying password for user ${email}...`);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    this.logger.log(`🔐 Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      this.logger.warn(`❌ Invalid password for user ${email}`);
      await this.handleFailedLogin(user);
      throw new UnauthorizedException("Credenciales inválidas");
    }

    if (!user.isActive) {
      this.logger.warn(`❌ User ${email} is not active`);
      throw new UnauthorizedException("Usuario inactivo");
    }
    this.logger.log(`✅ User is active`);

    this.logger.log(`📝 Updating user login info...`);
    await this.userModel.updateOne(
      { _id: user._id },
      {
        $unset: { loginAttempts: 1, lockUntil: 1 },
        lastLoginAt: new Date(),
        lastLoginIP: ip || "unknown",
      },
    );

    this.logger.log(`🏢 Fetching tenant info...`);
    const tenant = tenantCode ? await this.tenantModel.findById(user.tenantId).exec() : null;
    this.logger.log(`🔑 Generating tokens...`);
    const tokens = await this.generateTokens(user, tenant);

    this.logger.log(`✅ Successful login for user: ${user.email}`);

    const userPayload = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
    };

    if (tenant) {
      return {
        user: userPayload,
        tenant: {
          id: tenant._id,
          code: tenant.code,
          name: tenant.name,
          businessType: tenant.businessType,
        },
        ...tokens,
      };
    } else {
      // Super admin payload
      return {
        user: userPayload,
        ...tokens,
      };
    }
  }

  async register(registerDto: RegisterDto) {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);

    const tenant = await this.tenantModel.findOne({
      code: registerDto.tenantCode,
    });
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
    }

    if (tenant.usage.currentUsers >= tenant.limits.maxUsers) {
      throw new BadRequestException("El tenant ha alcanzado el límite de usuarios.");
    }

    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
      tenantId: tenant._id,
    });

    if (existingUser) {
      throw new BadRequestException(
        "El email ya está registrado en este tenant",
      );
    }

    const role: RoleDocument | null = await this.rolesService.findOneByName(registerDto.role, tenant._id.toString());
    if (!role) {
        throw new BadRequestException(`Rol '${registerDto.role}' no encontrado.`);
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const userData = {
      ...registerDto,
      password: hashedPassword,
      tenantId: tenant._id,
      role: role._id,
      emailVerificationToken: uuidv4(),
    };

    const user = new this.userModel(userData);
    const savedUser = await user.save();

    await this.tenantModel.findByIdAndUpdate(tenant._id, { $inc: { 'usage.currentUsers': 1 } });

    const userWithRole = await savedUser.populate('role');
    const tokens = await this.generateTokens(userWithRole, tenant);

    this.logger.log(`User registered successfully: ${savedUser.email}`);

    return {
      user: {
        id: userWithRole._id,
        email: userWithRole.email,
        firstName: userWithRole.firstName,
        lastName: userWithRole.lastName,
        role: userWithRole.role,
        tenantId: userWithRole.tenantId,
      },
      tenant: {
        id: tenant._id,
        code: tenant.code,
        name: tenant.name,
      },
      ...tokens,
    };
  }

  async validateOAuthLogin(email: string, provider: string, profile: any): Promise<UserDocument> {
    this.logger.log(`OAuth login validation for email: ${email} via ${provider}`);

    const user = await this.userModel.findOne({ email }).populate('role').exec();

    if (user) {
      this.logger.log(`User found for email ${email}. Returning existing user.`);
      // Ensure the user has a valid role populated before returning
      if (!user.role) {
        this.logger.error(`OAuth login failed: User ${email} has no role assigned.`);
        throw new UnauthorizedException('El usuario no tiene un rol asignado. Contacte al administrador.');
      }
      return user;
    }

    this.logger.warn(`OAuth login failed: No user found for email ${email}.`);
    throw new UnauthorizedException('Usuario no registrado. Por favor, regístrese o contacte a un administrador.');
  }

  async googleLogin(user: UserDocument) {
    if (!user) {
      throw new BadRequestException('Unauthenticated');
    }

    let tenant: TenantDocument | null = null;
    // Handle tenant users
    if (user.tenantId) {
      tenant = await this.tenantModel.findById(user.tenantId).exec();
      if (!tenant) {
        this.logger.error(`CRITICAL: User ${user.email} has an invalid tenantId: ${user.tenantId}`);
        throw new UnauthorizedException("Error de configuración de la cuenta: Tenant asociado no encontrado.");
      }
    }
    
    // If tenant is null here, it's a super_admin. generateTokens can handle a null tenant.
    const tokens = await this.generateTokens(user, tenant);

    this.logger.log(`Successful Google login for user: ${user.email}`);

    const userPayload = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
    };

    if (tenant) {
      return {
        user: userPayload,
        tenant: {
          id: tenant._id,
          code: tenant.code,
          name: tenant.name,
          businessType: tenant.businessType,
        },
        ...tokens,
      };
    } else {
      // Super admin payload
      return {
        user: userPayload,
        ...tokens,
      };
    }
  }

  async createUser(createUserDto: CreateUserDto, currentUser: any) {
    this.logger.log(
      `Creating user: ${createUserDto.email} by ${currentUser.email}`,
    );

    const tenant = await this.tenantModel.findById(currentUser.tenantId);
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
    }

    if (tenant.usage.currentUsers >= tenant.limits.maxUsers) {
      throw new BadRequestException("Límite de usuarios alcanzado para su plan de suscripción.");
    }

    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
      tenantId: currentUser.tenantId,
    });

    if (existingUser) {
      throw new BadRequestException("El email ya está registrado");
    }

    const role: RoleDocument | null = await this.rolesService.findOneByName(createUserDto.role, currentUser.tenantId);
    if (!role) {
        throw new BadRequestException(`Rol '${createUserDto.role}' no encontrado.`);
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    const userData = {
      ...createUserDto,
      password: hashedPassword,
      tenantId: currentUser.tenantId,
      role: role._id,
      createdBy: currentUser.id,
      emailVerificationToken: uuidv4(),
    };

    const user = new this.userModel(userData);
    const savedUser = await user.save();

    // Incrementar el contador de usuarios
    await this.tenantModel.findByIdAndUpdate(currentUser.tenantId, { $inc: { 'usage.currentUsers': 1 } });

    this.logger.log(`User created successfully: ${savedUser.email}`);

    const userWithRole = await savedUser.populate('role');

    return {
      id: userWithRole._id,
      email: userWithRole.email,
      firstName: userWithRole.firstName,
      lastName: userWithRole.lastName,
      role: userWithRole.role,
      isActive: userWithRole.isActive,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.userModel.findById(payload.sub).populate('role');
      if (!user || !user.isActive) {
        throw new UnauthorizedException("Usuario inválido");
      }

      const tenant = await this.tenantModel.findById(user.tenantId);
      if (!tenant || tenant.status !== "active") {
        throw new UnauthorizedException("Tenant inválido");
      }

      return this.generateTokens(user, tenant);
    } catch (error) {
      throw new UnauthorizedException("Refresh token inválido");
    }
  }

  async changePassword(changePasswordDto: ChangePasswordDto, user: any) {
    this.logger.log(`Password change request for user: ${user.email}`);

    const userDoc = await this.userModel.findById(user.id);
    if (!userDoc) {
      throw new UnauthorizedException("Usuario no encontrado");
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      userDoc.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException("Contraseña actual incorrecta");
    }

    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException("La nueva contraseña y la confirmación no coinciden");
    }

    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      12,
    );

    await this.userModel.updateOne(
      { _id: user.id },
      { password: hashedNewPassword },
    );

    this.logger.log(`Password changed successfully for user: ${user.email}`);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log(
      `Password reset request for email: ${forgotPasswordDto.email}`,
    );

    let user: UserDocument | null = null;

    if (forgotPasswordDto.tenantCode) {
      const tenant = await this.tenantModel.findOne({
        code: forgotPasswordDto.tenantCode,
      });
      if (tenant) {
        user = await this.userModel.findOne({
          email: forgotPasswordDto.email,
          tenantId: tenant._id,
        });
      }
    } else {
      user = await this.userModel.findOne({ email: forgotPasswordDto.email });
    }

    if (user) {
      const resetToken = uuidv4();
      const resetExpires = new Date(Date.now() + 3600000); // 1 hora

      await this.userModel.updateOne(
        { _id: user._id },
        {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        },
      );

      this.logger.log(`Password reset token generated for user: ${user.email}`);
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    this.logger.log(
      `Password reset attempt with token: ${resetPasswordDto.token}`,
    );

    const user = await this.userModel.findOne({
      passwordResetToken: resetPasswordDto.token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException("Token de reseteo inválido o expirado");
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 12);

    await this.userModel.updateOne(
      { _id: user._id },
      {
        password: hashedPassword,
        $unset: {
          passwordResetToken: 1,
          passwordResetExpires: 1,
          loginAttempts: 1,
          lockUntil: 1,
        },
      },
    );

    this.logger.log(`Password reset successfully for user: ${user.email}`);
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select("-password -passwordResetToken -emailVerificationToken")
      .populate("tenantId", "code name businessType")
      .populate('role')
      .exec();

    if (!user) {
      throw new UnauthorizedException("Usuario no encontrado");
    }

    return user;
  }

  async logout(userId: string) {
    this.logger.log(`Logout for user ID: ${userId}`);
  }

  private async generateTokens(user: UserDocument, tenant: TenantDocument | null, isImpersonation: boolean = false, impersonatorId?: string) {
    this.logger.log(`🔧 Generating tokens - user.role type: ${typeof user.role}`);
    this.logger.log(`🔧 user.role content: ${JSON.stringify(user.role)}`);
    const role = user.role as unknown as RoleDocument;

    if (!role || !role.name) {
      this.logger.error(`❌ Role is null/undefined or missing name for user ${user.email}`);
      this.logger.error(`❌ Role object: ${JSON.stringify(role)}`);
      throw new Error('User role is not properly populated');
    }

    this.logger.log(`🔧 Role found: ${role.name}`);

    // Load permission names from database
    let permissionNames: string[] = [];
    if (Array.isArray(role.permissions) && role.permissions.length > 0) {
      const firstPermission = role.permissions[0];
      const ObjectId = require('mongoose').Types.ObjectId;

      // Check if permissions are already populated (objects with 'name' property)
      if (typeof firstPermission === 'object' && firstPermission !== null && 'name' in firstPermission) {
        permissionNames = role.permissions.map((p: any) => p.name);
        this.logger.log(`🔧 Permissions already populated: ${permissionNames.length} permissions`);
      }
      // Check if permissions are ObjectIds (as strings or ObjectId instances)
      else if (
        (typeof firstPermission === 'string' && ObjectId.isValid(firstPermission)) ||
        (typeof firstPermission === 'object' && firstPermission instanceof ObjectId)
      ) {
        // Permissions are ObjectIds, need to fetch from DB
        const permissionIds = role.permissions.map(p => {
          if (typeof p === 'string') {
            return ObjectId.isValid(p) ? new ObjectId(p) : null;
          }
          return p;
        }).filter(p => p !== null);

        if (permissionIds.length > 0) {
          const permissionDocs = await this.userModel.db.collection('permissions').find({
            _id: { $in: permissionIds }
          }).toArray();
          permissionNames = permissionDocs.map(p => p.name);
          this.logger.log(`🔧 Loaded ${permissionNames.length} permission names from DB (were ObjectIds)`);
        }
      }
      // Check if permissions are strings (permission names directly)
      else if (typeof firstPermission === 'string') {
        permissionNames = role.permissions as string[];
        this.logger.log(`🔧 Permissions are permission name strings: ${permissionNames.length} permissions`);
      }
    }

    const payload = {
      sub: user._id,
      email: user.email,
      role: {
        name: role.name,
        permissions: permissionNames,
      },
      tenantId: tenant ? tenant._id : null,
      tenantCode: tenant ? tenant.code : null,
      impersonated: isImpersonation,
      impersonatorId: isImpersonation ? impersonatorId : null,
    };

    this.logger.log(`🔧 Signing JWT tokens...`);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
      }),
      this.jwtService.signAsync({ sub: user._id }, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
      }),
    ]);

    this.logger.log(`✅ Tokens generated successfully`);
    return {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    };
  }

  private async handleFailedLogin(user: UserDocument) {
    const maxAttempts = 5;
    const lockTime = 30 * 60 * 1000; // 30 minutos

    const updates: any = {
      $inc: { loginAttempts: 1 },
    };

    if (user.loginAttempts + 1 >= maxAttempts) {
      updates.lockUntil = new Date(Date.now() + lockTime);
    }

    await this.userModel.updateOne({ _id: user._id }, updates);
  }
}
