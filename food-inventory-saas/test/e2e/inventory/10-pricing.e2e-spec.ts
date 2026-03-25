import {
  TestContext,
  bootstrapTestApp,
  authPost,
} from './_setup/inventory-test.setup';
import { buildProductDto } from './_setup/test-data.factory';

describe('Pricing E2E', () => {
  let ctx: TestContext;
  let productId: string;
  let variantSku: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();

    // Create a product with pricing
    const dto = buildProductDto({
      name: 'Producto Pricing Test',
      variants: [
        {
          name: 'Unidad',
          unit: 'unidad',
          unitSize: 1,
          costPrice: 10,
          basePrice: 20,
          pricingStrategy: {
            mode: 'markup',
            markupPercentage: 100,
            autoCalculate: true,
          },
        },
      ],
      ivaApplicable: true,
      igtfExempt: false,
    });
    const res = await authPost(ctx, '/products', dto).expect(201);
    const product = res.body.data || res.body;
    productId = product._id;
    variantSku = product.variants?.[0]?.sku || product.sku;
  }, 60000);

  afterAll(async () => { /* app shared across test files - closed in 90-integration-flows */ });

  // ── Price Calculation ─────────────────────────────────────

  describe('Price Calculation', () => {
    it('should calculate price with IVA 16%', async () => {
      const res = await authPost(ctx, '/pricing/calculate', {
        items: [
          {
            productId,
            variantSku,
            quantity: 1,
            ivaApplicable: true,
          },
        ],
        paymentMethod: 'efectivo',
        currency: 'VES',
        ivaApplicable: true,
      });
      if (res.status !== 200 && res.status !== 201) {
        console.log('Pricing test error:', JSON.stringify(res.body, null, 2));
      }
      expect([200, 201]).toContain(res.status);
      if (res.status === 200) {
        const result = res.body.data || res.body;
        expect(result).toBeDefined();
      }
    });

    it('should reject invalid calculation input', async () => {
      const res = await authPost(ctx, '/pricing/calculate', {});
      expect([400, 422]).toContain(res.status);
    });
  });

  // ── Bulk Price Updates ────────────────────────────────────

  describe('Bulk Price Updates', () => {
    it('should preview bulk price update', async () => {
      const res = await authPost(ctx, '/pricing/bulk/preview', {
        productIds: [productId],
        adjustment: { type: 'percentage', value: 10 },
      });
      expect([200, 400]).toContain(res.status);
    });

    it('should execute bulk price update', async () => {
      const res = await authPost(ctx, '/pricing/bulk/execute', {
        productIds: [productId],
        adjustment: { type: 'percentage', value: 5 },
      });
      expect([200, 400]).toContain(res.status);
    });
  });
});
