require('dotenv').config();
const mongoose = require('mongoose');

async function checkEarlyAdopterIva() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('=== DIAGNÓSTICO IVA TENANT EARLYADOPTER ===\n');

    // Find early adopter tenant
    const tenant = await db.collection('tenants').findOne({
      $or: [
        { email: { $regex: /earlyadopter/i } },
        { businessName: { $regex: /earlyadopter/i } },
        { _id: new mongoose.Types.ObjectId("68d371dffdb57e5c800f2fcd") } // Tenant ID from previous script
      ]
    });

    if (!tenant) {
      console.log('❌ No se encontró el tenant earlyadopter');
      await mongoose.connection.close();
      return;
    }

    console.log(`✓ Tenant encontrado: ${tenant.businessName} (${tenant.email})`);
    console.log(`  ID: ${tenant._id}\n`);

    // Get ALL products for this tenant
    const products = await db.collection('products')
      .find({ tenantId: tenant._id })
      .toArray();

    console.log(`Total productos: ${products.length}\n`);

    // Analyze IVA status
    const ivaTrue = products.filter(p => p.ivaApplicable === true);
    const ivaFalse = products.filter(p => p.ivaApplicable === false);
    const ivaUndefined = products.filter(p => p.ivaApplicable === undefined || p.ivaApplicable === null);

    console.log('RESUMEN IVA:');
    console.log(`  Con IVA (ivaApplicable: true): ${ivaTrue.length}`);
    console.log(`  Exentos (ivaApplicable: false): ${ivaFalse.length}`);
    console.log(`  Sin definir: ${ivaUndefined.length}\n`);

    // Show examples of each
    if (ivaTrue.length > 0) {
      console.log('EJEMPLOS CON IVA (primeros 5):');
      ivaTrue.slice(0, 5).forEach(p => {
        console.log(`  - ${p.name} (${p.sku}): ivaApplicable = ${p.ivaApplicable}`);
      });
      console.log('');
    }

    if (ivaFalse.length > 0) {
      console.log('🚨 PRODUCTOS EXENTOS (TODOS):');
      ivaFalse.forEach(p => {
        console.log(`  - ${p.name} (${p.sku}): ivaApplicable = ${p.ivaApplicable}`);
        console.log(`    Actualizado: ${p.updatedAt}`);
      });
      console.log('');
    }

    // Check recent updates
    const recentUpdates = products
      .filter(p => p.updatedAt)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 10);

    console.log('ÚLTIMAS 10 ACTUALIZACIONES:');
    recentUpdates.forEach(p => {
      console.log(`  ${new Date(p.updatedAt).toISOString()}: ${p.name} - ivaApplicable: ${p.ivaApplicable}`);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEarlyAdopterIva();
