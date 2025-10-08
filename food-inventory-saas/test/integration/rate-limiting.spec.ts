import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Response } from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

jest.setTimeout(60000);

describe('Rate Limiting Security Tests (Integration)', () => {
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

  describe('POST /auth/login - Rate Limiting', () => {
    const loginEndpoint = '/api/v1/auth/login';
    const invalidCredentials = {
      email: 'nonexistent@example.com',
      password: 'wrongpassword',
    };

    it('should allow first 5 login attempts', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post(loginEndpoint)
          .send(invalidCredentials);

        // Should get 401 Unauthorized, NOT 429 Too Many Requests
        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Credenciales inválidas');
      }
    });

    it('should block 6th login attempt within 1 minute', async () => {
      // First 5 attempts (use different email to avoid collision with previous test)
      const testEmail = `test-${Date.now()}@example.com`;
      const credentials = { email: testEmail, password: 'wrong' };

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post(loginEndpoint)
          .send(credentials)
          .expect(401);
      }

      // 6th attempt should be rate limited
      const response = await request(app.getHttpServer())
        .post(loginEndpoint)
        .send(credentials);

      expect(response.status).toBe(429); // Too Many Requests
      expect(response.body.message).toContain('ThrottlerException');
    });

    it('should include rate limit headers in response', async () => {
      const testEmail = `test-headers-${Date.now()}@example.com`;
      const credentials = { email: testEmail, password: 'wrong' };

      const response = await request(app.getHttpServer())
        .post(loginEndpoint)
        .send(credentials);

      // Check for rate limit headers
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('POST /auth/register - Rate Limiting', () => {
    const registerEndpoint = '/api/v1/auth/register';

    it('should block excessive registration attempts', async () => {
      // Try to register 4 times (limit is 3 per minute for register)
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post(registerEndpoint)
          .send({
            email: `test${i}-${Date.now()}@example.com`,
            password: 'Test1234!',
            firstName: 'Test',
            lastName: 'User',
          });
      }

      // 4th attempt should be rate limited
      const response = await request(app.getHttpServer())
        .post(registerEndpoint)
        .send({
          email: `test-blocked-${Date.now()}@example.com`,
          password: 'Test1234!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(429);
    });
  });

  describe('Global Rate Limiting', () => {
    it('should enforce global rate limit across endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/v1/products' },
        { method: 'get', path: '/api/v1/customers' },
        { method: 'get', path: '/api/v1/orders' },
      ];

      // Make 100+ requests across different endpoints
      const requests: Array<Promise<Response>> = [];
      for (let i = 0; i < 120; i++) {
        const endpoint = endpoints[i % endpoints.length];
        requests.push(
          request(app.getHttpServer())
            [endpoint.method](endpoint.path)
            .set('Authorization', 'Bearer fake-token') // Will get 401 but still counts for rate limit
        );
      }

      const responses = await Promise.all(requests);

      // At least some requests should be rate limited (429)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Bypass Attempts', () => {
    it('should not be bypassed by changing User-Agent', async () => {
      const loginEndpoint = '/api/v1/auth/login';
      const credentials = {
        email: `bypass-test-${Date.now()}@example.com`,
        password: 'wrong',
      };

      // Make 5 requests with different User-Agents
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post(loginEndpoint)
          .set('User-Agent', `Browser-${i}`)
          .send(credentials)
          .expect(401);
      }

      // 6th request should still be rate limited (same IP)
      const response = await request(app.getHttpServer())
        .post(loginEndpoint)
        .set('User-Agent', 'Different-Browser')
        .send(credentials);

      expect(response.status).toBe(429);
    });

    it('should track rate limits by IP, not by credentials', async () => {
      const loginEndpoint = '/api/v1/auth/login';

      // Try 6 different credentials from same IP
      for (let i = 0; i < 6; i++) {
        const response = await request(app.getHttpServer())
          .post(loginEndpoint)
          .send({
            email: `user${i}-${Date.now()}@example.com`,
            password: 'wrong',
          });

        if (i < 5) {
          expect(response.status).toBe(401); // Unauthorized
        } else {
          expect(response.status).toBe(429); // Rate limited
        }
      }
    });
  });

  describe('DoS Attack Prevention', () => {
    it('should prevent rapid-fire requests (DoS simulation)', async () => {
      const endpoint = '/api/v1/products';

      // Simulate DoS: 200 requests as fast as possible
      const startTime = Date.now();
      const requests: Array<Promise<Response>> = Array.from({ length: 200 }, () =>
        request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', 'Bearer fake-token')
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // Count rate-limited responses
      const blockedRequests = responses.filter(r => r.status === 429).length;

      // Should block a significant portion of requests
      expect(blockedRequests).toBeGreaterThan(100);

      // Total time should be reasonable (not timeout)
      expect(endTime - startTime).toBeLessThan(30000); // < 30 seconds
    });

    it('should prevent slowloris attack (slow requests)', async () => {
      const endpoint = '/api/v1/auth/login';

      // Send requests with delays to avoid burst detection
      const responses: Response[] = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post(endpoint)
          .send({
            email: `slowloris-${Date.now()}@example.com`,
            password: 'wrong',
          })
          .timeout(5000);

        responses.push(response);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Even with delays, should eventually rate limit
      const blockedCount = responses.filter(r => r.status === 429).length;
      expect(blockedCount).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Recovery', () => {
    it('should reset rate limit after TTL expires', async () => {
      const loginEndpoint = '/api/v1/auth/login';
      const credentials = {
        email: `recovery-test-${Date.now()}@example.com`,
        password: 'wrong',
      };

      // Exhaust rate limit
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post(loginEndpoint)
          .send(credentials);
      }

      // Verify rate limited
      let response = await request(app.getHttpServer())
        .post(loginEndpoint)
        .send(credentials);
      expect(response.status).toBe(429);

      // Wait for TTL to expire (60 seconds for short limit)
      console.log('Waiting 61 seconds for rate limit reset...');
      await new Promise(resolve => setTimeout(resolve, 61000));

      // Should be able to make requests again
      response = await request(app.getHttpServer())
        .post(loginEndpoint)
        .send(credentials);

      expect(response.status).toBe(401); // Unauthorized, not rate limited
    }, 70000); // Increase timeout for this test
  });

  describe('Authenticated Requests Rate Limiting', () => {
    let authToken: string;

    beforeAll(async () => {
      // Register and login to get valid token
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `auth-user-${Date.now()}@example.com`,
          password: 'Test1234!',
          firstName: 'Auth',
          lastName: 'User',
          businessName: 'Test Business',
          businessType: 'restaurant',
        });

      authToken = registerResponse.body.data.accessToken;
    });

    it('should enforce rate limits even with valid authentication', async () => {
      const endpoint = '/api/v1/products';

      // Make 600 requests (exceeds 500/hour limit)
      const requests = Array.from({ length: 600 }, () =>
        request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
