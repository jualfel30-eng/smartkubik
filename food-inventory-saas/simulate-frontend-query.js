/**
 * Simular la consulta exacta del frontend a /inventory
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const TENANT_ID = '6984b426dad0fee93da83cfb';

const InventorySchema = new mongoose.Schema({}, { collection: 'inventories', strict: false, strictPopulate: false });
const ProductSchema = new mongoose.Schema({}, { collection: 'products', strict: false });

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB Atlas...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Inventory = mongoose.model('Inventory', InventorySchema);
    const Product = mongoose.model('Product', ProductSchema);

    // Simular la consulta exacta del backend
    console.log('🔍 Simulando consulta del frontend: GET /inventory?page=1&limit=100\n');

    const filter = {
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      isActive: { $ne: false }
    };

    const sortOptions = { lastUpdated: -1 };

    const inventories = await Inventory
      .find(filter)
      .sort(sortOptions)
      .limit(100)
      .populate('productId', 'name category brand isPerishable variants')
      .lean()
      .exec();

    console.log(`📦 Inventarios obtenidos: ${inventories.length}\n`);

    // Buscar los Al Reef
    const alReefInventories = inventories.filter(inv => {
      const productName = (inv.productName || '').toLowerCase();
      return productName.includes('al reef');
    });

    console.log(`🔍 Inventarios "al reef" encontrados: ${alReefInventories.length}\n`);

    alReefInventories.forEach((inv, idx) => {
      console.log(`${idx + 1}. ${inv.productName}`);
      console.log(`   productId populated?: ${inv.productId ? '✅ SÍ' : '❌ NO'}`);

      if (inv.productId) {
        console.log(`   productId.name: "${inv.productId.name}"`);
        console.log(`   productId.brand: "${inv.productId.brand}"`);
        console.log(`   productId.category: ${JSON.stringify(inv.productId.category)}`);
        console.log(`   productId.variants: ${inv.productId.variants?.length || 0} variante(s)`);

        // Verificar si hay pricingRules
        if (inv.productId.pricingRules !== undefined) {
          console.log(`   productId.pricingRules: ${JSON.stringify(inv.productId.pricingRules)}`);
        } else {
          console.log(`   productId.pricingRules: ❌ NO INCLUIDO en populate`);
        }
      }

      console.log('');
    });

    // Verificar el producto directamente en la colección products
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔍 Verificando productos Al Reef directamente:\n');

    const products = await Product.find({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      name: /al reef/i,
      isActive: true
    }).lean();

    console.log(`Productos encontrados: ${products.length}\n`);

    products.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name}`);
      console.log(`   SKU: ${p.sku}`);
      console.log(`   isActive: ${p.isActive}`);
      console.log(`   pricingRules: ${JSON.stringify(p.pricingRules, null, 2)}`);
      console.log('');
    });

    // Ahora simular el filtro del frontend
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔍 Simulando filtro del FRONTEND con búsqueda "al reef":\n');

    const searchTerm = 'al reef';
    const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);

    const frontendFiltered = inventories.filter((item) => {
      // Replicar lógica exacta del frontend (líneas 354-375)
      const searchableText = [
        item.productName,
        item.productSku,
        item.variantSku,
        item.productId?.name,
        item.productId?.sku,
        item.productId?.brand,
        ...(Array.isArray(item.productId?.category)
          ? item.productId.category
          : [item.productId?.category]),
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(' ');

      return searchWords.every((word) => searchableText.includes(word));
    });

    console.log(`Resultados del filtro frontend: ${frontendFiltered.length}\n`);

    frontendFiltered.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.productName}`);
      console.log(`   productSku: ${item.productSku}`);
      console.log(`   variantSku: ${item.variantSku}`);
      console.log(`   productId?.name: ${item.productId?.name}`);
      console.log(`   productId?.brand: ${item.productId?.brand}`);
      console.log(`   productId?.category: ${JSON.stringify(item.productId?.category)}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB\n');
  }
}

main();
