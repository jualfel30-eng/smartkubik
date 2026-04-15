const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
async function verify() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const tenantId = new ObjectId('69c71e7840187515237b821f');

  const tenant = await db.collection('tenants').findOne({ _id: tenantId });
  console.log('✅ Tenant:', tenant?.name, '| ID:', tenant?._id?.toString());
  console.log('   Esperado: "Barbería Savage" | ID: 69c71e7840187515237b821f');
  console.log('   ¿Coincide?', tenant?.name === 'Barbería Savage');

  const currentGallery = await db.collection('beautygalleryitems').countDocuments({ tenantId });
  console.log('📸 Items en galería actualmente:', currentGallery, '(esperado: 3)');

  await client.close();
}
verify().catch(console.error);
