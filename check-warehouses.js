const { MongoClient, ObjectId } = require('mongodb');

async function checkWarehouses() {
    const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    const tenantId = '68f59eda273377a751571e66';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('test');

        // Find Warehouses
        const warehouses = await db.collection('warehouses').find({
            tenantId: new ObjectId(tenantId)
        }).toArray();

        console.log(`Warehouses found: ${warehouses.length}`);
        warehouses.forEach(w => {
            console.log(`- ID: ${w._id}, Name: ${w.name}, Default: ${w.isDefault}`);
        });

        if (warehouses.length > 0) {
            console.log(`\nRecommendation: Link inventory to Warehouse ID: ${warehouses[0]._id}`);
        } else {
            console.log('\n⚠️ NO WAREHOUSES FOUND. This is likely the problem.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkWarehouses();
