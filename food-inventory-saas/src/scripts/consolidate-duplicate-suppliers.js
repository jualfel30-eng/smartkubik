/**
 * CONSOLIDACIÓN DE PROVEEDORES DUPLICADOS
 *
 * Este script consolida proveedores duplicados en un tenant específico.
 *
 * MODO DE USO:
 * 1. DRY-RUN (no hace cambios, solo muestra plan):
 *    node consolidate-duplicate-suppliers.js --dry-run
 *
 * 2. EJECUCIÓN (aplica cambios):
 *    node consolidate-duplicate-suppliers.js --execute
 *
 * ESTRATEGIA:
 * - Por cada grupo de duplicados, elige un "master" (prioridad: customer real > más POs > más reciente)
 * - Migra todas las referencias de duplicados al master
 * - Elimina registros duplicados
 * - Genera backup antes de ejecutar
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
const SupplierSchema = new mongoose.Schema({}, { strict: false });
const CustomerSchema = new mongoose.Schema({}, { strict: false });
const PurchaseOrderSchema = new mongoose.Schema({}, { strict: false });
const RatingSchema = new mongoose.Schema({}, { strict: false });
const ProductSchema = new mongoose.Schema({}, { strict: false });

let Supplier, Customer, PurchaseOrder, Rating, Product;

// ==================== UTILIDADES ====================

function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizeRif(rif) {
  if (!rif) return '';
  return rif.replace(/[^0-9]/g, '');
}

function extractRifFromSupplier(supplier) {
  return supplier.taxInfo?.rif || supplier.taxInfo?.taxId || supplier.rif || '';
}

// ==================== BACKUP ====================

async function createBackup() {
  console.log('\n📦 Creando backup de datos...');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `suppliers-backup-${timestamp}.json`);

  const suppliers = await Supplier.find({ tenantId: TENANT_ID }).lean();
  const purchaseOrders = await PurchaseOrder.find({ tenantId: TENANT_ID }).lean();
  const ratings = await Rating.find({ tenantId: TENANT_ID }).lean();
  const products = await Product.find({
    tenantId: TENANT_ID,
    'suppliers.0': { $exists: true }
  }).lean();

  const backup = {
    timestamp: new Date().toISOString(),
    tenantId: TENANT_ID,
    suppliers,
    purchaseOrders,
    ratings,
    products: products.map(p => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      suppliers: p.suppliers
    }))
  };

  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`✅ Backup creado: ${backupFile}\n`);

  return backupFile;
}

// ==================== IDENTIFICACIÓN DE DUPLICADOS ====================

async function findDuplicates() {
  console.log('🔍 Buscando proveedores duplicados...\n');

  const suppliers = await Supplier.find({ tenantId: TENANT_ID }).lean();

  // Agrupar por nombre normalizado
  const byName = {};
  const byRif = {};

  for (const s of suppliers) {
    const normName = normalizeName(s.name);
    const rif = normalizeRif(extractRifFromSupplier(s));

    if (!byName[normName]) byName[normName] = [];
    byName[normName].push(s);

    if (rif) {
      if (!byRif[rif]) byRif[rif] = [];
      byRif[rif].push(s);
    }
  }

  // Filtrar solo grupos con duplicados
  const duplicateGroups = [];

  // Por nombre
  for (const [normName, group] of Object.entries(byName)) {
    if (group.length > 1) {
      duplicateGroups.push({
        type: 'name',
        key: group[0].name,
        suppliers: group
      });
    }
  }

  // Por RIF
  for (const [rif, group] of Object.entries(byRif)) {
    if (group.length > 1) {
      // Solo agregar si no está ya en duplicateGroups por nombre
      const alreadyGrouped = duplicateGroups.some(dg =>
        dg.suppliers.some(s1 => group.some(s2 => String(s1._id) === String(s2._id)))
      );

      if (!alreadyGrouped) {
        duplicateGroups.push({
          type: 'rif',
          key: `J-${rif}`,
          suppliers: group
        });
      }
    }
  }

  return duplicateGroups;
}

// ==================== SELECCIÓN DEL MASTER ====================

async function selectMaster(group) {
  const suppliers = group.suppliers;

  // Obtener conteo de órdenes de compra para cada uno
  const withStats = await Promise.all(
    suppliers.map(async (s) => {
      const poCount = await PurchaseOrder.countDocuments({
        tenantId: TENANT_ID,
        supplierId: String(s._id)
      });

      const ratingCount = await Rating.countDocuments({
        tenantId: TENANT_ID,
        supplierId: String(s._id)
      });

      const products = await Product.find({
        tenantId: TENANT_ID,
        'suppliers.supplierId': String(s._id)
      }).lean();

      return {
        ...s,
        poCount,
        ratingCount,
        productCount: products.length,
        hasCustomer: !!s.customerId && String(s.customerId).length > 0,
        createdAt: s.createdAt || new Date(0)
      };
    })
  );

  // Ordenar por prioridad:
  // 1. Tiene Customer real
  // 2. Más órdenes de compra
  // 3. Más reciente
  withStats.sort((a, b) => {
    if (a.hasCustomer !== b.hasCustomer) return b.hasCustomer ? 1 : -1;
    if (a.poCount !== b.poCount) return b.poCount - a.poCount;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const master = withStats[0];
  const duplicates = withStats.slice(1);

  return { master, duplicates };
}

// ==================== CONSOLIDACIÓN ====================

async function consolidateGroup(group, isDryRun) {
  const { master, duplicates } = await selectMaster(group);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 GRUPO: ${group.key} (${group.type})`);
  console.log(`${'='.repeat(80)}\n`);

  console.log(`✅ MASTER (se conserva):`);
  console.log(`   ID: ${master._id}`);
  console.log(`   Nombre: ${master.name}`);
  console.log(`   RIF: ${extractRifFromSupplier(master)}`);
  console.log(`   Customer: ${master.hasCustomer ? 'Sí' : 'No (virtual)'}`);
  console.log(`   Órdenes: ${master.poCount}`);
  console.log(`   Calificaciones: ${master.ratingCount}`);
  console.log(`   Productos: ${master.productCount}`);
  console.log(`   PaymentSettings: ${master.paymentSettings ? 'Sí' : 'No'}\n`);

  console.log(`🗑️  DUPLICADOS (se eliminarán):`);
  for (const dup of duplicates) {
    console.log(`   - ID: ${dup._id}`);
    console.log(`     Nombre: ${dup.name}`);
    console.log(`     Customer: ${dup.hasCustomer ? 'Sí' : 'No'}`);
    console.log(`     Órdenes: ${dup.poCount}`);
    console.log(`     Calificaciones: ${dup.ratingCount}`);
    console.log(`     Productos: ${dup.productCount}\n`);
  }

  if (isDryRun) {
    console.log(`🔍 DRY-RUN: No se aplicarán cambios\n`);
    return;
  }

  // ==================== EJECUCIÓN ====================
  console.log(`⚙️  EJECUTANDO CONSOLIDACIÓN...\n`);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let totalMigrated = 0;

    for (const dup of duplicates) {
      const dupId = String(dup._id);
      const masterId = String(master._id);

      // 1. Migrar órdenes de compra
      const poResult = await PurchaseOrder.updateMany(
        { tenantId: TENANT_ID, supplierId: dupId },
        { $set: { supplierId: masterId } },
        { session }
      );
      console.log(`   ✅ Órdenes migradas: ${poResult.modifiedCount}`);
      totalMigrated += poResult.modifiedCount;

      // 2. Migrar calificaciones
      const ratingResult = await Rating.updateMany(
        { tenantId: TENANT_ID, supplierId: dupId },
        { $set: { supplierId: masterId } },
        { session }
      );
      console.log(`   ✅ Calificaciones migradas: ${ratingResult.modifiedCount}`);

      // 3. Migrar enlaces de productos
      const productsWithDup = await Product.find({
        tenantId: TENANT_ID,
        'suppliers.supplierId': dupId
      }).session(session);

      for (const product of productsWithDup) {
        // Encontrar el supplier en el array
        const supplierIndex = product.suppliers.findIndex(
          s => String(s.supplierId) === dupId
        );

        if (supplierIndex !== -1) {
          const dupSupplierData = product.suppliers[supplierIndex];

          // Verificar si el master ya existe en suppliers
          const masterIndex = product.suppliers.findIndex(
            s => String(s.supplierId) === masterId
          );

          if (masterIndex === -1) {
            // Master no existe, actualizar el duplicado
            await Product.updateOne(
              { _id: product._id },
              { $set: { [`suppliers.${supplierIndex}.supplierId`]: masterId } },
              { session }
            );
          } else {
            // Master ya existe, eliminar el duplicado
            await Product.updateOne(
              { _id: product._id },
              { $pull: { suppliers: { supplierId: dupId } } },
              { session }
            );
          }
        }
      }
      console.log(`   ✅ Productos actualizados: ${productsWithDup.length}`);

      // 4. Fusionar paymentSettings si el master no tiene y el duplicado sí
      if (!master.paymentSettings && dup.paymentSettings) {
        await Supplier.updateOne(
          { _id: master._id },
          { $set: { paymentSettings: dup.paymentSettings } },
          { session }
        );
        console.log(`   ✅ PaymentSettings copiados del duplicado al master`);
      }

      // 5. Eliminar el duplicado
      await Supplier.deleteOne({ _id: dup._id }, { session });
      console.log(`   ✅ Duplicado eliminado: ${dup._id}\n`);
    }

    await session.commitTransaction();
    console.log(`✅ CONSOLIDACIÓN COMPLETADA (${duplicates.length} duplicados eliminados)\n`);

  } catch (error) {
    await session.abortTransaction();
    console.error(`❌ ERROR durante consolidación: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🔧 CONSOLIDACIÓN DE PROVEEDORES DUPLICADOS');
  console.log('═'.repeat(80) + '\n');

  console.log(`📊 Tenant: ${TENANT_ID} (Tiendas Broas, C.A.)`);
  console.log(`🔍 Modo: ${isDryRun ? 'DRY-RUN (solo análisis)' : 'EJECUCIÓN (aplicará cambios)'}\n`);

  if (!isDryRun) {
    console.log('⚠️  ADVERTENCIA: Este script modificará la base de datos.');
    console.log('   Se creará un backup antes de proceder.\n');
  }

  try {
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    // Inicializar modelos
    Supplier = mongoose.model('Supplier', SupplierSchema, 'suppliers');
    Customer = mongoose.model('Customer', CustomerSchema, 'customers');
    PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema, 'purchaseorders');
    Rating = mongoose.model('PurchaseOrderRating', RatingSchema, 'purchaseorderratings');
    Product = mongoose.model('Product', ProductSchema, 'products');

    // Crear backup (solo en modo ejecución)
    if (!isDryRun) {
      await createBackup();
    }

    // Buscar duplicados
    const duplicateGroups = await findDuplicates();

    console.log(`📊 RESUMEN:`);
    console.log(`   Total de grupos duplicados: ${duplicateGroups.length}\n`);

    if (duplicateGroups.length === 0) {
      console.log('✅ No se encontraron duplicados.\n');
      return;
    }

    // Consolidar cada grupo
    for (const group of duplicateGroups) {
      await consolidateGroup(group, isDryRun);
    }

    // Resumen final
    console.log('\n' + '═'.repeat(80));
    if (isDryRun) {
      console.log('🔍 DRY-RUN COMPLETADO');
      console.log('\nPara aplicar los cambios, ejecuta:');
      console.log('   node consolidate-duplicate-suppliers.js --execute\n');
    } else {
      console.log('✅ CONSOLIDACIÓN COMPLETADA EXITOSAMENTE\n');
      console.log('📦 Backup guardado en: ' + BACKUP_DIR);
    }
    console.log('═'.repeat(80) + '\n');

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
