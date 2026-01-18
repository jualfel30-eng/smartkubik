const { MongoClient } = require('mongodb');

// Try common local URIs or fallback to the one in code if visible. 
// Assuming localhost for dev environment based on "npm run start dev"
const uri = "mongodb://localhost:27017/food-inventory-db"; // Guessing DB name based on folder
// actually, let's try to list dbs if we can, or just generic.

async function run() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        const db = client.db("food-inventory-db"); // Trying this name first
        // If not sure, we can list dbs
        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();
        console.log("Databases:", dbs.databases.map(d => d.name));

        // Tenant ID from logs: 68d371dffdb57e5c800f2fcd
        console.log('Available Databases:', dbs.databases.map(d => d.name));

        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'config', 'local'].includes(dbName)) continue;

            const database = client.db(dbName);
            const usersCollection = database.collection('users');
            const tenantsCollection = database.collection('tenants');
            const { ObjectId } = require('mongodb');

            // Search for ANY user with 'admin' in email to find the dev account
            const users = await usersCollection.find({ email: /earlyadopter/i }).toArray();

            if (users.length > 0) {
                console.log(`\n found ${users.length} users in DB: ${dbName}`);
                for (const user of users) {
                    console.log(`   - User: ${user.firstName} ${user.lastName} (${user.email})`);
                    console.log(`     ID: ${user._id}`);
                    console.log(`     Phone: '${user.phone}'`);
                    console.log(`     TenantID: ${user.tenantId}`);

                    if (user.tenantId) {
                        const tenant = await tenantsCollection.findOne({ _id: user.tenantId });
                        console.log(`     -> Tenant Exists? ${!!tenant} ${tenant ? `(Name: ${tenant.name})` : '(ORPHANED USER!)'}`);
                    }
                }
            }

            // Also check specific Tenant ID from logs
            try {
                const targetTenantId = new ObjectId("68d371dffdb57e5c800f2fcd");
                const targetTenant = await tenantsCollection.findOne({ _id: targetTenantId });
                if (targetTenant) {
                    console.log(`\n MATCH FOUND: Tenant 68d371... exists in ${dbName}`);
                    console.log(`   Name: ${targetTenant.name}`);
                    const usersInTenant = await usersCollection.find({ tenantId: targetTenantId }).toArray();
                    console.log(`   Users in this tenant: ${usersInTenant.length}`);
                    usersInTenant.forEach(u => console.log(`     - ${u.firstName} (${u.email}) Phone: ${u.phone}`));
                }
            } catch (e) { console.error(e); }
        }

    } finally {
        await client.close();
    }
}
run().catch(console.dir);
