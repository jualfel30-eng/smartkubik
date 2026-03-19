import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SuppliersService } from '../modules/suppliers/suppliers.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseOrder, PurchaseOrderDocument } from '../schemas/purchase-order.schema';

/**
 * Script de Migración: Vincular Productos con Proveedores desde Compras Históricas
 *
 * Este script recorre todas las órdenes de compra recibidas y vincula
 * automáticamente los productos con sus proveedores en Product.suppliers[]
 *
 * Cómo ejecutar:
 * npx ts-node src/scripts/migrate-historical-supplier-product-links.ts
 */

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const suppliersService = app.get(SuppliersService);
  const purchaseOrderModel = app.get<Model<PurchaseOrderDocument>>('PurchaseOrderModel');

  console.log('\n🚀 Iniciando migración de enlaces proveedor-producto desde compras históricas...\n');

  try {
    // Buscar todas las órdenes de compra recibidas
    const receivedOrders = await purchaseOrderModel
      .find({ status: 'received' })
      .select('_id poNumber supplierId supplierName items tenantId')
      .lean();

    console.log(`📦 Encontradas ${receivedOrders.length} órdenes de compra recibidas\n`);

    let totalProductsProcessed = 0;
    let totalLinksCreated = 0;
    let totalLinksUpdated = 0;
    let errors = 0;

    for (const [index, order] of receivedOrders.entries()) {
      console.log(`[${index + 1}/${receivedOrders.length}] Procesando orden ${order.poNumber}...`);

      for (const item of order.items) {
        totalProductsProcessed++;

        try {
          const result = await suppliersService.linkProductToSupplier(
            item.productId.toString(),
            order.supplierId.toString(),
            order.tenantId.toString(),
            {
              supplierName: order.supplierName,
              costPrice: item.costPrice,
              productSku: item.variantSku || item.productSku,
            },
          );

          if (result.isNew) {
            totalLinksCreated++;
            console.log(`  ✅ Nuevo enlace: ${item.productName} → ${order.supplierName}`);
          } else {
            totalLinksUpdated++;
            console.log(`  🔄 Actualizado: ${item.productName} → ${order.supplierName}`);
          }
        } catch (error) {
          errors++;
          console.error(`  ❌ Error en producto ${item.productName}: ${error.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(70));
    console.log(`✅ Órdenes procesadas:        ${receivedOrders.length}`);
    console.log(`📦 Productos procesados:      ${totalProductsProcessed}`);
    console.log(`🆕 Enlaces nuevos creados:    ${totalLinksCreated}`);
    console.log(`🔄 Enlaces actualizados:      ${totalLinksUpdated}`);
    console.log(`❌ Errores:                   ${errors}`);
    console.log('='.repeat(70) + '\n');

    if (errors === 0) {
      console.log('🎉 Migración completada exitosamente!\n');
    } else {
      console.log('⚠️  Migración completada con algunos errores. Revisa los logs arriba.\n');
    }

  } catch (error) {
    console.error('\n❌ Error fatal en la migración:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
