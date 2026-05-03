const { MongoClient } = require('mongodb');

async function findTenantByEmail() {
    const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    const email = 'resetpublicidad+test2@gmail.com';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db('test');

        // 1. Find User
        const user = await db.collection('users').findOne({ email: email });

        if (!user) {
            console.log(`❌ No user found with email: ${email}`);
            return;
        }

        console.log(`✅ User Found: ${user.name} (${user._id})`);
        console.log(`- Tenant ID from User: ${user.tenantId}`);

        // 2. Find Tenant
        const tenant = await db.collection('tenants').findOne({ _id: user.tenantId });

        if (tenant) {
            console.log(`✅ Tenant Found:`);
            console.log(`- Name: ${tenant.name}`);
            console.log(`- ID: ${tenant._id}`);

            // Check product count for this tenant
            const count = await db.collection('products').countDocuments({ tenantId: tenant._id });
            console.log(`- Current Product Count: ${count}`);
        } else {
            console.log(`❌ Tenant not found for ID: ${user.tenantId}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

findTenantByEmail();
