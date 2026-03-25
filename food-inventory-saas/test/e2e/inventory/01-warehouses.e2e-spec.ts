import {
  TestContext,
  bootstrapTestApp,
  authGet,
  authPost,
  authPatch,
  authDelete,
  unauthGet,
} from './_setup/inventory-test.setup';
import { buildWarehouseDto } from './_setup/test-data.factory';

describe('Warehouses E2E', () => {
  let ctx: TestContext;
  let warehouseId: string;
  let warehouseId2: string;
  let binLocationId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── CRUD ──────────────────────────────────────────────────

  describe('Warehouse CRUD', () => {
    it('should create a warehouse', async () => {
      const dto = buildWarehouseDto({ name: 'Almacén Principal', code: 'AP-01' });
      const res = await authPost(ctx, '/warehouses', dto).expect(201);
      expect(res.body.data || res.body).toHaveProperty('_id');
      warehouseId = (res.body.data || res.body)._id;
    });

    it('should create a second warehouse', async () => {
      const dto = buildWarehouseDto({ name: 'Almacén Secundario', code: 'AS-02' });
      const res = await authPost(ctx, '/warehouses', dto).expect(201);
      warehouseId2 = (res.body.data || res.body)._id;
    });

    it('should reject duplicate warehouse code', async () => {
      const dto = buildWarehouseDto({ name: 'Duplicado', code: 'AP-01' });
      await authPost(ctx, '/warehouses', dto).expect((res) => {
        expect([400, 409, 422]).toContain(res.status);
      });
    });

    it('should list warehouses', async () => {
      const res = await authGet(ctx, '/warehouses').expect(200);
      const warehouses = res.body.data || res.body;
      expect(Array.isArray(warehouses)).toBe(true);
      expect(warehouses.length).toBeGreaterThanOrEqual(2);
    });

    it('should update a warehouse', async () => {
      const res = await authPatch(ctx, `/warehouses/${warehouseId}`, {
        name: 'Almacén Principal Actualizado',
      }).expect(200);
      const updated = res.body.data || res.body;
      expect(updated.name).toBe('Almacén Principal Actualizado');
    });

    it('should delete a warehouse', async () => {
      // Create one to delete
      const dto = buildWarehouseDto({ name: 'Para Borrar', code: 'DEL-01' });
      const createRes = await authPost(ctx, '/warehouses', dto).expect(201);
      const deleteId = (createRes.body.data || createRes.body)._id;

      await authDelete(ctx, `/warehouses/${deleteId}`).expect(200);
    });
  });

  // ── Bin Locations ─────────────────────────────────────────

  describe('Bin Locations CRUD', () => {
    it('should create a bin location', async () => {
      const res = await authPost(ctx, '/bin-locations', {
        warehouseId,
        code: 'A-01-01',
        zone: 'A',
        aisle: '01',
        shelf: '01',
        bin: '01',
        locationType: 'picking',
      }).expect(201);
      binLocationId = (res.body.data || res.body)._id;
      expect(binLocationId).toBeDefined();
    });

    it('should list bin locations for warehouse', async () => {
      const res = await authGet(
        ctx,
        `/bin-locations?warehouseId=${warehouseId}`,
      ).expect(200);
      const bins = res.body.data || res.body;
      expect(Array.isArray(bins)).toBe(true);
      expect(bins.length).toBeGreaterThanOrEqual(1);
    });

    it('should update a bin location', async () => {
      await authPatch(ctx, `/bin-locations/${binLocationId}`, {
        description: 'Updated bin',
      }).expect(200);
    });

    it('should delete a bin location', async () => {
      await authDelete(ctx, `/bin-locations/${binLocationId}`).expect(200);
    });
  });

  // ── Auth guard ────────────────────────────────────────────

  describe('Auth guard', () => {
    it('should reject unauthenticated request', async () => {
      const res = await unauthGet('/warehouses');
      expect(res.status).toBe(401);
    });
  });
});
