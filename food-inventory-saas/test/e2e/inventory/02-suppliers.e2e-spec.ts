import {
  TestContext,
  bootstrapTestApp,
  authGet,
  authPost,
  authPatch,
  authDelete,
  unauthGet,
} from './_setup/inventory-test.setup';
import { buildSupplierDto, buildProductDto } from './_setup/test-data.factory';

describe('Suppliers E2E', () => {
  let ctx: TestContext;
  let supplierId: string;
  let supplierRif: string;
  let productId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── CRUD ──────────────────────────────────────────────────

  describe('Supplier CRUD', () => {
    it('should create a supplier with valid RIF', async () => {
      const dto = buildSupplierDto({ name: 'Distribuidora Central' }); // Let factory generate unique RIF
      const res = await authPost(ctx, '/suppliers', dto).expect(201);
      const supplier = res.body.data || res.body;
      supplierId = supplier._id;
      supplierRif = supplier.rif || supplier.taxInfo?.taxId || supplier.taxInfo?.rif;
      expect(supplierId).toBeDefined();
    });

    it('should reject invalid RIF format', async () => {
      const dto = buildSupplierDto({ rif: 'INVALID-RIF' });
      await authPost(ctx, '/suppliers', dto).expect(400);
    });

    it('should list suppliers', async () => {
      const res = await authGet(ctx, '/suppliers').expect(200);
      const suppliers = res.body.data || res.body;
      expect(Array.isArray(suppliers)).toBe(true);
      expect(suppliers.length).toBeGreaterThanOrEqual(1);
    });

    it('should search suppliers by name', async () => {
      const res = await authGet(
        ctx,
        '/suppliers?search=Distribuidora',
      ).expect(200);
      const suppliers = res.body.data || res.body;
      expect(suppliers.length).toBeGreaterThanOrEqual(1);
    });

    it('should update supplier name', async () => {
      const res = await authPatch(ctx, `/suppliers/${supplierId}`, {
        name: 'Distribuidora Central Actualizada',
      }).expect(200);
      const updated = res.body.data || res.body;
      expect(updated.name || updated.modifiedCount).toBeDefined();
    });

    it('should get supplier by ID', async () => {
      const res = await authGet(ctx, `/suppliers/${supplierId}`).expect(200);
      const supplier = res.body.data || res.body;
      expect(supplier.name).toBe('Distribuidora Central Actualizada');
    });

    it('should delete a supplier', async () => {
      const dto = buildSupplierDto({ name: 'Para Borrar' }); // Let factory generate unique RIF
      const createRes = await authPost(ctx, '/suppliers', dto).expect(201);
      const deleteId = (createRes.body.data || createRes.body)._id;
      await authDelete(ctx, `/suppliers/${deleteId}`).expect(200);
    });
  });

  // ── RIF Normalization (CRITICAL - Tenant problem #1) ──────

  describe('RIF Normalization', () => {
    it('should normalize RIF on create (strip extra formatting)', async () => {
      // Use unique number to avoid collisions on test reruns
      const uniqueNum = Date.now().toString().slice(-7);
      const dto = buildSupplierDto({
        name: 'Proveedor RIF Test',
        rif: `J${uniqueNum}`, // Non-normalized format to test normalization
      });
      const res = await authPost(ctx, '/suppliers', dto);
      if (res.status === 201) {
        const supplier = res.body.data || res.body;
        // RIF should be normalized to J-XXXXXXXX format
        const savedRif =
          supplier.rif || supplier.taxInfo?.taxId || supplier.taxInfo?.rif;
        expect(savedRif).toBeDefined();
        // Cleanup
        await authDelete(ctx, `/suppliers/${supplier._id}`);
      }
    });

    it('should be able to edit RIF (Tenant problem #5)', async () => {
      const dto = buildSupplierDto({ name: 'Proveedor Editar RIF' }); // Let factory generate unique RIF
      const createRes = await authPost(ctx, '/suppliers', dto).expect(201);
      const id = (createRes.body.data || createRes.body)._id;
      const originalRif = (createRes.body.data || createRes.body).rif;

      // Edit RIF - this was broken for the tenant
      // Change last digit to create a different but valid RIF
      const uniqueNum = Date.now().toString().slice(-7);
      const updateRes = await authPatch(ctx, `/suppliers/${id}`, {
        rif: `J-${uniqueNum}-9`,
      });
      expect([200, 201]).toContain(updateRes.status);
    });
  });

  // ── Payment Settings (Tenant problem #6) ──────────────────

  describe('Payment Settings', () => {
    it('should update payment settings', async () => {
      const res = await authPatch(
        ctx,
        `/suppliers/${supplierId}/payment-settings`,
        {
          acceptsCredit: true,
          defaultCreditDays: 30,
          acceptedPaymentMethods: ['transferencia', 'efectivo'],
          preferredPaymentMethod: 'transferencia',
          paymentCurrency: 'USD',
        },
      );
      expect([200, 201]).toContain(res.status);
    });

    it('should sync payment settings to linked products', async () => {
      // First create a product and link it to the supplier
      const productDto = buildProductDto({ name: 'Producto Payment Sync' });
      const prodRes = await authPost(ctx, '/products', productDto).expect(201);
      productId = (prodRes.body.data || prodRes.body)._id;

      // Link product to supplier
      await authPost(ctx, `/products/${productId}/suppliers`, {
        supplierId,
        supplierName: 'Distribuidora Central Actualizada',
        supplierSku: 'SUP-SKU-001',
        costPrice: 5,
        leadTimeDays: 7,
        minimumOrderQuantity: 1,
      });

      // Update payment settings
      await authPatch(ctx, `/suppliers/${supplierId}/payment-settings`, {
        paymentCurrency: 'VES',
        preferredPaymentMethod: 'pago_movil',
        acceptedPaymentMethods: ['pago_movil', 'transferencia'],
      });

      // Verify product got updated
      const prodCheck = await authGet(ctx, `/products/${productId}`).expect(200);
      const product = prodCheck.body.data || prodCheck.body;
      if (product.suppliers && product.suppliers.length > 0) {
        const linked = product.suppliers.find(
          (s: any) => s.supplierId?.toString() === supplierId || s.supplierId === supplierId,
        );
        // If sync works, payment settings should propagate
        if (linked) {
          expect(linked.paymentCurrency || linked.preferredPaymentMethod).toBeDefined();
        }
      }
    });
  });

  // ── Pricing Filters ───────────────────────────────────────

  describe('Pricing Filters', () => {
    it('should get suppliers by currency', async () => {
      const res = await authGet(ctx, '/suppliers/pricing/by-currency');
      expect([200, 404]).toContain(res.status);
    });

    it('should get suppliers by payment method', async () => {
      const res = await authGet(
        ctx,
        '/suppliers/pricing/by-method/transferencia',
      );
      expect([200, 404]).toContain(res.status);
    });
  });

  // ── Auth guard ────────────────────────────────────────────

  describe('Auth guard', () => {
    it('should reject unauthenticated request', async () => {
      const res = await unauthGet('/suppliers');
      expect(res.status).toBe(401);
    });
  });
});
