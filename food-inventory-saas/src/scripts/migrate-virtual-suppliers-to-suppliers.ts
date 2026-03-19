import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CustomerDocument } from '../schemas/customer.schema';
import { SupplierDocument } from '../schemas/supplier.schema';
import { PurchaseOrderDocument } from '../schemas/purchase-order.schema';

/**
 * Script de Migración: Crear registros Supplier para Virtual Suppliers
 *
 * Este script encuentra todos los customers con customerType='supplier' que NO tienen
 * un registro vinculado en la colección suppliers, y crea uno basándose en sus
 * órdenes de compra históricas para extraer paymentSettings comunes.
 *
 * Cómo ejecutar:
 * npx ts-node src/scripts/migrate-virtual-suppliers-to-suppliers.ts
 */

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const customerModel = app.get<Model<CustomerDocument>>('CustomerModel');
  const supplierModel = app.get<Model<SupplierDocument>>('SupplierModel');
  const purchaseOrderModel = app.get<Model<PurchaseOrderDocument>>('PurchaseOrderModel');

  console.log('\n🚀 Iniciando migración de Virtual Suppliers a Suppliers...\n');

  try {
    // 1. Encontrar todos los customers que son proveedores
    const virtualSuppliers = await customerModel
      .find({ customerType: 'supplier' })
      .select('_id name companyName taxInfo contacts tenantId')
      .lean();

    console.log(`📦 Encontrados ${virtualSuppliers.length} proveedores en CRM\n`);

    let suppliersCreated = 0;
    let suppliersSkipped = 0;
    let errors = 0;

    for (const [index, customer] of virtualSuppliers.entries()) {
      console.log(`[${index + 1}/${virtualSuppliers.length}] Procesando: ${customer.companyName || customer.name}...`);

      try {
        // 2. Verificar si ya tiene un registro en suppliers
        const existingSupplier = await supplierModel.findOne({
          customerId: customer._id,
          tenantId: customer.tenantId,
        });

        if (existingSupplier) {
          console.log(`  ⏭️  Ya tiene registro en Suppliers`);
          suppliersSkipped++;
          continue;
        }

        // 3. Buscar órdenes de compra históricas para este proveedor
        const purchaseOrders = await purchaseOrderModel
          .find({
            supplierId: customer._id,
            tenantId: customer.tenantId,
          })
          .select('paymentTerms')
          .lean();

        // 4. Extraer métodos de pago comunes de las órdenes
        const paymentMethodsMap = new Map<string, number>();
        purchaseOrders.forEach(po => {
          if (po.paymentTerms?.paymentMethods) {
            po.paymentTerms.paymentMethods.forEach(method => {
              paymentMethodsMap.set(method, (paymentMethodsMap.get(method) || 0) + 1);
            });
          }
        });

        // Ordenar por frecuencia y tomar los más comunes
        const sortedMethods = Array.from(paymentMethodsMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([method]) => method);

        // 5. Analizar crédito promedio
        const creditOrders = purchaseOrders.filter(po => po.paymentTerms?.isCredit);
        const avgCreditDays = creditOrders.length > 0
          ? Math.round(creditOrders.reduce((sum, po) => sum + (po.paymentTerms?.creditDays || 0), 0) / creditOrders.length)
          : 0;

        // 6. Crear registro en suppliers
        const newSupplier = new supplierModel({
          customerId: customer._id,
          name: customer.companyName || customer.name,
          contactInfo: {
            phone: customer.contacts?.find(c => c.type === 'phone')?.value || '',
            email: customer.contacts?.find(c => c.type === 'email')?.value || '',
            address: '',
          },
          taxInfo: {
            rif: customer.taxInfo?.taxId || '',
            businessName: customer.taxInfo?.taxName || customer.companyName || customer.name,
          },
          paymentSettings: {
            acceptedPaymentMethods: sortedMethods.length > 0 ? sortedMethods : ['efectivo'],
            acceptsCredit: creditOrders.length > 0,
            defaultCreditDays: avgCreditDays,
            requiresAdvancePayment: false,
            advancePaymentPercentage: 0,
          },
          tenantId: customer.tenantId,
        });

        await newSupplier.save();

        console.log(`  ✅ Creado registro Supplier`);
        if (sortedMethods.length > 0) {
          console.log(`     - Métodos de pago: ${sortedMethods.slice(0, 3).join(', ')}${sortedMethods.length > 3 ? '...' : ''}`);
        }
        if (avgCreditDays > 0) {
          console.log(`     - Crédito promedio: ${avgCreditDays} días`);
        }

        suppliersCreated++;
      } catch (error) {
        errors++;
        console.error(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(70));
    console.log(`✅ Proveedores procesados:     ${virtualSuppliers.length}`);
    console.log(`🆕 Registros Supplier creados: ${suppliersCreated}`);
    console.log(`⏭️  Ya existían:                ${suppliersSkipped}`);
    console.log(`❌ Errores:                    ${errors}`);
    console.log('='.repeat(70) + '\n');

    if (errors === 0) {
      console.log('🎉 Migración completada exitosamente!\n');
      console.log('💡 Ahora todos los proveedores tienen registros en la colección Suppliers.');
      console.log('   Las condiciones de pago se cargarán automáticamente al seleccionarlos.\n');
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
