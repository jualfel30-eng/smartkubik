/**
 * Buscar órdenes por número de orden para encontrar el tenant correcto
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

// Órdenes conocidas del usuario
const knownOrders = [
  'OC-260319-130526-536951',
  'OC-260319-152613-871029',
  'OC-260319-192254-290672',
  'OC-260319-195745-454303',
  'OC-260318-160750-803249'
];

async function findOrders() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const PurchaseOrder = mongoose.model('PurchaseOrder', new mongoose.Schema({}, { strict: false }), 'purchaseorders');

    console.log('🔍 Buscando órdenes conocidas...\n');

    for (const poNumber of knownOrders) {
      const order = await PurchaseOrder.findOne({ poNumber }).lean();

      if (order) {
        console.log(`✅ Orden encontrada: ${poNumber}`);
        console.log(`   TenantId: ${order.tenantId}`);
        console.log(`   Proveedor: ${order.supplierName}`);
        console.log(`   Estado: ${order.status}`);
        console.log(`   Fecha: ${order.purchaseDate}`);
        console.log(`   Items: ${order.items?.length || 0}`);
        console.log('');
      } else {
        console.log(`❌ Orden NO encontrada: ${poNumber}\n`);
      }
    }

    // Buscar primer orden para determinar tenant
    const firstOrder = await PurchaseOrder.findOne({ poNumber: knownOrders[0] }).lean();

    if (firstOrder) {
      console.log('═'.repeat(80));
      console.log('📋 TENANT ID CORRECTO PARA LAS ÓRDENES:\n');
      console.log(`   ${firstOrder.tenantId}`);
      console.log('═'.repeat(80) + '\n');

      // Buscar el tenant
      const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
      const tenant = await Tenant.findById(firstOrder.tenantId).lean();

      if (tenant) {
        console.log(`📊 Nombre del tenant: ${tenant.name || tenant.companyName}`);
        console.log(`   ID: ${tenant._id}\n`);
      }

      // Contar todas las órdenes de ese tenant
      const totalOrders = await PurchaseOrder.countDocuments({ tenantId: firstOrder.tenantId });
      console.log(`📦 Total de órdenes en este tenant: ${totalOrders}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

findOrders();
