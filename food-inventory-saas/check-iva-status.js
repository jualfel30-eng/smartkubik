require('dotenv').config();
const mongoose = require('mongoose');

async function checkIvaStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('=== DIAGNÓSTICO DE IVA EN PRODUCTOS ===\n');

    // Get all products and their IVA status
    const products = await db.collection('products').find({}).toArray();

    console.log(`Total de productos en la base de datos: ${products.length}\n`);

    // Count by IVA status
    const ivaStats = {
      applicable: 0,
      exempt: 0,
      undefined: 0
    };

    const exemptProducts = [];
    const applicableProducts = [];

    products.forEach(product => {
      if (product.ivaApplicable === true) {
        ivaStats.applicable++;
        if (applicableProducts.length < 5) {
          applicableProducts.push({
            name: product.name,
            sku: product.sku,
            ivaApplicable: product.ivaApplicable,
            updatedAt: product.updatedAt
          });
        }
      } else if (product.ivaApplicable === false) {
        ivaStats.exempt++;
        exemptProducts.push({
          name: product.name,
          sku: product.sku,
          ivaApplicable: product.ivaApplicable,
          updatedAt: product.updatedAt
        });
      } else {
        ivaStats.undefined++;
      }
    });

    console.log('ESTADÍSTICAS DE IVA:');
    console.log(`- Productos CON IVA (ivaApplicable: true): ${ivaStats.applicable}`);
    console.log(`- Productos EXENTOS (ivaApplicable: false): ${ivaStats.exempt}`);
    console.log(`- Productos SIN DEFINIR: ${ivaStats.undefined}\n`);

    if (exemptProducts.length > 0) {
      console.log('\n🚨 PRODUCTOS EXENTOS DE IVA:');
      console.log('=' .repeat(80));
      exemptProducts.forEach(p => {
        console.log(`- ${p.name} (${p.sku})`);
        console.log(`  ivaApplicable: ${p.ivaApplicable}`);
        console.log(`  updatedAt: ${p.updatedAt}`);
        console.log('');
      });
    }

    if (applicableProducts.length > 0) {
      console.log('\n✓ EJEMPLOS DE PRODUCTOS CON IVA:');
      console.log('=' .repeat(80));
      applicableProducts.forEach(p => {
        console.log(`- ${p.name} (${p.sku})`);
        console.log(`  ivaApplicable: ${p.ivaApplicable}`);
        console.log(`  updatedAt: ${p.updatedAt}`);
        console.log('');
      });
    }

    // Check if there was a mass update
    console.log('\nBUSCANDO PATRÓN DE ACTUALIZACIÓN MASIVA...');
    const updatedDates = products
      .filter(p => p.updatedAt)
      .map(p => new Date(p.updatedAt).toISOString().split('T')[0]);

    const dateFrequency = {};
    updatedDates.forEach(date => {
      dateFrequency[date] = (dateFrequency[date] || 0) + 1;
    });

    const sortedDates = Object.entries(dateFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('\nDías con más actualizaciones:');
    sortedDates.forEach(([date, count]) => {
      console.log(`  ${date}: ${count} productos actualizados`);
    });

    // Check by tenant
    const tenants = await db.collection('tenants').find({}).toArray();
    console.log(`\n\nPRODUCTOS POR TENANT:`);
    for (const tenant of tenants) {
      const tenantProducts = products.filter(p => p.tenantId.toString() === tenant._id.toString());
      const tenantExempt = tenantProducts.filter(p => p.ivaApplicable === false).length;
      const tenantApplicable = tenantProducts.filter(p => p.ivaApplicable === true).length;

      console.log(`\n${tenant.businessName} (${tenant.email}):`);
      console.log(`  Total productos: ${tenantProducts.length}`);
      console.log(`  Con IVA: ${tenantApplicable}`);
      console.log(`  Exentos: ${tenantExempt}`);

      if (tenantExempt === tenantProducts.length && tenantProducts.length > 0) {
        console.log(`  ⚠️  TODOS los productos están exentos!`);
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkIvaStatus();
