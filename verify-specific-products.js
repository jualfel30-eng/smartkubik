const { MongoClient, ObjectId } = require('mongodb');

async function verifySpecificProducts() {
    const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    const tenantId = '68f59eda273377a751571e66';
    const client = new MongoClient(uri);

    const targets = [
        { name: 'Face Mask', sku: 'FACE-MASK-001-V2', expectedPrice: 15 },
        { name: 'Tote Bag', sku: 'TOTE-BAG-001-V2', expectedPrice: 45 },
        { name: 'Socks 3-Pack', sku: 'SOCKS-3-PACK-001-V2', expectedPrice: 25 },
        { name: 'Beanie', sku: 'BEANIE-001-V2', expectedPrice: 30 }
    ];

    try {
        await client.connect();
        const db = client.db('test');

        console.log('Verifying User Requested Products:\n');

        for (const t of targets) {
            const product = await db.collection('products').findOne({
                tenantId: new ObjectId(tenantId),
                sku: t.sku
            });

            if (product) {
                console.log(`✅ FOUND: ${t.name}`);
                console.log(`   - SKU: ${product.sku} (Expected: ${t.sku})`);
                // Check first variant price as representative
                const variantPrice = product.variants[0].basePrice;
                console.log(`   - Price: $${variantPrice} (Expected: $${t.expectedPrice})`);

                if (variantPrice === t.expectedPrice) {
                    console.log(`   - Price Match: OK`);
                } else {
                    console.log(`   - ❌ Price Mismatch`);
                }
            } else {
                console.log(`❌ MISSING: ${t.name} (SKU: ${t.sku})`);
            }
            console.log('---');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

verifySpecificProducts();
