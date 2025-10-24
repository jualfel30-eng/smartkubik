import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { User, UserSchema } from "../schemas/user.schema";
import { Tenant, TenantSchema } from "../schemas/tenant.schema";
import { Role, RoleSchema } from "../schemas/role.schema";
import { RolesModule } from "../modules/roles/roles.module";
import { GoogleStrategy } from "./google.strategy";
import { MailModule } from "../modules/mail/mail.module";
import { PermissionsModule } from "../modules/permissions/permissions.module";
import { TokenService } from "./token.service";
import { MembershipsModule } from "../modules/memberships/memberships.module";
import { Session, SessionSchema } from "../schemas/session.schema";

@Module({
  imports: [
    RolesModule,
    MailModule,
    PermissionsModule,
    MembershipsModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN", "15m"),
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, TokenService],
  exports: [
    AuthService,
    JwtStrategy,
    PassportModule,
    TokenService,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
})
export class AuthModule {}
