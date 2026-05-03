const mongoose = require('mongoose');

const uri = "mongodb+srv://smartkubik:4N8pSFszXCIol9xa@cluster0.q4pit.mongodb.net/test?retryWrites=true&w=majority";

async function compareSuppliers() {
  try {
    await mongoose.connect(uri);
    console.log("✓ Conectado a MongoDB");

    const customers = mongoose.connection.collection('customers');
    const suppliers = mongoose.connection.collection('suppliers');

    console.log("\n========================================");
    console.log("BUSCANDO GEOMAR TARAZONA");
    console.log("========================================");

    // Buscar Geomar en CUSTOMERS
    const geomarCustomer = await customers.findOne({
      customerType: 'supplier',
      $or: [
        { name: /Geomar/i },
        { companyName: /Geomar/i },
        { 'taxInfo.taxId': /506443430/ }
      ]
    });

    // Buscar Geomar en SUPPLIERS
    const geomarSupplier = await suppliers.findOne({
      $or: [
        { name: /Geomar/i },
        { 'taxInfo.rif': /506443430/ },
        { supplierNumber: /PROV-000018/ }
      ]
    });

    console.log("En CUSTOMERS:", geomarCustomer ? "✓ ENCONTRADO" : "❌ NO ENCONTRADO");
    console.log("En SUPPLIERS:", geomarSupplier ? "✓ ENCONTRADO" : "❌ NO ENCONTRADO");

    console.log("\n========================================");
    console.log("BUSCANDO PLASTY MUNDO");
    console.log("========================================");

    // Buscar Plasty en CUSTOMERS
    const plastyCustomer = await customers.findOne({
      customerType: 'supplier',
      $or: [
        { name: /Plasty/i },
        { companyName: /Plasty/i },
        { 'taxInfo.taxId': /296115079/ }
      ]
    });

    // Buscar Plasty en SUPPLIERS
    const plastySupplier = await suppliers.findOne({
      $or: [
        { name: /Plasty/i },
        { 'taxInfo.rif': /296115079/ },
        { supplierNumber: /PROV-000033/ }
      ]
    });

    console.log("En CUSTOMERS:", plastyCustomer ? "✓ ENCONTRADO" : "❌ NO ENCONTRADO");
    console.log("En SUPPLIERS:", plastySupplier ? "✓ ENCONTRADO" : "❌ NO ENCONTRADO");

    // Mostrar datos completos
    console.log("\n========================================");
    console.log("GEOMAR - CUSTOMER");
    console.log("========================================");
    console.log(geomarCustomer ? JSON.stringify(geomarCustomer, null, 2) : "No encontrado");

    console.log("\n========================================");
    console.log("GEOMAR - SUPPLIER");
    console.log("========================================");
    console.log(geomarSupplier ? JSON.stringify(geomarSupplier, null, 2) : "No encontrado");

    console.log("\n========================================");
    console.log("PLASTY - CUSTOMER");
    console.log("========================================");
    console.log(plastyCustomer ? JSON.stringify(plastyCustomer, null, 2) : "No encontrado");

    console.log("\n========================================");
    console.log("PLASTY - SUPPLIER");
    console.log("========================================");
    console.log(plastySupplier ? JSON.stringify(plastySupplier, null, 2) : "No encontrado");

    // ANÁLISIS DE DIFERENCIAS
    console.log("\n========================================");
    console.log("ANÁLISIS: ¿POR QUÉ GEOMAR NO APARECE?");
    console.log("========================================");

    if (geomarCustomer && plastyCustomer) {
      console.log("\n🔍 Comparando CUSTOMER records:");
      const fields = ['_id', 'name', 'companyName', 'customerType', 'status', 'tenantId', 'customerNumber'];
      fields.forEach(field => {
        const gVal = geomarCustomer[field];
        const pVal = plastyCustomer[field];
        console.log(`\n${field}:`);
        console.log(`  Geomar: ${JSON.stringify(gVal)} (${typeof gVal})`);
        console.log(`  Plasty: ${JSON.stringify(pVal)} (${typeof pVal})`);
        if (JSON.stringify(gVal) !== JSON.stringify(pVal)) {
          console.log(`  ⚠️  DIFERENTE`);
        }
      });
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

compareSuppliers();
