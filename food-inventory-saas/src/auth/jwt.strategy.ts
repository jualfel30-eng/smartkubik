import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    this.logger.debug(`Validating token for payload: ${JSON.stringify(payload)}`);
    const user = await this.userModel
      .findById(payload.sub)
      .select('-password -passwordResetToken -emailVerificationToken')
      .exec();

    if (!user) {
      this.logger.warn(`User not found for id: ${payload.sub}`);
      throw new UnauthorizedException('Usuario inválido');
    }

    if (!user.isActive) {
      this.logger.warn(`User is not active: ${user.email}`);
      throw new UnauthorizedException('Usuario inactivo');
    }

    const userObject = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions,
      tenantId: user.tenantId,
    };

    this.logger.debug(`Validation successful for user: ${user.email}`);
    return userObject;
  }
}

