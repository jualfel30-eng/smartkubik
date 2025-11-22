import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { Connection, Types } from "mongoose";
import { getConnectionToken } from "@nestjs/mongoose";
import { configureApp } from "../../src/app.setup";

jest.setTimeout(60000);

describe("Ownership Validation E2E Tests", () => {
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
    await configureApp(app, {
      includeSwagger: true,
      runSeeder: false,
      setGlobalPrefix: true,
    });

    await app.init();

    mongoConnection = moduleFixture.get<Connection>(getConnectionToken());

    await setupTenants();
  });

  afterAll(async () => {
    await cleanupTestData();
    if (app) {
      await app.close();
    }
  });

  async function setupTenants() {
    // Create Tenant 1
    const tenant1Response = await request(app.getHttpServer())
      .post("/api/v1/onboarding/register")
      .send({
        email: `tenant1-${Date.now()}@example.com`,
        password: "Test1234!",
        firstName: "Tenant",
        lastName: "One",
        businessName: "Restaurant 1",
        businessType: "restaurant",
        subscriptionPlan: "Trial",
        numberOfUsers: 2,
      });

    if (tenant1Response.status !== 201) {
      console.error("Failed to create tenant 1:", tenant1Response.body);
      throw new Error("Could not set up tenant 1 for E2E test");
    }

    tenant1Token = tenant1Response.body.accessToken;
    tenant1Id = tenant1Response.body.tenant.id;

    // Create Tenant 2
    const tenant2Response = await request(app.getHttpServer())
      .post("/api/v1/onboarding/register")
      .send({
        email: `tenant2-${Date.now()}@example.com`,
        password: "Test1234!",
        firstName: "Tenant",
        lastName: "Two",
        businessName: "Restaurant 2",
        businessType: "restaurant",
        subscriptionPlan: "Trial",
        numberOfUsers: 2,
      });

    if (tenant2Response.status !== 201) {
      console.error("Failed to create tenant 2:", tenant2Response.body);
      throw new Error("Could not set up tenant 2 for E2E test");
    }

    tenant2Token = tenant2Response.body.accessToken;
    tenant2Id = tenant2Response.body.tenant.id;

    // Manually confirm tenants for testing purposes, bypassing the email confirmation flow.
    await mongoConnection.collection("tenants").updateMany(
      {
        _id: {
          $in: [new Types.ObjectId(tenant1Id), new Types.ObjectId(tenant2Id)],
        },
      },
      { $set: { isConfirmed: true } },
    );

    // Create products for each tenant
    const product1Response = await request(app.getHttpServer())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tenant1Token}`)
      .send({
        name: "Tenant 1 Product",
        sku: `SKU1-${Date.now()}`,
        category: "Food",
        subcategory: "Test Subcategory",
        brand: "Test Brand",
        isPerishable: false,
        taxCategory: "standard",
        pricingRules: {
          cashDiscount: 0,
          cardSurcharge: 0,
          minimumMargin: 0.2,
          maximumDiscount: 0.5,
        },
        inventoryConfig: {
          trackLots: false,
          trackExpiration: false,
          minimumStock: 10,
          maximumStock: 100,
          reorderPoint: 20,
          reorderQuantity: 50,
          fefoEnabled: false,
        },
        variants: [
          {
            name: "Default",
            sku: `SKU1-VAR-${Date.now()}`,
            unit: "unit",
            unitSize: 1,
            basePrice: 10.0,
            costPrice: 5.0,
          },
        ],
      });
    expect(product1Response.status).toBe(201);
    tenant1ProductId = product1Response.body.data._id;

    const product2Response = await request(app.getHttpServer())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tenant2Token}`)
      .send({
        name: "Tenant 2 Product",
        sku: `SKU2-${Date.now()}`,
        category: "Food",
        subcategory: "Test Subcategory",
        brand: "Test Brand",
        isPerishable: false,
        taxCategory: "standard",
        pricingRules: {
          cashDiscount: 0,
          cardSurcharge: 0,
          minimumMargin: 0.2,
          maximumDiscount: 0.5,
        },
        inventoryConfig: {
          trackLots: false,
          trackExpiration: false,
          minimumStock: 10,
          maximumStock: 100,
          reorderPoint: 20,
          reorderQuantity: 50,
          fefoEnabled: false,
        },
        variants: [
          {
            name: "Default",
            sku: `SKU2-VAR-${Date.now()}`,
            unit: "unit",
            unitSize: 1,
            basePrice: 20.0,
            costPrice: 10.0,
          },
        ],
      });
    expect(product2Response.status).toBe(201);
    tenant2ProductId = product2Response.body.data._id;

    // Create customers for each tenant
    const customer1Response = await request(app.getHttpServer())
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${tenant1Token}`)
      .send({
        name: "Customer",
        lastName: "One",
        email: `customer1-${Date.now()}@example.com`,
        customerType: "individual",
      });
    expect(customer1Response.status).toBe(201);
    tenant1CustomerId = customer1Response.body._id;

    const customer2Response = await request(app.getHttpServer())
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${tenant2Token}`)
      .send({
        name: "Customer",
        lastName: "Two",
        email: `customer2-${Date.now()}@example.com`,
        customerType: "individual",
      });
    expect(customer2Response.status).toBe(201);
    tenant2CustomerId = customer2Response.body._id;
  }

  async function cleanupTestData() {
    if (mongoConnection) {
      const tenantObjectIds = [tenant1Id, tenant2Id]
        .filter(Boolean)
        .map((id) => new Types.ObjectId(id));
      if (tenantObjectIds.length > 0) {
        await mongoConnection
          .collection("users")
          .deleteMany({ email: { $regex: /tenant[12]-.*@example\.com/ } });
        await mongoConnection
          .collection("tenants")
          .deleteMany({ _id: { $in: tenantObjectIds } });
        await mongoConnection
          .collection("products")
          .deleteMany({ tenantId: { $in: tenantObjectIds } });
        await mongoConnection
          .collection("customers")
          .deleteMany({ tenantId: { $in: tenantObjectIds } });
      }
    }
  }

  describe("DELETE /products/:id - Cross-Tenant Protection", () => {
    it("should allow tenant to delete their own product", async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tenant1Token}`)
        .send({
          name: "Deletable Product",
          sku: `DEL-${Date.now()}`,
          category: "Food",
          subcategory: "Test Subcategory",
          brand: "Test Brand",
          isPerishable: false,
          taxCategory: "standard",
          pricingRules: {
            cashDiscount: 0,
            cardSurcharge: 0,
            minimumMargin: 0.2,
            maximumDiscount: 0.5,
          },
          inventoryConfig: {
            trackLots: false,
            trackExpiration: false,
            minimumStock: 10,
            maximumStock: 100,
            reorderPoint: 20,
            reorderQuantity: 50,
            fefoEnabled: false,
          },
          variants: [
            {
              name: "Default",
              sku: `DEL-VAR-${Date.now()}`,
              unit: "unit",
              unitSize: 1,
              basePrice: 15.0,
              costPrice: 7.0,
            },
          ],
        });
      expect(createResponse.status).toBe(201);
      const productId = createResponse.body.data._id;

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${tenant1Token}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });

    it("should prevent tenant from deleting another tenants product", async () => {
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/products/${tenant2ProductId}`)
        .set("Authorization", `Bearer ${tenant1Token}`);

      expect(deleteResponse.status).toBe(404);
    });
  });
});
