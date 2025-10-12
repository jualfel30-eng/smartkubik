import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Tenant } from '../src/schemas/tenant.schema';

async function debugTenant() {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('❌ Please provide a tenantId as an argument.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const tenantModel = app.get<Model<Tenant>>(getModelToken(Tenant.name));

  console.log(`--- Searching for tenant with ID: ${tenantId} ---`);
  
  // Explicitly convert string to ObjectId for the query
  const tenant = await tenantModel.findById(new mongoose.Types.ObjectId(tenantId)).exec();

  if (tenant) {
    console.log('--- TENANT FOUND ---\n');
    console.log(JSON.stringify(tenant.toObject(), null, 2));
  } else {
    console.log('--- TENANT NOT FOUND ---\n');
  }

  await app.close();
}

debugTenant().catch(err => {
  console.error('Error running debug script:', err);
  process.exit(1);
});
