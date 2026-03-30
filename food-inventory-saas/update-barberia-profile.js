// Script para actualizar el verticalProfile.key de Barbería Savage

function getVerticalProfileKey(vertical, businessType) {
  const verticalUpper = vertical?.toUpperCase() || "FOOD_SERVICE";
  const businessTypeLower = businessType?.toLowerCase() || "";

  // SERVICES vertical
  if (verticalUpper === "SERVICES") {
    // Barbería / Peluquería / Salón de Belleza
    if (
      businessTypeLower.includes("barber") ||
      businessTypeLower.includes("peluquer") ||
      businessTypeLower.includes("salón de belleza") ||
      businessTypeLower.includes("salon de belleza") ||
      businessTypeLower.includes("estilis") ||
      businessTypeLower.includes("hair")
    ) {
      return "barbershop-salon";
    }

    // Taller Mecánico
    if (
      businessTypeLower.includes("taller") ||
      businessTypeLower.includes("mecánic") ||
      businessTypeLower.includes("mecanico") ||
      businessTypeLower.includes("automotriz") ||
      businessTypeLower.includes("reparaci")
    ) {
      return "mechanic-shop";
    }

    // Clínica / Spa / Centro Estético
    if (
      businessTypeLower.includes("clínica") ||
      businessTypeLower.includes("clinica") ||
      businessTypeLower.includes("spa") ||
      businessTypeLower.includes("estétic") ||
      businessTypeLower.includes("estetica") ||
      businessTypeLower.includes("fisioterapi") ||
      businessTypeLower.includes("odontolog") ||
      businessTypeLower.includes("médic") ||
      businessTypeLower.includes("medico") ||
      businessTypeLower.includes("consultorio")
    ) {
      return "clinic-spa";
    }

    // Hotelería
    if (
      businessTypeLower.includes("hotel") ||
      businessTypeLower.includes("hotelería") ||
      businessTypeLower.includes("hospitality")
    ) {
      return "hospitality";
    }

    return "hospitality";
  }

  return "food-service";
}

const mongoose = require('mongoose');

const mongoUri = 'mongodb+srv://jualfelsantamaria:12345@smartkubik-cluster.sxn9e.mongodb.net/test?retryWrites=true&w=majority&appName=smartkubik-cluster';

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false, collection: 'tenants' }));
    
    // Buscar el tenant
    const tenant = await Tenant.findOne({ name: /Barbería Savage/i }).lean();
    if (!tenant) {
      console.log('❌ Tenant not found');
      process.exit(1);
    }
    
    console.log('📋 Current tenant data:');
    console.log('  - name:', tenant.name);
    console.log('  - vertical:', tenant.vertical);
    console.log('  - businessType:', tenant.businessType);
    console.log('  - current verticalProfile.key:', tenant.verticalProfile?.key);
    
    // Calcular el profileKey correcto
    const correctKey = getVerticalProfileKey(tenant.vertical, tenant.businessType);
    console.log('  - calculated correct key:', correctKey);
    
    if (tenant.verticalProfile?.key === correctKey) {
      console.log('✅ Profile key is already correct! No update needed.');
      process.exit(0);
    }
    
    // Actualizar el tenant
    const result = await Tenant.updateOne(
      { _id: tenant._id },
      { 
        $set: { 
          'verticalProfile.key': correctKey,
          'verticalProfile.name': correctKey === 'barbershop-salon' ? 'Barbería / Peluquería / Salón de Belleza' : 'Unknown',
          'verticalProfile.category': 'SERVICES'
        } 
      }
    );
    
    console.log('\n📝 Update result:', result);
    
    const updated = await Tenant.findOne({ _id: tenant._id }).lean();
    console.log('\n✅ Updated verticalProfile:', updated.verticalProfile);
    console.log('\n🎉 Done! Reload your app to see the changes.');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
