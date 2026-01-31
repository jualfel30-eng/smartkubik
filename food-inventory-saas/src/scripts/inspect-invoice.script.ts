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
        console.log('=== DOCUMENT F106 ===');
        console.log('Currency:', doc.totals?.currency);
        console.log('Exchange Rate:', doc.totals?.exchangeRate);
        console.log('Taxes:', JSON.stringify(doc.totals?.taxes, null, 2));
        console.log('Tax Details:', JSON.stringify((doc as any).taxDetails, null, 2));
        console.log('Grand Total:', doc.totals?.grandTotal);
        console.log('=====================');
    } else {
        console.log('Document F106 not found');
    }

    await app.close();
}

bootstrap();
