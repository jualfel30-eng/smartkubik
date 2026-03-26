const mongoose = require('mongoose');

const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function getDefaultWarehouse() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Get warehouses for this tenant
    const warehouses = await mongoose.connection.db.collection('warehouses').find({
      tenantId: '69b187062339e815ceba7487',
      isActive: true,
      isDeleted: false
    }).toArray();

    console.log(`\n=== Warehouses for tenant ===`);
    warehouses.forEach((wh, idx) => {
      console.log(`[${idx + 1}] ${wh.name} (ID: ${wh._id})`);
      console.log(`  - Type: ${wh.type}`);
      console.log(`  - Is Primary: ${wh.isPrimary || false}`);
    });

    // Get the primary or first warehouse
    const primaryWarehouse = warehouses.find(w => w.isPrimary) || warehouses[0];

    if (primaryWarehouse) {
      console.log(`\n=== Default Warehouse ===`);
      console.log(`Name: ${primaryWarehouse.name}`);
      console.log(`ID: ${primaryWarehouse._id}`);
    } else {
      console.log('\n❌ No warehouses found for this tenant');
    }

    await mongoose.connection.close();
    console.log('\nConnection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getDefaultWarehouse();
