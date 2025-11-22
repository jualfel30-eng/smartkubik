import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/app.setup";

jest.setTimeout(90000); // Increased timeout for rate limiting tests

describe("Rate Limiting Security Tests (Integration)", () => {
  let app: INestApplication;

  beforeEach(async () => {
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

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("POST /auth/login - Rate Limiting", () => {
    const loginEndpoint = "/api/v1/auth/login";

    it("should allow 5 attempts and block the 6th", async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const credentials = { email: testEmail, password: "wrongpassword" };

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post(loginEndpoint)
          .send(credentials)
          .expect(401);
      }

      const response = await request(app.getHttpServer())
        .post(loginEndpoint)
        .send(credentials);

      expect(response.status).toBe(429);
      expect(response.body.message).toContain("ThrottlerException");
    });

    it.skip("should include rate limit headers in response", async () => {
      const testEmail = `test-headers-${Date.now()}@example.com`;
      const credentials = { email: testEmail, password: "wrongpassword" };

      const response = await request(app.getHttpServer())
        .post(loginEndpoint)
        .send(credentials);

      expect(response.headers["x-ratelimit-limit"]).toBeDefined();
      expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
      expect(response.headers["x-ratelimit-reset"]).toBeDefined();
    });
  });

  describe("POST /onboarding/register - Rate Limiting", () => {
    const registerEndpoint = "/api/v1/onboarding/register";

    it("should block excessive registration attempts", async () => {
      for (let i = 0; i < 2; i++) {
        const res = await request(app.getHttpServer())
          .post(registerEndpoint)
          .send({
            email: `test${i}-${Date.now()}@example.com`,
            password: "Test1234!",
            firstName: "Test",
            lastName: "User",
            businessName: `Test Business ${i}`,
            businessType: "restaurant",
            subscriptionPlan: "Trial",
            numberOfUsers: 1,
          });
        expect(res.status).toBe(201);
      }

      const response = await request(app.getHttpServer())
        .post(registerEndpoint)
        .send({
          email: `test-blocked-${Date.now()}@example.com`,
          password: "Test1234!",
          firstName: "Test",
          lastName: "User",
          businessName: "Test Blocked Business",
          businessType: "restaurant",
          subscriptionPlan: "Trial",
          numberOfUsers: 1,
        });

      expect(response.status).toBe(429);
    });
  });

  describe("Rate Limit Recovery", () => {
    it("should reset rate limit after TTL expires", async () => {
      const loginEndpoint = "/api/v1/auth/login";
      const credentials = {
        email: `recovery-test-${Date.now()}@example.com`,
        password: "wrongpassword",
      };

      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post(loginEndpoint)
          .send(credentials);
      }

      let response = await request(app.getHttpServer())
        .post(loginEndpoint)
        .send(credentials);
      expect(response.status).toBe(429);

      console.log("Waiting 61 seconds for rate limit reset...");
      await new Promise((resolve) => setTimeout(resolve, 61000));

      response = await request(app.getHttpServer())
        .post(loginEndpoint)
        .send(credentials);

      expect(response.status).toBe(401);
    }, 70000);
  });
});
