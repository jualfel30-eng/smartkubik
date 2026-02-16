/**
 * Test: Verificar qué devuelve la API al obtener el producto Al Reef 4lt
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

    // Obtener el producto como lo haría la API
    const product = await Product.findById(PRODUCT_4LT_ID).lean();

    if (!product) {
      console.error('❌ Producto no encontrado');
      process.exit(1);
    }

    console.log('📦 PRODUCTO AL REEF 4LT:\n');
    console.log(`Nombre: ${product.name}`);
    console.log(`SKU: ${product.sku}`);
    console.log(`isActive: ${product.isActive}`);
    console.log('');

    console.log('💰 PRICING RULES:');
    console.log(JSON.stringify(product.pricingRules, null, 2));
    console.log('');

    console.log('🏷️  VARIANTES:');
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((variant, idx) => {
        console.log(`\nVariante ${idx + 1}:`);
        console.log(`  name: ${variant.name}`);
        console.log(`  sku: ${variant.sku}`);
        console.log(`  basePrice: ${variant.basePrice}`);
        console.log(`  wholesalePrice: ${variant.wholesalePrice}`);
        console.log(`  costPrice: ${variant.costPrice}`);
        console.log(`  isActive: ${variant.isActive}`);
      });
    }
    console.log('');

    // Verificar específicamente los campos wholesale
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ VERIFICACIÓN DE CAMPOS WHOLESALE:\n');

    console.log(`pricingRules.wholesaleEnabled: ${product.pricingRules?.wholesaleEnabled}`);
    console.log(`pricingRules.wholesaleMinQuantity: ${product.pricingRules?.wholesaleMinQuantity}`);
    console.log(`variants[0].wholesalePrice: ${product.variants?.[0]?.wholesalePrice}`);
    console.log('');

    if (product.pricingRules?.wholesaleEnabled === true) {
      console.log('✅ wholesaleEnabled está en TRUE');
    } else if (product.pricingRules?.wholesaleEnabled === false) {
      console.log('⚠️  wholesaleEnabled está en FALSE');
    } else {
      console.log('❌ wholesaleEnabled es undefined o no existe');
    }

    if (product.variants?.[0]?.wholesalePrice > 0) {
      console.log('✅ wholesalePrice tiene un valor > 0');
    } else if (product.variants?.[0]?.wholesalePrice === 0) {
      console.log('⚠️  wholesalePrice es 0');
    } else {
      console.log('❌ wholesalePrice es undefined o no existe');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB\n');
  }
}

main();
