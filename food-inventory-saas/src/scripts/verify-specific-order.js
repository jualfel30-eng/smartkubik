/**
 * Verificar orden específica y sus productos
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function verifyOrder() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const PurchaseOrder = mongoose.model('PurchaseOrder', new mongoose.Schema({}, { strict: false }), 'purchaseorders');
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');
    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');

    // Buscar la orden específica
    const order = await PurchaseOrder.findOne({ poNumber: 'OC-260318-204631-452449' }).lean();

    if (!order) {
      console.log('❌ Orden no encontrada');
      return;
    }

    console.log('✅ Orden encontrada:');
    console.log(`   Proveedor: ${order.supplierName}`);
    console.log(`   SupplierId: ${order.supplierId}`);
    console.log(`   Estado: ${order.status}`);
    console.log(`   Items: ${order.items?.length || 0}\n`);

    if (order.items && order.items.length > 0) {
      console.log('📦 Productos en la orden:\n');
      for (const item of order.items) {
        console.log(`   - ${item.productName} (SKU: ${item.productSku})`);
        console.log(`     ID: ${item.productId}`);
        console.log(`     Cantidad: ${item.quantity}`);
        console.log(`     Precio: $${item.costPrice || item.unitCost}\n`);
      }
    }

    // Buscar el supplier
    console.log('🔍 Buscando supplier...\n');

    const supplierIdObj = new mongoose.Types.ObjectId(order.supplierId);
    const supplier = await Supplier.findOne({
      $or: [
        { _id: supplierIdObj },
        { customerId: supplierIdObj }
      ]
    }).lean();

    if (!supplier) {
      console.log('❌ Supplier no encontrado\n');
      return;
    }

    console.log('✅ Supplier encontrado:');
    console.log(`   Nombre: ${supplier.name}`);
    console.log(`   ID: ${supplier._id}`);
    console.log(`   CustomerID: ${supplier.customerId}\n`);

    // Verificar productos en el supplier
    console.log('🔍 Verificando vinculación de productos...\n');

    for (const item of order.items) {
      const product = await Product.findById(item.productId).lean();

      if (!product) {
        console.log(`   ❌ Producto NO EXISTE: ${item.productName}`);
        continue;
      }

      console.log(`   📦 ${product.name} (${product.sku})`);

      if (!product.suppliers || product.suppliers.length === 0) {
        console.log(`      ❌ NO tiene suppliers vinculados`);
      } else {
        console.log(`      ✅ Tiene ${product.suppliers.length} supplier(s) vinculado(s):`);
        product.suppliers.forEach(s => {
          const isThisSupplier = String(s.supplierId) === String(supplier._id);
          console.log(`         ${isThisSupplier ? '✅' : '  '} ${s.supplierName} (${s.supplierId})`);
          if (isThisSupplier) {
            console.log(`            Precio: $${s.costPrice} ${s.paymentCurrency}`);
            console.log(`            Métodos: ${s.acceptedPaymentMethods?.join(', ')}`);
          }
        });
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

verifyOrder();
