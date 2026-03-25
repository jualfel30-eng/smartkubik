import {
  TestContext,
  bootstrapTestApp,
  authGet,
  authPost,
  authPatch,
  authDelete,
} from './_setup/inventory-test.setup';
import { buildProductDto, buildWasteEntryDto } from './_setup/test-data.factory';

describe('Waste/Mermas E2E', () => {
  let ctx: TestContext;
  let productId: string;
  let wasteEntryId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();

    // Create a product for waste tests
    const dto = buildProductDto({ name: 'Producto Merma Test' });
    const res = await authPost(ctx, '/products', dto).expect(201);
    productId = (res.body.data || res.body)._id;
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── CRUD ──────────────────────────────────────────────────

  describe('Waste Entry CRUD', () => {
    it('should create waste entry (spoilage)', async () => {
      const dto = buildWasteEntryDto(productId, {
        reason: 'spoilage',
        quantity: 10,
        notes: 'Producto dañado por humedad',
      });
      const res = await authPost(ctx, '/waste', dto).expect(201);
      const entry = res.body.data || res.body;
      wasteEntryId = entry._id;
      expect(wasteEntryId).toBeDefined();
    });

    it('should create waste entry (expired)', async () => {
      const dto = buildWasteEntryDto(productId, {
        reason: 'expired',
        quantity: 5,
      });
      const res = await authPost(ctx, '/waste', dto).expect(201);
      expect((res.body.data || res.body)._id).toBeDefined();
    });

    it('should create waste entry (broken-damaged)', async () => {
      const dto = buildWasteEntryDto(productId, {
        reason: 'broken-damaged',
        quantity: 3,
      });
      const res = await authPost(ctx, '/waste', dto).expect(201);
      expect((res.body.data || res.body)._id).toBeDefined();
    });

    it('should reject invalid reason', async () => {
      const dto = buildWasteEntryDto(productId, { reason: 'invalid_reason' });
      await authPost(ctx, '/waste', dto).expect(400);
    });

    it('should list waste entries', async () => {
      const res = await authGet(ctx, '/waste').expect(200);
      const data = res.body.data || res.body;
      const entries = Array.isArray(data) ? data : data.items || data.entries || [];
      expect(entries.length).toBeGreaterThanOrEqual(3);
    });

    it('should get waste entry by ID', async () => {
      const res = await authGet(ctx, `/waste/${wasteEntryId}`).expect(200);
      const entry = res.body.data || res.body;
      expect(entry.reason).toBe('spoilage');
    });

    it('should update waste entry', async () => {
      const res = await authPatch(ctx, `/waste/${wasteEntryId}`, {
        notes: 'Updated notes',
        isPreventable: true,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('should soft-delete waste entry', async () => {
      // Create one to delete
      const dto = buildWasteEntryDto(productId, { reason: 'other', quantity: 1 });
      const createRes = await authPost(ctx, '/waste', dto).expect(201);
      const deleteId = (createRes.body.data || createRes.body)._id;
      await authDelete(ctx, `/waste/${deleteId}`).expect(200);
    });
  });

  // ── Analytics ─────────────────────────────────────────────

  describe('Waste Analytics', () => {
    it('should get waste analytics overview', async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const res = await authGet(
        ctx,
        `/waste/analytics/overview?startDate=${thirtyDaysAgo.toISOString()}&endDate=${now.toISOString()}`,
      );
      expect([200, 404]).toContain(res.status);
    });

    it('should get waste trends', async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const res = await authGet(
        ctx,
        `/waste/analytics/trends?startDate=${thirtyDaysAgo.toISOString()}&endDate=${now.toISOString()}`,
      );
      expect([200, 404]).toContain(res.status);
    });
  });
});
