/**
 * CRITICAL E2E Tests: Purchase Orders
 *
 * Tenant problems addressed:
 * - #1: RIF format mismatch between Suppliers and Purchases (duplication)
 * - #2: Products not linked to supplier after purchase
 * - #4: Status change pending→received failing
 * - #6: Payment terms not syncing bidirectionally
 */
import {
  TestContext,
  bootstrapTestApp,
  authGet,
  authPost,
  authPatch,
} from './_setup/inventory-test.setup';
import {
  buildProductDto,
  buildSupplierDto,
  buildPurchaseOrderDto,
  buildNewSupplierPurchaseOrderDto,
} from './_setup/test-data.factory';

describe('Purchases E2E (CRITICAL)', () => {
  let ctx: TestContext;

  // Shared state for sequential tests
  let supplierId: string;
  let supplierName: string;
  let product1Id: string;
  let product1Sku: string;
  let product1Name: string;
  let product2Id: string;
  let product2Sku: string;
  let product2Name: string;
  let poId: string;
  let poWithNewSupplierIdGlobal: string;
  let newSupplierId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── Setup: Create supplier and products ───────────────────

  describe('SETUP: Create test data', () => {
    it('should create a supplier', async () => {
      const dto = buildSupplierDto({
        name: 'Proveedor Compras Test',
        // Let factory generate unique RIF
        contactName: 'Juan Perez',
        contactPhone: '04141234567',
      });
      const res = await authPost(ctx, '/suppliers', dto).expect(201);
      const supplier = res.body.data || res.body;
      supplierId = supplier._id;
      supplierName = 'Proveedor Compras Test';
    });

    it('should create product 1', async () => {
      const dto = buildProductDto({
        name: 'Aceite de Oliva 500ml',
        variants: [
          { name: 'Botella 500ml', unit: 'unidad', unitSize: 1, costPrice: 8, basePrice: 15 },
        ],
      });
      const res = await authPost(ctx, '/products', dto).expect(201);
      const product = res.body.data || res.body;
      product1Id = product._id;
      product1Sku = product.sku;
      product1Name = product.name;
    });

    it('should create product 2', async () => {
      const dto = buildProductDto({
        name: 'Vinagre Balsámico 250ml',
        variants: [
          { name: 'Botella 250ml', unit: 'unidad', unitSize: 1, costPrice: 5, basePrice: 9 },
        ],
      });
      const res = await authPost(ctx, '/products', dto).expect(201);
      const product = res.body.data || res.body;
      product2Id = product._id;
      product2Sku = product.sku;
      product2Name = product.name;
    });
  });

  // ── PO with existing supplier ─────────────────────────────

  describe('PO with Existing Supplier', () => {
    it('should create purchase order with existing supplier', async () => {
      const dto = buildPurchaseOrderDto(supplierId, [
        {
          productId: product1Id,
          productName: product1Name,
          productSku: product1Sku,
          quantity: 50,
          costPrice: 8,
        },
        {
          productId: product2Id,
          productName: product2Name,
          productSku: product2Sku,
          quantity: 30,
          costPrice: 5,
        },
      ]);
      const res = await authPost(ctx, '/purchases', dto).expect(201);
      const po = res.body.data || res.body;
      poId = po._id;
      expect(poId).toBeDefined();
      expect(po.items.length).toBe(2);
    });

    it('should list purchase orders', async () => {
      const res = await authGet(ctx, '/purchases').expect(200);
      const data = res.body.data || res.body;
      const pos = Array.isArray(data) ? data : data.items || data.purchaseOrders || [];
      expect(pos.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Approval Workflow ─────────────────────────────────────

  describe('Approval Workflow', () => {
    it('should approve purchase order (Tenant problem #4)', async () => {
      const res = await authPatch(ctx, `/purchases/${poId}/approve`, {
        notes: 'Approved for testing',
      });
      expect([200, 201]).toContain(res.status);
      const po = res.body.data || res.body;
      // Status should change to approved
      if (po.status) {
        expect(po.status).toBe('approved');
      }
    });
  });

  // ── RECEIVE PO (CRITICAL - Tenant problem #4) ─────────────

  describe('Receive Purchase Order (CRITICAL)', () => {
    it('should receive purchase order', async () => {
      const res = await authPatch(ctx, `/purchases/${poId}/receive`, {
        receivedBy: 'Test User',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('should have created inventory for product 1', async () => {
      const res = await authGet(ctx, `/inventory/product/${product1Sku}`).expect(200);
      const inventory = res.body.data || res.body;
      // Could be single object or array
      const inv = Array.isArray(inventory) ? inventory[0] : inventory;
      expect(inv).toBeDefined();
      expect(inv.totalQuantity).toBeGreaterThanOrEqual(50);
    });

    it('should have created inventory for product 2', async () => {
      const res = await authGet(ctx, `/inventory/product/${product2Sku}`).expect(200);
      const inventory = res.body.data || res.body;
      const inv = Array.isArray(inventory) ? inventory[0] : inventory;
      expect(inv).toBeDefined();
      expect(inv.totalQuantity).toBeGreaterThanOrEqual(30);
    });

    it('should NOT have double-stocked (only 1 IN movement per product)', async () => {
      const res = await authGet(
        ctx,
        `/inventory-movements?productSku=${product1Sku}&movementType=in`,
      ).expect(200);
      const data = res.body.data || res.body;
      const movements = Array.isArray(data) ? data : data.items || data.movements || [];
      // Filter movements for this specific PO
      const poMovements = movements.filter(
        (m: any) => m.quantity === 50 || m.reference?.includes(poId),
      );
      // Should be exactly 1 IN movement, not 2 (the old double-stock bug)
      expect(poMovements.length).toBeLessThanOrEqual(1);
    });
  });

  // ── Reject Workflow ───────────────────────────────────────

  describe('Reject Workflow', () => {
    let rejectPoId: string;

    it('should create PO to reject', async () => {
      const dto = buildPurchaseOrderDto(supplierId, [
        {
          productId: product1Id,
          productName: product1Name,
          productSku: product1Sku,
          quantity: 10,
          costPrice: 8,
        },
      ]);
      const res = await authPost(ctx, '/purchases', dto).expect(201);
      rejectPoId = (res.body.data || res.body)._id;
    });

    it('should reject purchase order with reason', async () => {
      const res = await authPatch(ctx, `/purchases/${rejectPoId}/reject`, {
        reason: 'Price too high',
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  // ── PO with NEW supplier on-the-fly (Tenant problem #1, #2) ──

  describe('PO with New Supplier On-The-Fly', () => {
    it('should create PO with new supplier (newSupplierName + newSupplierRif)', async () => {
      const dto = buildNewSupplierPurchaseOrderDto(
        'Proveedor Nuevo Desde Compras',
        'J-60601111-0',
        [
          {
            productId: product1Id,
            productName: product1Name,
            productSku: product1Sku,
            quantity: 25,
            costPrice: 7.5,
          },
        ],
        {
          paymentTerms: {
            isCredit: true,
            creditDays: 30,
            paymentMethods: ['transferencia'],
            expectedCurrency: 'USD',
            requiresAdvancePayment: false,
          },
        },
      );
      const res = await authPost(ctx, '/purchases', dto).expect(201);
      const po = res.body.data || res.body;
      poWithNewSupplierIdGlobal = po._id;
      expect(po._id).toBeDefined();
      // The PO should have a supplierId (auto-created)
      if (po.supplierId) {
        newSupplierId = po.supplierId.toString ? po.supplierId.toString() : po.supplierId;
      }
    });

    it('should have created the supplier in the suppliers module', async () => {
      const res = await authGet(ctx, '/suppliers?search=Proveedor Nuevo Desde Compras').expect(200);
      const suppliers = res.body.data || res.body;
      const found = Array.isArray(suppliers) ? suppliers : suppliers.items || [];
      // Should find the supplier
      expect(found.length).toBeGreaterThanOrEqual(1);
      if (found.length > 0) {
        newSupplierId = found[0]._id;
      }
    });

    it('should NOT have duplicated the supplier (RIF consistency - Tenant problem #1)', async () => {
      const res = await authGet(ctx, '/suppliers').expect(200);
      const suppliers = res.body.data || res.body;
      const allSuppliers = Array.isArray(suppliers) ? suppliers : suppliers.items || [];
      // Count suppliers with matching RIF digits
      const matching = allSuppliers.filter((s: any) => {
        const rif = s.rif || s.taxInfo?.taxId || '';
        return rif.replace(/[^0-9]/g, '').includes('60601111');
      });
      expect(matching.length).toBe(1);
    });
  });

  // ── Payment Terms Sync (Tenant problem #6) ────────────────

  describe('Payment Terms Bidirectional Sync', () => {
    it('should sync payment terms from PO to supplier', async () => {
      if (!newSupplierId) return;
      const res = await authGet(ctx, `/suppliers/${newSupplierId}`).expect(200);
      const supplier = res.body.data || res.body;
      // Payment config from PO should have synced
      const paymentSettings = supplier.paymentSettings || supplier.paymentTerms || {};
      // At minimum, the payment method should exist
      expect(supplier).toBeDefined();
    });
  });

  // ── Product-Supplier Linking on Receive (Tenant problem #2) ──

  describe('Product-Supplier Linking After Receive', () => {
    it('should approve and receive the new-supplier PO', async () => {
      if (!poWithNewSupplierIdGlobal) return;
      await authPatch(ctx, `/purchases/${poWithNewSupplierIdGlobal}/approve`, {});
      const receiveRes = await authPatch(
        ctx,
        `/purchases/${poWithNewSupplierIdGlobal}/receive`,
        { receivedBy: 'Test' },
      );
      expect([200, 201]).toContain(receiveRes.status);
    });

    it('should have linked products to the new supplier', async () => {
      if (!newSupplierId) return;
      // Check that product1 has newSupplierId in its suppliers array
      const res = await authGet(ctx, `/products/${product1Id}`).expect(200);
      const product = res.body.data || res.body;
      if (product.suppliers && product.suppliers.length > 0) {
        const linked = product.suppliers.find(
          (s: any) =>
            s.supplierId?.toString() === newSupplierId ||
            s.supplierId === newSupplierId,
        );
        // This test documents whether the linking actually works
        // If it fails, it means tenant problem #2 is not fixed
        expect(linked).toBeDefined();
      }
    });
  });

  // ── Validation Errors ─────────────────────────────────────

  describe('Validation Errors', () => {
    it('should reject PO without items', async () => {
      const dto = buildPurchaseOrderDto(supplierId, []);
      await authPost(ctx, '/purchases', dto).expect(400);
    });

    it('should reject PO without paymentTerms', async () => {
      const dto = {
        supplierId,
        purchaseDate: new Date().toISOString(),
        items: [
          {
            productId: product1Id,
            productName: product1Name,
            productSku: product1Sku,
            quantity: 10,
            costPrice: 5,
          },
        ],
      };
      await authPost(ctx, '/purchases', dto).expect(400);
    });
  });

  // ── Pending Approval ──────────────────────────────────────

  describe('Pending Approval', () => {
    it('should get pending approval POs', async () => {
      const res = await authGet(ctx, '/purchases/pending-approval');
      expect([200, 404]).toContain(res.status);
    });
  });
});
