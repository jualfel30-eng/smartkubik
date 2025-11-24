import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { createHmac } from "crypto";
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
import { RoleDocument } from "../schemas/role.schema";
import { MailService } from "../modules/mail/mail.service";
import { TokenService } from "./token.service";
import {
  MembershipsService,
  MembershipSummary,
} from "../modules/memberships/memberships.service";
import { getEffectiveModulesForTenant } from "../config/vertical-features.config";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private jwtService: JwtService,
    private rolesService: RolesService,
    private mailService: MailService,
    private tokenService: TokenService,
    private membershipsService: MembershipsService,
  ) {}

  async login(
    loginDto: LoginDto | UserDocument | string,
    isImpersonation: boolean = false,
    impersonatorId?: string,
  ) {
    this.logger.log(`Received login DTO: ${JSON.stringify(loginDto)}`);
    if (isImpersonation) {
      this.logger.log(`Initiating impersonation flow for user ID: ${loginDto}`);
      const userId =
        typeof loginDto === "string"
          ? loginDto
          : (loginDto as any)._id || (loginDto as any).id;

      const user = await this.userModel
        .findById(userId)
        .populate({
          path: "role",
          populate: { path: "permissions", select: "name" },
        })
        .exec();

      if (!user) {
        this.logger.warn(
          `Impersonation failed: User not found for ID ${userId}`,
        );
        throw new NotFoundException("Usuario a impersonar no encontrado");
      }

      this.logger.log(`User to impersonate found: ${user.email}`);

      // Align with multi-tenant flow: find all memberships
      const memberships: MembershipSummary[] =
        await this.membershipsService.findActiveMembershipsForUser(user._id);

      if (!memberships.length) {
        this.logger.warn(
          `User ${user.email} has no active memberships. Impersonation cannot proceed to tenant selection.`,
        );
      }

      // Generate standard tokens but without a tenant context initially.
      // The token will contain impersonation flags.
      const tokens = await this.tokenService.generateTokens(user, null, {
        impersonation: true,
        impersonatorId,
      });

      // Return a payload similar to the standard multi-tenant login,
      // signaling to the frontend that organization selection is required.
      return {
        user: this.buildUserPayload(user, null),
        tenant: null,
        memberships,
        ...tokens,
        isImpersonation: true, // Explicit flag for the frontend
      };
    }

    const { email, password, ip, twoFactorCode, twoFactorBackupCode } =
      loginDto as LoginDto;
    const trimmedEmail = email.trim();
    const emailCandidates = Array.from(
      new Set([trimmedEmail, trimmedEmail.toLowerCase()]),
    );

    return this.loginMultiTenantFlow(
      emailCandidates,
      trimmedEmail,
      password,
      ip,
      twoFactorCode,
      twoFactorBackupCode,
    );
  }

  private async loginMultiTenantFlow(
    emailCandidates: string[],
    rawEmail: string,
    password: string,
    ip?: string,
    twoFactorCode?: string,
    twoFactorBackupCode?: string,
  ) {
    const sanitizedEmailForLog = LoggerSanitizer.sanitize({ email: rawEmail });
    this.logger.log(
      `Login attempt (multi-tenant) for email: ${sanitizedEmailForLog.email}`,
    );

    const user = await this.userModel
      .findOne({ email: { $in: emailCandidates } })
      .populate({
        path: "role",
        populate: { path: "permissions", select: "name" },
      })
      .exec();

    if (!user) {
      this.logger.warn(
        `Multi-tenant login failed: User not found for email ${sanitizedEmailForLog.email}`,
      );
      throw new UnauthorizedException("Credenciales inválidas");
    }

    await this.ensureUserNotLocked(user, rawEmail);
    await this.verifyPasswordOrThrow(user, password, rawEmail);

    await this.verifyTwoFactor(user, {
      email: rawEmail,
      code: twoFactorCode,
      backupCode: twoFactorBackupCode,
    });

    if (!user.isActive) {
      this.logger.warn(`❌ User ${rawEmail} is not active`);
      throw new UnauthorizedException("Usuario inactivo");
    }

    await this.persistSuccessfulLogin(user, ip);

    const memberships: MembershipSummary[] =
      await this.membershipsService.findActiveMembershipsForUser(user._id);

    // Si no hay memberships pero el usuario tiene tenantId (compatibilidad con invitaciones antiguas)
    if ((!memberships || memberships.length === 0) && user.tenantId) {
      this.logger.warn(
        `User ${sanitizedEmailForLog.email} no tenía memberships activas; creando membresía por compatibilidad.`,
      );
      const newMembership = await this.membershipsService.createDefaultMembershipIfMissing(
        user._id,
        user.tenantId,
        user.role,
      );
      if (newMembership) {
        memberships.push(newMembership);
      }
    }

    if (!memberships.length) {
      this.logger.warn(
        `User ${sanitizedEmailForLog.email} has no active memberships`,
      );
    }

    const defaultMembership =
      memberships.find((m) => m.isDefault) || memberships[0] || null;
    const shouldAutoSelectTenant =
      !!defaultMembership && (memberships.length === 1 || defaultMembership.isDefault);

    let tenantPayload = null as ReturnType<
      AuthService["buildTenantPayload"]
    > | null;
    let membershipPayload: MembershipSummary | null = null;
    let tokens:
      | Awaited<ReturnType<TokenService["generateTokens"]>>
      | null = null;

    if (shouldAutoSelectTenant && defaultMembership) {
      try {
        const membershipDoc =
          await this.membershipsService.getMembershipForUserOrFail(
            defaultMembership.id,
            user._id,
          );
        const [tenantDoc, roleDoc] = await Promise.all([
          this.membershipsService.resolveTenantById(membershipDoc.tenantId),
          this.membershipsService.resolveRoleById(membershipDoc.roleId),
        ]);

        if (!tenantDoc || tenantDoc.status !== "active" || !roleDoc) {
          this.logger.warn(
            `No se pudo auto-seleccionar tenant: tenant o rol inválido (tenant=${tenantDoc?._id}, rol=${roleDoc?._id})`,
          );
        } else {
          tokens = await this.tokenService.generateTokens(user, tenantDoc, {
            membershipId: membershipDoc._id.toString(),
            roleOverride: roleDoc,
          });

          if (
            !user.tenantId ||
            user.tenantId.toString() !== tenantDoc._id.toString()
          ) {
            await this.userModel.updateOne(
              { _id: user._id },
              { $set: { tenantId: tenantDoc._id } },
            );
          }

          membershipPayload =
            await this.membershipsService.buildMembershipSummary(
              membershipDoc,
            );
          tenantPayload = this.buildTenantPayload(tenantDoc);
        }
      } catch (error) {
        this.logger.warn(
          `Auto-selection of default tenant failed: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    if (!tokens) {
      tokens = await this.tokenService.generateTokens(user, null);
    }

    return {
      user: this.buildUserPayload(user, tenantPayload ? tenantPayload.id : null),
      tenant: tenantPayload,
      membership: membershipPayload,
      memberships,
      ...tokens,
    };
  }

  private async ensureUserNotLocked(user: UserDocument, email: string) {
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 60000,
      );
      this.logger.warn(`User ${email} is locked until ${user.lockUntil}`);
      throw new UnauthorizedException(
        `Cuenta bloqueada. Intente en ${remainingTime} minutos.`,
      );
    }
  }

  private async verifyPasswordOrThrow(
    user: UserDocument,
    password: string,
    email: string,
  ) {
    this.logger.log(`🔐 Verifying password for user ${email}...`);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    this.logger.log(`🔐 Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      this.logger.warn(`❌ Invalid password for user ${email}`);
      await this.handleFailedLogin(user);
      throw new UnauthorizedException("Credenciales inválidas");
    }
  }

  private async persistSuccessfulLogin(user: UserDocument, ip?: string) {
    this.logger.log(`📝 Updating user login info...`);
    await this.userModel.updateOne(
      { _id: user._id },
      {
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: {
          lastLoginAt: new Date(),
          lastLoginIP: ip || "unknown",
        },
      },
    );
  }

  private async verifyTwoFactor(
    user: UserDocument,
    options: { email: string; code?: string; backupCode?: string },
  ): Promise<void> {
    if (!user.twoFactorEnabled) {
      return;
    }

    const { email, code, backupCode } = options;

    if (
      !user.twoFactorSecret &&
      (!user.twoFactorBackupCodes?.length || !backupCode)
    ) {
      this.logger.error(
        `Usuario ${email} tiene 2FA habilitado pero sin secretos configurados`,
      );
      throw new UnauthorizedException(
        "Tu cuenta requiere verificación 2FA pero no está correctamente configurada",
      );
    }

    if (backupCode) {
      const normalized = backupCode.trim();
      if (!user.twoFactorBackupCodes?.includes(normalized)) {
        this.logger.warn(`Backup code inválido para ${email}`);
        throw new UnauthorizedException(
          "Código de respaldo inválido o ya usado",
        );
      }

      await this.userModel.updateOne(
        { _id: user._id },
        {
          $pull: { twoFactorBackupCodes: normalized },
          $set: { twoFactorLastVerifiedAt: new Date() },
        },
      );

      return;
    }

    if (!code) {
      this.logger.warn(`Intento de login sin código 2FA para ${email}`);
      throw new UnauthorizedException("Se requiere el código 2FA");
    }

    const verified = this.verifyTotpCode(user.twoFactorSecret || "", code);

    if (!verified) {
      this.logger.warn(`Código 2FA inválido para ${email}`);
      throw new UnauthorizedException("Código 2FA inválido");
    }

    await this.userModel.updateOne(
      { _id: user._id },
      { $set: { twoFactorLastVerifiedAt: new Date() } },
    );
  }

  private buildUserPayload(
    user: UserDocument,
    tenantIdOverride?: Types.ObjectId | string | null,
  ) {
    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId:
        tenantIdOverride !== undefined ? tenantIdOverride : user.tenantId,
    };
  }

  private buildTenantPayload(tenant: TenantDocument) {
    const effectiveModules = getEffectiveModulesForTenant(
      tenant.vertical || "FOOD_SERVICE",
      tenant.enabledModules,
    );

    return {
      id: tenant._id,
      name: tenant.name,
      businessType: tenant.businessType,
      vertical: tenant.vertical,
      enabledModules: effectiveModules,
      subscriptionPlan: tenant.subscriptionPlan,
      isConfirmed: tenant.isConfirmed,
      aiAssistant: tenant.aiAssistant ?? {
        autoReplyEnabled: false,
        knowledgeBaseTenantId: "",
      },
    };
  }

  async switchTenant(
    userId: string,
    membershipId: string,
    rememberAsDefault = false,
  ) {
    this.logger.log(
      `Switch tenant requested for user ${userId} -> membership ${membershipId}`,
    );

    const membership = await this.membershipsService.getMembershipForUserOrFail(
      membershipId,
      userId,
    );

    if (membership.status !== "active") {
      throw new UnauthorizedException("La membresía no está activa");
    }

    const [user, tenant, membershipRole] = await Promise.all([
      this.userModel
        .findById(userId)
        .populate({
          path: "role",
          populate: { path: "permissions", select: "name" },
        })
        .exec(),
      this.membershipsService.resolveTenantById(membership.tenantId),
      this.membershipsService.resolveRoleById(membership.roleId),
    ]);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Usuario inválido o inactivo");
    }

    if (!tenant) {
      throw new NotFoundException(
        "Tenant de la membresía no encontrado o inactivo",
      );
    }

    if (tenant.status !== "active") {
      throw new UnauthorizedException("El tenant está inactivo");
    }

    if (!membershipRole) {
      throw new UnauthorizedException("Rol de la membresía inválido");
    }

    const tokens = await this.tokenService.generateTokens(user, tenant, {
      membershipId: membership._id.toString(),
      roleOverride: membershipRole,
    });

    // Mantener compatibilidad con código existente que lee user.tenantId
    if (!user.tenantId || user.tenantId.toString() !== tenant._id.toString()) {
      await this.userModel.updateOne(
        { _id: user._id },
        { $set: { tenantId: tenant._id } },
      );
    }

    if (rememberAsDefault) {
      await this.membershipsService.setDefaultMembership(
        userId,
        membership._id,
      );
      membership.isDefault = true;
    }

    // Reusar datos cargados para evitar queries extra en el summary
    (membership as any).tenantId = tenant;
    (membership as any).roleId = membershipRole;
    const membershipSummary =
      await this.membershipsService.buildMembershipSummary(membership);

    const membershipsSnapshot =
      await this.membershipsService.findActiveMembershipsForUser(user._id);

    return {
      user: this.buildUserPayload(user, tenant._id),
      tenant: this.buildTenantPayload(tenant),
      membership: membershipSummary,
      memberships: membershipsSnapshot,
      ...tokens,
    };
  }

  async register(registerDto: RegisterDto) {
    // Public registration is disabled as the new flow is invite-based.
    this.logger.warn(
      `Blocked public registration attempt for email: ${registerDto.email}`,
    );
    throw new BadRequestException(
      "El registro público está deshabilitado. Los usuarios deben ser creados por un administrador.",
    );
  }

  async validateOAuthLogin(
    email: string,
    provider: string,
    profile: any,
  ): Promise<UserDocument> {
    this.logger.log(
      `OAuth login validation for email: ${email} via ${provider}`,
    );

    const user = await this.userModel
      .findOne({ email })
      .populate("role")
      .exec();

    if (user) {
      this.logger.log(
        `User found for email ${email}. Returning existing user.`,
      );
      // Ensure the user has a valid role populated before returning
      if (!user.role) {
        this.logger.error(
          `OAuth login failed: User ${email} has no role assigned.`,
        );
        throw new UnauthorizedException(
          "El usuario no tiene un rol asignado. Contacte al administrador.",
        );
      }
      return user;
    }

    this.logger.warn(`OAuth login failed: No user found for email ${email}.`);
    throw new UnauthorizedException(
      "Usuario no registrado. Por favor, regístrese o contacte a un administrador.",
    );
  }

  async googleLogin(user: UserDocument) {
    if (!user) {
      throw new BadRequestException("Unauthenticated");
    }

    let tenant: TenantDocument | null = null;
    // Handle tenant users
    if (user.tenantId) {
      tenant = await this.tenantModel.findById(user.tenantId).exec();
      if (!tenant) {
        this.logger.error(
          `CRITICAL: User ${user.email} has an invalid tenantId: ${user.tenantId}`,
        );
        throw new UnauthorizedException(
          "Error de configuración de la cuenta: Tenant asociado no encontrado.",
        );
      }
    }

    // If tenant is null here, it's a super_admin. TokenService handles a null tenant.
    const tokens = await this.tokenService.generateTokens(user, tenant);

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
        tenant: this.buildTenantPayload(tenant),
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
      throw new BadRequestException(
        "Límite de usuarios alcanzado para su plan de suscripción.",
      );
    }

    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
      tenantId: currentUser.tenantId,
    });

    if (existingUser) {
      throw new BadRequestException("El email ya está registrado");
    }

    const role: RoleDocument | null = await this.rolesService.findOneByName(
      createUserDto.role,
      currentUser.tenantId,
    );
    if (!role) {
      throw new BadRequestException(
        `Rol '${createUserDto.role}' no encontrado.`,
      );
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
    await this.tenantModel.findByIdAndUpdate(currentUser.tenantId, {
      $inc: { "usage.currentUsers": 1 },
    });

    this.logger.log(`User created successfully: ${savedUser.email}`);

    const userWithRole = await savedUser.populate("role");

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

      const user = await this.userModel.findById(payload.sub).populate("role");
      if (!user || !user.isActive) {
        throw new UnauthorizedException("Usuario inválido");
      }

      const tenant = await this.tenantModel.findById(user.tenantId);
      if (!tenant || tenant.status !== "active") {
        throw new UnauthorizedException("Tenant inválido");
      }

      return this.tokenService.generateTokens(user, tenant);
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
      throw new BadRequestException(
        "La nueva contraseña y la confirmación no coinciden",
      );
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

    const user = await this.userModel.findOne({
      email: forgotPasswordDto.email,
    });

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

      // Enviar correo con el link de recuperación
      try {
        await this.mailService.sendPasswordResetEmail(user.email, resetToken);
        this.logger.log(`Password reset email sent to: ${user.email}`);
      } catch (error) {
        this.logger.error(
          `Failed to send password reset email: ${error.message}`,
        );
        // No lanzamos error para no revelar si el usuario existe
      }
    } else {
      this.logger.warn(
        `Password reset requested for non-existent user: ${forgotPasswordDto.email}`,
      );
      // No revelamos que el usuario no existe por seguridad
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
      .populate(
        "tenantId",
        "code name businessType subscriptionPlan isConfirmed",
      )
      .populate("role")
      .exec();

    if (!user) {
      throw new UnauthorizedException("Usuario no encontrado");
    }

    return user;
  }

  async logout(userId: string) {
    this.logger.log(`Logout for user ID: ${userId}`);
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

  private verifyTotpCode(secret: string, token: string, window = 1): boolean {
    if (!secret || !token) {
      return false;
    }

    const sanitizedToken = token.replace(/\s+/g, "");
    if (!/^[0-9]{6}$/.test(sanitizedToken)) {
      return false;
    }

    const decodedSecret = this.decodeBase32(secret);
    if (!decodedSecret) {
      return false;
    }

    const step = 30;
    const currentCounter = Math.floor(Date.now() / 1000 / step);

    for (let offset = -window; offset <= window; offset += 1) {
      const counter = currentCounter + offset;
      if (counter < 0) {
        continue;
      }
      const generated = this.generateTotp(decodedSecret, counter);
      if (generated === sanitizedToken) {
        return true;
      }
    }

    return false;
  }

  private decodeBase32(secret: string): Buffer | null {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const normalized = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
    if (!normalized.length) {
      return null;
    }

    let bits = "";
    for (const char of normalized) {
      const value = alphabet.indexOf(char);
      if (value === -1) {
        continue;
      }
      bits += value.toString(2).padStart(5, "0");
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }

    return bytes.length ? Buffer.from(bytes) : null;
  }

  private generateTotp(secret: Buffer, counter: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));

    const hmac = createHmac("sha1", secret);
    hmac.update(buffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const otp = binary % 1_000_000;
    return otp.toString().padStart(6, "0");
  }
}
