import {
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export const PAYMENT_PORTAL_SCOPE = "payment_portal";

export interface PaymentPortalTokenClaims {
  scope: typeof PAYMENT_PORTAL_SCOPE;
  paymentRequestId: string;
  tenantId: string;
}

interface VerifiedClaims extends PaymentPortalTokenClaims {
  iat: number;
  exp: number;
}

@Injectable()
export class PaymentTokenService {
  private readonly logger = new Logger(PaymentTokenService.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Sign a portal token. `expiresInSeconds` is computed from
   * `PaymentRequest.expiresAt - now` by the caller — keeps the JWT exp
   * claim in lock-step with the document-level expiry so we have a single
   * source of truth.
   */
  sign(
    claims: PaymentPortalTokenClaims,
    expiresInSeconds: number,
  ): string {
    if (expiresInSeconds <= 0) {
      // Refuse to mint tokens that are already expired — prevents foot-guns
      // when a PR is created with a past expiresAt.
      throw new Error(
        `Refusing to mint payment portal token with non-positive TTL (${expiresInSeconds}s)`,
      );
    }

    return this.jwtService.sign(claims, { expiresIn: expiresInSeconds });
  }

  /**
   * Verify signature + expiry + scope. Throws UnauthorizedException on any
   * issue. Returns the typed claims on success.
   */
  verify(token: string): VerifiedClaims {
    let decoded: VerifiedClaims;
    try {
      decoded = this.jwtService.verify<VerifiedClaims>(token);
    } catch (err) {
      this.logger.warn(`Payment portal token verify failed: ${err.message}`);
      throw new UnauthorizedException("Token inválido o expirado");
    }

    if (decoded.scope !== PAYMENT_PORTAL_SCOPE) {
      this.logger.warn(
        `Payment portal token rejected: wrong scope "${decoded.scope}"`,
      );
      throw new UnauthorizedException("Token sin alcance válido");
    }

    if (!decoded.paymentRequestId || !decoded.tenantId) {
      throw new UnauthorizedException("Token incompleto");
    }

    return decoded;
  }
}
