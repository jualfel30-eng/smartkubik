const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cluster0.mbtyprl.mongodb.net/test';
const DB_NAME = 'test';

async function check() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db(DB_NAME);

    // 1. Verificar storefront config
    console.log('📋 STOREFRONT CONFIG:');
    const storefront = await db.collection('storefrontconfigs').findOne({ domain: 'barberiasavage' });
    console.log('  domain:', storefront?.domain);
    console.log('  tenantId:', storefront?.tenantId);
    console.log('  beautyConfig.enabled:', storefront?.beautyConfig?.enabled);
    console.log();

    // 2. Verificar tenant con ese email
    console.log('📋 TENANT:');
    const tenant = await db.collection('tenants').findOne({ 
      adminEmail: 'savageorganicsolutions+test100@gmail.com' 
    });
    console.log('  _id:', tenant?._id);
    console.log('  name:', tenant?.name);
    console.log('  adminEmail:', tenant?.adminEmail);
    console.log();

    // 3. Comparar IDs
    console.log('📊 COMPARACIÓN:');
    console.log('  storefront.tenantId:', storefront?.tenantId);
    console.log('  tenant._id:', tenant?._id?.toString());
    console.log('  ¿Coinciden?:', storefront?.tenantId === tenant?._id?.toString());
    console.log();

    // 4. Buscar profesionales para el tenant correcto
    const tenantIdToSearch = tenant?._id;
    console.log('💇 PROFESIONALES para tenant', tenant?.name, ':');
    const professionals = await db.collection('professionals')
      .find({ tenantId: tenantIdToSearch })
      .toArray();
    
    console.log('  Total profesionales:', professionals.length);
    professionals.forEach(p => {
      console.log('    -', p.name, '| ID:', p._id, '| Servicios:', p.serviceIds?.length || 0);
    });
    console.log();

    // 5. Buscar servicios de belleza
    console.log('💅 SERVICIOS DE BELLEZA para tenant', tenant?.name, ':');
    const services = await db.collection('beautyservices')
      .find({ tenantId: tenantIdToSearch })
      .toArray();
    
    console.log('  Total servicios:', services.length);
    services.forEach(s => {
      console.log('    -', s.name, '| ID:', s._id, '| Duración:', s.duration, 'min | Precio:', s.price);
    });
    console.log();

    // 6. Verificar el professionalId que está usando el storefront
    const professionalIdFromRequest = '69cb464e6eaab4b458348204';
    console.log('🔍 PROFESSIONAL del request:', professionalIdFromRequest);
    const professionalFromRequest = await db.collection('professionals')
      .findOne({ _id: new ObjectId(professionalIdFromRequest) });
    
    if (professionalFromRequest) {
      console.log('  Nombre:', professionalFromRequest.name);
      console.log('  TenantId:', professionalFromRequest.tenantId);
      console.log('  ¿Pertenece al tenant correcto?:', professionalFromRequest.tenantId?.toString() === tenantIdToSearch?.toString());
    } else {
      console.log('  ❌ No existe este professional');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

check();
