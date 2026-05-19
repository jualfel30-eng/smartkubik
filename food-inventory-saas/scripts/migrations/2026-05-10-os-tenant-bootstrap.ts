/**
 * Migration: Bootstrap del tenant Oliver Sutherland (vertical RETAIL / fashion).
 *
 * Crea — de forma idempotente — todo lo necesario para que la página
 * static de Oliver Sutherland pueda operar contra el SmartKubik backend:
 *   1. Tenant (vertical: RETAIL, USD-only, sin IGTF/IVA Venezuela)
 *   2. Warehouse "Atelier" (default)
 *   3. StorefrontConfig (registra el dominio para /public/storefront/by-domain)
 *   4. 3 productos (Travel Wrap, Reversible, Classic Scarf) con 4 variantes
 *      por color cada uno
 *   5. Inventario inicial (10 unidades por variante en el warehouse Atelier)
 *
 * Uso:
 *   # Modo dry-run (default — no escribe nada, solo reporta)
 *   ts-node -r dotenv/config scripts/migrations/2026-05-10-os-tenant-bootstrap.ts
 *
 *   # Aplicar cambios
 *   ts-node -r dotenv/config scripts/migrations/2026-05-10-os-tenant-bootstrap.ts --apply
 *
 *   # Override del dominio del cliente (si cambia)
 *   OS_DOMAIN=oliversutherland.com OS_ALT_DOMAIN=oliver.smartkubik.com \
 *     ts-node -r dotenv/config scripts/migrations/2026-05-10-os-tenant-bootstrap.ts --apply
 *
 * Idempotencia: cada paso busca por una clave natural (slug/code/sku/domain)
 * antes de crear. Re-correr la migración no duplica datos.
 */

import { connect, disconnect, model, Types } from "mongoose";
import { Inventory, InventoryDocument, InventorySchema } from "../../src/schemas/inventory.schema";
import { Product, ProductDocument, ProductSchema } from "../../src/schemas/product.schema";
import {
  StorefrontConfig,
  StorefrontConfigDocument,
  StorefrontConfigSchema,
} from "../../src/schemas/storefront-config.schema";
import { Tenant, TenantDocument, TenantSchema } from "../../src/schemas/tenant.schema";
import { Warehouse, WarehouseDocument, WarehouseSchema } from "../../src/schemas/warehouse.schema";

// ─── Config ─────────────────────────────────────────────────────────────

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/food-inventory-saas";

const APPLY = process.argv.includes("--apply");
const TENANT_CODE = "OLIVER_SUTHERLAND";
const TENANT_SLUG = "oliver-sutherland";
const PRIMARY_DOMAIN = process.env.OS_DOMAIN || "oliversutherland.com";
const ALT_DOMAIN = process.env.OS_ALT_DOMAIN || "oliver.smartkubik.com";
const WAREHOUSE_CODE = "ATELIER";

// Brand palette (extraída del HTML)
const NAVY = "#0B1F3A";
const CAMEL = "#A47148";

const COLORS = {
  Camel: "#a47148",
  Charcoal: "#2b2b2b",
  Ivory: "#f0e9d6",
  Black: "#0a0a0a",
};

type ProductDef = {
  key: "travel" | "reversible" | "scarf";
  sku: string;
  name: string;
  eyebrow: string;
  basePrice: number;
  retailPrice: number; // valor solo informativo (precio "equivalente retail")
  costPrice: number;   // estimado — el cliente lo ajusta luego desde admin
  category: string;
  subcategory: string;
  description: string;
  coverImage: string;  // imagen principal mostrada en collection grid + spotlight
  galleryImages: string[]; // imágenes adicionales para spotlight gallery
  initialStockPerVariant: number;
};

const PRODUCTS: ProductDef[] = [
  {
    key: "travel",
    sku: "OS-TRAV-WRAP",
    name: "The Travel Wrap",
    eyebrow: "N° 01 · Travel",
    basePrice: 1180,
    retailPrice: 2950,
    costPrice: 380,
    category: "Cashmere",
    subcategory: "Wraps",
    description:
      "An effortless layer in 100% Mongolian Grade A cashmere — designed to live in carry-on luggage and emerge unwrinkled.",
    coverImage: "/assets/travel-wrap-cover.png",
    galleryImages: [
      "/assets/travel-wrap-1.webp",
      "/assets/travel-wrap-2.webp",
      "/assets/travel-wrap-3.webp",
    ],
    initialStockPerVariant: 10,
  },
  {
    key: "reversible",
    sku: "OS-REVERSIBLE",
    name: "The Reversible Masterpiece",
    eyebrow: "N° 02 · Reversible",
    basePrice: 950,
    retailPrice: 2400,
    costPrice: 320,
    category: "Cashmere",
    subcategory: "Wraps",
    description:
      "Two cashmere weaves bonded face-to-face — flip for a different shade, the same Mongolian fiber.",
    coverImage: "/assets/reversible-cover.png",
    galleryImages: [
      "/assets/reversible-1.webp",
      "/assets/reversible-2.webp",
      "/assets/reversible-3.webp",
      "/assets/reversible-4.webp",
      "/assets/reversible-5.webp",
    ],
    initialStockPerVariant: 10,
  },
  {
    key: "scarf",
    sku: "OS-CLASSIC-SCARF",
    name: "The Classic Scarf",
    eyebrow: "N° 03 · Classic",
    basePrice: 620,
    retailPrice: 1580,
    costPrice: 210,
    category: "Cashmere",
    subcategory: "Scarves",
    description:
      "Hand-combed, hand-finished. The everyday scarf in 15.5-micron cashmere — the silhouette the house was built on.",
    coverImage: "/assets/classic-scarf-cover.png",
    galleryImages: [
      "/assets/classic-scarf-1.webp",
      "/assets/classic-scarf-2.webp",
      "/assets/classic-scarf-3.webp",
      "/assets/classic-scarf-4.webp",
    ],
    initialStockPerVariant: 10,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────

const log = (...args: any[]) => console.log("[os-bootstrap]", ...args);
const warn = (...args: any[]) => console.warn("[os-bootstrap]", ...args);

function tag(): string {
  return APPLY ? "[APPLY]" : "[DRY-RUN]";
}

// ─── Pasos ──────────────────────────────────────────────────────────────

async function ensureTenant(
  TenantModel: any,
): Promise<TenantDocument> {
  const existing = await TenantModel.findOne({
    $or: [{ code: TENANT_CODE }, { slug: TENANT_SLUG }],
  });

  if (existing) {
    log(
      `${tag()} Tenant existente: ${existing.name} (${existing._id}) — vertical=${existing.vertical}, currency=${existing.settings?.currency?.primary}`,
    );
    return existing;
  }

  const draft = {
    code: TENANT_CODE,
    slug: TENANT_SLUG,
    name: "Oliver Sutherland",
    description:
      "Atelier Mongolian cashmere — quiet luxury house, USD-only e-commerce.",
    businessType: "fashion",
    vertical: "RETAIL",
    contactInfo: {
      email: "concierge@oliversutherland.com",
      phone: "",
      address: {
        street: "Atelier",
        city: "Ulaanbaatar",
        state: "",
        country: "MN",
      },
    },
    // taxInfo no aplica para tenant internacional — dejar vacío
    taxInfo: {
      rif: "",
      businessName: "Oliver Sutherland",
      isRetentionAgent: false,
      taxRegime: "none",
      taxpayerType: "ordinario",
      specialTaxpayerWithholdingRate: 0,
    },
    settings: {
      currency: {
        primary: "USD",
        secondary: undefined,
        exchangeRateSource: "manual",
        autoUpdateRate: false,
      },
      taxes: {
        ivaRate: 0,
        igtfRate: 0,
        retentionRates: { iva: 0, islr: 0 },
      },
      inventory: {
        defaultWarehouse: WAREHOUSE_CODE,
        fefoEnabled: false,
        lotTrackingEnabled: false,
        expirationAlertDays: 0,
        lowStockAlertEnabled: true,
        autoReorderEnabled: false,
        enableAutomaticIngredientDeduction: false,
      },
      orders: {
        reservationExpiryMinutes: 30,
        autoConfirmOrders: false,
        requirePaymentConfirmation: true,
        allowPartialPayments: false,
        defaultPaymentTerms: 0,
      },
      notifications: {
        email: true,
        whatsapp: false,
        sms: false,
        lowStockAlerts: true,
        expirationAlerts: false,
        orderAlerts: true,
      },
      invoiceFormat: "standard",
      documentTemplates: {
        invoice: {
          primaryColor: NAVY,
          accentColor: CAMEL,
          footerText: "Oliver Sutherland · Atelier Mongolia",
        },
        quote: {
          primaryColor: NAVY,
          accentColor: CAMEL,
          footerText: "Oliver Sutherland · Atelier Mongolia",
        },
      },
    },
    enabledModules: {
      inventory: true,
      orders: true,
      customers: true,
      suppliers: true,
      reports: true,
      accounting: true,
      bankAccounts: true,
      cashRegister: false,
      marketing: true,
      pos: false,
      variants: true,
      ecommerce: true,
      loyaltyProgram: false,
      commissions: false,
      // Todos los módulos venezolanos / hospitality / restaurant en false (default)
    },
    status: "active",
    isActive: true,
    isVerified: true,
  };

  if (!APPLY) {
    log(
      `${tag()} Crearía Tenant '${draft.name}' (slug=${draft.slug}, vertical=${draft.vertical}, currency=USD)`,
    );
    return { _id: new Types.ObjectId(), ...draft } as any;
  }

  const created = await TenantModel.create(draft as any);
  log(`${tag()} Tenant creado: ${created.name} (${created._id})`);
  return created;
}

async function ensureWarehouse(
  WarehouseModel: any,
  tenantId: Types.ObjectId,
): Promise<WarehouseDocument> {
  const existing = await WarehouseModel.findOne({
    tenantId,
    code: WAREHOUSE_CODE,
  });
  if (existing) {
    log(`${tag()} Warehouse existente: ${existing.name} (${existing._id})`);
    return existing;
  }

  const draft = {
    tenantId,
    name: "Atelier",
    code: WAREHOUSE_CODE,
    isActive: true,
    isDefault: true,
    isDeleted: false,
    location: {
      city: "Ulaanbaatar",
      country: "MN",
    },
  };

  if (!APPLY) {
    log(`${tag()} Crearía Warehouse '${draft.name}' (code=${draft.code})`);
    return { _id: new Types.ObjectId(), ...draft } as any;
  }

  const created = await WarehouseModel.create(draft as any);
  log(`${tag()} Warehouse creado: ${created.name} (${created._id})`);
  return created;
}

async function ensureStorefrontConfig(
  StorefrontConfigModel: any,
  tenantId: Types.ObjectId,
): Promise<void> {
  for (const domain of [PRIMARY_DOMAIN, ALT_DOMAIN]) {
    const existing = await StorefrontConfigModel.findOne({ tenantId, domain });
    if (existing) {
      log(`${tag()} StorefrontConfig existente para domain=${domain}`);
      continue;
    }

    const draft = {
      tenantId,
      isActive: true,
      domain,
      theme: {
        primaryColor: NAVY,
        secondaryColor: CAMEL,
        logo: "/assets/logo-mark.png",
      },
      templateType: "premium" as const,
      seo: {
        title: "Oliver Sutherland · Atelier Cashmere",
        description:
          "Atelier-grade Mongolian cashmere — quiet, considered, and made to outlast its decade.",
        keywords: ["cashmere", "luxury", "atelier", "mongolia", "scarf"],
      },
      contactInfo: {
        email: "concierge@oliversutherland.com",
        phone: "",
        address: {
          street: "Atelier",
          city: "Ulaanbaatar",
          state: "",
          country: "MN",
        },
      },
      whatsappIntegration: {
        enabled: false,
        autoSendOrderConfirmation: false,
        sendPaymentInstructions: false,
        sendDeliveryUpdates: false,
      },
    };

    if (!APPLY) {
      log(
        `${tag()} Crearía StorefrontConfig domain=${domain} (template=premium, navy/camel)`,
      );
      continue;
    }

    await StorefrontConfigModel.create(draft as any);
    log(`${tag()} StorefrontConfig creado para domain=${domain}`);
  }
}

async function ensureProducts(
  ProductModel: any,
  tenantId: Types.ObjectId,
): Promise<ProductDocument[]> {
  const created: ProductDocument[] = [];

  for (const def of PRODUCTS) {
    const existing = await ProductModel.findOne({ sku: def.sku, tenantId });
    if (existing) {
      log(
        `${tag()} Producto existente: ${def.name} (${existing._id}) — ${existing.variants.length} variantes`,
      );
      created.push(existing);
      continue;
    }

    const variants = Object.entries(COLORS).map(([colorName, hex], i) => ({
      name: `${def.name} — ${colorName}`,
      sku: i === 0 ? def.sku : `${def.sku}-${colorName.toUpperCase()}`,
      barcode: undefined,
      unit: "und",
      unitSize: 1,
      basePrice: def.basePrice,
      costPrice: def.costPrice,
      isActive: true,
      images:
        i === 0
          ? [def.coverImage, ...def.galleryImages]
          : [def.coverImage], // primera variante recibe la galería completa
      attributes: {
        color: colorName,
        colorHex: hex,
        retailPrice: def.retailPrice,
      },
      pricingStrategy: {
        mode: "manual" as const,
        autoCalculate: false,
      },
    }));

    const draft = {
      tenantId,
      sku: def.sku,
      productType: "simple",
      name: def.name,
      brand: "Oliver Sutherland",
      category: [def.category],
      subcategory: [def.subcategory],
      unitOfMeasure: "unidad",
      description: def.description,
      tags: ["luxury", "atelier", "cashmere", def.key],
      variants,
      suppliers: [],
      isPerishable: false,
      ivaApplicable: false, // tenant internacional, USD only
      ivaRate: 0,
      igtfExempt: true,
      taxCategory: "exempt",
      isActive: true,
      pricingRules: {
        cashDiscount: 0,
        cardSurcharge: 0,
        minimumMargin: 30,
        maximumDiscount: 20,
      },
      inventoryConfig: {
        trackLots: false,
        trackExpiration: false,
        minimumStock: 2,
        maximumStock: 100,
        reorderPoint: 4,
        reorderQuantity: 20,
        fefoEnabled: false,
      },
      attributes: {
        eyebrow: def.eyebrow,
        retailPrice: def.retailPrice,
        productKey: def.key,
      },
    };

    if (!APPLY) {
      log(
        `${tag()} Crearía Producto '${def.name}' (sku=${def.sku}, ${variants.length} variantes, USD ${def.basePrice})`,
      );
      // Devolvemos un fake con _id para que ensureInventory pueda continuar el dry-run
      const fakeId = new Types.ObjectId();
      const fakeVariants = variants.map((v) => ({
        ...v,
        _id: new Types.ObjectId(),
      }));
      created.push({ _id: fakeId, ...draft, variants: fakeVariants } as any);
      continue;
    }

    const product = await ProductModel.create(draft as any);
    log(
      `${tag()} Producto creado: ${product.name} (${product._id}) — ${product.variants.length} variantes`,
    );
    created.push(product);
  }

  return created;
}

async function ensureInventory(
  InventoryModel: any,
  tenantId: Types.ObjectId,
  warehouseId: Types.ObjectId,
  products: ProductDocument[],
): Promise<void> {
  for (const product of products) {
    const def = PRODUCTS.find((p) => p.sku === product.sku);
    if (!def) continue;

    for (const variant of product.variants) {
      const existing = await InventoryModel.findOne({
        tenantId,
        productId: product._id,
        variantId: variant._id,
        warehouseId,
      });

      if (existing) {
        log(
          `${tag()} Inventory existente: ${product.name} / ${variant.name} (qty=${existing.totalQuantity})`,
        );
        continue;
      }

      const qty = def.initialStockPerVariant;
      const draft = {
        tenantId,
        productId: product._id,
        variantId: variant._id,
        warehouseId,
        productSku: product.sku,
        productName: product.name,
        variantSku: variant.sku,
        totalQuantity: qty,
        availableQuantity: qty,
        reservedQuantity: 0,
        committedQuantity: 0,
        averageCostPrice: variant.costPrice,
        lastCostPrice: variant.costPrice,
        lots: [],
        attributes: variant.attributes,
        location: {
          warehouse: WAREHOUSE_CODE,
          zone: "",
          aisle: "",
          shelf: "",
          bin: "",
        },
        alerts: {
          lowStock: false,
          nearExpiration: false,
          expired: false,
          overstock: false,
        },
        metrics: {
          turnoverRate: 0,
          daysOnHand: 0,
          averageDailySales: 0,
          seasonalityFactor: 1,
        },
        isActive: true,
      };

      if (!APPLY) {
        log(
          `${tag()} Crearía Inventory: ${product.name} / ${variant.name} (qty=${qty})`,
        );
        continue;
      }

      await InventoryModel.create(draft as any);
      log(
        `${tag()} Inventory creado: ${product.name} / ${variant.name} (qty=${qty})`,
      );
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  log(`Modo: ${APPLY ? "APPLY (escribirá)" : "DRY-RUN (no escribe)"}`);
  log(`MongoDB: ${MONGODB_URI.replace(/:\/\/[^@]+@/, "://<credentials>@")}`);
  log(`Dominio principal: ${PRIMARY_DOMAIN}`);
  log(`Dominio alternativo (staging): ${ALT_DOMAIN}`);
  log("");

  await connect(MONGODB_URI);
  log("✓ Conectado a MongoDB");

  try {
    const TenantModel = model(Tenant.name, TenantSchema);
    const WarehouseModel = model(Warehouse.name, WarehouseSchema);
    const StorefrontConfigModel = model(
      StorefrontConfig.name,
      StorefrontConfigSchema,
    );
    const ProductModel = model(Product.name, ProductSchema);
    const InventoryModel = model(Inventory.name, InventorySchema);

    log("");
    log("─── Step 1/5: Tenant ─────────────────────────────────");
    const tenant = await ensureTenant(TenantModel);

    log("");
    log("─── Step 2/5: Warehouse ──────────────────────────────");
    const warehouse = await ensureWarehouse(WarehouseModel, tenant._id);

    log("");
    log("─── Step 3/5: StorefrontConfig ───────────────────────");
    await ensureStorefrontConfig(StorefrontConfigModel, tenant._id);

    log("");
    log("─── Step 4/5: Products ───────────────────────────────");
    const products = await ensureProducts(ProductModel, tenant._id);

    log("");
    log("─── Step 5/5: Inventory ──────────────────────────────");
    await ensureInventory(
      InventoryModel,
      tenant._id,
      warehouse._id,
      products,
    );

    log("");
    log("─── Resumen ──────────────────────────────────────────");
    log(`Tenant ID:       ${tenant._id}`);
    log(`Warehouse ID:    ${warehouse._id}`);
    log(`Productos:       ${products.length}`);
    log(`Variantes total: ${products.reduce((s, p) => s + p.variants.length, 0)}`);
    log("");
    if (!APPLY) {
      log("⚠️  DRY-RUN — NO se escribió nada en la DB.");
      log("    Para aplicar, ejecuta nuevamente con --apply");
    } else {
      log("✅ Bootstrap completado. Próximo paso: cablear el HTML al backend.");
      log(`   Inyectar en window.OS_CONFIG.tenantId el valor: ${tenant._id}`);
    }
  } catch (err) {
    console.error("[os-bootstrap] ERROR:", err);
    process.exitCode = 1;
  } finally {
    await disconnect();
    log("✓ Desconectado de MongoDB");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
