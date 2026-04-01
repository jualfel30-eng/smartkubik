const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

async function createGeomarCustomer() {
  try {
    await mongoose.connect(uri);
    console.log("✓ Conectado a MongoDB\n");

    const db = mongoose.connection.db;
    const customers = db.collection('customers');
    const suppliers = db.collection('suppliers');

    const tenantId = '69b187062339e815ceba7487';
    const supplierNumber = 'PROV-000018';

    console.log('='.repeat(70));
    console.log('CREAR CUSTOMER FALTANTE PARA GEOMAR TARAZONA');
    console.log('='.repeat(70));

    // Buscar el supplier
    const supplier = await suppliers.findOne({
      supplierNumber,
      tenantId
    });

    if (!supplier) {
      console.log(`❌ Supplier ${supplierNumber} no encontrado`);
      process.exit(1);
    }

    console.log('\n✓ Supplier encontrado:');
    console.log(`   Name: ${supplier.name}`);
    console.log(`   SupplierNumber: ${supplier.supplierNumber}`);
    console.log(`   CustomerId: ${supplier.customerId}`);
    console.log(`   RIF: ${supplier.taxInfo?.rif || 'N/A'}`);

    // Verificar si el customer ya existe
    const existingCustomer = await customers.findOne({
      _id: new mongoose.Types.ObjectId(supplier.customerId)
    });

    if (existingCustomer) {
      console.log('\n✓ Customer ya existe, no se requiere acción');
      console.log(JSON.stringify(existingCustomer, null, 2));
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('\n❌ Customer NO existe, creando...');

    // Crear el customer con el ID que el supplier ya tiene
    const newCustomer = {
      _id: new mongoose.Types.ObjectId(supplier.customerId),
      customerNumber: `CLI-${String((await customers.countDocuments({ tenantId, customerType: 'supplier' })) + 1).padStart(6, '0')}`,
      name: supplier.name,
      companyName: supplier.name,
      customerType: 'supplier',
      taxInfo: {
        taxId: supplier.taxInfo?.rif || '',
        taxType: supplier.taxInfo?.rif?.charAt(0) || 'J'
      },
      contacts: supplier.contacts || [],
      segments: [],
      interactions: [],
      metrics: {
        totalOrders: 0,
        totalSpent: 0,
        totalSpentUSD: 0,
        averageOrderValue: 0,
        orderFrequency: 0,
        lifetimeValue: 0,
        returnRate: 0,
        cancellationRate: 0,
        paymentDelayDays: 0,
        averageRating: 0,
        totalRatings: 0
      },
      tier: 'bronce',
      loyaltyScore: 0,
      loyaltyPoints: 0,
      loyalty: {
        tier: 'bronce',
        lastUpgradeAt: new Date(),
        benefits: [],
        pendingRewards: []
      },
      creditInfo: {
        creditLimit: 0,
        availableCredit: 0,
        paymentTerms: 0,
        creditRating: 'C',
        isBlocked: false
      },
      status: supplier.status || 'active',
      source: 'manual',
      createdBy: supplier.createdBy,
      tenantId: supplier.tenantId,
      visitCount: 0,
      isWhatsappCustomer: false,
      emailVerified: false,
      hasStorefrontAccount: false,
      addresses: [],
      paymentMethods: [],
      communicationEvents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await customers.insertOne(newCustomer);

    console.log('\n✓ Customer creado exitosamente:');
    console.log(`   _id: ${result.insertedId}`);
    console.log(`   customerNumber: ${newCustomer.customerNumber}`);
    console.log(`   name: ${newCustomer.name}`);
    console.log(`   companyName: ${newCustomer.companyName}`);
    console.log(`   taxInfo.taxId: ${newCustomer.taxInfo?.taxId}`);
    console.log(`   customerType: ${newCustomer.customerType}`);
    console.log(`   status: ${newCustomer.status}`);
    console.log(`   tenantId: ${newCustomer.tenantId}`);

    console.log('\n✓ Migración completada exitosamente');
    console.log('   "Geomar Tarazona" ahora debería aparecer en el buscador de proveedores');

    await mongoose.disconnect();
    console.log('\n✓ Desconectado');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createGeomarCustomer();
