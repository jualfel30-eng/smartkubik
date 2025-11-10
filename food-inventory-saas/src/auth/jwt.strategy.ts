import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { User, UserDocument } from "../schemas/user.schema";
import { Role, RoleDocument } from "../schemas/role.schema";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    this.logger.debug(
      `Validating token for payload: ${JSON.stringify(payload)}`,
    );
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

    // Cargar el rol completo con permisos desde la base de datos
    let roleWithPermissions = payload.role;

    if (payload.role && payload.role._id) {
      const fullRole = await this.roleModel
        .findById(payload.role._id)
        .populate('permissions')
        .exec();

      if (fullRole) {
        // Extraer solo los nombres de los permisos para el PermissionsGuard
        const permissionNames = (fullRole.permissions || []).map((p: any) =>
          typeof p === 'string' ? p : p.name
        );

        roleWithPermissions = {
          _id: fullRole._id,
          name: fullRole.name,
          description: fullRole.description,
          permissions: permissionNames
        };

        this.logger.debug(`Role loaded with ${permissionNames.length} permissions for user`);
      }
    }

    const userObject = {
      userId: user._id,
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: roleWithPermissions,
      tenantId: payload.tenantId ?? user.tenantId,
      membershipId: payload.membershipId ?? null,
    };

    this.logger.debug(`Validation successful for user: ${user.email}`);
    return userObject;
  }
}
