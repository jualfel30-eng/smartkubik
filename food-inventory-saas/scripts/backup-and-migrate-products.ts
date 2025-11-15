import { connect, connection } from 'mongoose';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execPromise = promisify(exec);

/**
 * Script completo: Backup + Migración de productos
 *
 * 1. Hace backup de MongoDB usando mongodump
 * 2. Migra productos para agregar campo productType
 * 3. Optimiza consultas de inventario
 *
 * El backup se guarda en: ../backups/YYYY-MM-DD_HH-mm-ss/
 */

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';
const BACKUP_DIR = path.join(__dirname, '../../backups');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function createBackup(): Promise<string> {
  log('\n📦 PASO 1: Creando backup de MongoDB...', colors.blue + colors.bright);

  // Crear carpeta de backups si no existe
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    log(`✅ Carpeta de backups creada: ${BACKUP_DIR}`, colors.green);
  }

  // Crear carpeta con timestamp
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupPath = path.join(BACKUP_DIR, timestamp);

  log(`📁 Ubicación del backup: ${backupPath}`, colors.blue);

  try {
    // Construir comando mongodump
    const dumpCommand = `mongodump --uri="${MONGO_URI}" --out="${backupPath}"`;

    log('⏳ Ejecutando mongodump...', colors.yellow);
    const { stdout, stderr } = await execPromise(dumpCommand);

    if (stderr && !stderr.includes('done dumping')) {
      log(`⚠️  Advertencias durante backup: ${stderr}`, colors.yellow);
    }

    log('✅ Backup completado exitosamente', colors.green + colors.bright);
    log(`📊 ${stdout}`, colors.reset);

    return backupPath;
  } catch (error: any) {
    log(`❌ Error al crear backup: ${error.message}`, colors.red + colors.bright);
    throw error;
  }
}

async function migrateProducts() {
  log('\n🔄 PASO 2: Migrando productos...', colors.blue + colors.bright);

  try {
    log('🔌 Conectando a MongoDB...', colors.yellow);
    await connect(MONGO_URI);
    log('✅ Conectado a MongoDB', colors.green);

    const db = connection.db;
    const productsCollection = db.collection('products');

    // 1. Análisis pre-migración
    log('\n📊 Análisis pre-migración:', colors.blue);

    const totalProducts = await productsCollection.countDocuments({});
    const productsWithoutType = await productsCollection.countDocuments({
      productType: { $exists: false }
    });
    const inactiveProducts = await productsCollection.countDocuments({
      isActive: false
    });

    log(`   Total de productos: ${totalProducts}`, colors.reset);
    log(`   Productos sin productType: ${productsWithoutType}`, colors.yellow);
    log(`   Productos inactivos: ${inactiveProducts}`, colors.reset);

    if (productsWithoutType === 0) {
      log('\n✅ Todos los productos ya tienen el campo productType', colors.green + colors.bright);
      log('   No se requiere migración', colors.green);
      await connection.close();
      return;
    }

    // 2. Mostrar ejemplos de productos que se van a actualizar
    log('\n📋 Ejemplos de productos a actualizar:', colors.blue);
    const examples = await productsCollection.find(
      { productType: { $exists: false } }
    ).limit(5).toArray();

    examples.forEach((product: any, index: number) => {
      log(`   ${index + 1}. ${product.name} (SKU: ${product.sku})`, colors.reset);
    });

    if (productsWithoutType > 5) {
      log(`   ... y ${productsWithoutType - 5} productos más`, colors.reset);
    }

    // 3. Ejecutar migración
    log('\n⏳ Actualizando productos...', colors.yellow);

    const result = await productsCollection.updateMany(
      { productType: { $exists: false } },
      {
        $set: {
          productType: 'simple',
          updatedAt: new Date()
        }
      }
    );

    log(`✅ ${result.modifiedCount} productos actualizados con productType: "simple"`, colors.green + colors.bright);

    // 4. Verificación post-migración
    log('\n🔍 Verificación post-migración:', colors.blue);

    const remainingWithoutType = await productsCollection.countDocuments({
      productType: { $exists: false }
    });

    if (remainingWithoutType === 0) {
      log('✅ Todos los productos ahora tienen productType', colors.green + colors.bright);
    } else {
      log(`⚠️  Aún quedan ${remainingWithoutType} productos sin productType`, colors.yellow);
    }

    // 5. Estadísticas finales
    log('\n📈 Estadísticas de tipos de productos:', colors.blue);
    const typeStats = await productsCollection.aggregate([
      {
        $group: {
          _id: '$productType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    typeStats.forEach((stat: any) => {
      const typeName = stat._id || 'undefined';
      log(`   ${typeName}: ${stat.count} productos`, colors.reset);
    });

    // 6. Verificar producto específico mencionado
    log('\n🔍 Verificando productos específicos...', colors.blue);
    const searchTerms = ['aceituna', 'verde', 'hueso'];

    for (const term of searchTerms) {
      const products = await productsCollection.find({
        $or: [
          { name: new RegExp(term, 'i') },
          { description: new RegExp(term, 'i') }
        ]
      }).limit(3).toArray();

      if (products.length > 0) {
        log(`\n   Productos con "${term}":`, colors.reset);
        products.forEach((product: any) => {
          log(`   - ${product.name} (SKU: ${product.sku})`, colors.reset);
          log(`     productType: ${product.productType || 'NO DEFINIDO'}`, colors.reset);
          log(`     isActive: ${product.isActive !== false}`, colors.reset);
        });
      }
    }

    await connection.close();
    log('\n✅ Migración completada exitosamente', colors.green + colors.bright);

  } catch (error: any) {
    log(`\n❌ Error durante la migración: ${error.message}`, colors.red + colors.bright);
    log(`📚 Stack trace: ${error.stack}`, colors.red);
    await connection.close();
    throw error;
  }
}

async function optimizeInventoryQueries() {
  log('\n⚡ PASO 3: Optimizando consultas de inventario...', colors.blue + colors.bright);

  try {
    await connect(MONGO_URI);
    const db = connection.db;
    const inventoryCollection = db.collection('inventories');

    // Verificar índices existentes
    log('📊 Verificando índices existentes...', colors.yellow);
    const indexes = await inventoryCollection.indexes();

    log(`   Índices actuales: ${indexes.length}`, colors.reset);
    indexes.forEach((index: any) => {
      log(`   - ${JSON.stringify(index.key)}`, colors.reset);
    });

    // Crear índices optimizados si no existen
    log('\n⏳ Creando índices optimizados...', colors.yellow);

    const indexesToCreate: Array<{ key: Record<string, number>, name: string, background: boolean }> = [
      {
        key: { tenantId: 1, productSku: 1 },
        name: 'tenantId_1_productSku_1',
        background: true
      },
      {
        key: { tenantId: 1, productName: 1 },
        name: 'tenantId_1_productName_1',
        background: true
      },
      {
        key: { tenantId: 1, variantSku: 1 },
        name: 'tenantId_1_variantSku_1',
        background: true
      }
    ];

    for (const indexSpec of indexesToCreate) {
      try {
        await inventoryCollection.createIndex(indexSpec.key as any, {
          name: indexSpec.name,
          background: indexSpec.background
        });
        log(`   ✅ Índice creado: ${indexSpec.name}`, colors.green);
      } catch (error: any) {
        if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
          log(`   ℹ️  Índice ya existe: ${indexSpec.name}`, colors.blue);
        } else {
          log(`   ⚠️  Error creando índice ${indexSpec.name}: ${error.message}`, colors.yellow);
        }
      }
    }

    await connection.close();
    log('\n✅ Optimización de inventario completada', colors.green + colors.bright);

  } catch (error: any) {
    log(`\n❌ Error optimizando inventario: ${error.message}`, colors.red + colors.bright);
    await connection.close();
  }
}

async function main() {
  try {
    log('\n' + '='.repeat(70), colors.bright);
    log('🚀 INICIO: Backup y Migración de Productos', colors.bright + colors.blue);
    log('='.repeat(70), colors.bright);

    // Paso 1: Crear backup
    const backupPath = await createBackup();
    log(`\n💾 Backup guardado en: ${backupPath}`, colors.green + colors.bright);
    log('   Puedes restaurarlo con:', colors.green);
    log(`   mongorestore --uri="${MONGO_URI}" --drop "${backupPath}"`, colors.yellow);

    // Paso 2: Migrar productos
    await migrateProducts();

    // Paso 3: Optimizar inventario
    await optimizeInventoryQueries();

    // Resumen final
    log('\n' + '='.repeat(70), colors.bright);
    log('🎉 PROCESO COMPLETADO EXITOSAMENTE', colors.green + colors.bright);
    log('='.repeat(70), colors.bright);

    log('\n📋 Resumen:', colors.blue);
    log(`   ✅ Backup creado en: ${backupPath}`, colors.green);
    log(`   ✅ Productos migrados con campo productType`, colors.green);
    log(`   ✅ Índices de inventario optimizados`, colors.green);

    log('\n💡 Próximos pasos:', colors.blue);
    log('   1. Verifica que los productos ahora aparezcan en el frontend', colors.reset);
    log('   2. Prueba la carga de productos en órdenes de venta', colors.reset);
    log('   3. Si todo funciona, puedes eliminar el backup después de unos días', colors.reset);

    process.exit(0);

  } catch (error: any) {
    log('\n' + '='.repeat(70), colors.red);
    log('❌ ERROR FATAL', colors.red + colors.bright);
    log('='.repeat(70), colors.red);
    log(`\n${error.message}`, colors.red);
    log(`\n📚 Stack: ${error.stack}`, colors.red);

    log('\n💡 Recomendaciones:', colors.yellow);
    log('   1. Verifica que MongoDB esté corriendo', colors.reset);
    log('   2. Verifica la URI de conexión en las variables de entorno', colors.reset);
    log('   3. Si el backup se completó, los datos están seguros', colors.reset);

    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  main();
}

export { createBackup, migrateProducts, optimizeInventoryQueries };
