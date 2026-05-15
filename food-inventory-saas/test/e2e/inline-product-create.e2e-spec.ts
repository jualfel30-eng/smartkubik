import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request = require("supertest");
import { AppModule } from "../../src/app.module";
import { Connection, Types } from "mongoose";
import { getConnectionToken } from "@nestjs/mongoose";
import { configureApp } from "../../src/app.setup";

jest.setTimeout(180000);

/**
 * E2E coverage for the "inline product creation" payload shape used by the
 * unified Compras flow (popup inside CompraCreateDialog). The popup builds the
 * full CreateProductDto in the frontend; this test pins the contract so a
 * future DTO tweak that breaks the popup payload is caught here.
 *
 * Mirrors the payload built by `buildInlineProductPayload(popupState, verticalConfig)`
 * documented in docs/discovery/unified-purchase-product-creation.md
 */
describe("Inline Product Creation (Unified Compras Flow) E2E", () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let tenantATokens: { token: string; tenantId: string };
  let tenantBTokens: { token: string; tenantId: string };
  const createdSuffix = `inline-${Date.now()}`;

  /**
   * The popup's eight visible fields, plus the frontend-injected defaults that
   * CreateProductDto requires (see discovery doc §Fields NOT in the popup).
   */
  function buildPopupPayload(overrides: Record<string, any> = {}) {
    const name = overrides.name ?? "Aceite Oliva 2L";
    const baseUnit = overrides.baseUnit ?? "unidad";
    const sellingPrice = overrides.sellingPrice ?? 12.5;
    return {
      // 8 popup fields
      name,
      brand: overrides.brand ?? "MarcaTest",
      category: overrides.category ?? ["Sin clasificar"],
      subcategory: overrides.subcategory ?? ["General"],
      sku: overrides.sku, // undefined when blank — backend auto-generates
      // popup also captures barcode for the primary variant (see below)
      // and `unitOfMeasure` is the popup's "Unidad base"
      unitOfMeasure: baseUnit,

      // Frontend-injected defaults (popup never asks for these)
      taxCategory: "general",
      isPerishable: overrides.isPerishable ?? false, // smart heuristic resolves to false for non-food verticals
      pricingRules: {
        cashDiscount: 0,
        cardSurcharge: 0,
        minimumMargin: 0.2,
        maximumDiscount: 0.5,
        bulkDiscountEnabled: false,
        bulkDiscountRules: [],
        wholesaleEnabled: false,
        wholesaleMinQuantity: 1,
      },
      inventoryConfig: {
        minimumStock: 10,
        maximumStock: 100,
        reorderPoint: 20,
        reorderQuantity: 50,
        trackLots: true,
        trackExpiration: true,
        fefoEnabled: true,
      },
      // Single derived variant — basePrice from popup's "Precio de venta",
      // costPrice 0 because the real cost is carried by the PO line item.
      variants: [
        {
          name,
          unit: baseUnit,
          unitSize: 1,
          basePrice: Number(sellingPrice),
          costPrice: 0,
          barcode: overrides.barcode, // undefined when blank
        },
      ],
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await configureApp(app, {
      includeSwagger: false,
      runSeeder: false,
      setGlobalPrefix: true,
    });
    await app.init();

    mongoConnection = moduleFixture.get<Connection>(getConnectionToken());

    tenantATokens = await registerTenant("A");
    tenantBTokens = await registerTenant("B");
  });

  afterAll(async () => {
    if (mongoConnection) {
      const tenantObjectIds = [tenantATokens?.tenantId, tenantBTokens?.tenantId]
        .filter(Boolean)
        .map((id) => new Types.ObjectId(id));
      if (tenantObjectIds.length > 0) {
        await mongoConnection
          .collection("users")
          .deleteMany({ email: { $regex: new RegExp(`inline-tenant.*${createdSuffix}@`) } });
        await mongoConnection
          .collection("tenants")
          .deleteMany({ _id: { $in: tenantObjectIds } });
        await mongoConnection
          .collection("products")
          .deleteMany({ tenantId: { $in: tenantObjectIds } });
      }
    }
    if (app) {
      await app.close();
    }
  });

  async function registerTenant(label: string) {
    const email = `inline-tenant${label}-${createdSuffix}@example.com`;
    const response = await request(app.getHttpServer())
      .post("/api/v1/onboarding/register")
      .send({
        email,
        password: "Test1234!",
        firstName: "Inline",
        lastName: label,
        businessName: `Inline Tenant ${label}`,
        businessType: "restaurant",
        subscriptionPlan: "Trial",
        numberOfUsers: 1,
      });

    if (response.status !== 201) {
      throw new Error(
        `Could not register tenant ${label}: ${JSON.stringify(response.body)}`,
      );
    }

    const tenantId = response.body.tenant.id;
    await mongoConnection
      .collection("tenants")
      .updateOne(
        { _id: new Types.ObjectId(tenantId) },
        { $set: { isConfirmed: true } },
      );

    return { token: response.body.accessToken, tenantId };
  }

  describe("Happy path — popup payload accepted by POST /products", () => {
    it("creates a product with the minimum popup payload (blank SKU + blank barcode)", async () => {
      const payload = buildPopupPayload();

      const res = await request(app.getHttpServer())
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tenantATokens.token}`)
        .send(payload);

      expect(res.status).toBe(201);
      const product = res.body.data;

      expect(product._id).toBeDefined();
      expect(product.name).toBe(payload.name);
      expect(product.brand).toBe(payload.brand);

      // SKU auto-generated — format: <3 alphanumeric letters of tenant name>-<NNNN>
      expect(product.sku).toMatch(/^[A-Z0-9]{3}-\d{4}$/);

      // Schema defaults applied because popup didn't send them
      expect(product.unitOfMeasure ?? "unidad").toBe(payload.unitOfMeasure);
      expect(product.ivaRate).toBe(16); // schema default from cb2bff762

      // Primary variant carries the popup's selling price
      expect(Array.isArray(product.variants)).toBe(true);
      expect(product.variants.length).toBe(1);
      expect(product.variants[0].basePrice).toBe(payload.variants[0].basePrice);
    });

    it("accepts an explicit SKU when the popup user fills the optional field", async () => {
      const explicitSku = `INLINE-${createdSuffix}-EXPLICIT`;
      const payload = buildPopupPayload({ sku: explicitSku, name: "Producto SKU explicito" });

      const res = await request(app.getHttpServer())
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tenantATokens.token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.sku).toBe(explicitSku);
    });
  });

  describe("Ownership — tenant isolation under the unified flow", () => {
    it("tenant B cannot read tenant A's popup-created product", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tenantATokens.token}`)
        .send(buildPopupPayload({ name: "Visible solo a tenant A" }));
      expect(created.status).toBe(201);
      const productId = created.body.data._id;

      const tenantBRead = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${tenantBTokens.token}`);

      expect([403, 404]).toContain(tenantBRead.status);
    });

    it("tenant B cannot delete tenant A's popup-created product", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tenantATokens.token}`)
        .send(buildPopupPayload({ name: "Resistente a delete cruzado" }));
      expect(created.status).toBe(201);
      const productId = created.body.data._id;

      const tenantBDelete = await request(app.getHttpServer())
        .delete(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${tenantBTokens.token}`);

      expect([403, 404]).toContain(tenantBDelete.status);
    });
  });

  describe("SKU autogen — no collision under back-to-back popup creates", () => {
    // Popup UX is blocking: only one create can fire from a single browser at a
    // time. We assert SEQUENTIAL uniqueness — the realistic case. Parallel
    // creates across multiple users could TOCTOU on `generateSku`'s retry loop;
    // see discovery doc for the known limitation.
    it("creates two sequential products without SKU collision", async () => {
      const a = await request(app.getHttpServer())
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tenantATokens.token}`)
        .send(buildPopupPayload({ name: "Sequential A" }));
      expect(a.status).toBe(201);

      const b = await request(app.getHttpServer())
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tenantATokens.token}`)
        .send(buildPopupPayload({ name: "Sequential B" }));
      expect(b.status).toBe(201);

      expect(a.body.data.sku).not.toBe(b.body.data.sku);
      expect(a.body.data.sku).toMatch(/^[A-Z0-9]{3}-\d{4}$/);
      expect(b.body.data.sku).toMatch(/^[A-Z0-9]{3}-\d{4}$/);
    });
  });

  describe("Usage counter — tenant.usage.currentProducts increments", () => {
    it("increments currentProducts by exactly 1 per popup create", async () => {
      const tenantBefore = await mongoConnection
        .collection("tenants")
        .findOne({ _id: new Types.ObjectId(tenantATokens.tenantId) });
      const before = tenantBefore?.usage?.currentProducts ?? 0;

      const res = await request(app.getHttpServer())
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tenantATokens.token}`)
        .send(buildPopupPayload({ name: "Cuenta usage" }));
      expect(res.status).toBe(201);

      const tenantAfter = await mongoConnection
        .collection("tenants")
        .findOne({ _id: new Types.ObjectId(tenantATokens.tenantId) });
      const after = tenantAfter?.usage?.currentProducts ?? 0;

      expect(after).toBe(before + 1);
    });
  });

  describe("Validation — popup payload missing a required field is rejected", () => {
    it("rejects with 400 when brand is empty (popup enforces this client-side too)", async () => {
      const payload = buildPopupPayload({ brand: "" });

      const res = await request(app.getHttpServer())
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tenantATokens.token}`)
        .send(payload);

      expect(res.status).toBe(400);
    });

    it("rejects with 400 when taxCategory is missing (popup always sends 'general')", async () => {
      const payload = buildPopupPayload();
      delete (payload as any).taxCategory;

      const res = await request(app.getHttpServer())
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tenantATokens.token}`)
        .send(payload);

      expect(res.status).toBe(400);
    });
  });
});
