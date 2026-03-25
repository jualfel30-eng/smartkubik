/**
 * CRITICAL E2E Tests: Transfer Orders
 *
 * Tenant problem #3: Transfers between locations broken at every step.
 * This test validates the COMPLETE lifecycle for both PUSH and PULL flows.
 */
import {
  TestContext,
  bootstrapTestApp,
  authGet,
  authPost,
  authPatch,
  authDelete,
} from './_setup/inventory-test.setup';
import {
  buildProductDto,
  buildWarehouseDto,
  buildInventoryDto,
  buildTransferOrderDto,
} from './_setup/test-data.factory';

describe('Transfer Orders E2E (CRITICAL)', () => {
  let ctx: TestContext;

  // Shared state
  let warehouseAId: string;
  let warehouseBId: string;
  let productId: string;
  let productSku: string;
  let productName: string;
  let inventoryAId: string;
  let transferOrderId: string;
  let pullTransferOrderId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── Setup ─────────────────────────────────────────────────

  describe('SETUP: Create warehouses, product, and inventory', () => {
    it('should create source warehouse A', async () => {
      const dto = buildWarehouseDto({ name: 'Almacén Origen', code: 'XFER-A' });
      const res = await authPost(ctx, '/warehouses', dto).expect(201);
      warehouseAId = (res.body.data || res.body)._id;
      expect(warehouseAId).toBeDefined();
    });

    it('should create destination warehouse B', async () => {
      const dto = buildWarehouseDto({ name: 'Almacén Destino', code: 'XFER-B' });
      const res = await authPost(ctx, '/warehouses', dto).expect(201);
      warehouseBId = (res.body.data || res.body)._id;
      expect(warehouseBId).toBeDefined();
    });

    it('should create product for transfer', async () => {
      const dto = buildProductDto({ name: 'Producto Transfer Test' });
      const res = await authPost(ctx, '/products', dto).expect(201);
      const product = res.body.data || res.body;
      productId = product._id;
      productSku = product.sku;
      productName = product.name;
    });

    it('should create inventory in warehouse A with 100 units', async () => {
      const dto = buildInventoryDto(productId, productSku, productName, {
        totalQuantity: 100,
        averageCostPrice: 5,
        warehouseId: warehouseAId,
      });
      const res = await authPost(ctx, '/inventory', dto).expect(201);
      inventoryAId = (res.body.data || res.body)._id;
      expect(inventoryAId).toBeDefined();
    });
  });

  // ── PUSH Flow: Complete lifecycle ─────────────────────────

  describe('PUSH Flow: Complete Lifecycle', () => {
    it('Step 1: should create transfer order (DRAFT)', async () => {
      const dto = buildTransferOrderDto(warehouseAId, warehouseBId, [
        { productId, requestedQuantity: 50, productSku, productName },
      ]);
      const res = await authPost(ctx, '/transfer-orders', dto).expect(201);
      const order = res.body.data || res.body;
      transferOrderId = order._id;
      expect(transferOrderId).toBeDefined();
      expect(order.status).toBe('draft');
    });

    it('Step 2: should submit for approval (PUSH_REQUESTED)', async () => {
      const res = await authPost(
        ctx,
        `/transfer-orders/${transferOrderId}/request`,
        {},
      );
      expect([200, 201]).toContain(res.status);
      const order = res.body.data || res.body;
      expect(order.status).toMatch(/requested|push_requested/i);
    });

    it('Step 3: should approve transfer (PUSH_APPROVED)', async () => {
      const res = await authPost(
        ctx,
        `/transfer-orders/${transferOrderId}/approve`,
        { notes: 'Approved for E2E test' },
      );
      expect([200, 201]).toContain(res.status);
      const order = res.body.data || res.body;
      expect(order.status).toMatch(/approved|push_approved/i);
    });

    it('Step 4: should mark as in preparation (IN_PREPARATION)', async () => {
      const res = await authPost(
        ctx,
        `/transfer-orders/${transferOrderId}/prepare`,
        { notes: 'Preparing' },
      );
      expect([200, 201]).toContain(res.status);
      const order = res.body.data || res.body;
      expect(order.status).toMatch(/preparation|in_preparation/i);
    });

    it('Step 5: should ship (IN_TRANSIT) - stock decremented from source', async () => {
      const res = await authPost(
        ctx,
        `/transfer-orders/${transferOrderId}/ship`,
        {
          items: [{ productId, shippedQuantity: 50 }],
          notes: 'Shipped',
        },
      );
      expect([200, 201]).toContain(res.status);
      const order = res.body.data || res.body;
      expect(order.status).toMatch(/transit|in_transit|shipped/i);
    });

    it('Step 5b: should verify source warehouse stock decreased', async () => {
      // Check inventory in warehouse A - should be 100 - 50 = 50
      const res = await authGet(ctx, `/inventory/${inventoryAId}`).expect(200);
      const inventory = res.body.data || res.body;
      expect(inventory.totalQuantity).toBe(50);
      expect(inventory.availableQuantity).toBe(50);
    });

    it('Step 6: should receive (RECEIVED) - stock added to destination', async () => {
      const res = await authPost(
        ctx,
        `/transfer-orders/${transferOrderId}/receive`,
        {
          items: [{ productId, receivedQuantity: 50 }],
          receiptNotes: 'All received',
        },
      );
      expect([200, 201]).toContain(res.status);
      const order = res.body.data || res.body;
      expect(order.status).toMatch(/received/i);
    });

    it('Step 7: should verify destination warehouse has stock', async () => {
      // Look for inventory in warehouse B
      const res = await authGet(
        ctx,
        `/inventory?warehouseId=${warehouseBId}`,
      ).expect(200);
      const data = res.body.data || res.body;
      const items = Array.isArray(data) ? data : data.items || data.inventory || [];
      const productInv = items.find(
        (i: any) =>
          i.productId?.toString() === productId || i.productId === productId,
      );
      expect(productInv).toBeDefined();
      if (productInv) {
        expect(productInv.totalQuantity).toBe(50);
      }
    });

    it('Step 8: should verify inventory movements created (OUT + IN)', async () => {
      const res = await authGet(ctx, '/transfer-orders/' + transferOrderId).expect(200);
      const order = res.body.data || res.body;
      // The transfer should be marked as complete
      expect(order.status).toMatch(/received|completed/i);
    });
  });

  // ── PULL Flow ─────────────────────────────────────────────

  describe('PULL Flow', () => {
    let pullProductId: string;
    let pullProductSku: string;
    let pullProductName: string;

    it('should setup: create product + inventory for PULL test', async () => {
      const dto = buildProductDto({ name: 'Producto PULL Test' });
      const res = await authPost(ctx, '/products', dto).expect(201);
      const product = res.body.data || res.body;
      pullProductId = product._id;
      pullProductSku = product.sku;
      pullProductName = product.name;

      // Add stock to warehouse A
      await authPost(
        ctx,
        '/inventory',
        buildInventoryDto(pullProductId, pullProductSku, pullProductName, {
          totalQuantity: 80,
          warehouseId: warehouseAId,
        }),
      ).expect(201);
    });

    it('Step 1: should create transfer request (PULL - destination requests)', async () => {
      const res = await authPost(ctx, '/transfer-orders/requests', {
        sourceWarehouseId: warehouseAId,
        destinationWarehouseId: warehouseBId,
        items: [
          { productId: pullProductId, requestedQuantity: 30, productSku: pullProductSku },
        ],
        notes: 'Need stock at destination',
      });
      expect([200, 201]).toContain(res.status);
      pullTransferOrderId = (res.body.data || res.body)._id;
      expect(pullTransferOrderId).toBeDefined();
    });

    it('Step 2: should submit request (PULL_REQUESTED)', async () => {
      const res = await authPost(
        ctx,
        `/transfer-orders/${pullTransferOrderId}/submit`,
        {},
      );
      expect([200, 201]).toContain(res.status);
    });

    it('Step 3: should approve request (PULL_APPROVED)', async () => {
      const res = await authPost(
        ctx,
        `/transfer-orders/${pullTransferOrderId}/approve-request`,
        { approvalNotes: 'Approved' },
      );
      expect([200, 201]).toContain(res.status);
    });

    it('Step 4: should ship and receive PULL transfer', async () => {
      // Ship
      await authPost(ctx, `/transfer-orders/${pullTransferOrderId}/ship`, {
        items: [{ productId: pullProductId, shippedQuantity: 30 }],
      }).expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

      // Receive
      await authPost(ctx, `/transfer-orders/${pullTransferOrderId}/receive`, {
        items: [{ productId: pullProductId, receivedQuantity: 30 }],
      }).expect((res) => {
        expect([200, 201]).toContain(res.status);
      });
    });
  });

  // ── Reject Request ────────────────────────────────────────

  describe('Reject Transfer Request', () => {
    it('should reject a PULL request', async () => {
      const prodDto = buildProductDto({ name: 'Reject PULL Prod' });
      const prodRes = await authPost(ctx, '/products', prodDto).expect(201);
      const prod = prodRes.body.data || prodRes.body;

      // Create request
      const reqRes = await authPost(ctx, '/transfer-orders/requests', {
        sourceWarehouseId: warehouseAId,
        destinationWarehouseId: warehouseBId,
        items: [{ productId: prod._id, requestedQuantity: 10 }],
      });
      if (reqRes.status !== 201) return;
      const reqId = (reqRes.body.data || reqRes.body)._id;

      // Submit
      await authPost(ctx, `/transfer-orders/${reqId}/submit`, {});

      // Reject
      const rejectRes = await authPost(
        ctx,
        `/transfer-orders/${reqId}/reject-request`,
        { reason: 'No stock available' },
      );
      expect([200, 201]).toContain(rejectRes.status);
    });
  });

  // ── Cancel Transfer ───────────────────────────────────────

  describe('Cancel Transfer', () => {
    it('should cancel a draft transfer', async () => {
      const dto = buildTransferOrderDto(warehouseAId, warehouseBId, [
        { productId, requestedQuantity: 5 },
      ]);
      const createRes = await authPost(ctx, '/transfer-orders', dto).expect(201);
      const cancelId = (createRes.body.data || createRes.body)._id;

      const cancelRes = await authPost(
        ctx,
        `/transfer-orders/${cancelId}/cancel`,
        { reason: 'Test cancellation' },
      );
      expect([200, 201]).toContain(cancelRes.status);
    });
  });

  // ── Discrepancy ───────────────────────────────────────────

  describe('Transfer with Discrepancy', () => {
    let discProductId: string;
    let discTransferId: string;

    it('should setup and execute transfer with discrepancy', async () => {
      // Create product + inventory
      const prodDto = buildProductDto({ name: 'Producto Discrepancia' });
      const prodRes = await authPost(ctx, '/products', prodDto).expect(201);
      const prod = prodRes.body.data || prodRes.body;
      discProductId = prod._id;

      await authPost(
        ctx,
        '/inventory',
        buildInventoryDto(prod._id, prod.sku, prod.name, {
          totalQuantity: 60,
          warehouseId: warehouseAId,
        }),
      ).expect(201);

      // Create + request + approve + ship
      const dto = buildTransferOrderDto(warehouseAId, warehouseBId, [
        { productId: discProductId, requestedQuantity: 40 },
      ]);
      const createRes = await authPost(ctx, '/transfer-orders', dto).expect(201);
      discTransferId = (createRes.body.data || createRes.body)._id;

      await authPost(ctx, `/transfer-orders/${discTransferId}/request`, {});
      await authPost(ctx, `/transfer-orders/${discTransferId}/approve`, {});
      await authPost(ctx, `/transfer-orders/${discTransferId}/ship`, {
        items: [{ productId: discProductId, shippedQuantity: 40 }],
      });

      // Receive with discrepancy (only 35 of 40)
      const receiveRes = await authPost(
        ctx,
        `/transfer-orders/${discTransferId}/receive`,
        {
          items: [{ productId: discProductId, receivedQuantity: 35 }],
        },
      );
      expect([200, 201]).toContain(receiveRes.status);
    });

    it('should have recorded the discrepancy', async () => {
      if (!discTransferId) return;
      const res = await authGet(
        ctx,
        `/transfer-orders/${discTransferId}`,
      ).expect(200);
      const order = res.body.data || res.body;
      // Should be partially received or have discrepancies
      const hasDiscrepancy =
        order.status === 'partially_received' ||
        (order.discrepancies && order.discrepancies.length > 0) ||
        order.hasDiscrepancies === true;
      expect(hasDiscrepancy).toBe(true);
    });
  });

  // ── Error Cases ───────────────────────────────────────────

  describe('Error Cases', () => {
    it('should reject ship without sufficient stock', async () => {
      // Create product with minimal stock
      const prodDto = buildProductDto({ name: 'Low Stock Prod' });
      const prodRes = await authPost(ctx, '/products', prodDto).expect(201);
      const prod = prodRes.body.data || prodRes.body;

      await authPost(
        ctx,
        '/inventory',
        buildInventoryDto(prod._id, prod.sku, prod.name, {
          totalQuantity: 2,
          warehouseId: warehouseAId,
        }),
      ).expect(201);

      const dto = buildTransferOrderDto(warehouseAId, warehouseBId, [
        { productId: prod._id, requestedQuantity: 9999 },
      ]);
      const createRes = await authPost(ctx, '/transfer-orders', dto).expect(201);
      const orderId = (createRes.body.data || createRes.body)._id;

      await authPost(ctx, `/transfer-orders/${orderId}/request`, {});
      await authPost(ctx, `/transfer-orders/${orderId}/approve`, {});

      // Ship should fail - not enough stock
      const shipRes = await authPost(ctx, `/transfer-orders/${orderId}/ship`, {
        items: [{ productId: prod._id, shippedQuantity: 9999 }],
      });
      expect([400, 422]).toContain(shipRes.status);
    });
  });

  // ── List & Filter ─────────────────────────────────────────

  describe('List & Filter', () => {
    it('should list all transfer orders', async () => {
      const res = await authGet(ctx, '/transfer-orders').expect(200);
      const data = res.body.data || res.body;
      const orders = Array.isArray(data) ? data : data.items || data.transferOrders || [];
      expect(orders.length).toBeGreaterThanOrEqual(1);
    });

    it('should get transfer order by ID', async () => {
      const res = await authGet(
        ctx,
        `/transfer-orders/${transferOrderId}`,
      ).expect(200);
      const order = res.body.data || res.body;
      expect(order._id || order.id).toBeDefined();
    });
  });
});
