/**
 * Script para corregir los registros Supplier de Tiendas Broas
 * Elimina los existentes (con tenantId incorrecto como ObjectId)
 * y re-ejecuta la migración
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

// Definir schemas mínimos necesarios
const customerSchema = new mongoose.Schema({}, { strict: false });
const supplierSchema = new mongoose.Schema({}, { strict: false });
const purchaseOrderSchema = new mongoose.Schema({}, { strict: false });
const tenantSchema = new mongoose.Schema({}, { strict: false });

async function fix() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Tenant = mongoose.model('Tenant', tenantSchema, 'tenants');
    const Customer = mongoose.model('Customer', customerSchema, 'customers');
    const Supplier = mongoose.model('Supplier', supplierSchema, 'suppliers');
    const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema, 'purchaseorders');

    // 1. Obtener el tenant
    const tenant = await Tenant.findOne({ name: /Tiendas Broas/i }).lean();
    console.log('📍 Tenant:', tenant.name);
    console.log('   ID:', tenant._id.toString());
    console.log('');

    // 2. Eliminar registros Supplier existentes con tenantId incorrecto (ObjectId)
    console.log('🗑️  Eliminando registros Supplier con tenantId ObjectId...');
    const deleteResult = await Supplier.deleteMany({
      tenantId: tenant._id // ObjectId
    });
    console.log(`   Eliminados: ${deleteResult.deletedCount} registros\n`);

    // 3. Buscar Virtual Suppliers para este tenant
    console.log('🔍 Buscando proveedores en customers...');
    const virtualSuppliers = await Customer.find({
      tenantId: tenant._id,
      customerType: 'supplier'
    }).select('_id name companyName taxInfo contacts tenantId').lean();

    console.log(`📦 Encontrados ${virtualSuppliers.length} proveedores\n`);

    let suppliersCreated = 0;
    let errors = 0;

    for (let i = 0; i < virtualSuppliers.length; i++) {
      const customer = virtualSuppliers[i];
      console.log(`[${i + 1}/${virtualSuppliers.length}] Procesando: ${customer.companyName || customer.name}...`);

      try {
        // Buscar órdenes de compra históricas
        const purchaseOrders = await PurchaseOrder.find({
          supplierId: customer._id,
          tenantId: tenant._id,
        })
          .select('paymentTerms')
          .lean();

        // Extraer métodos de pago
        const paymentMethodsMap = new Map();
        purchaseOrders.forEach(po => {
          if (po.paymentTerms?.paymentMethods) {
            po.paymentTerms.paymentMethods.forEach(method => {
              paymentMethodsMap.set(method, (paymentMethodsMap.get(method) || 0) + 1);
            });
          }
        });

        const sortedMethods = Array.from(paymentMethodsMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([method]) => method);

        // Analizar crédito
        const creditOrders = purchaseOrders.filter(po => po.paymentTerms?.isCredit);
        const avgCreditDays = creditOrders.length > 0
          ? Math.round(creditOrders.reduce((sum, po) => sum + (po.paymentTerms?.creditDays || 0), 0) / creditOrders.length)
          : 0;

        // Generar supplierNumber
        const lastSupplier = await Supplier.findOne({ tenantId: tenant._id.toString() })
          .sort({ supplierNumber: -1 })
          .select('supplierNumber')
          .lean();

        let nextNumber = 1;
        if (lastSupplier?.supplierNumber) {
          const match = lastSupplier.supplierNumber.match(/SUP-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        const supplierNumber = `SUP-${String(nextNumber).padStart(5, '0')}`;

        // Crear registro con tenantId CORRECTO (string)
        const newSupplier = new Supplier({
          customerId: customer._id,
          supplierNumber: supplierNumber,
          supplierType: 'distributor',
          name: customer.companyName || customer.name,
          contacts: customer.contacts?.map(c => ({
            name: c.name || customer.name || 'Contacto',
            position: 'Principal',
            email: c.type === 'email' ? c.value : undefined,
            phone: c.type === 'phone' ? c.value : undefined,
            isPrimary: c.isPrimary || false
          })) || [],
          taxInfo: {
            rif: customer.taxInfo?.taxId || '',
            businessName: customer.taxInfo?.taxName || customer.companyName || customer.name,
            isRetentionAgent: false
          },
          paymentSettings: {
            acceptedPaymentMethods: sortedMethods.length > 0 ? sortedMethods : ['efectivo'],
            acceptsCredit: creditOrders.length > 0,
            defaultCreditDays: avgCreditDays,
            requiresAdvancePayment: false,
            advancePaymentPercentage: 0,
          },
          status: 'active',
          tenantId: tenant._id.toString(), // ✅ String, no ObjectId
          createdBy: new mongoose.Types.ObjectId('000000000000000000000000'), // Placeholder
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
    console.log('📊 RESUMEN DE CORRECCIÓN');
    console.log('='.repeat(70));
    console.log(`✅ Proveedores procesados:     ${virtualSuppliers.length}`);
    console.log(`🆕 Registros Supplier creados: ${suppliersCreated}`);
    console.log(`❌ Errores:                    ${errors}`);
    console.log('='.repeat(70) + '\n');

    if (errors === 0) {
      console.log('🎉 Corrección completada exitosamente!\\n');
      console.log('💡 Ahora los tenantId están correctamente almacenados como strings.');
      console.log('   Las condiciones de pago deberían cargar correctamente.\\n');
    }

  } catch (error) {
    console.error('\\n❌ Error fatal:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\\n');
  }
}

fix();
