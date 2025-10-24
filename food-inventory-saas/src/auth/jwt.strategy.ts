import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { User, UserDocument } from "../schemas/user.schema";
import { Session, SessionDocument } from "../schemas/session.schema";
import type { Request } from "express";

type RequestWithCookies = Request & {
  cookies?: Record<string, string | undefined>;
};

const cookieExtractor = (req: RequestWithCookies): string | null => {
  if (!req || !req.cookies) {
    return null;
  }

  return req.cookies["sk_access_token"] || null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    this.logger.debug(
      `Validating token for user ${payload?.email || payload?.sub || "unknown"}`,
    );

    if (!payload?.sessionId) {
      this.logger.warn("Token sin identificador de sesión");
      throw new UnauthorizedException("Sesión inválida");
    }

    if (!Types.ObjectId.isValid(payload.sessionId)) {
      this.logger.warn(
        `Identificador de sesión inválido: ${payload.sessionId}`,
      );
      throw new UnauthorizedException("Sesión inválida");
    }

    const session = await this.sessionModel.findById(payload.sessionId).exec();

    if (!session) {
      this.logger.warn(`Sesión ${payload.sessionId} no encontrada`);
      throw new UnauthorizedException("Sesión inválida");
    }

    if (session.revoked) {
      this.logger.warn(`Sesión ${payload.sessionId} revocada previamente`);
      throw new UnauthorizedException("La sesión ha sido cerrada");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessionModel.updateOne(
        { _id: session._id },
        {
          $set: {
            revoked: true,
            revokedAt: new Date(),
            revokedReason: "expired_access_check",
          },
        },
      );
      throw new UnauthorizedException("La sesión ha expirado");
    }

    const user = await this.userModel
      .findById(payload.sub)
      .select("-password -passwordResetToken -emailVerificationToken")
      .exec();

    if (!user) {
      this.logger.warn(`User not found for id: ${payload.sub}`);
      throw new UnauthorizedException("Usuario inválido");
    }

    if (!user.isActive) {
      this.logger.warn(`User is not active: ${user.email}`);
      throw new UnauthorizedException("Usuario inactivo");
    }

    if (!session.userId.equals(user._id)) {
      this.logger.warn(
        `Sesión ${session._id} no corresponde al usuario ${user._id}`,
      );
      throw new UnauthorizedException("Sesión inválida");
    }

    await this.sessionModel
      .updateOne({ _id: session._id }, { $set: { lastUsedAt: new Date() } })
      .catch((error) =>
        this.logger.warn(
          `No se pudo actualizar lastUsedAt para la sesión ${session._id}: ${error.message}`,
        ),
      );

    const userObject = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: payload.role,
      tenantId: payload.tenantId ?? user.tenantId,
      membershipId: payload.membershipId ?? null,
      sessionId: payload.sessionId,
      impersonated: Boolean(payload.impersonated),
      impersonatorId: payload.impersonatorId ?? null,
    };

    this.logger.debug(`Validation successful for user: ${user.email}`);
    return userObject;
  }
}
