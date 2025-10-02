import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Ownership Validation E2E Tests', () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let tenant1Token: string;
  let tenant2Token: string;
  let tenant1Id: string;
  let tenant2Id: string;
  let tenant1ProductId: string;
  let tenant2ProductId: string;
  let tenant1CustomerId: string;
  let tenant2CustomerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    mongoConnection = moduleFixture.get<Connection>(getConnectionToken());

    // Setup: Create two separate tenants
    await setupTenants();
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await cleanupTestData();
    await app.close();
  });

  async function setupTenants() {
    // Create Tenant 1
    const tenant1Response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `tenant1-${Date.now()}@example.com`,
        password: 'Test1234!',
        firstName: 'Tenant',
        lastName: 'One',
        businessName: 'Restaurant 1',
        businessType: 'restaurant',
      });

    tenant1Token = tenant1Response.body.data.accessToken;
    tenant1Id = tenant1Response.body.data.user.tenantId;

    // Create Tenant 2
    const tenant2Response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `tenant2-${Date.now()}@example.com`,
        password: 'Test1234!',
        firstName: 'Tenant',
        lastName: 'Two',
        businessName: 'Restaurant 2',
        businessType: 'restaurant',
      });

    tenant2Token = tenant2Response.body.data.accessToken;
    tenant2Id = tenant2Response.body.data.user.tenantId;

    // Create products for each tenant
    const product1Response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({
        name: 'Tenant 1 Product',
        sku: `SKU1-${Date.now()}`,
        price: 10.0,
        cost: 5.0,
        category: 'Food',
      });

    tenant1ProductId = product1Response.body.data._id;

    const product2Response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${tenant2Token}`)
      .send({
        name: 'Tenant 2 Product',
        sku: `SKU2-${Date.now()}`,
        price: 20.0,
        cost: 10.0,
        category: 'Food',
      });

    tenant2ProductId = product2Response.body.data._id;

    // Create customers for each tenant
    const customer1Response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({
        name: 'Customer',
        lastName: 'One',
        email: `customer1-${Date.now()}@example.com`,
        customerType: 'individual',
      });

    tenant1CustomerId = customer1Response.body.data._id;

    const customer2Response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tenant2Token}`)
      .send({
        name: 'Customer',
        lastName: 'Two',
        email: `customer2-${Date.now()}@example.com`,
        customerType: 'individual',
      });

    tenant2CustomerId = customer2Response.body.data._id;
  }

  async function cleanupTestData() {
    if (mongoConnection) {
      await mongoConnection.collection('users').deleteMany({
        email: { $regex: /tenant[12]-.*@example\.com/ },
      });
      await mongoConnection.collection('tenants').deleteMany({
        _id: { $in: [tenant1Id, tenant2Id] },
      });
      await mongoConnection.collection('products').deleteMany({
        tenantId: { $in: [tenant1Id, tenant2Id] },
      });
      await mongoConnection.collection('customers').deleteMany({
        tenantId: { $in: [tenant1Id, tenant2Id] },
      });
    }
  }

  describe('DELETE /products/:id - Cross-Tenant Protection', () => {
    it('should allow tenant to delete their own product', async () => {
      // Tenant 1 creates a product
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          name: 'Deletable Product',
          sku: `DEL-${Date.now()}`,
          price: 15.0,
          cost: 7.0,
          category: 'Food',
        });

      const productId = createResponse.body.data._id;

      // Tenant 1 deletes their own product
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${tenant1Token}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });

    it('should prevent tenant from deleting another tenants product', async () => {
      // Tenant 1 tries to delete Tenant 2's product
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/products/${tenant2ProductId}`)
        .set('Authorization', `Bearer ${tenant1Token}`);

      // Should get 404 (not found) instead of deleting
      expect(deleteResponse.status).toBe(404);
      expect(deleteResponse.body.message).toContain('no encontrado');

      // Verify product still exists for Tenant 2
      const verifyResponse = await request(app.getHttpServer())
        .get(`/api/v1/products/${tenant2ProductId}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.data._id).toBe(tenant2ProductId);
    });

    it('should prevent deletion with guessed product IDs', async () => {
      // Try to delete with a made-up ID
      const fakeId = '507f1f77bcf86cd799439011';

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/products/${fakeId}`)
        .set('Authorization', `Bearer ${tenant1Token}`);

      expect(deleteResponse.status).toBe(404);
    });
  });

  describe('DELETE /customers/:id - Cross-Tenant Protection', () => {
    it('should allow tenant to delete their own customer', async () => {
      // Create customer for deletion test
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          name: 'Deletable',
          lastName: 'Customer',
          email: `deletable-${Date.now()}@example.com`,
          customerType: 'individual',
        });

      const customerId = createResponse.body.data._id;

      // Delete own customer
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/customers/${customerId}`)
        .set('Authorization', `Bearer ${tenant1Token}`);

      expect(deleteResponse.status).toBe(200);
    });

    it('should prevent tenant from deleting another tenants customer', async () => {
      // Tenant 1 tries to delete Tenant 2's customer
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/customers/${tenant2CustomerId}`)
        .set('Authorization', `Bearer ${tenant1Token}`);

      expect(deleteResponse.status).toBe(404);

      // Verify customer still exists for Tenant 2
      const verifyResponse = await request(app.getHttpServer())
        .get(`/api/v1/customers/${tenant2CustomerId}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(verifyResponse.status).toBe(200);
    });
  });

  describe('PUT /products/:id - Cross-Tenant Protection', () => {
    it('should allow tenant to update their own product', async () => {
      const updateResponse = await request(app.getHttpServer())
        .put(`/api/v1/products/${tenant1ProductId}`)
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          name: 'Updated Product Name',
          price: 25.0,
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.name).toBe('Updated Product Name');
    });

    it('should prevent tenant from updating another tenants product', async () => {
      const updateResponse = await request(app.getHttpServer())
        .put(`/api/v1/products/${tenant2ProductId}`)
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          name: 'Hacked Product Name',
          price: 0.01, // Try to change price to $0.01
        });

      expect(updateResponse.status).toBe(404);

      // Verify product unchanged for Tenant 2
      const verifyResponse = await request(app.getHttpServer())
        .get(`/api/v1/products/${tenant2ProductId}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(verifyResponse.body.data.name).toBe('Tenant 2 Product');
      expect(verifyResponse.body.data.price).toBe(20.0);
    });
  });

  describe('GET /products - Tenant Isolation', () => {
    it('should only return products belonging to authenticated tenant', async () => {
      const tenant1Response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${tenant1Token}`);

      const tenant2Response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(tenant1Response.status).toBe(200);
      expect(tenant2Response.status).toBe(200);

      // Tenant 1 should only see their products
      const tenant1Products = tenant1Response.body.data;
      tenant1Products.forEach(product => {
        expect(product.tenantId).toBe(tenant1Id);
      });

      // Tenant 2 should only see their products
      const tenant2Products = tenant2Response.body.data;
      tenant2Products.forEach(product => {
        expect(product.tenantId).toBe(tenant2Id);
      });

      // No overlap between tenants
      const tenant1Ids = tenant1Products.map(p => p._id);
      const tenant2Ids = tenant2Products.map(p => p._id);

      tenant1Ids.forEach(id => {
        expect(tenant2Ids).not.toContain(id);
      });
    });
  });

  describe('POST /orders - Cross-Tenant Product Access', () => {
    it('should prevent creating order with another tenants products', async () => {
      // Tenant 1 tries to create order with Tenant 2's product
      const orderResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          customerId: tenant1CustomerId, // Own customer
          items: [
            {
              productId: tenant2ProductId, // ❌ Another tenant's product!
              quantity: 10,
              price: 20.0,
            },
          ],
          paymentMethod: 'cash',
        });

      // Should fail (product not found for this tenant)
      expect(orderResponse.status).toBeGreaterThanOrEqual(400);
    });

    it('should prevent creating order with another tenants customer', async () => {
      const orderResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          customerId: tenant2CustomerId, // ❌ Another tenant's customer!
          items: [
            {
              productId: tenant1ProductId, // Own product
              quantity: 5,
              price: 10.0,
            },
          ],
          paymentMethod: 'cash',
        });

      expect(orderResponse.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('DELETE /events/:id - Cross-Tenant Protection', () => {
    it('should prevent tenant from deleting another tenants event', async () => {
      // Tenant 1 creates an event
      const event1Response = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          title: 'Tenant 1 Event',
          start: new Date(),
          end: new Date(Date.now() + 3600000),
        });

      const event1Id = event1Response.body.data._id;

      // Tenant 2 tries to delete Tenant 1's event
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/events/${event1Id}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(deleteResponse.status).toBe(404);

      // Verify event still exists for Tenant 1
      const verifyResponse = await request(app.getHttpServer())
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${tenant1Token}`);

      const events = verifyResponse.body.data;
      const eventExists = events.some(e => e._id === event1Id);
      expect(eventExists).toBe(true);
    });
  });

  describe('Bulk Operations - Cross-Tenant Protection', () => {
    it('should not allow bulk delete across tenants', async () => {
      // Try to delete multiple products including other tenant's products
      const deleteResponse = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-delete')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          productIds: [tenant1ProductId, tenant2ProductId], // Mix of own and other's
        });

      // Should either:
      // 1. Return 404 (endpoint doesn't exist)
      // 2. Only delete tenant's own products
      // 3. Return error for invalid product IDs

      if (deleteResponse.status === 200) {
        // If successful, verify Tenant 2's product still exists
        const verifyResponse = await request(app.getHttpServer())
          .get(`/api/v1/products/${tenant2ProductId}`)
          .set('Authorization', `Bearer ${tenant2Token}`);

        expect(verifyResponse.status).toBe(200);
      }
    });
  });

  describe('Unauthenticated Access', () => {
    it('should block all DELETE operations without authentication', async () => {
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/products/${tenant1ProductId}`);
      // No Authorization header

      expect(deleteResponse.status).toBe(401);
    });

    it('should block all GET operations without authentication', async () => {
      const getResponse = await request(app.getHttpServer()).get('/api/v1/products');

      expect(getResponse.status).toBe(401);
    });
  });

  describe('Invalid Token Attacks', () => {
    it('should reject requests with invalid JWT', async () => {
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/products/${tenant1ProductId}`)
        .set('Authorization', 'Bearer invalid.token.here');

      expect(deleteResponse.status).toBe(401);
    });

    it('should reject requests with expired JWT', async () => {
      // Expired token (exp claim in the past)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.invalid';

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/products/${tenant1ProductId}`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(deleteResponse.status).toBe(401);
    });
  });
});
