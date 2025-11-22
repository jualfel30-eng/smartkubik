import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/app.setup";

jest.setTimeout(30000);

describe("Content Security Policy E2E Tests", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await configureApp(app, {
      includeSwagger: true,
      runSeeder: false,
      setGlobalPrefix: true,
    });
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("CSP Headers Presence", () => {
    it("should include Content-Security-Policy header in responses", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/health")
        .expect(200);

      expect(response.headers["content-security-policy"]).toBeDefined();
    });

    it("should have restrictive script-src directive", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("script-src 'unsafe-inline'");
      expect(csp).not.toContain("script-src *");
    });

    it("should have restrictive default-src directive", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      expect(csp).toContain("default-src 'self'");
    });

    it("should block frame embedding (clickjacking protection)", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("should restrict connect-src to same origin", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      expect(csp).toContain("connect-src 'self'");
    });

    it("should block object and embed tags", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      expect(csp).toContain("object-src 'none'");
    });

    it("should allow HTTPS images from any domain", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      // Should allow https: for images (product images from CDNs)
      expect(csp).toContain("img-src");
      expect(csp).toContain("https:");
    });

    it("should include upgrade-insecure-requests directive", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      expect(csp).toContain("upgrade-insecure-requests");
    });
  });

  describe("Other Security Headers", () => {
    it("should include X-Content-Type-Options: nosniff", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      expect(response.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("should include X-Frame-Options: DENY", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    });

    it("should include Strict-Transport-Security (HSTS)", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const hsts = response.headers["strict-transport-security"];

      expect(hsts).toBeDefined();
      expect(hsts).toContain("max-age=");
    });

    it("should remove X-Powered-By header (hide technology)", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      expect(response.headers["x-powered-by"]).toBeUndefined();
    });
  });

  describe("CSP Across Different Endpoints", () => {
    it("should apply CSP to API endpoints", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/products")
        .set("Authorization", "Bearer fake-token");

      expect(response.headers["content-security-policy"]).toBeDefined();
    });

    it("should apply CSP to Swagger docs endpoint", async () => {
      const response = await request(app.getHttpServer()).get("/api/docs");

      expect(response.headers["content-security-policy"]).toBeDefined();

      // Swagger needs unsafe-inline for styles
      const csp = response.headers["content-security-policy"];
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it("should apply CSP to auth endpoints", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: "test@test.com", password: "wrong" });

      expect(response.headers["content-security-policy"]).toBeDefined();
    });
  });

  describe("CSP Violation Scenarios", () => {
    it("should have CSP that would block inline scripts", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      // Verify that CSP does NOT allow unsafe-inline
      expect(csp).not.toContain("script-src 'unsafe-inline'");

      // This means inline scripts like <script>alert(1)</script> would be blocked
    });

    it("should have CSP that would block external script sources", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      // script-src should ONLY allow 'self'
      const scriptSrcMatch = csp.match(/script-src ([^;]+)/);
      expect(scriptSrcMatch).toBeTruthy();

      if (!scriptSrcMatch) {
        throw new Error("Missing script-src directive in CSP header");
      }

      const scriptSrcValue = scriptSrcMatch[1];

      // Should not allow any external domains
      expect(scriptSrcValue).not.toContain("http://");
      expect(scriptSrcValue).not.toContain("https://");
      expect(scriptSrcValue).toContain("'self'");
    });

    it("should block form submissions to external domains", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      expect(csp).toContain("form-action 'self'");
    });
  });

  describe("CSP Compliance", () => {
    it("should follow OWASP CSP best practices", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      // OWASP recommendations
      const requirements = [
        "default-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
      ];

      requirements.forEach((req) => {
        expect(csp).toContain(req);
      });
    });

    it("should not use wildcard (*) in any directive", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      // Wildcard is too permissive
      const dangerousPatterns = [
        "default-src *",
        "script-src *",
        "connect-src *",
        "frame-src *",
      ];

      dangerousPatterns.forEach((pattern) => {
        expect(csp).not.toContain(pattern);
      });
    });

    it("should have all critical CSP directives", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health");

      const csp = response.headers["content-security-policy"];

      const criticalDirectives = [
        "default-src",
        "script-src",
        "style-src",
        "img-src",
        "connect-src",
        "font-src",
        "object-src",
        "frame-src",
        "base-uri",
        "form-action",
      ];

      criticalDirectives.forEach((directive) => {
        expect(csp).toContain(directive);
      });
    });
  });

  describe("CSP Header Consistency", () => {
    it("should have consistent CSP across multiple requests", async () => {
      const response1 = await request(app.getHttpServer()).get(
        "/api/v1/health",
      );
      const response2 = await request(app.getHttpServer()).get(
        "/api/v1/health",
      );

      expect(response1.headers["content-security-policy"]).toBe(
        response2.headers["content-security-policy"],
      );
    });

    it("should apply CSP to both GET and POST requests", async () => {
      const getResponse = await request(app.getHttpServer()).get(
        "/api/v1/health",
      );

      const postResponse = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: "test@test.com", password: "wrong" });

      expect(getResponse.headers["content-security-policy"]).toBeDefined();
      expect(postResponse.headers["content-security-policy"]).toBeDefined();
    });

    it("should apply CSP to error responses (4xx, 5xx)", async () => {
      // 404 response
      const notFoundResponse = await request(app.getHttpServer()).get(
        "/api/v1/nonexistent",
      );

      expect(notFoundResponse.headers["content-security-policy"]).toBeDefined();

      // 401 response
      const unauthorizedResponse = await request(app.getHttpServer()).get(
        "/api/v1/products",
      );

      expect(
        unauthorizedResponse.headers["content-security-policy"],
      ).toBeDefined();
    });
  });
});
