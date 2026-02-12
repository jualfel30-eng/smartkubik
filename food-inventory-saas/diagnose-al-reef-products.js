/**
 * Script de Diagnóstico: Comparar Al Reef 2lt vs 4lt
 *
 * Compara ambos productos lado a lado para identificar
 * por qué uno aparece y el otro no.
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const TENANT_ID = '6984b426dad0fee93da83cfb'; // Tiendas Broas - El Parral
const PRODUCT_2LT_ID = '69868232527ba464e4281a03';
const PRODUCT_4LT_ID = '698b89c38ad8cf98c367324f';

// Schemas simplificados
const ProductSchema = new mongoose.Schema({}, { collection: 'products', strict: false });
const InventorySchema = new mongoose.Schema({}, { collection: 'inventories', strict: false });

function compareObjects(obj1, obj2, path = '') {
  const differences = [];

  const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];

    // Ignorar campos de metadatos
    if (['_id', 'createdAt', 'updatedAt', '__v'].includes(key)) continue;

    if (val1 === undefined && val2 !== undefined) {
      differences.push(`  ⚠️  2lt tiene ${currentPath} = ${JSON.stringify(val2)}, pero 4lt NO lo tiene`);
    } else if (val2 === undefined && val1 !== undefined) {
      differences.push(`  ⚠️  4lt tiene ${currentPath} = ${JSON.stringify(val1)}, pero 2lt NO lo tiene`);
    } else if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null) {
      if (Array.isArray(val1) && Array.isArray(val2)) {
        if (JSON.stringify(val1) !== JSON.stringify(val2)) {
          differences.push(`  ⚠️  ${currentPath} difiere:`);
          differences.push(`     2lt: ${JSON.stringify(val2)}`);
          differences.push(`     4lt: ${JSON.stringify(val1)}`);
        }
      } else {
        differences.push(...compareObjects(val1, val2, currentPath));
      }
    } else if (val1 !== val2) {
      differences.push(`  ⚠️  ${currentPath} difiere:`);
      differences.push(`     2lt: ${JSON.stringify(val2)}`);
      differences.push(`     4lt: ${JSON.stringify(val1)}`);
    }
  }

  return differences;
}

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB Atlas...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Product = mongoose.model('Product', ProductSchema);
    const Inventory = mongoose.model('Inventory', InventorySchema);

    // Obtener ambos productos
    console.log('📦 Obteniendo productos Al Reef...\n');

    const product4lt = await Product.findById(PRODUCT_4LT_ID).lean();
    const product2lt = await Product.findById(PRODUCT_2LT_ID).lean();

    if (!product4lt) {
      console.error('❌ Producto 4lt NO ENCONTRADO');
      process.exit(1);
    }

    if (!product2lt) {
      console.error('❌ Producto 2lt NO ENCONTRADO');
      process.exit(1);
    }

    console.log('✅ Ambos productos encontrados\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Información básica
    console.log('📋 INFORMACIÓN BÁSICA:\n');
    console.log('2lt:');
    console.log(`  Nombre: ${product2lt.name}`);
    console.log(`  SKU: ${product2lt.sku}`);
    console.log(`  isActive: ${product2lt.isActive}`);
    console.log(`  productType: ${product2lt.productType}`);
    console.log('');
    console.log('4lt:');
    console.log(`  Nombre: ${product4lt.name}`);
    console.log(`  SKU: ${product4lt.sku}`);
    console.log(`  isActive: ${product4lt.isActive}`);
    console.log(`  productType: ${product4lt.productType}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Comparar pricingRules
    console.log('💰 PRICING RULES:\n');
    console.log('2lt pricingRules:');
    console.log(JSON.stringify(product2lt.pricingRules, null, 2));
    console.log('\n4lt pricingRules:');
    console.log(JSON.stringify(product4lt.pricingRules, null, 2));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Comparar variantes
    console.log('🏷️  VARIANTES:\n');
    console.log(`2lt tiene ${product2lt.variants?.length || 0} variante(s)`);
    console.log(`4lt tiene ${product4lt.variants?.length || 0} variante(s)`);
    console.log('');

    if (product2lt.variants?.length > 0) {
      console.log('2lt - Variante 1:');
      console.log(`  SKU: ${product2lt.variants[0].sku}`);
      console.log(`  Precio: ${product2lt.variants[0].basePrice}`);
      console.log(`  isActive: ${product2lt.variants[0].isActive}`);
    }
    console.log('');
    if (product4lt.variants?.length > 0) {
      console.log('4lt - Variante 1:');
      console.log(`  SKU: ${product4lt.variants[0].sku}`);
      console.log(`  Precio: ${product4lt.variants[0].basePrice}`);
      console.log(`  wholesalePrice: ${product4lt.variants[0].wholesalePrice}`);
      console.log(`  isActive: ${product4lt.variants[0].isActive}`);
    }
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Obtener inventarios
    console.log('📦 INVENTARIOS:\n');

    const inventory4lt = await Inventory.find({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      productId: new mongoose.Types.ObjectId(PRODUCT_4LT_ID)
    }).lean();

    const inventory2lt = await Inventory.find({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      productId: new mongoose.Types.ObjectId(PRODUCT_2LT_ID)
    }).lean();

    console.log(`2lt: ${inventory2lt.length} registro(s) de inventario`);
    if (inventory2lt.length > 0) {
      inventory2lt.forEach((inv, idx) => {
        console.log(`  ${idx + 1}. isActive: ${inv.isActive}, quantity: ${inv.availableQuantity}, variantSku: ${inv.variantSku}`);
      });
    }
    console.log('');
    console.log(`4lt: ${inventory4lt.length} registro(s) de inventario`);
    if (inventory4lt.length > 0) {
      inventory4lt.forEach((inv, idx) => {
        console.log(`  ${idx + 1}. isActive: ${inv.isActive}, quantity: ${inv.availableQuantity}, variantSku: ${inv.variantSku}`);
      });
    }
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // DIFERENCIAS CRÍTICAS
    console.log('⚠️  DIFERENCIAS ENTRE 2lt Y 4lt:\n');
    const differences = compareObjects(product4lt, product2lt);

    if (differences.length === 0) {
      console.log('✅ No se encontraron diferencias significativas en los productos\n');
    } else {
      differences.forEach(diff => console.log(diff));
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ANÁLISIS DE COMPATIBILIDAD CON CONSULTAS
    console.log('🔍 ANÁLISIS DE COMPATIBILIDAD CON CONSULTAS FRONTEND:\n');

    // Simulación de la consulta típica del frontend
    const testQuery = {
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      isActive: true,
      $or: [
        { name: { $regex: 'al reef', $options: 'i' } },
        { sku: { $regex: 'al reef', $options: 'i' } },
      ]
    };

    console.log('Ejecutando consulta simulada del frontend:');
    console.log(JSON.stringify(testQuery, null, 2));
    console.log('');

    const searchResults = await Product.find(testQuery).lean();
    console.log(`Resultados encontrados: ${searchResults.length}`);
    searchResults.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.name} (SKU: ${p.sku}, ID: ${p._id})`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // VERIFICAR SI EL PRODUCTO APARECE EN AGGREGATE CON INVENTORY
    console.log('🔍 PRUEBA DE AGGREGATE CON INVENTARIO:\n');

    const aggregateResults = await Product.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(TENANT_ID),
          isActive: true,
          $or: [
            { name: { $regex: 'al reef', $options: 'i' } },
            { sku: { $regex: 'al reef', $options: 'i' } },
          ]
        }
      },
      {
        $lookup: {
          from: 'inventories',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$productId', '$$productId'] },
                    { $eq: ['$tenantId', new mongoose.Types.ObjectId(TENANT_ID)] },
                    { $eq: ['$isActive', true] }
                  ]
                }
              }
            }
          ],
          as: 'inventory'
        }
      }
    ]);

    console.log(`Resultados del aggregate: ${aggregateResults.length}`);
    aggregateResults.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.name}`);
      console.log(`      Inventarios encontrados: ${p.inventory?.length || 0}`);
      if (p.inventory?.length > 0) {
        p.inventory.forEach((inv, invIdx) => {
          console.log(`        ${invIdx + 1}. Cantidad: ${inv.availableQuantity}, isActive: ${inv.isActive}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB\n');
  }
}

main();
