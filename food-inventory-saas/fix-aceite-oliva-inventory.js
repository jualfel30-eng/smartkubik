/**
 * Script para diagnosticar y reactivar el inventario de "Aceite de Oliva E.V Al Reef 4lt"
 * Tenant: Tiendas Broas El Parral
 * MongoDB Atlas - Cluster: test
 */

const mongoose = require('mongoose');

// Configuración
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const TENANT_NAME = 'Tiendas Broas -  El Parral';
const PRODUCT_SEARCH = 'aceite de oliva';

// Schemas simplificados
const TenantSchema = new mongoose.Schema({
  name: String,
  slug: String,
}, { collection: 'tenants' });

const ProductSchema = new mongoose.Schema({
  name: String,
  sku: String,
  isActive: Boolean,
  tenantId: mongoose.Schema.Types.ObjectId,
  variants: [{
    name: String,
    sku: String,
    basePrice: Number,
    costPrice: Number,
    wholesalePrice: Number,
  }]
}, { collection: 'products' });

const InventorySchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.ObjectId,
  productName: String,
  productSku: String,
  variantSku: String,
  availableQuantity: Number,
  totalQuantity: Number,
  isActive: Boolean,
  tenantId: mongoose.Schema.Types.ObjectId,
}, { collection: 'inventories' });

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB Atlas...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Tenant = mongoose.model('Tenant', TenantSchema);
    const Product = mongoose.model('Product', ProductSchema);
    const Inventory = mongoose.model('Inventory', InventorySchema);

    // 1. Buscar el tenant
    console.log(`🔍 Buscando tenant: "${TENANT_NAME}"...`);
    const tenant = await Tenant.findOne({
      $or: [
        { name: new RegExp(TENANT_NAME, 'i') },
        { slug: new RegExp(TENANT_NAME.replace(/\s+/g, '-'), 'i') }
      ]
    });

    if (!tenant) {
      console.error(`❌ Tenant "${TENANT_NAME}" no encontrado`);
      process.exit(1);
    }

    console.log(`✅ Tenant encontrado: ${tenant.name} (ID: ${tenant._id})\n`);

    // 2. Buscar el producto
    console.log(`🔍 Buscando producto que contenga: "${PRODUCT_SEARCH}"...`);
    const products = await Product.find({
      tenantId: tenant._id,
      name: new RegExp(PRODUCT_SEARCH, 'i')
    });

    if (products.length === 0) {
      console.error(`❌ No se encontró ningún producto con "${PRODUCT_SEARCH}"`);
      process.exit(1);
    }

    console.log(`✅ Se encontraron ${products.length} producto(s):\n`);
    products.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name}`);
      console.log(`      SKU: ${p.sku}`);
      console.log(`      Activo: ${p.isActive}`);
      console.log(`      ID: ${p._id}`);
      console.log(`      Variantes: ${p.variants?.length || 0}\n`);
    });

    // 3. Buscar inventario de cada producto
    console.log('📦 Buscando registros de inventario...\n');

    for (const product of products) {
      const inventories = await Inventory.find({
        tenantId: tenant._id,
        productId: product._id
      });

      if (inventories.length === 0) {
        console.log(`   ⚠️  "${product.name}" NO tiene registros de inventario\n`);
        continue;
      }

      console.log(`   📋 "${product.name}" - ${inventories.length} registro(s) de inventario:`);

      const inactiveInventories = [];

      inventories.forEach((inv, idx) => {
        console.log(`      ${idx + 1}. SKU: ${inv.variantSku || inv.productSku}`);
        console.log(`         Cantidad disponible: ${inv.availableQuantity}`);
        console.log(`         Cantidad total: ${inv.totalQuantity}`);
        console.log(`         isActive: ${inv.isActive}`);
        console.log(`         ID: ${inv._id}`);

        if (inv.isActive === false) {
          console.log(`         ⚠️  ESTE INVENTARIO ESTÁ INACTIVO - Por eso no aparece en las vistas`);
          inactiveInventories.push(inv);
        }
        console.log('');
      });

      // 4. Ofrecer reactivar inventarios inactivos
      if (inactiveInventories.length > 0) {
        console.log(`\n🔧 SOLUCIÓN DISPONIBLE:`);
        console.log(`   Se encontraron ${inactiveInventories.length} registro(s) de inventario inactivo(s)`);
        console.log(`   Para reactivarlos, ejecuta:\n`);

        inactiveInventories.forEach(inv => {
          console.log(`   db.inventories.updateOne(`);
          console.log(`     { _id: ObjectId("${inv._id}") },`);
          console.log(`     { $set: { isActive: true } }`);
          console.log(`   )\n`);
        });

        // Opción automática (comentada por seguridad)
        console.log(`\n   O descomentar la siguiente línea en el script para reactivar automáticamente:\n`);

        // DESCOMENTA LA SIGUIENTE LÍNEA PARA REACTIVAR AUTOMÁTICAMENTE
        // await reactivateInventories(inactiveInventories, Inventory);
      }
    }

    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

async function reactivateInventories(inventories, InventoryModel) {
  console.log('\n🔄 Reactivando inventarios...\n');

  for (const inv of inventories) {
    try {
      await InventoryModel.updateOne(
        { _id: inv._id },
        { $set: { isActive: true } }
      );
      console.log(`   ✅ Reactivado: ${inv.productName} (SKU: ${inv.variantSku || inv.productSku})`);
    } catch (error) {
      console.error(`   ❌ Error reactivando ${inv._id}:`, error.message);
    }
  }

  console.log('\n✅ Reactivación completada');
}

// Ejecutar
main();
