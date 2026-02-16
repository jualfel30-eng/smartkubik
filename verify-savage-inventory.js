const { MongoClient, ObjectId } = require('mongodb');

async function verifyInventory() {
    const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    const tenantId = '68f59eda273377a751571e66';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('test');

        // Count Inventory Records
        const count = await db.collection('inventories').countDocuments({
            tenantId: new ObjectId(tenantId)
        });

        console.log(`Total Inventory Records for Savage Clothing: ${count}`);

        // Expected: 15 products * 4 sizes + 5 products * 1 size = 65 records
        if (count >= 65) {
            console.log('✅ Success: All variants have inventory.');
        } else {
            console.log(`⚠️ Warning: Expected 65+ records, found ${count}.`);
        }

        // Identify products without inventory
        const products = await db.collection('products').find({ tenantId: new ObjectId(tenantId) }).toArray();
        for (const p of products) {
            if (p.variants && p.variants.length > 0) {
                for (const v of p.variants) {
                    const inv = await db.collection('inventories').findOne({
                        tenantId: new ObjectId(tenantId),
                        variantId: v._id
                    });
                    if (!inv) {
                        console.log(`❌ Missing inventory for: ${p.name} [${v.name}]`);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

verifyInventory();
