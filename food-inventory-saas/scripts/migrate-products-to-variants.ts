/**
 * Script de Migración: Productos sin Variantes → Productos con Variante "Estándar"
 *
 * Este script migra todos los productos que NO tienen variantes a tener una variante
 * "Estándar" con los datos del producto base.
 *
 * IMPORTANTE:
 * - Hacer BACKUP de la base de datos antes de ejecutar
 * - Ejecutar primero en ambiente de desarrollo/staging
 * - Validar resultados antes de ejecutar en producción
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
  category?: string;
  subcategory?: string;
  brand?: string;
  unitOfMeasure?: string;
  basePrice?: number;
  costPrice?: number;
  variants?: Array<{
    _id?: mongoose.Types.ObjectId;
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
  tenantId: mongoose.Types.ObjectId;
  isActive: boolean;
}

interface InventoryDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  variantId?: mongoose.Types.ObjectId;
  variantSku?: string;
  tenantId: mongoose.Types.ObjectId;
}

// Definir esquemas simplificados (solo para migración)
const ProductSchema = new mongoose.Schema({}, { strict: false });
const InventorySchema = new mongoose.Schema({}, { strict: false });

const Product = mongoose.model<ProductDocument>('Product', ProductSchema);
const Inventory = mongoose.model<InventoryDocument>('Inventory', InventorySchema);

// Estadísticas de migración
interface MigrationStats {
  totalProducts: number;
  productsWithVariants: number;
  productsWithoutVariants: number;
  productsMigrated: number;
  inventoriesMigrated: number;
  errors: Array<{ productId: string; error: string }>;
}

const stats: MigrationStats = {
  totalProducts: 0,
  productsWithVariants: 0,
  productsWithoutVariants: 0,
  productsMigrated: 0,
  inventoriesMigrated: 0,
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
 * Crear variante "Estándar" para un producto
 */
function createStandardVariant(product: ProductDocument): any {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Estándar',
    sku: `${product.sku}-VAR1`,
    barcode: '',
    unit: product.unitOfMeasure || 'unidad',
    unitSize: 1,
    basePrice: product.basePrice || 0,
    costPrice: product.costPrice || 0,
    isActive: true,
    images: [],
  };
}

/**
 * Migrar un producto individual
 */
async function migrateProduct(
  product: ProductDocument,
  dryRun: boolean
): Promise<{ success: boolean; variantId?: mongoose.Types.ObjectId; error?: string }> {
  try {
    // Verificar si ya tiene variantes
    if (product.variants && product.variants.length > 0) {
      stats.productsWithVariants++;
      console.log(`  ⏭️  Producto ${product.sku} ya tiene ${product.variants.length} variante(s)`);
      return { success: true };
    }

    stats.productsWithoutVariants++;

    // Crear variante estándar
    const standardVariant = createStandardVariant(product);

    console.log(`  🔄 Migrando producto: ${product.name} (${product.sku})`);
    console.log(`     → Creando variante: ${standardVariant.name} (${standardVariant.sku})`);

    if (!dryRun) {
      // Actualizar producto con la variante
      product.variants = [standardVariant];
      await product.save();

      stats.productsMigrated++;
      console.log(`     ✅ Producto migrado exitosamente`);
    } else {
      console.log(`     🔍 [DRY RUN] Producto se migraría exitosamente`);
    }

    return { success: true, variantId: standardVariant._id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`     ❌ Error migrando producto ${product.sku}: ${errorMsg}`);
    stats.errors.push({ productId: product._id.toString(), error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

/**
 * Migrar inventarios relacionados a un producto
 */
async function migrateInventories(
  productId: mongoose.Types.ObjectId,
  variantId: mongoose.Types.ObjectId,
  variantSku: string,
  dryRun: boolean
): Promise<void> {
  try {
    // Buscar inventarios del producto que no tienen variantId
    const inventories = await Inventory.find({
      productId: productId,
      $or: [
        { variantId: { $exists: false } },
        { variantId: null },
      ],
    });

    if (inventories.length === 0) {
      console.log(`     📦 No hay inventarios para migrar`);
      return;
    }

    console.log(`     📦 Encontrados ${inventories.length} inventario(s) para migrar`);

    for (const inventory of inventories) {
      if (!dryRun) {
        inventory.variantId = variantId;
        inventory.variantSku = variantSku;
        await inventory.save();
        stats.inventoriesMigrated++;
        console.log(`        ✅ Inventario ${inventory._id} migrado`);
      } else {
        console.log(`        🔍 [DRY RUN] Inventario ${inventory._id} se migraría`);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`     ❌ Error migrando inventarios: ${errorMsg}`);
  }
}

/**
 * Ejecutar migración completa
 */
async function runMigration(options: { dryRun: boolean; tenantId?: string }): Promise<void> {
  console.log('🚀 Iniciando migración de productos a formato de variantes\n');
  console.log(`📋 Modo: ${options.dryRun ? 'DRY RUN (simulación)' : 'EJECUCIÓN REAL'}`);

  if (options.tenantId) {
    console.log(`🎯 Filtrando por Tenant ID: ${options.tenantId}\n`);
  } else {
    console.log(`🌍 Migrando TODOS los tenants\n`);
  }

  // Construir filtro
  const filter: any = { isActive: { $ne: false } };
  if (options.tenantId) {
    filter.tenantId = new mongoose.Types.ObjectId(options.tenantId);
  }

  // Obtener todos los productos
  console.log('🔍 Buscando productos...\n');
  const products = await Product.find(filter).sort({ tenantId: 1, sku: 1 });

  stats.totalProducts = products.length;
  console.log(`📊 Encontrados ${stats.totalProducts} productos\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Migrar cada producto
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`[${i + 1}/${products.length}] Procesando: ${product.name}`);

    const result = await migrateProduct(product, options.dryRun);

    if (result.success && result.variantId) {
      // Migrar inventarios asociados
      await migrateInventories(
        product._id,
        result.variantId,
        `${product.sku}-VAR1`,
        options.dryRun
      );
    }

    console.log(''); // Línea en blanco para separación
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Mostrar resumen de la migración
 */
function printSummary(): void {
  console.log('📊 RESUMEN DE MIGRACIÓN\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total de productos:              ${stats.totalProducts}`);
  console.log(`Productos con variantes (skip):  ${stats.productsWithVariants}`);
  console.log(`Productos sin variantes:         ${stats.productsWithoutVariants}`);
  console.log(`Productos migrados:              ${stats.productsMigrated}`);
  console.log(`Inventarios migrados:            ${stats.inventoriesMigrated}`);
  console.log(`Errores:                         ${stats.errors.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (stats.errors.length > 0) {
    console.log('❌ ERRORES ENCONTRADOS:\n');
    stats.errors.forEach((err, i) => {
      console.log(`${i + 1}. Producto ID: ${err.productId}`);
      console.log(`   Error: ${err.error}\n`);
    });
  }
}

/**
 * Main
 */
async function main(): Promise<void> {
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
