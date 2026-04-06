import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer } from '../schemas/customer.schema';
import { Supplier } from '../schemas/supplier.schema';

async function createMissingCustomer() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const customerModel = app.get<Model<Customer>>(getModelToken(Customer.name));
    const supplierModel = app.get<Model<Supplier>>(getModelToken(Supplier.name));

    console.log('='.repeat(70));
    console.log('CREAR CUSTOMER FALTANTE PARA GEOMAR TARAZONA');
    console.log('='.repeat(70));

    const tenantId = '69b187062339e815ceba7487';
    const supplierNumber = 'PROV-000018';

    // Buscar el supplier
    const supplier = await supplierModel.findOne({
      supplierNumber,
      tenantId
    }).lean();

    if (!supplier) {
      console.log(`❌ Supplier ${supplierNumber} no encontrado`);
      process.exit(1);
    }

    console.log('\n✓ Supplier encontrado:');
    console.log(`   Name: ${supplier.name}`);
    console.log(`   SupplierNumber: ${supplier.supplierNumber}`);
    console.log(`   CustomerId: ${supplier.customerId}`);
    console.log(`   RIF: ${supplier.taxInfo?.rif || 'N/A'}`);

    // Verificar si el customer ya existe
    const existingCustomer = await customerModel.findById(supplier.customerId);

    if (existingCustomer) {
      console.log('\n✓ Customer ya existe, no se requiere acción');
      process.exit(0);
    }

    console.log('\n❌ Customer NO existe, creando...');

    // Generar customerNumber
    const customerCount = await customerModel.countDocuments({
      tenantId,
      customerType: 'supplier'
    });
    const customerNumber = `CLI-${String(customerCount + 1).padStart(6, '0')}`;

    // Crear el customer con el ID que el supplier ya tiene
    const newCustomer = {
      _id: new Types.ObjectId(supplier.customerId),
      customerNumber,
      name: supplier.name,
      companyName: supplier.name,
      customerType: 'supplier' as const,
      taxInfo: {
        taxId: supplier.taxInfo?.rif || '',
        taxType: supplier.taxInfo?.rif?.charAt(0) || 'J'
      },
      contacts: supplier.contacts || [],
      segments: [],
      interactions: [],
      metrics: {
        totalOrders: 0,
        totalSpent: 0,
        totalSpentUSD: 0,
        averageOrderValue: 0,
        orderFrequency: 0,
        lifetimeValue: 0,
        returnRate: 0,
        cancellationRate: 0,
        paymentDelayDays: 0,
        averageRating: 0,
        totalRatings: 0
      },
      tier: 'bronce' as const,
      loyaltyScore: 0,
      loyaltyPoints: 0,
      loyalty: {
        tier: 'bronce' as const,
        lastUpgradeAt: new Date(),
        benefits: [],
        pendingRewards: []
      },
      creditInfo: {
        creditLimit: 0,
        availableCredit: 0,
        paymentTerms: 0,
        creditRating: 'C' as const,
        isBlocked: false
      },
      status: supplier.status || 'active',
      source: 'manual' as const,
      createdBy: supplier.createdBy,
      tenantId: supplier.tenantId,
      visitCount: 0,
      isWhatsappCustomer: false,
      emailVerified: false,
      hasStorefrontAccount: false,
      addresses: [],
      paymentMethods: [],
      communicationEvents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await customerModel.create(newCustomer);

    console.log('\n✓ Customer creado exitosamente:');
    console.log(`   _id: ${created._id}`);
    console.log(`   customerNumber: ${created.customerNumber}`);
    console.log(`   name: ${created.name}`);
    console.log(`   companyName: ${created.companyName}`);
    console.log(`   taxInfo.taxId: ${created.taxInfo?.taxId}`);
    console.log(`   customerType: ${created.customerType}`);
    console.log(`   status: ${created.status}`);

    console.log('\n✓ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

createMissingCustomer();
