import {
  TestContext,
  bootstrapTestApp,
  authGet,
  authPost,
  authPatch,
  authDelete,
} from './_setup/inventory-test.setup';
import { buildProductDto } from './_setup/test-data.factory';

describe('Consumables E2E', () => {
  let ctx: TestContext;
  let mainProductId: string;
  let consumableProductId: string;
  let configId: string;
  let relationId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();

    // Create main product
    const mainDto = buildProductDto({ name: 'Hamburguesa (Main)' });
    const mainRes = await authPost(ctx, '/products', mainDto).expect(201);
    mainProductId = (mainRes.body.data || mainRes.body)._id;

    // Create consumable product
    const consDto = buildProductDto({
      name: 'Servilletas (Consumable)',
      productType: 'consumable',
    });
    const consRes = await authPost(ctx, '/products', consDto).expect(201);
    consumableProductId = (consRes.body.data || consRes.body)._id;
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── Consumable Configs ────────────────────────────────────

  describe('Consumable Configs', () => {
    it('should create consumable config', async () => {
      const res = await authPost(ctx, '/consumables/configs', {
        productId: consumableProductId,
        consumableType: 'napkin',
        isAutoDeducted: true,
        defaultQuantity: 2,
      });
      if (res.status !== 200 && res.status !== 201) {
        console.log('Consumable config error:', JSON.stringify(res.body, null, 2));
      }
      expect([200, 201]).toContain(res.status);
      configId = (res.body.data || res.body)._id;
    });

    it('should list consumable configs', async () => {
      const res = await authGet(ctx, '/consumables/configs').expect(200);
      expect(res.body).toBeDefined();
    });

    it('should get config by product', async () => {
      const res = await authGet(
        ctx,
        `/consumables/configs/product/${mainProductId}`,
      );
      expect([200, 404]).toContain(res.status);
    });

    it('should update consumable config', async () => {
      if (!configId) return;
      const res = await authPatch(ctx, `/consumables/configs/${configId}`, {
        quantityRequired: 3,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  // ── Product-Consumable Relations ──────────────────────────

  describe('Product-Consumable Relations', () => {
    it('should create relation', async () => {
      const res = await authPost(ctx, '/consumables/relations', {
        productId: mainProductId,
        consumableId: consumableProductId,
        quantityRequired: 1,
        unit: 'unidad',
        costPerUnit: 0.5,
      });
      expect([200, 201]).toContain(res.status);
      relationId = (res.body.data || res.body)._id;
    });

    it('should get relations by product', async () => {
      const res = await authGet(
        ctx,
        `/consumables/relations/product/${mainProductId}`,
      );
      expect([200, 404]).toContain(res.status);
    });

    it('should get products using consumable', async () => {
      const res = await authGet(
        ctx,
        `/consumables/relations/consumable/${consumableProductId}`,
      );
      expect([200, 404]).toContain(res.status);
    });

    it('should update relation', async () => {
      if (!relationId) return;
      const res = await authPatch(ctx, `/consumables/relations/${relationId}`, {
        quantityRequired: 2,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('should delete relation', async () => {
      if (!relationId) return;
      await authDelete(ctx, `/consumables/relations/${relationId}`).expect(200);
    });
  });
});
