import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  PAYMENT_PORTAL_SCOPE,
  PaymentTokenService,
} from "../../../src/modules/payment-requests/services/payment-token.service";

describe("PaymentTokenService", () => {
  let jwt: JwtService;
  let service: PaymentTokenService;

  beforeEach(() => {
    jwt = new JwtService({ secret: "test-secret-for-payment-portal" });
    service = new PaymentTokenService(jwt);
  });

  describe("sign", () => {
    it("mints a token whose verify round-trips the claims", () => {
      const token = service.sign(
        {
          scope: PAYMENT_PORTAL_SCOPE,
          paymentRequestId: "60ed4f6a8c3e8b0001abc123",
          tenantId: "60ed4f6a8c3e8b0001tenant9",
        },
        3600,
      );

      const claims = service.verify(token);
      expect(claims.paymentRequestId).toBe("60ed4f6a8c3e8b0001abc123");
      expect(claims.tenantId).toBe("60ed4f6a8c3e8b0001tenant9");
      expect(claims.scope).toBe(PAYMENT_PORTAL_SCOPE);
      expect(claims.exp).toBeGreaterThan(claims.iat);
    });

    it("refuses non-positive TTL — prevents minting pre-expired tokens", () => {
      expect(() =>
        service.sign(
          {
            scope: PAYMENT_PORTAL_SCOPE,
            paymentRequestId: "x",
            tenantId: "y",
          },
          0,
        ),
      ).toThrow(/non-positive TTL/);

      expect(() =>
        service.sign(
          {
            scope: PAYMENT_PORTAL_SCOPE,
            paymentRequestId: "x",
            tenantId: "y",
          },
          -10,
        ),
      ).toThrow();
    });
  });

  describe("verify", () => {
    it("rejects tokens issued for a different scope", () => {
      // Sign a token with a foreign scope using the same key
      const wrong = jwt.sign(
        { scope: "auth_session", paymentRequestId: "x", tenantId: "y" },
        { expiresIn: 60 },
      );
      expect(() => service.verify(wrong)).toThrow(UnauthorizedException);
    });

    it("rejects tokens missing required claims", () => {
      const incomplete = jwt.sign(
        { scope: PAYMENT_PORTAL_SCOPE },
        { expiresIn: 60 },
      );
      expect(() => service.verify(incomplete)).toThrow(UnauthorizedException);
    });

    it("rejects expired tokens", () => {
      const expired = jwt.sign(
        {
          scope: PAYMENT_PORTAL_SCOPE,
          paymentRequestId: "x",
          tenantId: "y",
        },
        { expiresIn: -1 },
      );
      expect(() => service.verify(expired)).toThrow(UnauthorizedException);
    });

    it("rejects tokens signed with a different secret", () => {
      const foreignJwt = new JwtService({ secret: "different-secret" });
      const foreignToken = foreignJwt.sign(
        {
          scope: PAYMENT_PORTAL_SCOPE,
          paymentRequestId: "x",
          tenantId: "y",
        },
        { expiresIn: 60 },
      );
      expect(() => service.verify(foreignToken)).toThrow(UnauthorizedException);
    });

    it("rejects garbage strings", () => {
      expect(() => service.verify("not-a-jwt")).toThrow(UnauthorizedException);
      expect(() => service.verify("")).toThrow(UnauthorizedException);
    });
  });
});
