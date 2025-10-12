import { Injectable, CanActivate, ExecutionContext, ForbiddenException, RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WhapiSignatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const signature = request.headers['x-hub-signature-256'];

    if (!signature) {
      throw new ForbiddenException('Missing signature');
    }

    if (!request.rawBody) {
        throw new ForbiddenException('Missing raw body');
    }

    const appSecret = this.configService.get<string>('WHAPI_APP_SECRET');
    if (!appSecret) {
      // In a real app, you might want to handle this more gracefully
      // For example, log the error and return false
      console.error('WHAPI_APP_SECRET is not configured');
      throw new ForbiddenException('Server configuration error');
    }

    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(request.rawBody);
    const calculatedSignature = `sha256=${hmac.digest('hex')}`;

    const isValid = crypto.timingSafeEqual(Buffer.from(calculatedSignature), Buffer.from(signature as string));

    if (!isValid) {
      throw new ForbiddenException('Invalid signature');
    }

    return true;
  }
}
