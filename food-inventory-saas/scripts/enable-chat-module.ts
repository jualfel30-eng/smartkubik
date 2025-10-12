import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from '../src/schemas/tenant.schema';

/**
 * Script to enable the chat module for a specific tenant
 * Usage: npx ts-node scripts/enable-chat-module.ts <tenantId>
 */
async function enableChatModule() {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('❌ Please provide a tenantId as an argument.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const tenantModel = app.get<Model<Tenant>>(getModelToken(Tenant.name));

  console.log(`🚀 Enabling chat module for tenant: ${tenantId}`);

  const result = await tenantModel.updateOne(
    { _id: tenantId },
    { $set: { 'enabledModules.chat': true } }
  ).exec();

  if (result.modifiedCount > 0) {
    console.log('✅ Chat module enabled successfully.');
  } else {
    console.warn('⚠️  Tenant not found or chat module was already enabled.');
  }

  await app.close();
  process.exit(0);
}

enableChatModule().catch((error) => {
  console.error('❌ Error enabling chat module:', error);
  process.exit(1);
});
