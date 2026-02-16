/**
 * Fix Al Reef 4lt - Agregar campos faltantes en pricingRules
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const PRODUCT_4LT_ID = '698b89c38ad8cf98c367324f';

const ProductSchema = new mongoose.Schema({}, { collection: 'products', strict: false });

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB Atlas...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Product = mongoose.model('Product', ProductSchema);

    // Obtener el producto actual
    const product = await Product.findById(PRODUCT_4LT_ID).lean();

    if (!product) {
      console.error('❌ Producto 4lt no encontrado');
      process.exit(1);
    }

    console.log('📦 Producto actual:');
    console.log(`   Nombre: ${product.name}`);
    console.log(`   pricingRules actuales:`, JSON.stringify(product.pricingRules, null, 2));
    console.log('');

    // Actualizar con los campos faltantes
    const updateFields = {
      'pricingRules.cardSurcharge': 0,
      'pricingRules.cashDiscount': 0,
      'pricingRules.maximumDiscount': 0.5,
      'pricingRules.minimumMargin': 0.2,
    };

    console.log('🔧 Aplicando actualización...\n');

    const result = await Product.updateOne(
      { _id: new mongoose.Types.ObjectId(PRODUCT_4LT_ID) },
      { $set: updateFields }
    );

    console.log(`✅ Actualización completada`);
    console.log(`   Documentos modificados: ${result.modifiedCount}`);
    console.log('');

    // Verificar
    const updatedProduct = await Product.findById(PRODUCT_4LT_ID).lean();
    console.log('📦 Producto actualizado:');
    console.log(`   pricingRules:`, JSON.stringify(updatedProduct.pricingRules, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB\n');
  }
}

main();
