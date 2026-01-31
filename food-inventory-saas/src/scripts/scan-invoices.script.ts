import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { BillingDocument } from '../schemas/billing-document.schema';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const billingModel = app.get<Model<BillingDocument>>(getModelToken(BillingDocument.name));

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-31T23:59:59.000Z');

    const docs = await billingModel.find({
        issueDate: { $gte: startDate, $lte: endDate },
        type: { $ne: 'quote' }
    }).lean();

    console.log('=== JAN 2026 INVOICE SCAN ===');
    console.log('Count:', docs.length);
    docs.forEach(doc => {
        console.log(`[${doc.documentNumber}] Total: ${doc.totals?.grandTotal}, Rate: ${doc.totals?.exchangeRate}, Cur: ${doc.totals?.currency}`);
    });
    console.log('=============================');

    await app.close();
}

bootstrap();
