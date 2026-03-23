/**
 * Test directo de búsqueda de proveedores
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function testSearch() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const PurchaseOrder = mongoose.model('PurchaseOrder', new mongoose.Schema({}, { strict: false }), 'purchaseorders');
    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');

    // Buscar una orden
    const order = await PurchaseOrder.findOne({ poNumber: 'OC-260314-123751-368785' }).lean();
    console.log(`Orden: ${order.supplierName}`);
    console.log(`SupplierId: ${order.supplierId}\n`);

    // Test 1: Búsqueda simple
    console.log('Test 1: Búsqueda simple con $or');
    const result1 = await Supplier.findOne({
      $or: [
        { _id: order.supplierId },
        { customerId: order.supplierId }
      ]
    }).lean();
    console.log(result1 ? `✅ Encontrado: ${result1.name}` : '❌ No encontrado');

    // Test 2: Con session
    console.log('\nTest 2: Búsqueda con session');
    const session = await mongoose.startSession();
    const result2 = await Supplier.findOne({
      $or: [
        { _id: order.supplierId },
        { customerId: order.supplierId }
      ]
    }).session(session).lean();
    console.log(result2 ? `✅ Encontrado: ${result2.name}` : '❌ No encontrado');
    session.endSession();

    // Test 3: Búsqueda solo por customerId
    console.log('\nTest 3: Búsqueda solo por customerId');
    const result3 = await Supplier.findOne({ customerId: order.supplierId }).lean();
    console.log(result3 ? `✅ Encontrado: ${result3.name}` : '❌ No encontrado');

    // Test 4: Contar todos los suppliers
    console.log('\nTest 4: Total de suppliers en DB');
    const total = await Supplier.countDocuments();
    console.log(`Total: ${total}`);

    // Test 5: Listar algunos suppliers
    console.log('\nTest 5: Primeros 10 suppliers');
    const suppliers = await Supplier.find().limit(10).lean();
    suppliers.forEach(s => {
      console.log(`   - ${s.name} (customerId: ${s.customerId || 'N/A'})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

testSearch();
