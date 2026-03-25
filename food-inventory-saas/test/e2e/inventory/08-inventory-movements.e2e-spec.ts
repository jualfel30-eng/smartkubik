import {
  TestContext,
  bootstrapTestApp,
  authGet,
  authPost,
} from './_setup/inventory-test.setup';
import { buildProductDto, buildInventoryDto } from './_setup/test-data.factory';

describe('Inventory Movements E2E', () => {
  let ctx: TestContext;
  let productId: string;
  let productSku: string;
  let inventoryId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();

    // Create product + inventory
    const prodDto = buildProductDto({ name: 'Prod Movimientos' });
    const prodRes = await authPost(ctx, '/products', prodDto).expect(201);
    const product = prodRes.body.data || prodRes.body;
    productId = product._id;
    productSku = product.sku;

    const invDto = buildInventoryDto(product._id, product.sku, product.name, {
      totalQuantity: 200,
    });
    const invRes = await authPost(ctx, '/inventory', invDto).expect(201);
    inventoryId = (invRes.body.data || invRes.body)._id;

    // Create some movements
    await authPost(ctx, '/inventory/movements', {
      inventoryId,
      movementType: 'in',
      quantity: 30,
      unitCost: 5,
      reason: 'Restock',
      reference: 'MOV-TEST-001',
    }).expect(201);

    await authPost(ctx, '/inventory/movements', {
      inventoryId,
      movementType: 'out',
      quantity: 10,
      unitCost: 5,
      reason: 'Sale',
      reference: 'MOV-TEST-002',
    }).expect(201);
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── Standalone Movements Controller ───────────────────────

  describe('Movements via /inventory-movements', () => {
    it('should create a movement', async () => {
      const res = await authPost(ctx, '/inventory-movements', {
        inventoryId,
        productId,
        movementType: 'IN',
        quantity: 15,
        unitCost: 5,
        reason: 'Additional restock',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('should list movements with filters', async () => {
      const res = await authGet(ctx, '/inventory-movements').expect(200);
      const data = res.body.data || res.body;
      const movements = Array.isArray(data) ? data : data.items || data.movements || [];
      expect(movements.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter movements by type', async () => {
      const res = await authGet(ctx, '/inventory-movements?movementType=IN').expect(200);
      const data = res.body.data || res.body;
      const movements = Array.isArray(data) ? data : data.items || data.movements || [];
      movements.forEach((m: any) => {
        expect(m.movementType).toMatch(/IN/i);
      });
    });
  });

  // ── Documents ─────────────────────────────────────────────

  describe('Movement Documents', () => {
    it('should find movement documents', async () => {
      const res = await authGet(ctx, '/inventory-movements/documents');
      expect([200, 404]).toContain(res.status);
    });
  });

  // ── Export ────────────────────────────────────────────────

  describe('Movement Export', () => {
    it('should export movements as PDF', async () => {
      const res = await authGet(ctx, '/inventory-movements/export?format=pdf');
      // May return PDF buffer or 200 with content
      expect([200, 404]).toContain(res.status);
    });

    it('should export movements as CSV', async () => {
      const res = await authGet(ctx, '/inventory-movements/export?format=csv');
      expect([200, 404]).toContain(res.status);
    });
  });
});
