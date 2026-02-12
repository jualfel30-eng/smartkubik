/**
 * Script de Migración: PricingRules Completos
 *
 * Actualiza todos los productos con pricingRules incompletos,
 * agregando los campos faltantes con valores por defecto.
 *
 * Campos agregados:
 * - cashDiscount: 0
 * - cardSurcharge: 0
 * - minimumMargin: 0.2 (20%)
 * - maximumDiscount: 0.5 (50%)
 * - wholesaleEnabled: false
 * - wholesaleMinQuantity: 1
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

// Valores por defecto
const DEFAULT_PRICING_RULES = {
  cashDiscount: 0,
  cardSurcharge: 0,
  minimumMargin: 0.2,
  maximumDiscount: 0.5,
  wholesaleEnabled: false,
  wholesaleMinQuantity: 1,
  bulkDiscountEnabled: false,
  bulkDiscountRules: []
};

const ProductSchema = new mongoose.Schema({}, { collection: 'products', strict: false });

async function analyzePricingRules() {
  console.log('🔍 ANALIZANDO PRODUCTOS...\n');

  const Product = mongoose.model('Product', ProductSchema);

  // Buscar todos los productos
  const allProducts = await Product.find({}).lean();
  console.log(`Total de productos en DB: ${allProducts.length}\n`);

  // Analizar cuáles necesitan actualización
  const needsUpdate = [];
  const stats = {
    noPricingRules: 0,
    missingCashDiscount: 0,
    missingCardSurcharge: 0,
    missingMinimumMargin: 0,
    missingMaximumDiscount: 0,
    missingWholesaleEnabled: 0,
    missingWholesaleMinQuantity: 0,
  };

  for (const product of allProducts) {
    const pr = product.pricingRules;
    let needsUpdateFlag = false;
    const missingFields = [];

    if (!pr) {
      stats.noPricingRules++;
      needsUpdateFlag = true;
      missingFields.push('pricingRules completo');
    } else {
      if (pr.cashDiscount === undefined) {
        stats.missingCashDiscount++;
        needsUpdateFlag = true;
        missingFields.push('cashDiscount');
      }
      if (pr.cardSurcharge === undefined) {
        stats.missingCardSurcharge++;
        needsUpdateFlag = true;
        missingFields.push('cardSurcharge');
      }
      if (pr.minimumMargin === undefined) {
        stats.missingMinimumMargin++;
        needsUpdateFlag = true;
        missingFields.push('minimumMargin');
      }
      if (pr.maximumDiscount === undefined) {
        stats.missingMaximumDiscount++;
        needsUpdateFlag = true;
        missingFields.push('maximumDiscount');
      }
      if (pr.wholesaleEnabled === undefined) {
        stats.missingWholesaleEnabled++;
        needsUpdateFlag = true;
        missingFields.push('wholesaleEnabled');
      }
      if (pr.wholesaleMinQuantity === undefined) {
        stats.missingWholesaleMinQuantity++;
        needsUpdateFlag = true;
        missingFields.push('wholesaleMinQuantity');
      }
    }

    if (needsUpdateFlag) {
      needsUpdate.push({
        id: product._id,
        name: product.name,
        sku: product.sku,
        missingFields
      });
    }
  }

  console.log('📊 ESTADÍSTICAS:\n');
  console.log(`Productos sin pricingRules: ${stats.noPricingRules}`);
  console.log(`Productos sin cashDiscount: ${stats.missingCashDiscount}`);
  console.log(`Productos sin cardSurcharge: ${stats.missingCardSurcharge}`);
  console.log(`Productos sin minimumMargin: ${stats.missingMinimumMargin}`);
  console.log(`Productos sin maximumDiscount: ${stats.missingMaximumDiscount}`);
  console.log(`Productos sin wholesaleEnabled: ${stats.missingWholesaleEnabled}`);
  console.log(`Productos sin wholesaleMinQuantity: ${stats.missingWholesaleMinQuantity}\n`);

  console.log(`📝 TOTAL DE PRODUCTOS QUE NECESITAN ACTUALIZACIÓN: ${needsUpdate.length}\n`);

  if (needsUpdate.length > 0) {
    console.log('🔍 PRIMEROS 10 PRODUCTOS A ACTUALIZAR:\n');
    needsUpdate.slice(0, 10).forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.sku})`);
      console.log(`   Campos faltantes: ${p.missingFields.join(', ')}\n`);
    });
  }

  return needsUpdate;
}

async function migrateProducts(productsToUpdate, dryRun = true) {
  if (productsToUpdate.length === 0) {
    console.log('✅ No hay productos que actualizar\n');
    return;
  }

  const Product = mongoose.model('Product', ProductSchema);

  if (dryRun) {
    console.log('🔍 MODO DRY-RUN (no se aplicarán cambios)\n');
    console.log('Para aplicar los cambios, ejecuta el script con: node migrate-pricing-rules.js --apply\n');
    return;
  }

  console.log('🔧 APLICANDO MIGRACIÓN...\n');

  let updated = 0;
  let errors = 0;

  for (const product of productsToUpdate) {
    try {
      // Obtener el producto actual
      const currentProduct = await Product.findById(product.id).lean();

      if (!currentProduct) {
        console.log(`⚠️  Producto ${product.id} no encontrado, saltando...`);
        continue;
      }

      // Construir el objeto de actualización
      const updateFields = {};

      // Si no tiene pricingRules, crear todo desde cero
      if (!currentProduct.pricingRules) {
        updateFields.pricingRules = { ...DEFAULT_PRICING_RULES };
      } else {
        // Agregar solo los campos faltantes
        if (currentProduct.pricingRules.cashDiscount === undefined) {
          updateFields['pricingRules.cashDiscount'] = DEFAULT_PRICING_RULES.cashDiscount;
        }
        if (currentProduct.pricingRules.cardSurcharge === undefined) {
          updateFields['pricingRules.cardSurcharge'] = DEFAULT_PRICING_RULES.cardSurcharge;
        }
        if (currentProduct.pricingRules.minimumMargin === undefined) {
          updateFields['pricingRules.minimumMargin'] = DEFAULT_PRICING_RULES.minimumMargin;
        }
        if (currentProduct.pricingRules.maximumDiscount === undefined) {
          updateFields['pricingRules.maximumDiscount'] = DEFAULT_PRICING_RULES.maximumDiscount;
        }
        if (currentProduct.pricingRules.wholesaleEnabled === undefined) {
          updateFields['pricingRules.wholesaleEnabled'] = DEFAULT_PRICING_RULES.wholesaleEnabled;
        }
        if (currentProduct.pricingRules.wholesaleMinQuantity === undefined) {
          updateFields['pricingRules.wholesaleMinQuantity'] = DEFAULT_PRICING_RULES.wholesaleMinQuantity;
        }
        if (currentProduct.pricingRules.bulkDiscountEnabled === undefined) {
          updateFields['pricingRules.bulkDiscountEnabled'] = DEFAULT_PRICING_RULES.bulkDiscountEnabled;
        }
        if (!currentProduct.pricingRules.bulkDiscountRules) {
          updateFields['pricingRules.bulkDiscountRules'] = DEFAULT_PRICING_RULES.bulkDiscountRules;
        }
      }

      // Aplicar la actualización
      await Product.updateOne(
        { _id: product.id },
        { $set: updateFields }
      );

      updated++;

      if (updated % 50 === 0) {
        console.log(`✅ Actualizados: ${updated}/${productsToUpdate.length}`);
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error actualizando producto ${product.name}:`, error.message);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ MIGRACIÓN COMPLETADA\n');
  console.log(`Productos actualizados: ${updated}`);
  console.log(`Errores: ${errors}`);
}

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB Atlas...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Analizar productos
    const productsToUpdate = await analyzePricingRules();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verificar si se debe aplicar la migración
    const args = process.argv.slice(2);
    const shouldApply = args.includes('--apply');

    // Migrar
    await migrateProducts(productsToUpdate, !shouldApply);

    if (!shouldApply && productsToUpdate.length > 0) {
      console.log('\n💡 Para aplicar los cambios, ejecuta:\n');
      console.log('   node migrate-pricing-rules.js --apply\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB\n');
  }
}

// Ejecutar
main();
