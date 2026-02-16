import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { BillingDocument } from '../schemas/billing-document.schema';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const billingModel = app.get<Model<BillingDocument>>(getModelToken(BillingDocument.name));

    const doc = await billingModel.findOne({ documentNumber: 'F106' }).lean();

    if (doc) {
        console.log('=== FULL DOCUMENT F106 ===');
        console.log(JSON.stringify(doc, null, 2));
        console.log('==========================');
    } else {
        console.log('Document F106 not found');
    }

    await app.close();
}

bootstrap();
