/**
 * VINCULACIÓN RETROACTIVA DE PRODUCTOS A PROVEEDORES
 *
 * Este script vincula productos de órdenes de compra con sus proveedores.
 * Actualiza Product.suppliers[] para que los productos aparezcan en el módulo de Proveedores.
 *
 * MODO DE USO:
 * 1. ANÁLISIS (no hace cambios, solo muestra plan):
 *    node link-products-to-suppliers.js --dry-run
 *
 * 2. EJECUCIÓN (aplica cambios):
 *    node link-products-to-suppliers.js --execute
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';
const TENANT_ID = '69b187062339e815ceba7487'; // Tiendas Broas, C.A. (con 18 órdenes de compra)
const BACKUP_DIR = path.join(__dirname, '../../backups');

// Modo de ejecución
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--execute');

// ==================== SCHEMAS ====================
const PurchaseOrderSchema = new mongoose.Schema({}, { strict: false });
const ProductSchema = new mongoose.Schema({}, { strict: false });
const SupplierSchema = new mongoose.Schema({}, { strict: false });

let PurchaseOrder, Product, Supplier;

// ==================== BACKUP ====================

async function createBackup() {
  console.log('\n📦 Creando backup de productos...');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `products-suppliers-backup-${timestamp}.json`);

  const products = await Product.find({ tenantId: new mongoose.Types.ObjectId(TENANT_ID) }).lean();

  const backup = {
    timestamp: new Date().toISOString(),
    tenantId: TENANT_ID,
    products: products.map(p => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      suppliers: p.suppliers || []
    }))
  };

  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`✅ Backup creado: ${backupFile}\n`);

  return backupFile;
}

// ==================== ANÁLISIS ====================

async function analyzePurchaseOrders() {
  console.log('🔍 Analizando órdenes de compra...\n');

  // Buscar todas las órdenes de compra del tenant (convertir a ObjectId)
  const purchaseOrders = await PurchaseOrder.find({
    tenantId: new mongoose.Types.ObjectId(TENANT_ID)
  }).lean();

  console.log(`📊 Total de órdenes encontradas: ${purchaseOrders.length}\n`);

  // Agrupar por estado
  const byStatus = {};
  purchaseOrders.forEach(po => {
    const status = po.status || 'unknown';
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(po);
  });

  console.log('📋 Órdenes por estado:');
  for (const [status, orders] of Object.entries(byStatus)) {
    console.log(`   ${status}: ${orders.length} órdenes`);
  }
  console.log('');

  // Analizar productos por orden
  const linkingNeeded = [];

  for (const po of purchaseOrders) {
    if (!po.items || po.items.length === 0) continue;

    for (const item of po.items) {
      if (!item.productId) continue;

      // Buscar el producto
      const product = await Product.findOne({
        _id: item.productId,
        tenantId: new mongoose.Types.ObjectId(TENANT_ID)
      }).lean();

      if (!product) {
        console.log(`   ⚠️  Producto no encontrado: ${item.productName} (ID: ${item.productId})`);
        continue;
      }

      // Verificar si el proveedor ya está vinculado
      const suppliers = product.suppliers || [];
      const alreadyLinked = suppliers.some(s =>
        String(s.supplierId) === String(po.supplierId)
      );

      if (!alreadyLinked) {
        linkingNeeded.push({
          purchaseOrder: po,
          product: product,
          item: item,
          supplierName: po.supplierName,
          costPrice: item.costPrice || item.unitCost || 0,
          paymentCurrency: po.paymentTerms?.expectedCurrency || 'USD'
        });
      }
    }
  }

  return { purchaseOrders, linkingNeeded };
}

// ==================== VINCULACIÓN ====================

async function linkProductToSupplier(linkData, session) {
  const { product, purchaseOrder, item, costPrice, paymentCurrency } = linkData;

  // Buscar el proveedor para obtener paymentSettings
  // El supplierId puede ser el ID del Customer o del Supplier directamente
  // Convertir a ObjectId porque customerId está almacenado como ObjectId
  const supplierIdObj = new mongoose.Types.ObjectId(purchaseOrder.supplierId);

  const supplier = await Supplier.findOne({
    $or: [
      { _id: supplierIdObj },
      { customerId: supplierIdObj }
    ]
    // No filtrar por tenantId aquí - el Customer/Supplier ya valida el tenant
  }).session(session).lean();

  if (!supplier) {
    console.log(`   ⚠️  Proveedor no encontrado: ${purchaseOrder.supplierName}`);
    return false;
  }

  // Crear objeto de supplier para el array
  const supplierData = {
    supplierId: String(supplier._id),
    supplierName: purchaseOrder.supplierName,
    costPrice: costPrice,
    paymentCurrency: paymentCurrency,
    acceptedPaymentMethods: supplier.paymentSettings?.acceptedPaymentMethods ||
                            purchaseOrder.paymentTerms?.paymentMethods || [],
    lastUpdated: new Date()
  };

  // Verificar si ya existe (doble check)
  const existingProduct = await Product.findOne({
    _id: product._id,
    'suppliers.supplierId': String(supplier._id)
  }).session(session);

  if (existingProduct) {
    // Ya existe, actualizar precio si es diferente
    await Product.updateOne(
      {
        _id: product._id,
        'suppliers.supplierId': String(supplier._id)
      },
      {
        $set: {
          'suppliers.$.costPrice': costPrice,
          'suppliers.$.lastUpdated': new Date()
        }
      },
      { session }
    );
    return 'updated';
  } else {
    // No existe, agregar
    await Product.updateOne(
      { _id: product._id },
      { $push: { suppliers: supplierData } },
      { session }
    );
    return 'created';
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🔗 VINCULACIÓN DE PRODUCTOS A PROVEEDORES');
  console.log('═'.repeat(80) + '\n');

  console.log(`📊 Tenant: ${TENANT_ID} (Tiendas Broas, C.A.)`);
  console.log(`🔍 Modo: ${isDryRun ? 'ANÁLISIS (solo análisis)' : 'EJECUCIÓN (aplicará cambios)'}\n`);

  try {
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    // Inicializar modelos
    PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema, 'purchaseorders');
    Product = mongoose.model('Product', ProductSchema, 'products');
    Supplier = mongoose.model('Supplier', SupplierSchema, 'suppliers');

    // Analizar órdenes de compra
    const { purchaseOrders, linkingNeeded } = await analyzePurchaseOrders();

    console.log('═'.repeat(80));
    console.log('📊 RESUMEN DE ANÁLISIS\n');
    console.log(`Total de órdenes de compra: ${purchaseOrders.length}`);
    console.log(`Productos que necesitan vinculación: ${linkingNeeded.length}\n`);

    if (linkingNeeded.length === 0) {
      console.log('✅ Todos los productos ya están vinculados a sus proveedores.\n');
      return;
    }

    // Mostrar detalles de vinculaciones necesarias
    console.log('📋 PRODUCTOS A VINCULAR:\n');

    // Agrupar por proveedor
    const bySupplier = {};
    linkingNeeded.forEach(link => {
      const supplierId = link.purchaseOrder.supplierId;
      if (!bySupplier[supplierId]) {
        bySupplier[supplierId] = {
          name: link.supplierName,
          products: []
        };
      }
      bySupplier[supplierId].products.push(link);
    });

    for (const [supplierId, data] of Object.entries(bySupplier)) {
      console.log(`\n🏢 ${data.name}`);
      console.log(`   Productos a vincular: ${data.products.length}`);

      data.products.forEach((link, idx) => {
        console.log(`   ${idx + 1}. ${link.product.name} (SKU: ${link.product.sku})`);
        console.log(`      Precio: $${link.costPrice.toFixed(2)} ${link.paymentCurrency}`);
        console.log(`      Orden: ${link.purchaseOrder.poNumber || link.purchaseOrder._id}`);
      });
    }

    console.log('\n' + '═'.repeat(80) + '\n');

    if (isDryRun) {
      console.log('🔍 MODO ANÁLISIS - No se aplicarán cambios');
      console.log('\nPara aplicar los cambios, ejecuta:');
      console.log('   node link-products-to-suppliers.js --execute\n');
      return;
    }

    // ==================== EJECUCIÓN ====================
    console.log('⚙️  EJECUTANDO VINCULACIÓN...\n');

    // Crear backup
    await createBackup();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let created = 0;
      let updated = 0;
      let errors = 0;

      for (const link of linkingNeeded) {
        try {
          const result = await linkProductToSupplier(link, session);

          if (result === 'created') {
            created++;
            console.log(`   ✅ Vinculado: ${link.product.name} ↔ ${link.supplierName}`);
          } else if (result === 'updated') {
            updated++;
            console.log(`   🔄 Actualizado: ${link.product.name} ↔ ${link.supplierName}`);
          }
        } catch (error) {
          errors++;
          console.log(`   ❌ Error: ${link.product.name} ↔ ${link.supplierName}`);
          console.log(`      ${error.message}`);
        }
      }

      await session.commitTransaction();

      console.log('\n' + '═'.repeat(80));
      console.log('✅ VINCULACIÓN COMPLETADA\n');
      console.log(`📊 Resumen:`);
      console.log(`   Nuevas vinculaciones: ${created}`);
      console.log(`   Actualizaciones: ${updated}`);
      console.log(`   Errores: ${errors}`);
      console.log('═'.repeat(80) + '\n');

    } catch (error) {
      await session.abortTransaction();
      console.error(`\n❌ ERROR durante vinculación: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

main();
