import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { User, UserDocument } from "../schemas/user.schema";
import { Tenant, TenantDocument } from "../schemas/tenant.schema";
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

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim();
    this.logger.log(`Login attempt for email: ${email}`);

    const user = await this.userModel.findOne({ email }).populate('role').exec();

    if (!user) {
      this.logger.warn(`Login failed: User not found for email ${email}`);
      throw new UnauthorizedException("Credenciales inválidas");
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada. Intente en ${remainingTime} minutos.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException("Credenciales inválidas");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Usuario inactivo");
    }

    const tenant = await this.tenantModel.findById(user.tenantId).exec();
    if (!tenant) {
        this.logger.error(`CRITICAL: User ${user.email} has an invalid tenantId: ${user.tenantId}`);
        throw new UnauthorizedException("Error de configuración de la cuenta: Tenant asociado no encontrado.");
    }
    if (tenant.status !== "active") {
      throw new UnauthorizedException("La organización (tenant) está inactiva");
    }

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $unset: { loginAttempts: 1, lockUntil: 1 },
        lastLoginAt: new Date(),
        lastLoginIP: loginDto.ip || "unknown",
      },
    );

    const tokens = await this.generateTokens(user, tenant);

    this.logger.log(`Successful login for user: ${user.email}`);

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: {
        id: tenant._id,
        code: tenant.code,
        name: tenant.name,
        businessType: tenant.businessType,
      },
      ...tokens,
    };
  }

  async register(registerDto: RegisterDto) {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);

    const tenant = await this.tenantModel.findOne({
      code: registerDto.tenantCode,
    });
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
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

    const role: RoleDocument = await this.rolesService.findOneByName(registerDto.role, tenant._id.toString());
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

  async createUser(createUserDto: CreateUserDto, currentUser: any) {
    this.logger.log(
      `Creating user: ${createUserDto.email} by ${currentUser.email}`,
    );

    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
      tenantId: currentUser.tenantId,
    });

    if (existingUser) {
      throw new BadRequestException("El email ya está registrado");
    }

    const role: RoleDocument = await this.rolesService.findOneByName(createUserDto.role, currentUser.tenantId);
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

  private async generateTokens(user: UserDocument, tenant: TenantDocument) {
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
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
      }),
      this.jwtService.signAsync({ sub: user._id }, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
      }),
    ]);

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