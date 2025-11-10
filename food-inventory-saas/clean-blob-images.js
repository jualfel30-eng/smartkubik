const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function cleanBlobImages() {
  try {
    await client.connect();
    console.log('🔗 Conectado a MongoDB\n');

    const db = client.db('test');
    const products = db.collection('products');

    console.log('🔍 Buscando productos con blob URLs...\n');

    // Find all products with blob URLs
    const productsWithBlobUrls = await products.find({
      'variants.images': { $regex: /^blob:/ }
    }).toArray();

    console.log(`📊 Encontrados ${productsWithBlobUrls.length} productos con blob URLs\n`);

    if (productsWithBlobUrls.length === 0) {
      console.log('✅ No hay blob URLs para limpiar');
      return;
    }

    let totalBlobsRemoved = 0;
    let productsUpdated = 0;

    for (const product of productsWithBlobUrls) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 Producto: ${product.name}`);
      console.log(`   SKU: ${product.sku}`);

      const updatedVariants = product.variants.map((variant, vIdx) => {
        if (!variant.images || variant.images.length === 0) {
          return variant;
        }

        const originalCount = variant.images.length;

        // Filter out blob URLs, keep only base64 and http URLs
        const cleanedImages = variant.images.filter(img => {
          const isBlob = img.startsWith('blob:');
          if (isBlob) {
            console.log(`   🗑️  Removiendo blob URL de variante "${variant.name || 'Estándar'}"`);
            totalBlobsRemoved++;
          }
          return !isBlob;
        });

        const removedCount = originalCount - cleanedImages.length;
        if (removedCount > 0) {
          console.log(`   ✓ Variante "${variant.name || 'Estándar'}": ${removedCount} blob(s) removida(s), ${cleanedImages.length} imagen(es) válida(s) conservada(s)`);
        }

        return {
          ...variant,
          images: cleanedImages
        };
      });

      // Update the product in the database
      await products.updateOne(
        { _id: product._id },
        { $set: { variants: updatedVariants } }
      );

      productsUpdated++;
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ LIMPIEZA COMPLETADA\n');
    console.log(`📊 Resumen:`);
    console.log(`   • Productos actualizados: ${productsUpdated}`);
    console.log(`   • Total de blob URLs removidas: ${totalBlobsRemoved}`);
    console.log('\n💡 Las imágenes válidas (base64 y URLs externas) fueron conservadas');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar con opción de dry-run
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  console.log('⚠️  MODO DRY-RUN - No se realizarán cambios en la base de datos\n');
  // TODO: Implementar modo dry-run si es necesario
} else {
  cleanBlobImages();
}
