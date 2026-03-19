/**
 * Script de Migración: Crear registros Supplier para Virtual Suppliers
 *
 * Versión directa con MongoDB (sin NestJS) para evitar problemas de path aliases
 *
 * Cómo ejecutar:
 * node src/scripts/migrate-suppliers-direct.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

// Definir schemas mínimos necesarios
const customerSchema = new mongoose.Schema({}, { strict: false });
const supplierSchema = new mongoose.Schema({}, { strict: false });
const purchaseOrderSchema = new mongoose.Schema({}, { strict: false });

async function migrate() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Customer = mongoose.model('Customer', customerSchema, 'customers');
    const Supplier = mongoose.model('Supplier', supplierSchema, 'suppliers');
    const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema, 'purchaseorders');

    console.log('🚀 Iniciando migración de Virtual Suppliers a Suppliers...\n');

    // 1. Encontrar todos los customers que son proveedores
    const virtualSuppliers = await Customer.find({ customerType: 'supplier' })
      .select('_id name companyName taxInfo contacts tenantId')
      .lean();

    console.log(`📦 Encontrados ${virtualSuppliers.length} proveedores en CRM\n`);

    let suppliersCreated = 0;
    let suppliersSkipped = 0;
    let errors = 0;

    for (let i = 0; i < virtualSuppliers.length; i++) {
      const customer = virtualSuppliers[i];
      console.log(`[${i + 1}/${virtualSuppliers.length}] Procesando: ${customer.companyName || customer.name}...`);

      try {
        // 2. Verificar si ya tiene un registro en suppliers
        const existingSupplier = await Supplier.findOne({
          customerId: customer._id,
          tenantId: customer.tenantId,
        });

        if (existingSupplier) {
          console.log(`  ⏭️  Ya tiene registro en Suppliers`);
          suppliersSkipped++;
          continue;
        }

        // 3. Buscar órdenes de compra históricas para este proveedor
        const purchaseOrders = await PurchaseOrder.find({
          supplierId: customer._id,
          tenantId: customer.tenantId,
        })
          .select('paymentTerms')
          .lean();

        // 4. Extraer métodos de pago comunes de las órdenes
        const paymentMethodsMap = new Map();
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

        // 6. Generar supplierNumber único
        // Obtener el último supplierNumber para este tenant
        const lastSupplier = await Supplier.findOne({ tenantId: customer.tenantId })
          .sort({ supplierNumber: -1 })
          .select('supplierNumber')
          .lean();

        let nextNumber = 1;
        if (lastSupplier?.supplierNumber) {
          // Extraer el número del formato SUP-XXXXX
          const match = lastSupplier.supplierNumber.match(/SUP-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        const supplierNumber = `SUP-${String(nextNumber).padStart(5, '0')}`;

        // 7. Crear registro en suppliers
        const newSupplier = new Supplier({
          customerId: customer._id,
          supplierNumber: supplierNumber,
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
          createdAt: new Date(),
          updatedAt: new Date(),
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
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

migrate();
