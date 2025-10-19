import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Guard to validate Whapi webhook requests
 *
 * Whapi uses custom headers for authentication, not HMAC signatures.
 * You can configure a custom header like "X-Webhook-Secret" in Whapi dashboard.
 *
 * For development/testing, you can disable this by setting WHAPI_WEBHOOK_VALIDATION=false
 */
@Injectable()
export class WhapiSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WhapiSignatureGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Allow disabling validation for development/testing
    const validationEnabled =
      this.configService.get<string>("WHAPI_WEBHOOK_VALIDATION") !== "false";

    if (!validationEnabled) {
      this.logger.warn(
        "Whapi webhook validation is DISABLED. Enable it in production!",
      );
      return true;
    }

    // Check for custom webhook secret header
    const webhookSecret = request.headers["x-webhook-secret"];
    const expectedSecret = this.configService.get<string>(
      "WHAPI_WEBHOOK_SECRET",
    );

    if (!expectedSecret) {
      this.logger.error("WHAPI_WEBHOOK_SECRET is not configured");
      throw new ForbiddenException("Server configuration error");
    }

    if (!webhookSecret) {
      this.logger.warn("Missing X-Webhook-Secret header from Whapi webhook");
      throw new ForbiddenException("Missing webhook secret");
    }

    if (webhookSecret !== expectedSecret) {
      this.logger.warn("Invalid webhook secret received");
      throw new ForbiddenException("Invalid webhook secret");
    }

    return true;
  }
}
