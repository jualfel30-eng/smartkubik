
const { MongoClient } = require('mongodb');

// Connection URL from .env
const url = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(url);

async function main() {
    await client.connect();
    console.log("Connected successfully to REMOTE server");

    // Use the DB we found earlier
    const dbName = 'test';
    const db = client.db(dbName);

    // Find Tenant 'Tiendas Broas'
    const tenantsCollection = db.collection('tenants');
    const tenant = await tenantsCollection.findOne({ name: /Broas/i });

    if (!tenant) {
        console.log("Tenant 'Tiendas Broas' NOT FOUND.");
        return;
    }

    console.log(`FOUND Tenant: ${tenant.name} (_id: ${tenant._id})`);

    // Check Inventories for this tenant
    const inventoryCollection = db.collection('inventories');
    const productCollection = db.collection('products');

    const skuRegex = /flamenco/i;
    console.log(`\nChecking Inventory RETAIL PRICE for Tenant ${tenant.name} matching 'flamenco'...`);

    const items = await inventoryCollection.find({
        tenantId: tenant._id,
        $or: [
            { productName: skuRegex },
            { productSku: skuRegex }
        ]
    }).toArray();

    console.log(`Found ${items.length} items.`);

    for (const item of items) {
        console.log(`\n-- Item: ${item.productName} --`);
        console.log(`SKU: ${item.productSku}`);
        console.log(`TotalQuantity: ${item.totalQuantity}`);

        let catalogBasePrice = 0;
        let variantFound = false;

        if (item.productId) {
            const product = await productCollection.findOne({ _id: item.productId });
            if (product) {
                // Try to find variant match
                if (item.variantSku && product.variants) {
                    const variant = product.variants.find(v => v.sku === item.variantSku);
                    if (variant) {
                        catalogBasePrice = variant.basePrice;
                        variantFound = true;
                        console.log(`MATCHED Variant SKU: ${item.variantSku}`);
                        console.log(`Variant BasePrice (Retail): ${variant.basePrice}`);
                    } else {
                        console.log(`Variant SKU ${item.variantSku} NOT FOUND in Product.`);
                    }
                }

                if (!variantFound) {
                    // Fallback inspection
                    console.log("Checking First Variant as fallback...");
                    if (product.variants && product.variants.length > 0) {
                        console.log(`First Variant BasePrice: ${product.variants[0].basePrice}`);
                    }
                    console.log(`Top-level Product BasePrice? (checking schema): ${product.basePrice} (undefined expected)`);
                }
            }
        }

        const retailValue = item.totalQuantity * catalogBasePrice;
        console.log(`Calculated Retail Value: ${retailValue}`);
    }

    return 'Done.';
}

main()
    .then(console.log)
    .catch(console.error)
    .finally(() => client.close());
