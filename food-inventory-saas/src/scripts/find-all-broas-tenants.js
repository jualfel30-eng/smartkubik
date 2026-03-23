/**
 * Encontrar todos los tenants que tengan "Broas" en el nombre
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function findAllBroasTenants() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }), 'customers');

    console.log('🔍 Buscando todos los tenants con "Broas" en el nombre...\n');

    const tenants = await Tenant.find({
      $or: [
        { name: /broas/i },
        { companyName: /broas/i }
      ]
    }).lean();

    console.log(`📊 Total de tenants encontrados: ${tenants.length}\n`);
    console.log('═'.repeat(80) + '\n');

    for (let i = 0; i < tenants.length; i++) {
      const tenant = tenants[i];

      console.log(`${i + 1}. ${tenant.name || tenant.companyName || 'Sin nombre'}`);
      console.log(`   _id: ${tenant._id}`);
      console.log(`   status: ${tenant.status}`);
      console.log(`   createdAt: ${tenant.createdAt ? new Date(tenant.createdAt).toLocaleString() : 'N/A'}`);

      // Buscar usuarios de este tenant
      const users = await User.find({ tenantId: tenant._id }).select('email name').lean();
      console.log(`   Usuarios (${users.length}):`);
      users.forEach(u => {
        console.log(`      - ${u.email} ${u.name ? `(${u.name})` : ''}`);
      });

      // Contar suppliers y customers
      const suppliersCount = await Supplier.countDocuments({ tenantId: String(tenant._id) });
      const customersCount = await Customer.countDocuments({
        tenantId: tenant._id,
        customerType: 'supplier'
      });

      console.log(`   Proveedores:`);
      console.log(`      - Suppliers (virtuales): ${suppliersCount}`);
      console.log(`      - Customers (reales): ${customersCount}`);
      console.log(`      - TOTAL: ${suppliersCount + customersCount}`);
      console.log('');
    }

    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

findAllBroasTenants();
