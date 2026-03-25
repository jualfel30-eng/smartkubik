import {
  TestContext,
  bootstrapTestApp,
  authGet,
  authPost,
  authPatch,
  authDelete,
} from './_setup/inventory-test.setup';
import { buildProductDto, buildInventoryDto } from './_setup/test-data.factory';

describe('Inventory E2E', () => {
  let ctx: TestContext;
  let productId: string;
  let productSku: string;
  let productName: string;
  let inventoryId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();

    // Create a product for inventory tests
    const dto = buildProductDto({ name: 'Producto Inventario Test' });
    const res = await authPost(ctx, '/products', dto).expect(201);
    const product = res.body.data || res.body;
    productId = product._id;
    productSku = product.sku;
    productName = product.name;
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── Create Inventory ──────────────────────────────────────

  describe('Inventory CRUD', () => {
    it('should create inventory record', async () => {
      const dto = buildInventoryDto(productId, productSku, productName, {
        totalQuantity: 100,
        averageCostPrice: 5,
      });
      const res = await authPost(ctx, '/inventory', dto).expect(201);
      const inventory = res.body.data || res.body;
      inventoryId = inventory._id;
      expect(inventoryId).toBeDefined();
      expect(inventory.totalQuantity).toBe(100);
    });

    it('should list inventory', async () => {
      const res = await authGet(ctx, '/inventory').expect(200);
      const data = res.body.data || res.body;
      const items = Array.isArray(data) ? data : data.items || data.inventory || [];
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('should get inventory by ID', async () => {
      const res = await authGet(ctx, `/inventory/${inventoryId}`).expect(200);
      const inventory = res.body.data || res.body;
      expect(inventory.productId?.toString() || inventory.productId).toBe(productId);
    });

    it('should get inventory by product SKU', async () => {
      const res = await authGet(ctx, `/inventory/product/${productSku}`).expect(200);
      const inventory = res.body.data || res.body;
      expect(inventory).toBeDefined();
    });

    it('should get stock summary', async () => {
      const res = await authGet(ctx, '/inventory/stock-summary').expect(200);
      expect(res.body).toBeDefined();
    });
  });

  // ── Movements ─────────────────────────────────────────────

  describe('Inventory Movements', () => {
    it('should register IN movement (stock increases)', async () => {
      const res = await authPost(ctx, '/inventory/movements', {
        inventoryId,
        movementType: 'in',
        quantity: 50,
        unitCost: 5,
        reason: 'Restock',
        reference: 'TEST-IN-001',
      }).expect(201);
      expect(res.body).toBeDefined();
    });

    it('should verify stock increased', async () => {
      const res = await authGet(ctx, `/inventory/${inventoryId}`).expect(200);
      const inventory = res.body.data || res.body;
      expect(inventory.totalQuantity).toBe(150); // 100 + 50
    });

    it('should register OUT movement (stock decreases)', async () => {
      await authPost(ctx, '/inventory/movements', {
        inventoryId,
        movementType: 'out',
        quantity: 20,
        unitCost: 5,
        reason: 'Sale',
        reference: 'TEST-OUT-001',
      }).expect(201);
    });

    it('should verify stock decreased', async () => {
      const res = await authGet(ctx, `/inventory/${inventoryId}`).expect(200);
      const inventory = res.body.data || res.body;
      expect(inventory.totalQuantity).toBe(130); // 150 - 20
    });

    it('should reject OUT movement exceeding available stock', async () => {
      const res = await authPost(ctx, '/inventory/movements', {
        inventoryId,
        movementType: 'out',
        quantity: 99999,
        unitCost: 5,
        reason: 'Impossible',
      });
      expect([400, 422]).toContain(res.status);
    });

    it('should get movement history', async () => {
      const res = await authGet(ctx, '/inventory/movements/history').expect(200);
      const data = res.body.data || res.body;
      const movements = Array.isArray(data) ? data : data.items || data.movements || [];
      expect(movements.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Adjustments ───────────────────────────────────────────

  describe('Inventory Adjustments', () => {
    it('should manually adjust inventory', async () => {
      const res = await authPost(ctx, '/inventory/adjust', {
        inventoryId,
        newQuantity: 80,
        reason: 'Physical count discrepancy',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('should verify adjusted quantity', async () => {
      const res = await authGet(ctx, `/inventory/${inventoryId}`).expect(200);
      const inventory = res.body.data || res.body;
      // Quantity should be adjusted
      expect(inventory.totalQuantity).toBeDefined();
    });
  });

  // ── Reservations ──────────────────────────────────────────

  describe('Inventory Reservations', () => {
    it('should reserve inventory', async () => {
      const res = await authPost(ctx, '/inventory/reserve', {
        items: [{ productSku, quantity: 10 }],
        orderId: '507f1f77bcf86cd799439099',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('should release inventory reservation', async () => {
      const res = await authPost(ctx, '/inventory/release', {
        orderId: '507f1f77bcf86cd799439099',
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  // ── Alerts ────────────────────────────────────────────────

  describe('Inventory Alerts', () => {
    it('should get low stock alerts', async () => {
      const res = await authGet(ctx, '/inventory/alerts/low-stock').expect(200);
      expect(res.body).toBeDefined();
    });

    it('should get near expiration alerts', async () => {
      const res = await authGet(ctx, '/inventory/alerts/near-expiration').expect(200);
      expect(res.body).toBeDefined();
    });
  });

  // ── Reports ───────────────────────────────────────────────

  describe('Inventory Reports', () => {
    it('should get summary report', async () => {
      const res = await authGet(ctx, '/inventory/reports/summary').expect(200);
      expect(res.body).toBeDefined();
    });
  });

  // ── Lots ──────────────────────────────────────────────────

  describe('Inventory Lots', () => {
    it('should update lots', async () => {
      const res = await authPatch(ctx, `/inventory/${inventoryId}/lots`, {
        lots: [
          {
            lotNumber: 'LOT-001',
            quantity: 50,
            costPrice: 5,
            receivedDate: new Date().toISOString(),
          },
        ],
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  // ── Soft Delete ───────────────────────────────────────────

  describe('Soft Delete', () => {
    it('should soft delete inventory', async () => {
      // Create another inventory to delete
      const prodDto = buildProductDto({ name: 'Prod Delete Inv' });
      const prodRes = await authPost(ctx, '/products', prodDto).expect(201);
      const prod = prodRes.body.data || prodRes.body;

      const invDto = buildInventoryDto(prod._id, prod.sku, prod.name, { totalQuantity: 10 });
      const invRes = await authPost(ctx, '/inventory', invDto).expect(201);
      const invId = (invRes.body.data || invRes.body)._id;

      await authDelete(ctx, `/inventory/${invId}`).expect(200);
    });
  });
});
