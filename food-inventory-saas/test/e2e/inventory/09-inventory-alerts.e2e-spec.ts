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
  let alertRuleId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();

    // Create a product for alert tests
    const dto = buildProductDto({ name: 'Producto Alertas Test' });
    const res = await authPost(ctx, '/products', dto).expect(201);
    productId = (res.body.data || res.body)._id;
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── Alert Rules CRUD ──────────────────────────────────────

  describe('Alert Rules CRUD', () => {
    it('should create an alert rule (low_stock)', async () => {
      const dto = buildAlertRuleDto({
        productId,
        alertType: 'low_stock',
        threshold: 15,
      });
      const res = await authPost(ctx, '/inventory-alerts', dto).expect(201);
      alertRuleId = (res.body.data || res.body)._id;
      expect(alertRuleId).toBeDefined();
    });

    it('should create an alert rule (near_expiration)', async () => {
      const dto = buildAlertRuleDto({
        productId,
        alertType: 'near_expiration',
        daysBeforeExpiration: 7,
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
        threshold: 20,
        isActive: true,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('should delete alert rule', async () => {
      // Create one to delete
      const dto = buildAlertRuleDto({ productId, alertType: 'overstock', threshold: 500 });
      const createRes = await authPost(ctx, '/inventory-alerts', dto).expect(201);
      const deleteId = (createRes.body.data || createRes.body)._id;
      await authDelete(ctx, `/inventory-alerts/${deleteId}`).expect(200);
    });
  });
});
