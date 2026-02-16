import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    // Get Sales Book Model
    const salesBookModel = app.get<Model<any>>(getModelToken('IvaSalesBook'));

    // DIAGNOSIS: Check specifically for invoice F106
    const entry: any = await salesBookModel.findOne({ invoiceNumber: 'F106' }).lean();

    if (entry) {
        console.log('=== SALES BOOK ENTRY F106 ===');
        console.log('ID:', entry._id);
        console.log('Original Currency:', entry.originalCurrency);
        console.log('Exchange Rate:', entry.exchangeRate);
        console.log('Base Amount (VES):', entry.baseAmount);
        console.log('IVA Amount (VES):', entry.ivaAmount);
        console.log('Total Amount (VES):', entry.totalAmount);
        console.log('Tenant:', entry.tenantId);
        console.log('=============================');

        // Check expected values vs actual
        if (entry.totalAmount > 60000) {
            console.log('SUCCESS: DB has converted VES value.');
        } else {
            console.log('FAILURE: DB still has USD-like value.');
        }
    } else {
        console.log('CRITICAL: Invoice F106 NOT FOUND in Sales Book!');
    }

    await app.close();
}

bootstrap();
