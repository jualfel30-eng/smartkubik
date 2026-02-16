import { connect, disconnect, model, Types } from 'mongoose';
import { Product, ProductDocument, ProductSchema } from '../src/schemas/product.schema';
import { BillOfMaterials, BillOfMaterialsSchema } from '../src/schemas/bill-of-materials.schema';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
const TARGET_TENANT_ID = '6962b024c96f2d4a2370ebe4'; // Savage Restaurante

// Ingredients to create (Raw Materials)
const ingredients = [
    // Meats
    { name: 'Carne Angus Molida', sku: 'ING-MEAT-ANGUS', unit: 'kg', cost: 12.50, category: 'Carnes' },
    { name: 'Pechuga de Pollo', sku: 'ING-MEAT-CHICKEN', unit: 'kg', cost: 8.00, category: 'Carnes' },
    { name: 'Tocineta Ahumada', sku: 'ING-MEAT-BACON', unit: 'kg', cost: 15.00, category: 'Carnes' },
    { name: 'Patty Vegetariana', sku: 'ING-VEG-PATTY', unit: 'unidad', cost: 1.50, category: 'Congelados' },

    // Buns
    { name: 'Pan Brioche Artesanal', sku: 'ING-BUN-BRIOCHE', unit: 'unidad', cost: 0.80, category: 'Panadería' },
    { name: 'Pan con Sésamo', sku: 'ING-BUN-SESAME', unit: 'unidad', cost: 0.60, category: 'Panadería' },
    { name: 'Pan Integral', sku: 'ING-BUN-WHEAT', unit: 'unidad', cost: 0.70, category: 'Panadería' },
    { name: 'Pan Mini Slider', sku: 'ING-BUN-SLIDER', unit: 'unidad', cost: 0.30, category: 'Panadería' },

    // Dairy
    { name: 'Queso Cheddar Lonjas', sku: 'ING-DAIRY-CHEDDAR', unit: 'kg', cost: 14.00, category: 'Lácteos' },
    { name: 'Queso Americano', sku: 'ING-DAIRY-AMERICAN', unit: 'kg', cost: 10.00, category: 'Lácteos' },
    { name: 'Queso Suizo', sku: 'ING-DAIRY-SWISS', unit: 'kg', cost: 18.00, category: 'Lácteos' },
    { name: 'Queso Pepper Jack', sku: 'ING-DAIRY-PJACK', unit: 'kg', cost: 16.00, category: 'Lácteos' },
    { name: 'Queso Azul', sku: 'ING-DAIRY-BLUE', unit: 'kg', cost: 22.00, category: 'Lácteos' },

    // Veggies
    { name: 'Lechuga Fresca', sku: 'ING-VEG-LETTUCE', unit: 'kg', cost: 2.00, category: 'Verduras' },
    { name: 'Tomate', sku: 'ING-VEG-TOMATO', unit: 'kg', cost: 3.00, category: 'Verduras' },
    { name: 'Cebolla Morada', sku: 'ING-VEG-ONION-RED', unit: 'kg', cost: 1.50, category: 'Verduras' },
    { name: 'Aros de Cebolla (Congelados)', sku: 'ING-VEG-ONIONRINGS', unit: 'kg', cost: 5.00, category: 'Congelados' },
    { name: 'Pepinillos', sku: 'ING-VEG-PICKLES', unit: 'kg', cost: 4.00, category: 'Encurtidos' },
    { name: 'Champiñones', sku: 'ING-VEG-MUSHROOMS', unit: 'kg', cost: 6.00, category: 'Verduras' },
    { name: 'Jalapeños', sku: 'ING-VEG-JALAPENO', unit: 'kg', cost: 5.00, category: 'Verduras' },
    { name: 'Aguacate', sku: 'ING-VEG-AVOCADO', unit: 'kg', cost: 8.00, category: 'Verduras' },
    { name: 'Brotes de Alfalfa', sku: 'ING-VEG-SPROUTS', unit: 'kg', cost: 12.00, category: 'Verduras' },
    { name: 'Peras', sku: 'ING-FRUIT-PEAR', unit: 'kg', cost: 4.50, category: 'Frutas' },

    // Pantry/Sauces
    { name: 'Salsa BBQ', sku: 'ING-SAUCE-BBQ', unit: 'lt', cost: 5.00, category: 'Salsas' },
    { name: 'Aceite de Trufa', sku: 'ING-OIL-TRUFFLE', unit: 'lt', cost: 40.00, category: 'Despensa' },
    { name: 'Nueces', sku: 'ING-NUT-WALNUT', unit: 'kg', cost: 20.00, category: 'Despensa' },
    { name: 'Huevos', sku: 'ING-EGG', unit: 'unidad', cost: 0.20, category: 'Lácteos' },
    { name: 'Hash Brown', sku: 'ING-HASHBROWN', unit: 'unidad', cost: 0.50, category: 'Congelados' },
    { name: 'Mayonesa Ajo Negro', sku: 'ING-MAYO-BLACKGARLIC', unit: 'lt', cost: 8.00, category: 'Salsas' },
    { name: 'Salsa Picante', sku: 'ING-SAUCE-HOT', unit: 'lt', cost: 6.00, category: 'Salsas' }
];

// Recipe Definitions (Burger SKU -> Ingredients List)
const recipes: Record<string, Array<{ sku: string, qty: number }>> = {
    'SVG-HAMB-CLASSIC': [
        { sku: 'ING-BUN-BRIOCHE', qty: 1 },
        { sku: 'ING-MEAT-ANGUS', qty: 0.2 }, // 200g
        { sku: 'ING-DAIRY-CHEDDAR', qty: 0.03 }, // 30g
        { sku: 'ING-VEG-LETTUCE', qty: 0.02 },
        { sku: 'ING-VEG-TOMATO', qty: 0.03 }
    ],
    'SVG-HAMB-BBQ': [
        { sku: 'ING-BUN-SESAME', qty: 1 },
        { sku: 'ING-MEAT-ANGUS', qty: 0.2 },
        { sku: 'ING-DAIRY-AMERICAN', qty: 0.03 },
        { sku: 'ING-MEAT-BACON', qty: 0.04 }, // 2 slices roughly
        { sku: 'ING-VEG-ONIONRINGS', qty: 0.08 },
        { sku: 'ING-SAUCE-BBQ', qty: 0.03 }
    ],
    'SVG-HAMB-CRISPY': [
        { sku: 'ING-BUN-BRIOCHE', qty: 1 },
        { sku: 'ING-MEAT-CHICKEN', qty: 0.18 }, // Chicken breast
        { sku: 'ING-VEG-PICKLES', qty: 0.02 },
        // Simplified coleslaw as just lettuce for demo if needed, but we don't have coleslaw mix defined
        { sku: 'ING-VEG-LETTUCE', qty: 0.05 }
    ],
    'SVG-HAMB-VEGGIE': [
        { sku: 'ING-BUN-WHEAT', qty: 1 },
        { sku: 'ING-VEG-PATTY', qty: 1 },
        { sku: 'ING-VEG-AVOCADO', qty: 0.1 }, // Half avocado roughly
        { sku: 'ING-VEG-SPROUTS', qty: 0.02 },
        { sku: 'ING-VEG-TOMATO', qty: 0.03 }
    ],
    'SVG-HAMB-TRUFFLE': [
        { sku: 'ING-BUN-BRIOCHE', qty: 1 },
        { sku: 'ING-MEAT-ANGUS', qty: 0.2 },
        { sku: 'ING-DAIRY-SWISS', qty: 0.03 },
        { sku: 'ING-VEG-MUSHROOMS', qty: 0.08 },
        { sku: 'ING-OIL-TRUFFLE', qty: 0.005 }, // 5ml
        { sku: 'ING-MAYO-BLACKGARLIC', qty: 0.02 }
    ],
    'SVG-HAMB-SPICY': [
        { sku: 'ING-BUN-SESAME', qty: 1 },
        { sku: 'ING-MEAT-ANGUS', qty: 0.2 },
        { sku: 'ING-DAIRY-PJACK', qty: 0.03 },
        { sku: 'ING-VEG-JALAPENO', qty: 0.03 },
        { sku: 'ING-SAUCE-HOT', qty: 0.02 },
        { sku: 'ING-VEG-ONION-RED', qty: 0.02 }
    ],
    'SVG-HAMB-BLUE': [
        { sku: 'ING-BUN-BRIOCHE', qty: 1 },
        { sku: 'ING-MEAT-ANGUS', qty: 0.2 },
        { sku: 'ING-DAIRY-BLUE', qty: 0.04 },
        { sku: 'ING-FRUIT-PEAR', qty: 0.06 },
        { sku: 'ING-NUT-WALNUT', qty: 0.01 }
    ],
    'SVG-HAMB-BREAKFAST': [
        { sku: 'ING-BUN-BRIOCHE', qty: 1 },
        { sku: 'ING-MEAT-ANGUS', qty: 0.2 },
        { sku: 'ING-EGG', qty: 1 },
        { sku: 'ING-MEAT-BACON', qty: 0.04 },
        { sku: 'ING-HASHBROWN', qty: 1 }
    ],
    'SVG-HAMB-DOUBLE': [
        { sku: 'ING-BUN-SESAME', qty: 1 },
        { sku: 'ING-MEAT-ANGUS', qty: 0.4 }, // Double meat
        { sku: 'ING-DAIRY-CHEDDAR', qty: 0.06 }, // Double cheese
        { sku: 'ING-MEAT-BACON', qty: 0.04 },
        { sku: 'ING-VEG-LETTUCE', qty: 0.02 },
        { sku: 'ING-SAUCE-BBQ', qty: 0.03 }
    ],
    'SVG-HAMB-SLIDERS': [
        { sku: 'ING-BUN-SLIDER', qty: 3 },
        { sku: 'ING-MEAT-ANGUS', qty: 0.18 }, // 3 x 60g roughly
        { sku: 'ING-DAIRY-CHEDDAR', qty: 0.03 },
        { sku: 'ING-VEG-PICKLES', qty: 0.03 }
    ]
};

async function populateSavageRecipes() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await connect(MONGODB_URI);
        console.log('✅ Connected.');

        const ProductModel = model(Product.name, ProductSchema);
        const ProductVariantSchema = ProductSchema.path('variants').schema; // Might need this if querying variants directly logic differs
        const BOMModel = model(BillOfMaterials.name, BillOfMaterialsSchema);
        const TenantModel = model(Tenant.name, TenantSchema);

        // Verify Tenant
        const tenant = await TenantModel.findById(TARGET_TENANT_ID);
        if (!tenant) {
            throw new Error(`Tenant ${TARGET_TENANT_ID} not found!`);
        }
        console.log(`🏢 Target Tenant: ${tenant.name} (${tenant._id})`);

        // 1. Create Ingredients (Raw Materials)
        console.log('🥦 Creating Raw Materials (Ingredients)...');

        // Clean old ingredients first to ensure fresh start
        const ingredientSkus = ingredients.map(i => i.sku);
        await ProductModel.deleteMany({
            tenantId: tenant._id,
            sku: { $in: ingredientSkus }
        });

        const createdIngredients: Record<string, ProductDocument> = {};

        for (const ing of ingredients) {
            const product = new ProductModel({
                sku: ing.sku,
                name: ing.name,
                productType: 'raw_material',
                category: [ing.category],
                subcategory: ['Materia Prima'],
                brand: 'Generic',
                unitOfMeasure: ing.unit,
                basePrice: ing.cost * 1.5, // Dummy selling price
                costPrice: ing.cost,
                description: `Ingrediente: ${ing.name}`,
                isActive: true,
                tenantId: tenant._id,
                isPerishable: true,
                taxCategory: 'exempt',
                pricingRules: {
                    usdPrice: ing.cost * 1.5,
                    minimumMargin: 0.3,
                    cashDiscount: 0,
                    cardSurcharge: 0,
                    maximumDiscount: 0
                },
                tags: ['ingrediente', 'raw_material', 'savage_demo']
            });

            const saved = await product.save();
            createdIngredients[ing.sku] = saved;
            // console.log(`   - Created ${ing.name}`);
        }
        console.log(`✅ Created ${ingredients.length} ingredients.`);

        // 2. Create BOMs
        console.log('📜 Creating Recipes (BOMs)...');

        for (const [productSku, components] of Object.entries(recipes)) {
            // Find the main product (Burger)
            const mainProduct = await ProductModel.findOne({ tenantId: tenant._id, sku: productSku });
            if (!mainProduct) {
                console.warn(`⚠️  Main product ${productSku} not found. Skipping recipe.`);
                continue;
            }

            // Check for existing BOM and remove it
            await BOMModel.deleteMany({ tenantId: tenant._id, productId: mainProduct._id });

            // Build BOM components
            const bomComponents: any[] = [];
            for (const comp of components) {
                const ingredient = createdIngredients[comp.sku];
                if (!ingredient) {
                    console.warn(`⚠️  Ingredient ${comp.sku} not found for recipe ${productSku}.`);
                    continue;
                }

                bomComponents.push({
                    componentProductId: ingredient._id,
                    quantity: comp.qty,
                    unit: ingredient.unitOfMeasure,
                    scrapPercentage: 0,
                    isOptional: false
                });
            }

            const bom = new BOMModel({
                productId: mainProduct._id,
                code: `RECIPE-${productSku}`,
                name: `Receta: ${mainProduct.name}`,
                productionQuantity: 1,
                productionUnit: 'unidad',
                components: bomComponents,
                bomType: 'production',
                productionCategory: 'Cocina Caliente',
                isActive: true,
                tenantId: tenant._id
            });

            await bom.save();
            console.log(`   - Created BOM for ${mainProduct.name}`);
        }

        console.log('🎉 Recipe population complete!');

    } catch (error) {
        console.error('❌ Error populating recipes:', error);
    } finally {
        await disconnect();
        console.log('👋 Disconnected.');
    }
}

populateSavageRecipes();
