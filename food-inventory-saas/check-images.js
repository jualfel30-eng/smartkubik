const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function checkImages() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // List all databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('\n📚 Available databases:');
    dbs.databases.forEach(db => console.log(`  - ${db.name}`));

    const db = client.db('test');

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📦 Collections in test:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    const products = db.collection('products');
    const tenants = db.collection('tenants');

    // Find Tiendas Broas tenant
    const broas = await tenants.findOne({
      name: { $regex: /broas/i }
    });

    if (!broas) {
      console.log('❌ Tenant "Tiendas Broas" not found');
      console.log('\nSearching all tenants...');
      const allTenants = await tenants.find({}).toArray();
      console.log(`\nFound ${allTenants.length} tenants total:\n`);
      allTenants.forEach(t => console.log(`  - ${t.name} (${t._id})`));

      // Try to find products with images from any tenant
      console.log('\n\nSearching for ANY products with images...');
      const anyProductsWithImages = await products.find({
        'variants.images': { $exists: true, $ne: [] }
      }).limit(3).toArray();

      if (anyProductsWithImages.length > 0) {
        console.log(`\n✅ Found ${anyProductsWithImages.length} products with images:\n`);
        for (const product of anyProductsWithImages) {
          const tenant = await tenants.findOne({ _id: product.tenantId });
          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`📦 Product: ${product.name}`);
          console.log(`🏢 Tenant: ${tenant?.name || 'Unknown'}`);
          console.log(`SKU: ${product.sku}`);

          if (product.variants && product.variants[0]?.images?.[0]) {
            const img = product.variants[0].images[0];
            const imageType = img.startsWith('blob:') ? '🔴 blob URL (EXPIRED - PERDIDA)'
                            : img.startsWith('data:image') ? '✅ base64 (VÁLIDA)'
                            : img.startsWith('http') ? '🔗 external URL'
                            : '❓ unknown';
            console.log(`📸 First image type: ${imageType}`);
            console.log(`   Preview: ${img.substring(0, 80)}...`);
          }
        }
      }
      return;
    }

    console.log(`✅ Found tenant: ${broas.name} (${broas._id})\n`);

    // Find ALL Nutella products
    const nutellaProducts = await products.find({
      tenantId: broas._id,
      name: { $regex: /nutella/i }
    }).toArray();

    console.log(`🎯 FOUND ${nutellaProducts.length} NUTELLA PRODUCTS:\n`);

    nutellaProducts.forEach((nutella, pIdx) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 Product ${pIdx + 1}: ${nutella.name}`);
      console.log(`SKU: ${nutella.sku}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      if (nutella.variants && nutella.variants.length > 0) {
        nutella.variants.forEach((variant, idx) => {
          console.log(`\n  🔹 Variant ${idx + 1}: ${variant.name || 'Default'}`);

          if (variant.images && variant.images.length > 0) {
            variant.images.forEach((img, imgIdx) => {
              const imageType = img.startsWith('blob:') ? '🔴 blob URL (EXPIRED - PERDIDA)'
                              : img.startsWith('data:image') ? '✅ base64 (VÁLIDA)'
                              : img.startsWith('http') ? '🔗 external URL'
                              : '❓ unknown';

              console.log(`    📸 Image ${imgIdx + 1}:`);
              console.log(`       Type: ${imageType}`);
              console.log(`       Size: ${(img.length / 1024).toFixed(2)} KB`);
              console.log(`       Full URL: ${img}`);
            });
          } else {
            console.log('    (No images)');
          }
        });
      }
    });
    console.log('\n\n');

    // Find products with images for this tenant
    const productsWithImages = await products.find({
      tenantId: broas._id,
      'variants.images': { $exists: true, $ne: [] }
    }).limit(10).toArray();

    if (productsWithImages.length === 0) {
      console.log('❌ No products with images found for this tenant');
      return;
    }

    console.log(`Found ${productsWithImages.length} products with images:\n`);

    productsWithImages.forEach((product) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 Product: ${product.name}`);
      console.log(`SKU: ${product.sku}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant, idx) => {
          console.log(`\n  🔹 Variant ${idx + 1}: ${variant.name || 'Default'}`);

          if (variant.images && variant.images.length > 0) {
            variant.images.forEach((img, imgIdx) => {
              const imageType = img.startsWith('blob:') ? '🔴 blob URL (EXPIRED - PERDIDA)'
                              : img.startsWith('data:image') ? '✅ base64 (VÁLIDA)'
                              : img.startsWith('http') ? '🔗 external URL'
                              : '❓ unknown';

              const preview = img.substring(0, 80);
              const size = img.length;
              const sizeKB = (size / 1024).toFixed(2);

              console.log(`    📸 Image ${imgIdx + 1}:`);
              console.log(`       Type: ${imageType}`);
              console.log(`       Size: ${sizeKB} KB (${size} chars)`);
              console.log(`       Preview: ${preview}...`);
            });
          } else {
            console.log('    (No images)');
          }
        });
      } else {
        console.log('  (No variants)');
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkImages();
