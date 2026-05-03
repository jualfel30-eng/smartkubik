const { MongoClient } = require('mongodb');

async function findTenant() {
    const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db('test');

        // Case-insensitive search for "Savage" or "Clothing"
        const tenants = await db.collection('tenants').find({
            name: { $regex: /Savage|Clothing/i }
        }).toArray();

        if (tenants.length > 0) {
            console.log('Found Tenants:');
            tenants.forEach(t => {
                console.log(`- Name: ${t.name}, ID: ${t._id}`);
            });
        } else {
            console.log('No tenant found with name "Savage" or "Clothing"');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

findTenant();
