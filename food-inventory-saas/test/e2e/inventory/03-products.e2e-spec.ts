import {
  TestContext,
  bootstrapTestApp,
  authGet,
  authPost,
  authPatch,
  authDelete,
} from './_setup/inventory-test.setup';
import { buildProductDto, buildSupplierDto } from './_setup/test-data.factory';

describe('Products E2E', () => {
  let ctx: TestContext;
  let simpleProductId: string;
  let simpleProductSku: string;
  let consumableProductId: string;
  let supplyProductId: string;
  let rawMaterialProductId: string;
  let supplierId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();

    // Create a supplier for linking tests
    const supDto = buildSupplierDto({ name: 'Supplier For Products', rif: 'J-80801111-0' });
    const supRes = await authPost(ctx, '/suppliers', supDto).expect(201);
    supplierId = (supRes.body.data || supRes.body)._id;
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── Create all product types ──────────────────────────────

  describe('Create Products (4 types)', () => {
    it('should create SIMPLE product', async () => {
      const dto = buildProductDto({
        name: 'Atún Enlatado',
        productType: 'simple',
        variants: [
          { name: 'Lata 170g', unit: 'unidad', unitSize: 1, costPrice: 2.5, basePrice: 4.5 },
        ],
      });
      const res = await authPost(ctx, '/products', dto).expect(201);
      const product = res.body.data || res.body;
      simpleProductId = product._id;
      simpleProductSku = product.sku;
      expect(simpleProductId).toBeDefined();
      expect(simpleProductSku).toBeDefined();
    });

    it('should create CONSUMABLE product', async () => {
      const dto = buildProductDto({
        name: 'Servilletas',
        productType: 'consumable',
      });
      const res = await authPost(ctx, '/products', dto).expect(201);
      consumableProductId = (res.body.data || res.body)._id;
      expect(consumableProductId).toBeDefined();
    });

    it('should create SUPPLY product', async () => {
      const dto = buildProductDto({
        name: 'Bolsas Plásticas',
        productType: 'supply',
      });
      const res = await authPost(ctx, '/products', dto).expect(201);
      supplyProductId = (res.body.data || res.body)._id;
      expect(supplyProductId).toBeDefined();
    });

    it('should create RAW_MATERIAL product', async () => {
      const dto = buildProductDto({
        name: 'Harina de Trigo',
        productType: 'raw_material',
      });
      const res = await authPost(ctx, '/products', dto).expect(201);
      rawMaterialProductId = (res.body.data || res.body)._id;
      expect(rawMaterialProductId).toBeDefined();
    });
  });

  // ── Validation ────────────────────────────────────────────

  describe('Validation', () => {
    it('should reject product without name', async () => {
      const dto = buildProductDto({ name: '' });
      await authPost(ctx, '/products', dto).expect(400);
    });

    it('should reject product without variants', async () => {
      const dto = buildProductDto({ variants: [] });
      await authPost(ctx, '/products', dto).expect(400);
    });
  });

  // ── Read Operations ───────────────────────────────────────

  describe('Read Operations', () => {
    it('should list products with pagination', async () => {
      const res = await authGet(ctx, '/products').expect(200);
      const body = res.body;
      const products = body.data || body;
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThanOrEqual(4);
    });

    it('should filter products by search', async () => {
      const searchTerm = encodeURIComponent('Atún');
      const res = await authGet(ctx, `/products?search=${searchTerm}`).expect(200);
      const products = res.body.data || res.body;
      expect(products.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by productType', async () => {
      const res = await authGet(ctx, '/products?productType=consumable').expect(200);
      const products = res.body.data || res.body;
      expect(products.length).toBeGreaterThanOrEqual(1);
    });

    it('should get product by ID', async () => {
      const res = await authGet(ctx, `/products/${simpleProductId}`).expect(200);
      const product = res.body.data || res.body;
      expect(product.name).toBe('Atún Enlatado');
    });

    it('should return 404 for non-existent product', async () => {
      await authGet(ctx, '/products/507f1f77bcf86cd799439099').expect(404);
    });
  });

  // ── Update ────────────────────────────────────────────────

  describe('Update Product', () => {
    it('should update product name', async () => {
      const res = await authPatch(ctx, `/products/${simpleProductId}`, {
        name: 'Atún Enlatado Premium',
      }).expect(200);
      const updated = res.body.data || res.body;
      expect(updated.name).toBe('Atún Enlatado Premium');
    });
  });

  // ── Categories ────────────────────────────────────────────

  describe('Categories', () => {
    it('should list categories', async () => {
      const res = await authGet(ctx, '/products/categories/list').expect(200);
      const categories = res.body.data || res.body;
      expect(Array.isArray(categories)).toBe(true);
    });

    it('should list subcategories', async () => {
      const res = await authGet(
        ctx,
        '/products/subcategories/list?category=Alimentos',
      ).expect(200);
      const subcategories = res.body.data || res.body;
      expect(Array.isArray(subcategories)).toBe(true);
    });
  });

  // ── Supplier Linking ──────────────────────────────────────

  describe('Supplier Linking', () => {
    it('should link supplier to product', async () => {
      const res = await authPost(ctx, `/products/${simpleProductId}/suppliers`, {
        supplierId,
        supplierName: 'Supplier For Products',
        supplierSku: 'SUP-ATUN-001',
        costPrice: 2.5,
        leadTimeDays: 5,
        minimumOrderQuantity: 10,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('should verify supplier is linked', async () => {
      const res = await authGet(ctx, `/products/${simpleProductId}`).expect(200);
      const product = res.body.data || res.body;
      expect(product.suppliers).toBeDefined();
      expect(product.suppliers.length).toBeGreaterThanOrEqual(1);
      const linked = product.suppliers.find(
        (s: any) => s.supplierId?.toString() === supplierId || s.supplierId === supplierId,
      );
      expect(linked).toBeDefined();
    });
  });

  // ── Price History ─────────────────────────────────────────

  describe('Price History', () => {
    it('should get price history', async () => {
      const res = await authGet(ctx, `/products/${simpleProductId}/price-history`);
      expect([200, 404]).toContain(res.status);
    });
  });

  // ── Bulk Create ───────────────────────────────────────────

  describe('Bulk Create', () => {
    it('should bulk create products', async () => {
      const products = [
        buildProductDto({ name: 'Bulk Product 1' }),
        buildProductDto({ name: 'Bulk Product 2' }),
      ];
      const res = await authPost(ctx, '/products/bulk', { products });
      expect([200, 201]).toContain(res.status);
    });
  });

  // ── Delete ────────────────────────────────────────────────

  describe('Delete Product', () => {
    it('should soft-delete a product', async () => {
      const dto = buildProductDto({ name: 'Para Eliminar' });
      const createRes = await authPost(ctx, '/products', dto).expect(201);
      const deleteId = (createRes.body.data || createRes.body)._id;
      await authDelete(ctx, `/products/${deleteId}`).expect(200);
    });
  });
});
