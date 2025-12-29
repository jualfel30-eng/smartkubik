/**
 * Script directo para ejecutar la migración de payment-order linking
 * Sin necesidad de JWT token - se ejecuta directamente en el proceso de Node
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../food-inventory-saas/src/app.module';
import { LinkPaymentsToOrdersMigration } from '../food-inventory-saas/src/database/migrations/link-payments-to-orders.migration';

async function bootstrap() {
  console.log('🚀 Iniciando aplicación NestJS...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  const migration = app.get(LinkPaymentsToOrdersMigration);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🔗 EJECUTANDO MIGRACIÓN: Link Payments to Orders');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    await migration.run();
    console.log('\n✅ Migración completada exitosamente!\n');
  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
