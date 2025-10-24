import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";
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
import { TokenService, TokenGenerationOptions } from "./token.service";
import {
  MembershipsService,
  MembershipSummary,
} from "../modules/memberships/memberships.service";
import { getEffectiveModulesForTenant } from "../config/vertical-features.config";
import { Session, SessionDocument } from "../schemas/session.schema";
import { parseDurationToMs } from "./auth-cookie.util";

type SessionContext = {
  ip?: string;
  userAgent?: string;
};

export interface SessionView {
  id: string;
  current: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  impersonation: boolean;
  impersonatorId: string | null;
  tenantId: string | null;
  membershipId: string | null;
  roleId: string | null;
  revoked: boolean;
  revokedAt: Date | null;
  revokedReason: string | null;
}

const DEFAULT_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private refreshTokenTtlMs: number | null = null;
  private readonly membershipCacheTtlMs = 5 * 60 * 1000; // 5 minutos

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private jwtService: JwtService,
    private rolesService: RolesService,
    private mailService: MailService,
    private tokenService: TokenService,
    private membershipsService: MembershipsService,
  ) {}

  private getRefreshTokenTtlMs(): number {
    if (this.refreshTokenTtlMs === null) {
      this.refreshTokenTtlMs = parseDurationToMs(
        process.env.JWT_REFRESH_EXPIRES_IN,
        DEFAULT_REFRESH_TTL_MS,
      );
    }

    return this.refreshTokenTtlMs;
  }

  private getRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + this.getRefreshTokenTtlMs());
  }

  private getMembershipCacheExpiry(): Date {
    return new Date(Date.now() + this.membershipCacheTtlMs);
  }

  private hashToken(token: string): string {
    return createHash("sha512").update(token).digest("hex");
  }

  private serializeMembershipList(
    memberships: MembershipSummary[],
  ): MembershipSummary[] {
    if (!Array.isArray(memberships)) {
      return [];
    }
    return JSON.parse(JSON.stringify(memberships));
  }

  private serializeMembershipSummary(
    summary: MembershipSummary | null,
  ): MembershipSummary | null {
    if (!summary) {
      return null;
    }
    return JSON.parse(JSON.stringify(summary));
  }

  private updateSessionMembershipCache(
    session: SessionDocument,
    payload: {
      memberships: MembershipSummary[];
      summary: MembershipSummary | null;
      membershipId: string | null;
    },
  ) {
    session.membershipsSnapshot = this.serializeMembershipList(
      payload.memberships,
    );
    session.membershipSnapshot = this.serializeMembershipSummary(
      payload.summary,
    );
    session.membershipSnapshotMembershipId = payload.membershipId;
    session.membershipSnapshotExpiresAt = this.getMembershipCacheExpiry();
  }

  private normalizeUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) {
      return undefined;
    }

    const trimmed = userAgent.trim();
    return trimmed.length > 512 ? trimmed.slice(0, 512) : trimmed;
  }

  private normalizeIp(ip?: string): string | undefined {
    if (!ip) {
      return undefined;
    }

    const trimmed = ip.trim();
    return trimmed.length > 64 ? trimmed.slice(0, 64) : trimmed;
  }

  private resolveObjectId(value?: string | null): Types.ObjectId | undefined {
    if (!value || !Types.ObjectId.isValid(value)) {
      return undefined;
    }

    return new Types.ObjectId(value);
  }

  private normalizeObjectIdList(
    values?: (string | Types.ObjectId | null | undefined)[],
  ): Types.ObjectId[] {
    if (!values || !values.length) {
      return [];
    }

    const normalized: Types.ObjectId[] = [];

    for (const value of values) {
      if (!value) {
        continue;
      }

      if (value instanceof Types.ObjectId) {
        normalized.push(value);
        continue;
      }

      const resolved = this.resolveObjectId(String(value));
      if (resolved) {
        normalized.push(resolved);
      }
    }

    return normalized;
  }

  private mapSessionDocument(
    session: SessionDocument,
    currentSessionId?: Types.ObjectId,
  ): SessionView {
    const currentIdString = currentSessionId?.toHexString();
    return {
      id: session._id.toString(),
      current: currentIdString
        ? session._id.toString() === currentIdString
        : false,
      createdAt: session.createdAt as Date,
      lastUsedAt: (session.lastUsedAt as Date | undefined) ?? null,
      expiresAt: session.expiresAt as Date,
      ipAddress: session.ipAddress ?? null,
      userAgent: session.userAgent ?? null,
      impersonation: Boolean(session.impersonation),
      impersonatorId: session.impersonatorId
        ? session.impersonatorId.toString()
        : null,
      tenantId: session.tenantId ? session.tenantId.toString() : null,
      membershipId: session.membershipId ?? null,
      roleId: session.roleId ? session.roleId.toString() : null,
      revoked: Boolean(session.revoked),
      revokedAt: (session.revokedAt as Date | undefined) ?? null,
      revokedReason: session.revokedReason ?? null,
    };
  }

  async ensureActorCanManageUserSessions(
    actor: {
      id: string;
      tenantId?: string | Types.ObjectId | null;
      role?: { name?: string } | null;
    },
    targetUserId: string,
  ): Promise<Types.ObjectId> {
    const targetObjectId = this.resolveObjectId(targetUserId);

    if (!targetObjectId) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const targetUser = await this.userModel
      .findById(targetObjectId)
      .select("tenantId")
      .exec();

    if (!targetUser) {
      throw new NotFoundException("Usuario no encontrado");
    }

    if (actor.role?.name === "super_admin" || actor.id === targetUserId) {
      return targetObjectId;
    }

    const actorTenantId = actor.tenantId
      ? actor.tenantId instanceof Types.ObjectId
        ? actor.tenantId.toHexString()
        : String(actor.tenantId)
      : null;

    if (!actorTenantId) {
      throw new ForbiddenException("Usuario sin tenant válido");
    }

    if (
      targetUser.tenantId &&
      targetUser.tenantId.toString() === actorTenantId
    ) {
      return targetObjectId;
    }

    const memberships =
      await this.membershipsService.findActiveMembershipsForUser(
        targetObjectId,
      );

    if (
      memberships.some((membership) => membership.tenant?.id === actorTenantId)
    ) {
      return targetObjectId;
    }

    throw new ForbiddenException("El usuario no pertenece al tenant actual");
  }

  async listSessionsForUser(
    userId: string,
    options: {
      includeRevoked?: boolean;
      currentSessionId?: string | Types.ObjectId | null;
    } = {},
  ): Promise<SessionView[]> {
    const userObjectId = this.resolveObjectId(userId);

    if (!userObjectId) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const currentSessionObjectId = options.currentSessionId
      ? this.resolveObjectId(String(options.currentSessionId))
      : undefined;

    const filter: FilterQuery<SessionDocument> = {
      userId: userObjectId,
    };

    if (!options.includeRevoked) {
      filter.revoked = false;
    }

    const sessions = await this.sessionModel
      .find(filter)
      .sort({ revoked: 1, lastUsedAt: -1, createdAt: -1 })
      .exec();

    return sessions.map((session) =>
      this.mapSessionDocument(session, currentSessionObjectId),
    );
  }

  async revokeSessionForUser(
    userId: string,
    sessionId: string,
    options: {
      reason?: string;
      currentSessionId?: string | Types.ObjectId | null;
    } = {},
  ): Promise<{ updated: SessionView; alreadyRevoked: boolean }> {
    const userObjectId = this.resolveObjectId(userId);

    if (!userObjectId) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const sessionObjectId = this.resolveObjectId(sessionId);

    if (!sessionObjectId) {
      throw new NotFoundException("Sesión no encontrada");
    }

    const session = await this.sessionModel
      .findOne({ _id: sessionObjectId, userId: userObjectId })
      .exec();

    if (!session) {
      throw new NotFoundException("Sesión no encontrada");
    }

    const alreadyRevoked = Boolean(session.revoked);

    if (!alreadyRevoked) {
      await this.revokeSession(session, options.reason ?? "manual_revocation");
    }

    const currentSessionObjectId = options.currentSessionId
      ? this.resolveObjectId(String(options.currentSessionId))
      : undefined;

    return {
      updated: this.mapSessionDocument(session, currentSessionObjectId),
      alreadyRevoked,
    };
  }

  async revokeAllSessionsForUser(
    userId: string,
    options: {
      reason?: string;
      excludeSessionIds?: (string | Types.ObjectId | null | undefined)[];
    } = {},
  ): Promise<number> {
    const userObjectId = this.resolveObjectId(userId);

    if (!userObjectId) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return this.revokeUserSessions(
      userObjectId,
      options.reason ?? "manual_revocation",
      { excludeSessionIds: options.excludeSessionIds },
    );
  }

  private buildSessionDocument(
    user: UserDocument,
    tenant: TenantDocument | null,
    options: TokenGenerationOptions = {},
    context: SessionContext = {},
  ) {
    const rawRole = options.roleOverride;
    let resolvedRoleId: Types.ObjectId | undefined;

    if (rawRole) {
      if (typeof rawRole === "string") {
        resolvedRoleId = this.resolveObjectId(rawRole);
      } else if (rawRole instanceof Types.ObjectId) {
        resolvedRoleId = rawRole;
      } else if (typeof rawRole === "object" && "_id" in rawRole) {
        const candidate = (rawRole as RoleDocument | any)._id;
        if (candidate instanceof Types.ObjectId) {
          resolvedRoleId = candidate;
        } else if (typeof candidate === "string") {
          resolvedRoleId = this.resolveObjectId(candidate);
        }
      }
    }

    const session = new this.sessionModel({
      userId: user._id,
      tenantId: tenant?._id ?? null,
      membershipId: options.membershipId ?? null,
      roleId: resolvedRoleId ?? null,
      impersonation: Boolean(options.impersonation),
      impersonatorId: this.resolveObjectId(options.impersonatorId),
      userAgent: this.normalizeUserAgent(context.userAgent),
      ipAddress: this.normalizeIp(context.ip),
      expiresAt: this.getRefreshTokenExpiryDate(),
      revoked: false,
      lastUsedAt: new Date(),
    });

    return session;
  }

  private async persistSessionToken(
    session: SessionDocument,
    refreshToken: string,
  ) {
    session.previousTokenHash = null;
    session.refreshTokenHash = this.hashToken(refreshToken);
    session.expiresAt = this.getRefreshTokenExpiryDate();
    session.revoked = false;
    session.revokedAt = null;
    session.revokedReason = null;
    session.lastUsedAt = new Date();
    await session.save();
  }

  private async rotateSessionToken(
    session: SessionDocument,
    refreshToken: string,
    context: SessionContext = {},
  ) {
    session.previousTokenHash = session.refreshTokenHash;
    session.refreshTokenHash = this.hashToken(refreshToken);
    session.expiresAt = this.getRefreshTokenExpiryDate();
    session.lastUsedAt = new Date();
    session.rotatedAt = new Date();
    const normalizedUserAgent = this.normalizeUserAgent(context.userAgent);
    const normalizedIp = this.normalizeIp(context.ip);
    if (normalizedUserAgent) {
      session.userAgent = normalizedUserAgent;
    }
    if (normalizedIp) {
      session.ipAddress = normalizedIp;
    }
    session.revoked = false;
    session.revokedAt = null;
    session.revokedReason = null;
    await session.save();
  }

  private async revokeSession(
    session: SessionDocument,
    reason: string,
  ): Promise<void> {
    session.revoked = true;
    session.revokedAt = new Date();
    session.revokedReason = reason;
    await session.save();
  }

  private async revokeUserSessions(
    userId: Types.ObjectId,
    reason: string,
    options: {
      excludeSessionIds?: (string | Types.ObjectId | null | undefined)[];
    } = {},
  ): Promise<number> {
    const filter: FilterQuery<SessionDocument> = {
      userId,
      revoked: false,
    };

    const exclusions = this.normalizeObjectIdList(options.excludeSessionIds);

    if (exclusions.length) {
      filter._id = { $nin: exclusions };
    }

    const now = new Date();

    const result = await this.sessionModel.updateMany(filter, {
      $set: {
        revoked: true,
        revokedAt: now,
        revokedReason: reason,
      },
    });

    return result.modifiedCount ?? 0;
  }

  private async issueSessionTokens(
    user: UserDocument,
    tenant: TenantDocument | null,
    options: TokenGenerationOptions = {},
    context: SessionContext = {},
  ) {
    const session = this.buildSessionDocument(user, tenant, options, context);
    const tokens = await this.tokenService.generateTokens(user, tenant, {
      ...options,
      sessionId: session._id.toString(),
    });

    if (!tokens.refreshToken) {
      throw new UnauthorizedException(
        "No se pudo generar un refresh token válido",
      );
    }

    await this.persistSessionToken(session, tokens.refreshToken);

    return { tokens, session };
  }

  async createSessionForUser(
    user: UserDocument,
    tenant: TenantDocument | null,
    options: TokenGenerationOptions = {},
    context: SessionContext = {},
  ) {
    const { tokens } = await this.issueSessionTokens(
      user,
      tenant,
      options,
      context,
    );

    return tokens;
  }

  private async assertSessionIntegrity(
    sessionId: string,
  ): Promise<SessionDocument> {
    const session = await this.sessionModel.findById(sessionId).exec();

    if (!session) {
      throw new UnauthorizedException("Sesión inválida o expirada");
    }

    if (session.revoked) {
      throw new UnauthorizedException("La sesión ha sido cerrada");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.revokeSession(session, "expired");
      throw new UnauthorizedException("La sesión ha expirado");
    }

    return session;
  }

  async login(
    loginDto: LoginDto | UserDocument | string,
    isImpersonation: boolean = false,
    impersonatorId?: string,
    sessionContext: SessionContext = {},
  ) {
    if (!isImpersonation) {
      const sanitizedPayload = LoggerSanitizer.sanitize(loginDto);
      const identifier =
        typeof sanitizedPayload === "object" && sanitizedPayload
          ? sanitizedPayload.email || sanitizedPayload.id || "unknown"
          : "unknown";
      this.logger.log(`Processing login request for ${identifier}`);
    }
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
      const { tokens, session } = await this.issueSessionTokens(
        user,
        null,
        {
          impersonation: true,
          impersonatorId,
        },
        sessionContext,
      );

      this.updateSessionMembershipCache(session, {
        memberships,
        summary: null,
        membershipId: null,
      });
      await session.save();

      // Return a payload similar to the standard multi-tenant login,
      // signaling to the frontend that organization selection is required.
      return {
        sessionId: session._id.toString(),
        user: this.buildUserPayload(user, null),
        tenant: null,
        memberships,
        ...tokens,
        isImpersonation: true, // Explicit flag for the frontend
      };
    }

    const { email, password, ip } = loginDto as LoginDto;
    const trimmedEmail = email.trim();
    const emailCandidates = Array.from(
      new Set([trimmedEmail, trimmedEmail.toLowerCase()]),
    );

    return this.loginMultiTenantFlow(
      emailCandidates,
      trimmedEmail,
      password,
      ip,
      sessionContext,
    );
  }

  private async loginMultiTenantFlow(
    emailCandidates: string[],
    rawEmail: string,
    password: string,
    ip?: string,
    sessionContext: SessionContext = {},
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

    if (!user.isActive) {
      this.logger.warn(`❌ User ${rawEmail} is not active`);
      throw new UnauthorizedException("Usuario inactivo");
    }

    await this.persistSuccessfulLogin(user, ip);

    const memberships: MembershipSummary[] =
      await this.membershipsService.findActiveMembershipsForUser(user._id);

    if (!memberships.length) {
      this.logger.warn(
        `User ${sanitizedEmailForLog.email} has no active memberships`,
      );
    }

    const { tokens, session } = await this.issueSessionTokens(
      user,
      null,
      {},
      {
        ...sessionContext,
        ip: sessionContext.ip ?? ip,
      },
    );

    this.updateSessionMembershipCache(session, {
      memberships,
      summary: null,
      membershipId: null,
    });
    await session.save();

    return {
      sessionId: session._id.toString(),
      user: this.buildUserPayload(user, null),
      tenant: null,
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
    sessionId: string,
    rememberAsDefault = false,
    sessionContext: SessionContext = {},
  ) {
    this.logger.log(
      `Switch tenant requested for user ${userId} -> membership ${membershipId}`,
    );

    const session = await this.assertSessionIntegrity(sessionId);

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

    if (!session.userId.equals(user._id)) {
      throw new ForbiddenException(
        "La sesión no pertenece al usuario indicado",
      );
    }

    const targetMembershipId = membership._id.toString();
    const cacheExpiryTime = session.membershipSnapshotExpiresAt?.getTime() ?? 0;
    const cacheIsFresh = cacheExpiryTime > Date.now();

    const cachedMemberships =
      cacheIsFresh && Array.isArray(session.membershipsSnapshot)
        ? (session.membershipsSnapshot as MembershipSummary[])
        : null;

    (membership as any).tenantId = tenant;
    (membership as any).roleId = membershipRole;

    const membershipSummary =
      cacheIsFresh &&
      session.membershipSnapshot &&
      session.membershipSnapshotMembershipId === targetMembershipId
        ? (session.membershipSnapshot as MembershipSummary)
        : await this.membershipsService.buildMembershipSummary(membership);

    const membershipsSnapshot =
      cachedMemberships ??
      (await this.membershipsService.findActiveMembershipsForUser(user._id));

    const tokens = await this.tokenService.generateTokens(user, tenant, {
      membershipId: targetMembershipId,
      roleOverride: membershipRole,
      sessionId: session._id.toString(),
    });

    if (!tokens.refreshToken) {
      throw new UnauthorizedException(
        "No se pudo generar un refresh token válido",
      );
    }

    session.tenantId = tenant._id;
    session.membershipId = targetMembershipId;
    session.roleId = membershipRole._id;
    this.updateSessionMembershipCache(session, {
      memberships: membershipsSnapshot,
      summary: membershipSummary,
      membershipId: targetMembershipId,
    });
    await this.rotateSessionToken(session, tokens.refreshToken, sessionContext);

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

  async getSessionSnapshot(userId: string, membershipId?: string | null) {
    const user = await this.userModel
      .findById(userId)
      .populate({
        path: "role",
        populate: { path: "permissions", select: "name" },
      })
      .exec();

    if (!user) {
      throw new UnauthorizedException("Usuario no encontrado");
    }

    const memberships: MembershipSummary[] =
      await this.membershipsService.findActiveMembershipsForUser(user._id);

    const pickMembershipById = (
      targetId: string | null | undefined,
    ): MembershipSummary | null => {
      if (!targetId) {
        return null;
      }
      return (
        memberships.find((membership) => membership.id === targetId) ?? null
      );
    };

    let activeMembership =
      pickMembershipById(membershipId) ||
      memberships.find((membership) => membership.isDefault) ||
      memberships[0] ||
      null;

    let tenant: TenantDocument | null = null;

    if (activeMembership?.tenant?.id) {
      tenant = await this.tenantModel
        .findById(activeMembership.tenant.id)
        .exec();
    } else if (user.tenantId) {
      tenant = await this.tenantModel.findById(user.tenantId).exec();
      if (!activeMembership && tenant) {
        activeMembership = pickMembershipById(
          memberships.find((membership) =>
            membership.tenant?.id
              ? membership.tenant.id === tenant?._id?.toString()
              : false,
          )?.id,
        );
      }
    }

    return {
      user: this.buildUserPayload(user, tenant?._id ?? null),
      tenant: tenant ? this.buildTenantPayload(tenant) : null,
      membership: activeMembership ?? null,
      memberships,
    };
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

  async googleLogin(user: UserDocument, sessionContext: SessionContext = {}) {
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

    // If tenant is null here, it's a super_admin. Session handling supports null tenant.
    const { tokens } = await this.issueSessionTokens(
      user,
      tenant,
      {},
      sessionContext,
    );

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

  async refreshToken(
    refreshToken: string,
    sessionContext: SessionContext = {},
  ) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }) as { sub: string; sid?: string } & Record<string, any>;

      const sessionId = payload.sid || payload.sessionId;

      if (!sessionId) {
        throw new UnauthorizedException("Refresh token inválido");
      }

      const session = await this.assertSessionIntegrity(sessionId);

      const presentedHash = this.hashToken(refreshToken);
      if (session.refreshTokenHash !== presentedHash) {
        if (
          session.previousTokenHash &&
          session.previousTokenHash === presentedHash
        ) {
          this.logger.warn(
            `Refresh token reuse detected for session ${session._id}`,
          );
          await this.revokeSession(session, "refresh_token_reuse");
          throw new ForbiddenException(
            "Reutilización de refresh token detectada. La sesión ha sido revocada.",
          );
        }

        this.logger.warn(
          `Refresh token mismatch for session ${session._id}. Revoking session.`,
        );
        await this.revokeSession(session, "refresh_token_mismatch");
        throw new UnauthorizedException("Refresh token inválido");
      }

      const user = await this.userModel.findById(payload.sub).populate("role");
      if (!user || !user.isActive) {
        await this.revokeSession(session, "user_inactive");
        throw new UnauthorizedException("Usuario inválido");
      }

      let tenant: TenantDocument | null = null;
      const tenantId = session.tenantId ?? user.tenantId ?? null;
      if (tenantId) {
        tenant = await this.tenantModel.findById(tenantId).exec();
        if (!tenant || tenant.status !== "active") {
          await this.revokeSession(session, "tenant_inactive");
          throw new UnauthorizedException("Tenant inválido");
        }
      }

      let roleOverride: RoleDocument | undefined;
      if (session.roleId && tenant) {
        try {
          roleOverride = await this.rolesService.findOne(
            session.roleId.toString(),
            tenant._id.toString(),
          );
        } catch (error) {
          this.logger.warn(
            `No se pudo recuperar el rol asociado a la sesión ${session._id}: ${error.message}`,
          );
        }
      }

      const tokens = await this.tokenService.generateTokens(user, tenant, {
        membershipId: session.membershipId ?? undefined,
        roleOverride: roleOverride ?? undefined,
        impersonation: session.impersonation,
        impersonatorId: session.impersonatorId
          ? session.impersonatorId.toString()
          : undefined,
        sessionId: session._id.toString(),
      });

      if (!tokens.refreshToken) {
        await this.revokeSession(session, "refresh_generation_failed");
        throw new UnauthorizedException(
          "No se pudo generar un refresh token válido",
        );
      }

      if (roleOverride) {
        session.roleId = roleOverride._id;
      }

      if (
        tenant &&
        (!session.tenantId || !session.tenantId.equals(tenant._id))
      ) {
        session.tenantId = tenant._id;
      }

      await this.rotateSessionToken(
        session,
        tokens.refreshToken,
        sessionContext,
      );

      return tokens;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error(`Error al refrescar token: ${error?.message || error}`);
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

    const currentSessionId = this.resolveObjectId(user.sessionId);
    const revokedCount = await this.revokeUserSessions(
      userDoc._id,
      "password_changed",
      {
        excludeSessionIds: currentSessionId ? [currentSessionId] : [],
      },
    );

    if (revokedCount) {
      this.logger.log(
        `Revoked ${revokedCount} session(s) after password change for user: ${user.email}`,
      );
    }

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

    const revokedCount = await this.revokeUserSessions(
      user._id,
      "password_reset",
    );

    if (revokedCount) {
      this.logger.log(
        `Revoked ${revokedCount} session(s) after password reset for user: ${user.email}`,
      );
    }

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

  async logout(userId: string, sessionId: string, refreshToken?: string) {
    this.logger.log(`Logout for user ID: ${userId} (session: ${sessionId})`);

    if (!Types.ObjectId.isValid(sessionId)) {
      this.logger.warn(`Logout aborted: invalid session id ${sessionId}`);
      return;
    }

    if (!Types.ObjectId.isValid(userId)) {
      this.logger.warn(`Logout aborted: invalid user id ${userId}`);
      return;
    }

    const session = await this.sessionModel.findById(sessionId).exec();

    if (!session) {
      this.logger.warn(`Logout aborted: session ${sessionId} not found`);
      return;
    }

    if (!session.userId.equals(new Types.ObjectId(userId))) {
      throw new ForbiddenException(
        "La sesión no pertenece al usuario indicado",
      );
    }

    if (refreshToken) {
      const hashed = this.hashToken(refreshToken);
      if (
        session.refreshTokenHash !== hashed &&
        session.previousTokenHash !== hashed
      ) {
        this.logger.warn(
          `Refresh token provided at logout does not match stored hash for session ${sessionId}`,
        );
      }
    }

    await this.revokeSession(session, "logout");
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
