// Este script se ejecutará en el servidor de producción
const mongoose = require('mongoose');

const uri = "mongodb+srv://smartkubik:4N8pSFszXCIol9xa@cluster0.q4pit.mongodb.net/test?retryWrites=true&w=majority";

async function compareSuppliers() {
  try {
    await mongoose.connect(uri);
    console.log("✓ Conectado a MongoDB");

    const db = mongoose.connection.db;
    const customers = db.collection('customers');

    // Buscar Geomar
    const geomar = await customers.findOne({
      customerType: 'supplier',
      $or: [
        { name: /Geomar/i },
        { companyName: /Geomar/i },
        { 'taxInfo.taxId': /506443430/ }
      ]
    });

    // Buscar Plasty
    const plasty = await customers.findOne({
      customerType: 'supplier',
      $or: [
        { name: /Plasty/i },
        { companyName: /Plasty/i },
        { 'taxInfo.taxId': /296115079/ }
      ]
    });

    console.log("\n" + "=".repeat(50));
    console.log("GEOMAR TARAZONA");
    console.log("=".repeat(50));
    if (geomar) {
      console.log("_id:", geomar._id);
      console.log("name:", geomar.name);
      console.log("companyName:", geomar.companyName);
      console.log("customerType:", geomar.customerType);
      console.log("status:", geomar.status);
      console.log("tenantId:", geomar.tenantId, "(tipo:", typeof geomar.tenantId + ")");
      console.log("customerNumber:", geomar.customerNumber);
      console.log("taxInfo:", JSON.stringify(geomar.taxInfo));
    } else {
      console.log("❌ NO ENCONTRADO");
    }

    console.log("\n" + "=".repeat(50));
    console.log("PLASTY MUNDO");
    console.log("=".repeat(50));
    if (plasty) {
      console.log("_id:", plasty._id);
      console.log("name:", plasty.name);
      console.log("companyName:", plasty.companyName);
      console.log("customerType:", plasty.customerType);
      console.log("status:", plasty.status);
      console.log("tenantId:", plasty.tenantId, "(tipo:", typeof plasty.tenantId + ")");
      console.log("customerNumber:", plasty.customerNumber);
      console.log("taxInfo:", JSON.stringify(plasty.taxInfo));
    } else {
      console.log("❌ NO ENCONTRADO");
    }

    if (geomar && plasty) {
      console.log("\n" + "=".repeat(50));
      console.log("DIFERENCIAS CRÍTICAS");
      console.log("=".repeat(50));

      if (typeof geomar.tenantId !== typeof plasty.tenantId) {
        console.log("⚠️  TIPO DE tenantId DIFERENTE:");
        console.log("   Geomar:", typeof geomar.tenantId, "-", geomar.tenantId);
        console.log("   Plasty:", typeof plasty.tenantId, "-", plasty.tenantId);
      }

      if (JSON.stringify(geomar.tenantId) !== JSON.stringify(plasty.tenantId)) {
        console.log("⚠️  VALOR DE tenantId DIFERENTE:");
        console.log("   Geomar:", JSON.stringify(geomar.tenantId));
        console.log("   Plasty:", JSON.stringify(plasty.tenantId));
      }
    }

    await mongoose.disconnect();
    console.log("\n✓ Desconectado");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

compareSuppliers();
