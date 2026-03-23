/**
 * CONVERSIÓN DE SUPPLIER IDs DE STRING A OBJECTID
 *
 * Convierte todos los Product.suppliers[].supplierId de tipo String a ObjectId
 * para mantener consistencia con el estándar del backend.
 *
 * MODO DE USO:
 * 1. ANÁLISIS (no hace cambios, solo muestra plan):
 *    node convert-supplierids-to-objectid.js --dry-run
 *
 * 2. EJECUCIÓN (aplica conversión):
 *    node convert-supplierids-to-objectid.js --execute
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

let Product;

// ==================== BACKUP ====================

async function createBackup() {
  console.log('\n📦 Creando backup de productos...');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `products-supplierids-conversion-${timestamp}.json`);

  const products = await Product.find({
    tenantId: new mongoose.Types.ObjectId(TENANT_ID),
    'suppliers.0': { $exists: true }
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
  console.log('🔍 Analizando productos con suppliers...\n');

  const products = await Product.find({
    tenantId: new mongoose.Types.ObjectId(TENANT_ID),
    'suppliers.0': { $exists: true }
  }).lean();

  console.log(`📊 Total de productos con suppliers: ${products.length}\n`);

  const conversionsNeeded = [];
  let totalSupplierLinks = 0;
  let stringSupplierLinks = 0;
  let objectIdSupplierLinks = 0;

  for (const product of products) {
    for (let i = 0; i < product.suppliers.length; i++) {
      const supplierLink = product.suppliers[i];
      totalSupplierLinks++;

      // Verificar tipo del supplierId
      const supplierId = supplierLink.supplierId;
      const isString = typeof supplierId === 'string';
      const isObjectId = supplierId && supplierId.constructor && supplierId.constructor.name === 'ObjectId';

      if (isString) {
        stringSupplierLinks++;
        conversionsNeeded.push({
          product: product,
          supplierIndex: i,
          supplierId: supplierId,
          supplierName: supplierLink.supplierName,
          currentType: 'String'
        });
      } else if (isObjectId) {
        objectIdSupplierLinks++;
      }
    }
  }

  return {
    products,
    conversionsNeeded,
    stats: {
      totalSupplierLinks,
      stringSupplierLinks,
      objectIdSupplierLinks
    }
  };
}

// ==================== CONVERSIÓN ====================

async function convertSupplierIds(conversions, session) {
  let converted = 0;
  let errors = 0;

  // Agrupar conversiones por producto para hacer menos updates
  const conversionsByProduct = {};
  conversions.forEach(conversion => {
    const productId = String(conversion.product._id);
    if (!conversionsByProduct[productId]) {
      conversionsByProduct[productId] = {
        product: conversion.product,
        conversions: []
      };
    }
    conversionsByProduct[productId].conversions.push(conversion);
  });

  for (const [productId, data] of Object.entries(conversionsByProduct)) {
    try {
      // Obtener el producto actual de la DB
      const product = await Product.findById(productId).session(session);

      if (!product) {
        errors++;
        console.log(`   ❌ Producto no encontrado: ${data.product.name}`);
        continue;
      }

      // Convertir cada supplierId de String a ObjectId
      let modified = false;
      for (const conversion of data.conversions) {
        const supplierLink = product.suppliers[conversion.supplierIndex];

        if (supplierLink && typeof supplierLink.supplierId === 'string') {
          if (mongoose.Types.ObjectId.isValid(supplierLink.supplierId)) {
            supplierLink.supplierId = new mongoose.Types.ObjectId(supplierLink.supplierId);
            supplierLink.lastUpdated = new Date();
            modified = true;
            converted++;
          } else {
            errors++;
            console.log(`   ❌ ID inválido en ${data.product.name}: ${supplierLink.supplierId}`);
          }
        }
      }

      // Guardar el producto si hubo modificaciones
      if (modified) {
        await product.save({ session });
        console.log(`   ✅ ${data.product.name} (${data.conversions.length} supplier(s) convertido(s))`);
      }

    } catch (error) {
      errors++;
      console.log(`   ❌ Error en ${data.product.name}: ${error.message}`);
    }
  }

  return { converted, errors };
}

// ==================== MAIN ====================

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🔄 CONVERSIÓN DE SUPPLIER IDs: STRING → OBJECTID');
  console.log('═'.repeat(80) + '\n');

  console.log(`📊 Tenant: ${TENANT_ID} (Tiendas Broas, C.A.)`);
  console.log(`🔍 Modo: ${isDryRun ? 'ANÁLISIS (solo análisis)' : 'EJECUCIÓN (aplicará cambios)'}\n`);

  try {
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    // Inicializar modelo
    Product = mongoose.model('Product', ProductSchema, 'products');

    // Analizar productos
    const { products, conversionsNeeded, stats } = await analyzeProducts();

    console.log('═'.repeat(80));
    console.log('📊 RESUMEN DE ANÁLISIS\n');
    console.log(`Total de vínculos proveedor-producto: ${stats.totalSupplierLinks}`);
    console.log(`   Con ObjectId (correcto): ${stats.objectIdSupplierLinks} ✅`);
    console.log(`   Con String (requiere conversión): ${stats.stringSupplierLinks} ⚠️`);
    console.log(`\nProductos afectados: ${[...new Set(conversionsNeeded.map(c => c.product._id.toString()))].length}`);
    console.log(`Conversiones necesarias: ${conversionsNeeded.length}\n`);

    if (conversionsNeeded.length === 0) {
      console.log('✅ Todos los supplier IDs ya son ObjectId. No se necesitan conversiones.\n');
      return;
    }

    // Agrupar por supplier para mostrar
    const bySupplier = {};
    conversionsNeeded.forEach(conversion => {
      const key = conversion.supplierName;
      if (!bySupplier[key]) {
        bySupplier[key] = [];
      }
      bySupplier[key].push(conversion);
    });

    console.log('📋 CONVERSIONES NECESARIAS POR PROVEEDOR:\n');
    for (const [supplierName, conversions] of Object.entries(bySupplier)) {
      console.log(`🏢 ${supplierName}`);
      console.log(`   Productos a convertir: ${conversions.length}`);

      // Mostrar primeros 3 productos como ejemplo
      conversions.slice(0, 3).forEach((c, idx) => {
        console.log(`   ${idx + 1}. ${c.product.name} (${c.product.sku})`);
        console.log(`      Tipo actual: ${c.currentType}`);
      });

      if (conversions.length > 3) {
        console.log(`   ... y ${conversions.length - 3} producto(s) más`);
      }
      console.log('');
    }

    console.log('═'.repeat(80) + '\n');

    if (isDryRun) {
      console.log('🔍 MODO ANÁLISIS - No se aplicarán cambios');
      console.log('\nPara aplicar las conversiones, ejecuta:');
      console.log('   node convert-supplierids-to-objectid.js --execute\n');
      return;
    }

    // ==================== EJECUCIÓN ====================
    console.log('⚙️  EJECUTANDO CONVERSIONES...\n');

    // Crear backup
    await createBackup();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { converted, errors } = await convertSupplierIds(conversionsNeeded, session);

      await session.commitTransaction();

      console.log('\n' + '═'.repeat(80));
      console.log('✅ CONVERSIÓN COMPLETADA\n');
      console.log(`📊 Resumen:`);
      console.log(`   Conversiones exitosas: ${converted}`);
      console.log(`   Errores: ${errors}`);
      console.log('\n💡 Resultado: Todos los supplier IDs ahora son ObjectId (tipo consistente)');
      console.log('═'.repeat(80) + '\n');

    } catch (error) {
      await session.abortTransaction();
      console.error(`\n❌ ERROR durante conversión: ${error.message}`);
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
