/**
 * Verificar cómo está almacenado el supplierId en productos de Borush
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';
const TENANT_ID = '69b187062339e815ceba7487';

async function check() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');

    // Buscar un producto de Borush (Supplier ID: 69b8212c8c0abe9a8c545a72)
    const borushSupplierId = '69b8212c8c0abe9a8c545a72';

    console.log(`🔍 Buscando productos con supplierId = "${borushSupplierId}"...\n`);

    // Buscar como String
    const productsByString = await Product.findOne({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      'suppliers.supplierId': borushSupplierId // String
    }).lean();

    // Buscar como ObjectId
    const productsByObjectId = await Product.findOne({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      'suppliers.supplierId': new mongoose.Types.ObjectId(borushSupplierId) // ObjectId
    }).lean();

    console.log(`📊 Búsqueda como String: ${productsByString ? '✅ Encontrado' : '❌ No encontrado'}`);
    console.log(`📊 Búsqueda como ObjectId: ${productsByObjectId ? '✅ Encontrado' : '❌ No encontrado'}\n`);

    if (productsByString) {
      const supplierLink = productsByString.suppliers.find(s => String(s.supplierId) === borushSupplierId);
      console.log('Producto encontrado (búsqueda como String):');
      console.log(`   Nombre: ${productsByString.name}`);
      console.log(`   supplierId: ${supplierLink.supplierId}`);
      console.log(`   Tipo: ${typeof supplierLink.supplierId}`);
      console.log(`   Constructor: ${supplierLink.supplierId.constructor.name}\n`);
    }

    if (productsByObjectId) {
      const supplierLink = productsByObjectId.suppliers.find(s =>
        String(s.supplierId) === borushSupplierId ||
        (s.supplierId && s.supplierId.toString && s.supplierId.toString() === borushSupplierId)
      );
      console.log('Producto encontrado (búsqueda como ObjectId):');
      console.log(`   Nombre: ${productsByObjectId.name}`);
      console.log(`   supplierId: ${supplierLink.supplierId}`);
      console.log(`   Tipo: ${typeof supplierLink.supplierId}`);
      console.log(`   Constructor: ${supplierLink.supplierId.constructor.name}\n`);
    }

    // También buscar 3P Inversiones (Supplier ID: 69bc29589cbb1908d45b8363)
    console.log('━'.repeat(80) + '\n');
    const trespSupplierId = '69bc29589cbb1908d45b8363';
    console.log(`🔍 Buscando productos de 3P Inversiones (${trespSupplierId})...\n`);

    const trespByString = await Product.findOne({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      'suppliers.supplierId': trespSupplierId
    }).lean();

    const trespByObjectId = await Product.findOne({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      'suppliers.supplierId': new mongoose.Types.ObjectId(trespSupplierId)
    }).lean();

    console.log(`📊 Búsqueda como String: ${trespByString ? '✅ Encontrado' : '❌ No encontrado'}`);
    console.log(`📊 Búsqueda como ObjectId: ${trespByObjectId ? '✅ Encontrado' : '❌ No encontrado'}\n`);

    if (trespByString) {
      const supplierLink = trespByString.suppliers.find(s => String(s.supplierId) === trespSupplierId);
      console.log('Producto encontrado (búsqueda como String):');
      console.log(`   Nombre: ${trespByString.name}`);
      console.log(`   supplierId: ${supplierLink.supplierId}`);
      console.log(`   Tipo: ${typeof supplierLink.supplierId}`);
      console.log(`   Constructor: ${supplierLink.supplierId.constructor.name}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

check();
