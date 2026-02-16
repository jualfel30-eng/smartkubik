const { MongoClient, ObjectId } = require('mongodb');

async function checkAllTenants() {
    const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db('test');

        // Find all tenants with "Savage" in the name
        const tenants = await db.collection('tenants').find({
            name: { $regex: /Savage Clothing/i }
        }).toArray();

        if (tenants.length > 0) {
            console.log(`Found ${tenants.length} tenants matching "Savage Clothing":`);
            for (const t of tenants) {
                const count = await db.collection('products').countDocuments({
                    tenantId: t._id
                });
                console.log(`- Name: ${t.name}, ID: ${t._id}, Product Count: ${count}`);
            }
        } else {
            console.log('No tenant found with name "Savage Clothing"');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkAllTenants();
