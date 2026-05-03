const { MongoClient, ObjectId } = require('mongodb');

async function debugPOS() {
    const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    const tenantId = '68f59eda273377a751571e66';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('test');

        // 1. Fetch Tenant to check Vertical
        const tenant = await db.collection('tenants').findOne({ _id: new ObjectId(tenantId) });
        const isRestaurant = (tenant.vertical === 'food-service' || tenant.settings?.vertical === 'food-service');
        console.log(`Tenant Vertical: ${tenant.vertical}, Is Restaurant: ${isRestaurant}`);

        // 2. Fetch Products
        const products = await db.collection('products').find({
            tenantId: new ObjectId(tenantId),
            isActive: true
        }).toArray();
        console.log(`Active Products Found: ${products.length}`);

        // 3. Fetch Inventory
        const inventories = await db.collection('inventories').find({
            tenantId: new ObjectId(tenantId),
            isActive: true
        }).toArray();
        console.log(`Active Inventories Found: ${inventories.length}`);

        // 4. Build Inventory Map (Simulating Frontend)
        const invMap = {};
        inventories.forEach(inv => {
            const pId = String(inv.productId); // DB returns ObjectId, String() converts to hex
            invMap[pId] = (invMap[pId] || 0) + (inv.availableQuantity || 0);
        });

        // 5. Filter Products (Simulating Frontend)
        const validProducts = products.filter(product => {
            const productId = String(product._id);
            const stock = invMap[productId] || 0;
            const type = product.productType || 'simple';

            // Log specific check for one item
            if (product.sku === 'FACE-MASK-001-V2') {
                console.log(`\nDEBUG FACE MASK:`);
                console.log(`- ID: ${productId}`);
                console.log(`- Stock in Map: ${stock}`);
                console.log(`- Type: ${type}`);
                console.log(`- Is Restaurant Mode: ${isRestaurant}`);
            }

            if (isRestaurant) {
                if (['supply', 'raw_material', 'consumable'].includes(type)) return false;
                return true;
            }

            // Retail Logic
            return stock > 0;
        });

        console.log(`\n✅ POS VISIBLE PRODUCTS: ${validProducts.length}`);

        if (validProducts.length === 0) {
            console.log("❌ ZERO PRODUCTS VISIBLE! Investigating mismatches...");
            // Check IDs
            if (products.length > 0 && inventories.length > 0) {
                const pId = String(products[0]._id);
                const invPId = String(inventories[0].productId);
                console.log(`Sample Product ID: ${pId}`);
                console.log(`Sample Inventory PID: ${invPId}`);
                console.log(`Match? ${pId === invPId}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

debugPOS();
