import {
  TestContext,
  bootstrapTestApp,
  authGet,
  authPost,
  authPatch,
} from './_setup/inventory-test.setup';
import { buildProductDto } from './_setup/test-data.factory';

describe('Supplies E2E', () => {
  let ctx: TestContext;
  let mainProductId: string;
  let supplyProductId: string;
  let configId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();

    // Create main product
    const mainDto = buildProductDto({ name: 'Main Product (Supplies)' });
    const mainRes = await authPost(ctx, '/products', mainDto).expect(201);
    mainProductId = (mainRes.body.data || mainRes.body)._id;

    // Create supply product
    const supplyDto = buildProductDto({
      name: 'Bolsas de Empaque (Supply)',
      productType: 'supply',
    });
    const supplyRes = await authPost(ctx, '/products', supplyDto).expect(201);
    supplyProductId = (supplyRes.body.data || supplyRes.body)._id;
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── Supply Configs ────────────────────────────────────────

  describe('Supply Configs', () => {
    it('should create supply config', async () => {
      const res = await authPost(ctx, '/supplies/configs', {
        productId: mainProductId,
        supplyId: supplyProductId,
        quantityRequired: 1,
        unit: 'unidad',
        costPerUnit: 0.2,
      });
      expect([200, 201]).toContain(res.status);
      configId = (res.body.data || res.body)._id;
    });

    it('should list supply configs', async () => {
      const res = await authGet(ctx, '/supplies/configs').expect(200);
      expect(res.body).toBeDefined();
    });

    it('should get config by product', async () => {
      const res = await authGet(
        ctx,
        `/supplies/configs/product/${mainProductId}`,
      );
      expect([200, 404]).toContain(res.status);
    });

    it('should update supply config', async () => {
      if (!configId) return;
      const res = await authPatch(ctx, `/supplies/configs/${configId}`, {
        quantityRequired: 2,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  // ── Supply Consumption ────────────────────────────────────

  describe('Supply Consumption', () => {
    it('should log supply consumption', async () => {
      const res = await authPost(ctx, '/supplies/consumption', {
        supplyId: supplyProductId,
        productId: mainProductId,
        quantityConsumed: 5,
        unit: 'unidad',
        department: 'Empaque',
        notes: 'Consumo diario',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('should get consumption logs for supply', async () => {
      const res = await authGet(
        ctx,
        `/supplies/consumption/${supplyProductId}`,
      );
      expect([200, 404]).toContain(res.status);
    });
  });

  // ── Supply Reports ────────────────────────────────────────

  describe('Supply Reports', () => {
    it('should get report by department', async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const res = await authGet(
        ctx,
        `/supplies/reports/by-department?startDate=${thirtyDaysAgo.toISOString()}&endDate=${now.toISOString()}`,
      );
      expect([200, 404]).toContain(res.status);
    });

    it('should get report by supply', async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const res = await authGet(
        ctx,
        `/supplies/reports/by-supply?startDate=${thirtyDaysAgo.toISOString()}&endDate=${now.toISOString()}`,
      );
      expect([200, 404]).toContain(res.status);
    });
  });
});
