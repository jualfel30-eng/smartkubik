const { MongoClient, ObjectId } = require('mongodb');

async function verify() {
    const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    const tenantId = '68f59eda273377a751571e66';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('test');

        // Count products
        const count = await db.collection('products').countDocuments({
            tenantId: new ObjectId(tenantId)
        });

        console.log(`Total Products for Savage Clothing: ${count}`);

        if (count >= 20) {
            console.log('✅ Success: At least 20 products found.');
        } else {
            console.log('❌ Error: Expected 20+ products.');
        }

        // Check one product details
        const product = await db.collection('products').findOne({
            tenantId: new ObjectId(tenantId),
            brand: 'Savage Clothing'
        });

        if (product) {
            console.log('\nSample Product:');
            console.log(`- Name: ${product.name}`);
            console.log(`- SKU: ${product.sku}`);
            console.log(`- Image: ${product.images[0]}`);
            console.log(`- Variants Count: ${product.variants.length}`);

            if (product.images[0].includes('localhost:3000/uploads/marketing')) {
                console.log('✅ Image URL format is correct.');
            } else {
                console.log('⚠️ Warning: Image URL format might be incorrect.');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

verify();
