import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    // Assuming ExchangeRate model name. Need to verify schema if this fails, but usually 'ExchangeRate'.
    // Looking at app.module.ts, it imports ExchangeRateModule.

    // Let's guess the model name based on standard naming or look for schema file first?
    // I'll assume 'ExchangeRate' token.
    try {
        const rateModel = app.get<Model<any>>(getModelToken('ExchangeRate'));

        // Look for rates around Jan 29, 2026
        // F106 date is 2026-01-30T01:36:50Z (from dump)
        const date = new Date('2026-01-29T00:00:00.000Z');
        const endDate = new Date('2026-01-31T23:59:59.000Z');

        const rates = await rateModel.find({
            date: { $gte: date, $lte: endDate }
        }).lean();

        console.log('=== EXCHANGE RATES (Jan 29-31) ===');
        console.log(JSON.stringify(rates, null, 2));
        console.log('==================================');

    } catch (e) {
        console.log('Error fetching rates:', e.message);
    }

    await app.close();
}

bootstrap();
