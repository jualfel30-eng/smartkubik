/**
 * CORRECCIÓN DE SUPPLIER IDs EN PRODUCTOS
 *
 * Problema: Products.suppliers[] contiene Customer IDs en lugar de Supplier IDs
 * Solución: Actualizar todos los productos para usar el Supplier ID real
 *
 * MODO DE USO:
 * 1. ANÁLISIS (solo muestra qué se corregirá):
 *    node fix-supplier-ids.js --dry-run
 *
 * 2. EJECUCIÓN (aplica correcciones):
 *    node fix-supplier-ids.js --execute
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';
const TENANT_ID = '69b187062339e815ceba7487'; // Tiendas Broas, C.A.
const BACKUP_DIR = path.join(__dirname, '../../backups');

// Modo de ejecución
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--execute');

// ==================== SCHEMAS ====================
const ProductSchema = new mongoose.Schema({}, { strict: false });
const SupplierSchema = new mongoose.Schema({}, { strict: false });

let Product, Supplier;

// ==================== BACKUP ====================

async function createBackup() {
  console.log('\n📦 Creando backup de productos...');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `products-suppliers-fix-${timestamp}.json`);

  const products = await Product.find({
    tenantId: new mongoose.Types.ObjectId(TENANT_ID),
    'suppliers.0': { $exists: true } // Solo productos con suppliers
  }).lean();

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
  console.log(`✅ Backup creado: ${backupFile}`);
  console.log(`   Productos con suppliers: ${products.length}\n`);

  return backupFile;
}

// ==================== ANÁLISIS ====================

async function analyzeProducts() {
  console.log('🔍 Analizando productos con suppliers vinculados...\n');

  // Buscar todos los productos del tenant que tengan suppliers
  const products = await Product.find({
    tenantId: new mongoose.Types.ObjectId(TENANT_ID),
    'suppliers.0': { $exists: true }
  }).lean();

  console.log(`📊 Total de productos con suppliers: ${products.length}\n`);

  const correctionsNeeded = [];

  for (const product of products) {
    for (let i = 0; i < product.suppliers.length; i++) {
      const supplierLink = product.suppliers[i];
      const supplierId = supplierLink.supplierId;

      // Buscar el supplier por su _id
      const supplierById = await Supplier.findById(supplierId).lean();

      if (supplierById) {
        // Supplier encontrado directamente - ID correcto
        continue;
      }

      // No encontrado por _id, puede ser un Customer ID
      // Buscar Supplier que tenga este ID como customerId
      const supplierByCustomerId = await Supplier.findOne({
        customerId: new mongoose.Types.ObjectId(supplierId)
      }).lean();

      if (supplierByCustomerId) {
        // Encontrado el Supplier real - necesita corrección
        correctionsNeeded.push({
          product: product,
          supplierIndex: i,
          incorrectId: supplierId,
          correctId: String(supplierByCustomerId._id),
          supplierName: supplierLink.supplierName
        });
      } else {
        // Supplier no encontrado de ninguna forma - posible huérfano
        console.log(`   ⚠️  Supplier huérfano en ${product.name}: ${supplierLink.supplierName} (${supplierId})`);
      }
    }
  }

  return { products, correctionsNeeded };
}

// ==================== CORRECCIÓN ====================

async function fixProductSupplierIds(corrections, session) {
  let fixed = 0;
  let errors = 0;

  for (const correction of corrections) {
    try {
      // Actualizar el supplierId específico en el array
      await Product.updateOne(
        {
          _id: correction.product._id,
          'suppliers.supplierId': correction.incorrectId
        },
        {
          $set: {
            'suppliers.$.supplierId': correction.correctId,
            'suppliers.$.lastUpdated': new Date()
          }
        },
        { session }
      );

      fixed++;
      console.log(`   ✅ ${correction.product.name} → ${correction.supplierName}`);
      console.log(`      ${correction.incorrectId} → ${correction.correctId}`);
    } catch (error) {
      errors++;
      console.log(`   ❌ Error en ${correction.product.name}: ${error.message}`);
    }
  }

  return { fixed, errors };
}

// ==================== MAIN ====================

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🔧 CORRECCIÓN DE SUPPLIER IDs EN PRODUCTOS');
  console.log('═'.repeat(80) + '\n');

  console.log(`📊 Tenant: ${TENANT_ID} (Tiendas Broas, C.A.)`);
  console.log(`🔍 Modo: ${isDryRun ? 'ANÁLISIS (solo análisis)' : 'EJECUCIÓN (aplicará cambios)'}\\n`);

  try {
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    // Inicializar modelos
    Product = mongoose.model('Product', ProductSchema, 'products');
    Supplier = mongoose.model('Supplier', SupplierSchema, 'suppliers');

    // Analizar productos
    const { products, correctionsNeeded } = await analyzeProducts();

    console.log('═'.repeat(80));
    console.log('📊 RESUMEN DE ANÁLISIS\n');
    console.log(`Total de productos con suppliers: ${products.length}`);
    console.log(`Correcciones necesarias: ${correctionsNeeded.length}\n`);

    if (correctionsNeeded.length === 0) {
      console.log('✅ Todos los productos tienen los Supplier IDs correctos.\n');
      return;
    }

    // Agrupar por supplier para mostrar
    const bySupplier = {};
    correctionsNeeded.forEach(correction => {
      const key = correction.supplierName;
      if (!bySupplier[key]) {
        bySupplier[key] = {
          products: [],
          correctId: correction.correctId
        };
      }
      bySupplier[key].products.push(correction);
    });

    console.log('📋 CORRECCIONES NECESARIAS:\n');
    for (const [supplierName, data] of Object.entries(bySupplier)) {
      console.log(`\n🏢 ${supplierName}`);
      console.log(`   Supplier ID correcto: ${data.correctId}`);
      console.log(`   Productos a corregir: ${data.products.length}`);

      data.products.forEach((correction, idx) => {
        console.log(`   ${idx + 1}. ${correction.product.name} (${correction.product.sku})`);
        console.log(`      ID incorrecto: ${correction.incorrectId}`);
      });
    }

    console.log('\n' + '═'.repeat(80) + '\n');

    if (isDryRun) {
      console.log('🔍 MODO ANÁLISIS - No se aplicarán cambios');
      console.log('\nPara aplicar las correcciones, ejecuta:');
      console.log('   node fix-supplier-ids.js --execute\n');
      return;
    }

    // ==================== EJECUCIÓN ====================
    console.log('⚙️  EJECUTANDO CORRECCIONES...\n');

    // Crear backup
    await createBackup();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { fixed, errors } = await fixProductSupplierIds(correctionsNeeded, session);

      await session.commitTransaction();

      console.log('\n' + '═'.repeat(80));
      console.log('✅ CORRECCIÓN COMPLETADA\n');
      console.log(`📊 Resumen:`);
      console.log(`   Correcciones aplicadas: ${fixed}`);
      console.log(`   Errores: ${errors}`);
      console.log('═'.repeat(80) + '\n');

    } catch (error) {
      await session.abortTransaction();
      console.error(`\n❌ ERROR durante corrección: ${error.message}`);
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
