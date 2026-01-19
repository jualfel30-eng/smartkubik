import { connect, disconnect, model, Types } from 'mongoose';
import { Product, ProductSchema } from '../src/schemas/product.schema';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
const TARGET_TENANT_ID = '6962b024c96f2d4a2370ebe4'; // Savage Restaurante
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

type ProductDefinition = {
    sku: string;
    name: string;
    category: string;
    subcategory: string;
    basePrice: number;
    costPrice: number;
    description: string;
    imageName: string;
    isPerishable: boolean;
    ingredients: string[];
};

// 10 Burgers, 3 Drinks, 3 Desserts
const productsToCreate: ProductDefinition[] = [
    // --- BURGERS ---
    {
        sku: 'SVG-HAMB-CLASSIC',
        name: 'Savage Classic Burger',
        category: 'Alimentos',
        subcategory: 'Hamburguesas',
        basePrice: 12.50,
        costPrice: 4.50,
        description: 'Nuestra hamburguesa insignia: 200g de carne angus, queso cheddar derretido, lechuga fresca, tomate y pan brioche artesanal.',
        imageName: 'burger_classic.png',
        isPerishable: true,
        ingredients: ['Carne Angus', 'Queso Cheddar', 'Pan Brioche', 'Lechuga', 'Tomate']
    },
    {
        sku: 'SVG-HAMB-BBQ',
        name: 'Smoky BBQ Bacon',
        category: 'Alimentos',
        subcategory: 'Hamburguesas',
        basePrice: 14.99,
        costPrice: 5.20,
        description: 'Para los amantes del ahumado: aros de cebolla crujientes, tocineta ahumada, salsa BBQ de la casa y queso americano.',
        imageName: 'burger_bbq.png',
        isPerishable: true,
        ingredients: ['Carne Res', 'Tocineta', 'Aros de Cebolla', 'Salsa BBQ', 'Pan Sésamo']
    },
    {
        sku: 'SVG-HAMB-CRISPY',
        name: 'Crispy Chicken Deluxe',
        category: 'Alimentos',
        subcategory: 'Hamburguesas',
        basePrice: 11.50,
        costPrice: 3.80,
        description: 'Pollo frito extra crujiente, ensalada de col (coleslaw) cremosa y pepinillos encurtidos en casa.',
        imageName: 'burger_chicken.png',
        isPerishable: true,
        ingredients: ['Pollo Frito', 'Coleslaw', 'Pepinillos', 'Pan Brioche']
    },
    {
        sku: 'SVG-HAMB-VEGGIE',
        name: 'Green Goddess Veggie',
        category: 'Alimentos',
        subcategory: 'Hamburguesas',
        basePrice: 13.00,
        costPrice: 4.00,
        description: 'Opción vegetariana llena de sabor: patty de lentejas y champiñones, aguacate fresco, brotes de alfalfa y pan integral.',
        imageName: 'burger_veggie.png',
        isPerishable: true,
        ingredients: ['Patty Vegetariana', 'Aguacate', 'Brotes', 'Pan Integral']
    },
    {
        sku: 'SVG-HAMB-TRUFFLE',
        name: 'Truffle Mushroom Swiss',
        category: 'Alimentos',
        subcategory: 'Hamburguesas',
        basePrice: 16.50,
        costPrice: 6.00,
        description: 'Elegancia pura: champiñones salteados, aceite de trufa blanca, queso suizo fundido y mayonesa de ajo negro.',
        imageName: 'burger_classic.png', // Reusing classic image as base
        isPerishable: true,
        ingredients: ['Carne Angus', 'Champiñones', 'Queso Suizo', 'Aceite Trufa']
    },
    {
        sku: 'SVG-HAMB-SPICY',
        name: 'Diablo Spicy Burger',
        category: 'Alimentos',
        subcategory: 'Hamburguesas',
        basePrice: 13.99,
        costPrice: 4.80,
        description: 'Solo para valientes: jalapeños frescos, salsa picante de la casa, queso pepper jack y cebollas asadas.',
        imageName: 'burger_bbq.png', // Reusing BBQ image for spicy look
        isPerishable: true,
        ingredients: ['Carne Res', 'Jalapeños', 'Queso Pepper Jack', 'Salsa Picante']
    },
    {
        sku: 'SVG-HAMB-BLUE',
        name: 'Blue Cheese & Pear',
        category: 'Alimentos',
        subcategory: 'Hamburguesas',
        basePrice: 15.50,
        costPrice: 5.50,
        description: 'Contraste dulce y salado: queso azul intenso, peras caramelizadas, nueces y reducción de balsámico.',
        imageName: 'burger_classic.png',
        isPerishable: true,
        ingredients: ['Carne Angus', 'Queso Azul', 'Peras', 'Nueces']
    },
    {
        sku: 'SVG-HAMB-BREAKFAST',
        name: 'Morning Glory Burger',
        category: 'Alimentos',
        subcategory: 'Hamburguesas',
        basePrice: 14.50,
        costPrice: 5.00,
        description: 'El desayuno hecho hamburguesa: huevo frito, tocino crujiente, hash brown y salsa holandesa.',
        imageName: 'burger_bbq.png',
        isPerishable: true,
        ingredients: ['Carne Res', 'Huevo', 'Tocino', 'Hash Brown']
    },
    {
        sku: 'SVG-HAMB-DOUBLE',
        name: 'The Savage Double',
        category: 'Alimentos',
        subcategory: 'Hamburguesas',
        basePrice: 18.99,
        costPrice: 7.50,
        description: 'Doble carne, doble queso, doble placer. Acompañada de todas las salsas de la casa.',
        imageName: 'burger_classic.png',
        isPerishable: true,
        ingredients: ['Doble Carne', 'Doble Queso', 'Tocino', 'Salsas']
    },
    {
        sku: 'SVG-HAMB-SLIDERS',
        name: 'Trio Sliders',
        category: 'Alimentos',
        subcategory: 'Hamburguesas',
        basePrice: 14.00,
        costPrice: 4.50,
        description: 'Tres mini hamburguesas para probar de todo: 1 clásica, 1 BBQ y 1 de pollo.',
        imageName: 'burger_classic.png',
        isPerishable: true,
        ingredients: ['Mini Carnes', 'Variedad Quesos', 'Mini Panes']
    },

    // --- DRINKS ---
    {
        sku: 'SVG-DRK-COLA',
        name: 'Craft Cola',
        category: 'Bebidas',
        subcategory: 'Refrescos',
        basePrice: 3.50,
        costPrice: 0.80,
        description: 'Refresco de cola artesanal con hielo y rodaja de limón.',
        imageName: 'drink_cola.png',
        isPerishable: false,
        ingredients: []
    },
    {
        sku: 'SVG-DRK-WATER',
        name: 'Mineral Water Artesian',
        category: 'Bebidas',
        subcategory: 'Agua',
        basePrice: 2.50,
        costPrice: 0.50,
        description: 'Agua mineral de manantial natural, servida en botella de vidrio.',
        imageName: 'drink_water.png',
        isPerishable: false,
        ingredients: []
    },
    {
        sku: 'SVG-DRK-LEMONADE',
        name: 'Fresh Mint Lemonade',
        category: 'Bebidas',
        subcategory: 'Jugos',
        basePrice: 4.50,
        costPrice: 1.20,
        description: 'Limonada recién exprimida con hojas de menta fresca y hielo picado.',
        imageName: 'drink_water.png', // Reusing fresh look
        isPerishable: true,
        ingredients: ['Limón', 'Menta', 'Azúcar']
    },

    // --- DESSERTS ---
    {
        sku: 'SVG-DST-CHEESE',
        name: 'NY Strawberry Cheesecake',
        category: 'Alimentos',
        subcategory: 'Postres',
        basePrice: 7.99,
        costPrice: 3.00,
        description: 'Clásica tarta de queso estilo New York con topping de fresas frescas.',
        imageName: 'dessert_cheesecake.png',
        isPerishable: true,
        ingredients: ['Queso Crema', 'Galleta', 'Fresas']
    },
    {
        sku: 'SVG-DST-BROWNIE',
        name: 'Volcano Brownie',
        category: 'Alimentos',
        subcategory: 'Postres',
        basePrice: 8.50,
        costPrice: 3.20,
        description: 'Brownie de chocolate caliente servido con una bola de helado de vainilla.',
        imageName: 'dessert_brownie.png',
        isPerishable: true,
        ingredients: ['Chocolate', 'Harina', 'Helado Vainilla']
    },
    {
        sku: 'SVG-DST-LAVA',
        name: 'Chocolate Lava Cake',
        category: 'Alimentos',
        subcategory: 'Postres',
        basePrice: 9.00,
        costPrice: 3.50,
        description: 'Bizcocho de chocolate con centro líquido caliente.',
        imageName: 'dessert_brownie.png', // Close enough
        isPerishable: true,
        ingredients: ['Chocolate Amargo', 'Mantequilla', 'Huevos']
    }
];

async function populateSavageProducts() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await connect(MONGODB_URI);
        console.log('✅ Connected.');

        const ProductModel = model(Product.name, ProductSchema);
        const TenantModel = model(Tenant.name, TenantSchema);

        // Verify Tenant
        const tenant = await TenantModel.findById(TARGET_TENANT_ID);
        if (!tenant) {
            throw new Error(`Tenant ${TARGET_TENANT_ID} not found!`);
        }
        console.log(`🏢 Target Tenant: ${tenant.name} (${tenant._id})`);

        // Clean existing products with these SKUs to avoid duplicates/errors
        const skus = productsToCreate.map(p => p.sku);
        console.log(`🧹 Cleaning up existing products with SKUs: ${skus.join(', ')}...`);
        await ProductModel.deleteMany({
            tenantId: tenant._id,
            sku: { $in: skus }
        });

        console.log('🚀 inserting products...');
        const productsToInsert = productsToCreate.map(p => ({
            name: p.name,
            sku: p.sku,
            description: p.description,
            category: p.category,
            subcategory: p.subcategory,
            brand: 'Savage Kitchen',

            // Pricing
            basePrice: p.basePrice,
            costPrice: p.costPrice,
            pricingRules: {
                usdPrice: p.basePrice,
                minimumMargin: 0.3,
            },

            // Images (Local URL)
            images: [`${API_BASE_URL}/uploads/products/${p.imageName}`],

            // Inventory Config
            isPerishable: p.isPerishable,
            inventoryConfig: {
                trackStock: true,
                minimumStock: 10,
                reorderPoint: 20
            },

            // Status
            isActive: true,
            tenantId: tenant._id,
            taxCategory: 'standard', // Added

            // Variants (Default simple variant)
            variants: [{
                name: p.name,
                sku: `${p.sku}-STD`,
                basePrice: p.basePrice,
                costPrice: p.costPrice,
                isActive: true,
                unit: 'unidad', // Added
                unitSize: 1,    // Added
                images: [`${API_BASE_URL}/uploads/products/${p.imageName}`]
            }],

            tags: ['savage_demo', ...p.ingredients]
        }));

        const result = await ProductModel.insertMany(productsToInsert);
        console.log(`✅ Successfully inserted ${result.length} products into Savage Restaurante!`);

    } catch (error) {
        console.error('❌ Error populating products:', error);
    } finally {
        await disconnect();
        console.log('👋 Disconnected.');
    }
}

populateSavageProducts();
