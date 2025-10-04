import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from '../src/schemas/tenant.schema';

/**
 * Script to enable the appointments module for existing tenants
 * Usage: npx ts-node scripts/enable-appointments-module.ts
 */
async function enableAppointmentsModule() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const tenantModel = app.get<Model<Tenant>>(getModelToken(Tenant.name));

  console.log('Enabling appointments module for all SERVICES vertical tenants...');

  // Update all tenants with SERVICES vertical to enable appointments
  const result = await tenantModel.updateMany(
    { vertical: 'SERVICES' },
    {
      $set: {
        'enabledModules.appointments': true,
      },
    },
  );

  console.log(`✅ Updated ${result.modifiedCount} tenants`);

  // Also enable for specific tenants if needed (e.g., EARLYADOPTER for testing)
  const earlyAdopterResult = await tenantModel.updateOne(
    { code: 'EARLYADOPTER' },
    {
      $set: {
        'enabledModules.appointments': true,
      },
    },
  );

  if (earlyAdopterResult.modifiedCount > 0) {
    console.log('✅ Enabled appointments module for EARLYADOPTER tenant');
  }

  // Display summary of all tenants with appointments enabled
  const tenantsWithAppointments = await tenantModel
    .find({ 'enabledModules.appointments': true })
    .select('name code vertical enabledModules')
    .lean();

  console.log('\n📋 Tenants with appointments module enabled:');
  tenantsWithAppointments.forEach((tenant) => {
    console.log(`  - ${tenant.name} (${tenant.code}) - ${tenant.vertical}`);
  });

  await app.close();
  console.log('\n✅ Script completed successfully');
  process.exit(0);
}

enableAppointmentsModule().catch((error) => {
  console.error('❌ Error enabling appointments module:', error);
  process.exit(1);
});
