
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseOrder, PurchaseOrderDocument } from '../src/schemas/purchase-order.schema';
import { PurchaseOrderRating, PurchaseOrderRatingDocument } from '../src/schemas/purchase-order-rating.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const purchaseOrderModel = app.get<Model<PurchaseOrderDocument>>(getModelToken(PurchaseOrder.name));
  const purchaseOrderRatingModel = app.get<Model<PurchaseOrderRatingDocument>>(getModelToken(PurchaseOrderRating.name));

  console.log('--- DUMPING PURCHASE ORDERS ---');
  const allPurchaseOrders = await purchaseOrderModel.find({}).lean();
  console.log(JSON.stringify(allPurchaseOrders, null, 2));

  console.log('\n--- DUMPING PURCHASE ORDER RATINGS ---');
  const allRatings = await purchaseOrderRatingModel.find({}).lean();
  console.log(JSON.stringify(allRatings, null, 2));

  await app.close();
  process.exit(0);
}

bootstrap();
