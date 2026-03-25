import {
  TestContext,
  bootstrapTestApp,
  authGet,
  authPost,
  authPatch,
  authDelete,
} from './_setup/inventory-test.setup';
import { buildProductDto, buildAlertRuleDto } from './_setup/test-data.factory';

describe('Inventory Alerts E2E', () => {
  let ctx: TestContext;
  let productId: string;
  let productId2: string;
  let alertRuleId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();

    // Create products for alert tests
    const dto = buildProductDto({ name: 'Producto Alertas Test' });
    const res = await authPost(ctx, '/products', dto).expect(201);
    productId = (res.body.data || res.body)._id;

    const dto2 = buildProductDto({ name: 'Producto Alertas Test 2' });
    const res2 = await authPost(ctx, '/products', dto2).expect(201);
    productId2 = (res2.body.data || res2.body)._id;
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── Alert Rules CRUD ──────────────────────────────────────

  describe('Alert Rules CRUD', () => {
    it('should create an alert rule (low_stock)', async () => {
      const dto = buildAlertRuleDto({
        productId,
        minQuantity: 15,
      });
      const res = await authPost(ctx, '/inventory-alerts', dto).expect(201);
      alertRuleId = (res.body.data || res.body)._id;
      expect(alertRuleId).toBeDefined();
    });

    it('should create an alert rule (second product)', async () => {
      const dto = buildAlertRuleDto({
        productId: productId2,
        minQuantity: 5,
      });
      const res = await authPost(ctx, '/inventory-alerts', dto).expect(201);
      expect((res.body.data || res.body)._id).toBeDefined();
    });

    it('should list alert rules', async () => {
      const res = await authGet(ctx, '/inventory-alerts').expect(200);
      const rules = res.body.data || res.body;
      const items = Array.isArray(rules) ? rules : rules.items || [];
      expect(items.length).toBeGreaterThanOrEqual(2);
    });

    it('should update alert rule', async () => {
      const res = await authPatch(ctx, `/inventory-alerts/${alertRuleId}`, {
        minQuantity: 20,
        isActive: true,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('should delete alert rule', async () => {
      // Create a third product for delete test
      const prodDto = buildProductDto({ name: 'Producto Delete Alert' });
      const prodRes = await authPost(ctx, '/products', prodDto).expect(201);
      const prodId = (prodRes.body.data || prodRes.body)._id;

      // Create alert to delete
      const dto = buildAlertRuleDto({ productId: prodId, minQuantity: 500 });
      const createRes = await authPost(ctx, '/inventory-alerts', dto).expect(201);
      const deleteId = (createRes.body.data || createRes.body)._id;
      await authDelete(ctx, `/inventory-alerts/${deleteId}`).expect(200);
    });
  });
});
