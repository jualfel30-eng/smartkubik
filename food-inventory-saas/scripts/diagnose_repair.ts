
// @ts-nocheck
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BillingService } from '../src/modules/billing/billing.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const billingService = app.get(BillingService);
    const connection = app.get(getConnectionToken());

    // Access raw models
    const BillingDocument = connection.model('BillingDocument');
    const Order = connection.model('Order');

    console.log('--- DIAGNOSTIC START ---');

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // 1. Find broken invoices
    const brokenDocs = await BillingDocument.find({
        $or: [{ items: { $size: 0 } }, { items: { $exists: false } }]
    }) as any[];

    console.log(`Found ${brokenDocs.length} remaining broken invoices.`);

    for (const doc of brokenDocs) {
        console.log(`\nAnalyzing Invoice: ${doc.documentNumber} (${doc._id})`);
        console.log(`  Created: ${doc.createdAt}`);
        console.log(`  Customer: ${doc.customer?.name || 'N/A'}`);
        console.log(`  Ref Order: ${doc.references?.orderId || 'None'}`);

        if (doc.customer?.name) {
            // Search for ANY order by this customer
            const name = doc.customer.name.trim();
            const orders = await Order.find({
                $or: [
                    { customerName: { $regex: new RegExp(name, 'i') } },
                    { 'customer.name': { $regex: new RegExp(name, 'i') } }
                ]
            }).sort({ createdAt: -1 }).limit(3).lean() as any[];

            if (orders.length > 0) {
                console.log(`  Found ${orders.length} potential orders by name match:`);
                for (const o of orders) {
                    const timeDiff = (new Date(doc.createdAt).getTime() - new Date(o.createdAt).getTime()) / (1000 * 60); // minutes
                    console.log(`    - Order ${o.orderNumber} (${o._id}) | Created: ${o.createdAt} | Diff: ${timeDiff.toFixed(1)} mins`);
                }
            } else {
                console.log('  No orders found with this exact name.');
                // Try lenient search?
            }
        } else {
            console.log('  Invoice has NO customer name. Cannot match by name.');
            // Show recent orders around that time
            const timeWindowStart = new Date(new Date(doc.createdAt).getTime() - 120 * 60000);
            const timeWindowEnd = new Date(new Date(doc.createdAt).getTime() + 10 * 60000);

            const nearbyOrders = await Order.find({
                createdAt: { $gte: timeWindowStart, $lte: timeWindowEnd }
            }).limit(3).lean() as any[];

            if (nearbyOrders.length > 0) {
                console.log(`  Nearby orders (time only):`);
                for (const o of nearbyOrders) {
                    console.log(`    - Order ${o.orderNumber} | Customer: ${o.customerName} | Created: ${o.createdAt}`);
                }
            } else {
                console.log('  No nearby orders found even by time.');
            }
        }
    }

    console.log('\n--- DIAGNOSTIC END ---');
    await app.close();
    process.exit(0);
}

bootstrap();
