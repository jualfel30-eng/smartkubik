/**
 * Verificar tipo de dato del tenantId
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function checkTenantType() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const PurchaseOrder = mongoose.model('PurchaseOrder', new mongoose.Schema({}, { strict: false }), 'purchaseorders');

    // Buscar una orden conocida
    const order = await PurchaseOrder.findOne({ poNumber: 'OC-260319-130526-536951' }).lean();

    if (order) {
      console.log('✅ Orden encontrada\n');
      console.log(`TenantId: ${order.tenantId}`);
      console.log(`Tipo: ${typeof order.tenantId}`);
      console.log(`Es ObjectId: ${order.tenantId instanceof mongoose.Types.ObjectId}`);
      console.log(`Constructor: ${order.tenantId.constructor.name}\n`);

      // Intentar búsquedas con diferentes formatos
      console.log('🔍 Probando búsquedas...\n');

      // 1. Búsqueda como string
      const count1 = await PurchaseOrder.countDocuments({ tenantId: '69b187062339e815ceba7487' });
      console.log(`1. Como string '69b187062339e815ceba7487': ${count1} órdenes`);

      // 2. Búsqueda como ObjectId
      const count2 = await PurchaseOrder.countDocuments({ tenantId: new mongoose.Types.ObjectId('69b187062339e815ceba7487') });
      console.log(`2. Como ObjectId: ${count2} órdenes`);

      // 3. Búsqueda sin conversión (pasando el valor directo)
      const count3 = await PurchaseOrder.countDocuments({ tenantId: order.tenantId });
      console.log(`3. Usando valor directo: ${count3} órdenes\n`);
    } else {
      console.log('❌ Orden no encontrada');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

checkTenantType();
