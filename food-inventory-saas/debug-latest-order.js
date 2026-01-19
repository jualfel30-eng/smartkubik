
const { MongoClient, ObjectId } = require('mongodb');

async function checkLatestOrder() {
    const uri = "mongodb+srv://doadmin:s38127L9Pj05q4Om@db-mongodb-nyc3-38827-0c20165c.mongo.ondigitalocean.com/admin?tls=true&authSource=admin";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db('test');
        const ordersCollection = db.collection('orders');

        // Find the latest order
        const latestOrders = await ordersCollection.find().sort({ createdAt: -1 }).limit(1).toArray();

        if (latestOrders.length === 0) {
            console.log("❌ No orders found");
            return;
        }

        const order = latestOrders[0];
        console.log(`✅ Latest Order: ${order.orderNumber} (ID: ${order._id})`);

        if (order.items && order.items.length > 0) {
            order.items.forEach((item, index) => {
                console.log(`   Item ${index + 1}: ${item.productName}`);
                console.log(`   - Modifiers:`, item.modifiers);
                console.log(`   - Removed Ingredients (Raw):`, item.removedIngredients);

                if (item.removedIngredients && item.removedIngredients.length > 0) {
                    console.log("   ⚠️  Found removed ingredients! IDs present.");
                } else {
                    console.log("   ❌ No removed ingredients found on this item.");
                }
            });
        } else {
            console.log("   ❌ No items in order.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkLatestOrder();
