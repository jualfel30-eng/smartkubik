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
  let warehouseCode: string;
  let binLocationId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── CRUD ──────────────────────────────────────────────────

  describe('Warehouse CRUD', () => {
    it('should create a warehouse', async () => {
      const dto = buildWarehouseDto({ name: 'Almacén Principal' }); // Let factory generate unique code
      console.log('Creating warehouse with DTO:', dto);
      const res = await authPost(ctx, '/warehouses', dto);
      if (res.status !== 201) {
        console.log('Warehouse creation failed. Status:', res.status);
        console.log('Response body:', res.body);
      }
      expect(res.status).toBe(201);
      const warehouse = res.body.data || res.body;
      expect(warehouse).toHaveProperty('_id');
      warehouseId = warehouse._id;
      warehouseCode = warehouse.code;
    });

    it('should create a second warehouse', async () => {
      const dto = buildWarehouseDto({ name: 'Almacén Secundario' }); // Let factory generate unique code
      const res = await authPost(ctx, '/warehouses', dto).expect(201);
      warehouseId2 = (res.body.data || res.body)._id;
    });

    it('should reject duplicate warehouse code', async () => {
      // Use the code from the first warehouse we created
      const dto = buildWarehouseDto({ name: 'Duplicado', code: warehouseCode });
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
      const dto = buildWarehouseDto({ name: 'Para Borrar' }); // Let factory generate unique code
      const createRes = await authPost(ctx, '/warehouses', dto).expect(201);
      const deleteId = (createRes.body.data || createRes.body)._id;

      await authDelete(ctx, `/warehouses/${deleteId}`).expect(200);
    });
  });

  // ── Bin Locations ─────────────────────────────────────────

  describe('Bin Locations CRUD', () => {
    it('should create a bin location', async () => {
      const uniqueCode = `A-01-${Date.now().toString().slice(-6)}`; // Generate unique code
      const res = await authPost(ctx, '/bin-locations', {
        warehouseId,
        code: uniqueCode,
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
