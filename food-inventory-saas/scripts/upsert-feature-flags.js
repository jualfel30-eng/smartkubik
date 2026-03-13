const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test');
    const col = db.collection('globalsettings');

    // Check current state
    const existing = await col.find({}).toArray();
    console.log('\n=== Current globalsettings ===');
    existing.forEach(s => console.log(`  ${s.key} = ${s.value}`));

    // Upsert MULTI_LOCATION and MULTI_WAREHOUSE
    const keys = ['ENABLE_MULTI_LOCATION', 'ENABLE_MULTI_WAREHOUSE'];
    for (const key of keys) {
      const result = await col.updateOne(
        { key },
        { $set: { value: 'true', key }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
      console.log(`  ${key}: ${result.upsertedCount ? 'INSERTED' : 'UPDATED'}`);
    }

    // Verify
    const after = await col.find({}).toArray();
    console.log('\n=== After update ===');
    after.forEach(s => console.log(`  ${s.key} = ${s.value}`));
  } finally {
    await client.close();
  }
}

run().catch(console.error);
