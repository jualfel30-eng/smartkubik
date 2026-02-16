
const { MongoClient, ObjectId } = require('mongodb');

async function checkBOM() {
    const uri = "mongodb+srv://doadmin:s38127L9Pj05q4Om@db-mongodb-nyc3-38827-0c20165c.mongo.ondigitalocean.com/admin?tls=true&authSource=admin";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db('test');
        const productsCollection = db.collection('products');
        const bomCollection = db.collection('bill_of_materials');

        // 1. Find a product named "Hamburguesa Clásica"
        const product = await productsCollection.findOne({ name: { $regex: 'Hamburguesa', $options: 'i' } });

        if (!product) {
            console.log("❌ Product 'Hamburguesa' not found");
            return;
        }

        console.log(`Checking BOM for Product: ${product.name} (_id: ${product._id})`);

        // 2. Find BOM for this product
        const bom = await bomCollection.findOne({ productId: product._id });

        if (bom) {
            console.log(`✅ BOM Found (ID: ${bom._id})`);
            console.log(`Components (${bom.components.length}):`);

            for (const comp of bom.components) {
                // Check if ingredient exists
                console.log(`   Checking component ID: ${comp.componentProductId}`);
                const ingredient = await productsCollection.findOne({ _id: comp.componentProductId });

                if (ingredient) {
                    console.log(`   ✅ Found Ingredient: ${ingredient.name} (${ingredient.sku})`);
                } else {
                    console.log(`   ❌ MISSING IN DB: Component ID ${comp.componentProductId} not found in products collection`);
                }
            }
        } else {
            console.log("❌ BOM NOT FOUND for verifyProductId: " + product._id);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkBOM();
