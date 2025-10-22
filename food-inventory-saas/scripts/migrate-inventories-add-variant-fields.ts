/**
 * Script de Migración: Agregar campos variantId y variantSku a inventarios
 *
 * Este script actualiza todos los inventarios que NO tienen variantId/variantSku
 * para agregarles estos campos basándose en la primera variante del producto.
 *
 * IMPORTANTE:
 * - Hacer BACKUP de la base de datos antes de ejecutar
 * - Ejecutar primero en dry-run mode para ver qué cambiará
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface ProductDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  variants?: Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    sku: string;
    barcode?: string;
    unit: string;
    unitSize: number;
    basePrice: number;
    costPrice: number;
    isActive: boolean;
    images?: string[];
  }>;
}

interface InventoryDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  variantId?: mongoose.Types.ObjectId;
  variantSku?: string;
  tenantId: mongoose.Types.ObjectId;
}

// Esquemas flexibles
const ProductSchema = new mongoose.Schema({}, { strict: false });
const InventorySchema = new mongoose.Schema({}, { strict: false });

const Product = mongoose.model<ProductDocument>('Product', ProductSchema);
const Inventory = mongoose.model<InventoryDocument>('Inventory', InventorySchema);

// Estadísticas de migración
interface MigrationStats {
  totalInventories: number;
  inventoriesWithVariant: number;
  inventoriesWithoutVariant: number;
  inventoriesMigrated: number;
  inventoriesSkipped: number;
  errors: Array<{ inventoryId: string; error: string }>;
}

const stats: MigrationStats = {
  totalInventories: 0,
  inventoriesWithVariant: 0,
  inventoriesWithoutVariant: 0,
  inventoriesMigrated: 0,
  inventoriesSkipped: 0,
  errors: [],
};

/**
 * Conectar a MongoDB
 */
async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';

  console.log('🔌 Conectando a MongoDB...');
  console.log(`📍 URI: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

  await mongoose.connect(mongoUri);
  console.log('✅ Conectado a MongoDB\n');
}

/**
 * Migrar un inventario individual
 */
async function migrateInventory(
  inventory: InventoryDocument,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar si ya tiene variantId
    if (inventory.variantId) {
      stats.inventoriesWithVariant++;
      return { success: true };
    }

    stats.inventoriesWithoutVariant++;

    // Buscar el producto
    const product = await Product.findById(inventory.productId);

    if (!product) {
      const error = `Producto no encontrado: ${inventory.productId}`;
      stats.errors.push({
        inventoryId: inventory._id.toString(),
        error,
      });
      return { success: false, error };
    }

    // Verificar que el producto tenga variantes
    if (!product.variants || product.variants.length === 0) {
      const error = `Producto ${product.sku} no tiene variantes`;
      stats.errors.push({
        inventoryId: inventory._id.toString(),
        error,
      });
      return { success: false, error };
    }

    // Obtener la primera variante (variante estándar)
    const variant = product.variants[0];

    console.log(`  ✅ Agregando variantId: ${variant._id}, variantSku: ${variant.sku}`);

    if (!dryRun) {
      // Actualizar el inventario
      await Inventory.updateOne(
        { _id: inventory._id },
        {
          $set: {
            variantId: variant._id,
            variantSku: variant.sku,
          },
        }
      );
    }

    stats.inventoriesMigrated++;
    return { success: true };
  } catch (error: any) {
    const errorMsg = error.message || 'Error desconocido';
    stats.errors.push({
      inventoryId: inventory._id.toString(),
      error: errorMsg,
    });
    console.error(`  ❌ Error: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Ejecutar migración
 */
async function runMigration(options: {
  dryRun: boolean;
  tenantId?: string;
}): Promise<void> {
  console.log('🚀 Iniciando migración de inventarios\n');
  console.log(`📋 Modo: ${options.dryRun ? 'DRY RUN (simulación)' : 'REAL (cambios permanentes)'}`);

  if (options.tenantId) {
    console.log(`🏢 Tenant ID: ${options.tenantId}`);
  } else {
    console.log('🌍 Migrando TODOS los tenants');
  }

  // Construir filtro
  const filter: any = { isActive: { $ne: false } };
  if (options.tenantId) {
    filter.tenantId = new mongoose.Types.ObjectId(options.tenantId);
  }

  // Obtener todos los inventarios
  console.log('\n🔍 Buscando inventarios...\n');
  const inventories = await Inventory.find(filter).sort({ tenantId: 1, productSku: 1 });

  stats.totalInventories = inventories.length;
  console.log(`📊 Encontrados ${stats.totalInventories} inventarios\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Migrar cada inventario
  for (let i = 0; i < inventories.length; i++) {
    const inventory = inventories[i];
    console.log(`[${i + 1}/${inventories.length}] Procesando: SKU ${inventory.productSku}`);

    await migrateInventory(inventory, options.dryRun);
    console.log(''); // Línea en blanco para separación
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Mostrar resumen de la migración
 */
function printSummary(): void {
  console.log('\n📊 RESUMEN DE MIGRACIÓN\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total de inventarios:            ${stats.totalInventories}`);
  console.log(`Inventarios con variantId:       ${stats.inventoriesWithVariant}`);
  console.log(`Inventarios sin variantId:       ${stats.inventoriesWithoutVariant}`);
  console.log(`Inventarios migrados:            ${stats.inventoriesMigrated}`);
  console.log(`Errores:                         ${stats.errors.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORES:\n');
    stats.errors.forEach((error) => {
      console.log(`  • Inventario ${error.inventoryId}: ${error.error}`);
    });
    console.log('');
  }
}

/**
 * Main
 */
async function main() {
  try {
    await connectToDatabase();

    // Parsear argumentos
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run') || args.includes('-d');
    const tenantIdArg = args.find(arg => arg.startsWith('--tenant='));
    const tenantId = tenantIdArg ? tenantIdArg.split('=')[1] : undefined;

    if (dryRun) {
      console.log('⚠️  MODO DRY RUN: No se realizarán cambios en la base de datos\n');
    } else {
      console.log('⚠️  MODO REAL: Se realizarán cambios PERMANENTES en la base de datos');
      console.log('⚠️  Asegúrate de tener un BACKUP antes de continuar\n');

      // Dar tiempo para cancelar si es necesario
      console.log('⏳ Iniciando en 5 segundos... (Ctrl+C para cancelar)');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('');
    }

    await runMigration({ dryRun, tenantId });
    printSummary();

    console.log('✅ Migración completada\n');
  } catch (error) {
    console.error('❌ Error fatal durante la migración:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar
main().catch(console.error);
