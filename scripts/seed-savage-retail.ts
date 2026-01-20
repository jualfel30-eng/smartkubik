import { MongoClient, ObjectId } from 'mongodb';

// CONFIGURATION
const TENANT_ID = '68f59eda273377a751571e66'; // Savage Clothing (resetpublicidad+test2@gmail.com)
const MONGO_URI = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

// IMAGES
const IMAGES = {
    tee: 'http://localhost:3000/uploads/marketing/asset_tee_black_1768878900891.png',
    hoodie: 'http://localhost:3000/uploads/marketing/asset_hoodie_cream_1768878913988.png',
    pants: 'http://localhost:3000/uploads/marketing/asset_pants_cargo_1768878926705.png',
    // General cap fallback
    cap: 'http://localhost:3000/uploads/marketing/asset_cap_savage_1768878983262.png',
    // New User-Generated Assets (Accessories)
    facemask: 'http://localhost:3000/uploads/marketing/asset_acc_facemask.png',
    totebag: 'http://localhost:3000/uploads/marketing/asset_acc_totebag.png',
    socks: 'http://localhost:3000/uploads/marketing/asset_acc_socks.png',
    beanie: 'http://localhost:3000/uploads/marketing/asset_acc_beanie.png',
    // New User-Generated Assets (Pants)
    chino: 'http://localhost:3000/uploads/marketing/asset_pants_chino.png',
    shorts: 'http://localhost:3000/uploads/marketing/asset_pants_shorts.png',
    denim: 'http://localhost:3000/uploads/marketing/asset_pants_denim.png',
    cargo: 'http://localhost:3000/uploads/marketing/asset_pants_cargo.png',
    // New User-Generated Assets (Hoodies)
    cropped: 'http://localhost:3000/uploads/marketing/asset_hoodie_cropped.png',
    tech: 'http://localhost:3000/uploads/marketing/asset_hoodie_tech.png',
    distressed: 'http://localhost:3000/uploads/marketing/asset_hoodie_distressed.png',
    oversized: 'http://localhost:3000/uploads/marketing/asset_hoodie_oversized.png'
};

// DATASETS
const SIZES = ['S', 'M', 'L', 'XL'];

const PRODUCTS_DATA = [
    // TEES
    { name: 'Savage Basic Tee', type: 'tee', price: 35, cost: 12 },
    { name: 'Heavyweight Boxy Tee', type: 'tee', price: 45, cost: 15 },
    { name: 'Graphic Spine Tee', type: 'tee', price: 48, cost: 16 },
    { name: 'Acid Wash Tee', type: 'tee', price: 42, cost: 14 },
    { name: 'Essential Layer Tee', type: 'tee', price: 30, cost: 10 },

    // HOODIES
    { name: 'Core Hoodie', type: 'hoodie', price: 85, cost: 35 }, // Default hoodie image
    { name: 'Oversized Zip-Up', type: 'hoodie', price: 95, cost: 40, imgKey: 'oversized' },
    { name: 'Distressed Pullover', type: 'hoodie', price: 90, cost: 38, imgKey: 'distressed' },
    { name: 'Tech Fleece Hoodie', type: 'hoodie', price: 110, cost: 45, imgKey: 'tech' },
    { name: 'Cropped Hoodie', type: 'hoodie', price: 75, cost: 30, imgKey: 'cropped' },

    // PANTS
    { name: 'Savage Cargo', type: 'pants', price: 120, cost: 50, imgKey: 'cargo' },
    { name: 'Denim Slim', type: 'pants', price: 90, cost: 35, imgKey: 'denim' },
    { name: 'Jogger Tech', type: 'pants', price: 85, cost: 32 }, // Default pants image
    { name: 'Shorts Sweat', type: 'pants', price: 55, cost: 20, imgKey: 'shorts' },
    { name: 'Chino Relaxed', type: 'pants', price: 80, cost: 30, imgKey: 'chino' },

    // ACCESSORIES (User Requested)
    { name: 'Face Mask', type: 'cap', price: 15, cost: 5, skuOverride: 'FACE-MASK-001-V2', imgKey: 'facemask' },
    { name: 'Tote Bag', type: 'cap', price: 45, cost: 18, skuOverride: 'TOTE-BAG-001-V2', imgKey: 'totebag' },
    { name: 'Socks 3-Pack', type: 'cap', price: 25, cost: 8, skuOverride: 'SOCKS-3-PACK-001-V2', imgKey: 'socks' },
    { name: 'Beanie', type: 'cap', price: 30, cost: 10, skuOverride: 'BEANIE-001-V2', imgKey: 'beanie' },
    // Keeping one general item
    { name: 'Savage Dad Hat', type: 'cap', price: 35, cost: 12 },
];

async function seed() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db('test');

        const tenantObjectId = new ObjectId(TENANT_ID);

        // 1. CLEAR EXISTING PRODUCTS FOR THIS TENANT
        console.log(`Clearing existing products for tenant ${TENANT_ID}...`);
        const deleteResult = await db.collection('products').deleteMany({ tenantId: tenantObjectId });
        console.log(`Deleted ${deleteResult.deletedCount} existing products.`);

        // 2. INSERT PRODUCTS
        let productsInserted = 0;

        for (const item of PRODUCTS_DATA) {
            const productId = new ObjectId();
            const category = item.type === 'cap' ? 'Accessories' : 'Apparel';
            const subcategory = item.type === 'tee' ? 'T-Shirts' : item.type === 'hoodie' ? 'Sweatshirts' : item.type === 'pants' ? 'Bottoms' : 'Headwear';
            // Use specific image key if provided, otherwise fallback to type-based defaults
            const img = (item as any).imgKey ? IMAGES[(item as any).imgKey as keyof typeof IMAGES] : IMAGES[item.type as keyof typeof IMAGES];

            // Generate Variants with V2 SKU
            const variants = [];
            if (item.type === 'cap') {
                const baseSku = item.skuOverride ? item.skuOverride.replace('-V2', '') : `${item.name.replace(/\s+/g, '-').toUpperCase()}-OS`;
                variants.push({
                    _id: new ObjectId(),
                    name: 'One Size',
                    sku: `${baseSku}-V2`,
                    unit: 'unidad',
                    unitSize: 1,
                    basePrice: item.price,
                    costPrice: item.cost,
                    isActive: true,
                    barcode: Math.floor(Math.random() * 1000000000).toString()
                });
            } else {
                for (const size of SIZES) {
                    variants.push({
                        _id: new ObjectId(),
                        name: size,
                        sku: `${item.name.replace(/\s+/g, '-').toUpperCase()}-${size}-V2`,
                        unit: 'unidad',
                        unitSize: 1,
                        basePrice: item.price,
                        costPrice: item.cost,
                        isActive: true,
                        barcode: Math.floor(Math.random() * 1000000000).toString()
                    });
                }
            }

            const productSku = item.skuOverride || `${item.name.replace(/\s+/g, '-').toUpperCase()}-001-V2`;

            const product = {
                _id: productId,
                sku: productSku,
                productType: 'simple',
                name: item.name,
                category: [category],
                subcategory: [subcategory],
                brand: 'Savage Clothing',
                unitOfMeasure: 'unidad',
                description: `High quality ${item.name} from the latest Savage collection.`,
                tags: ['New Arrival', 'Savage', category],
                variants: variants,
                suppliers: [], // Empty for now
                isPerishable: false,
                ivaApplicable: true,
                igtfExempt: false,
                taxCategory: 'General',
                isActive: true,
                tenantId: tenantObjectId,
                images: [img], // Assigning the image path
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryConfig: {
                    trackLots: false,
                    trackExpiration: false,
                    minimumStock: 10,
                    maximumStock: 100,
                    reorderPoint: 20,
                    reorderQuantity: 50,
                    fefoEnabled: false
                }
            };

            await db.collection('products').insertOne(product);
            productsInserted++;
            console.log(`Inserted: ${item.name}`);
        }

        console.log(`\n✅ Successfully seeded ${productsInserted} products for matching Tenant ID ${TENANT_ID}.`);

    } catch (error) {
        console.error('❌ Error seeding:', error);
    } finally {
        await client.close();
    }
}

seed();
