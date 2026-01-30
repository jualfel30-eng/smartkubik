
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const connection = app.get(getConnectionToken());
    const Order = connection.model('Order');
    const Payment = connection.model('Payment');

    const order = await Order.findOne().sort({ createdAt: -1 }).lean();
    if (!order) {
        console.log('No order found');
        process.exit(0);
    }

    console.log('LATEST ORDER:', order.orderNumber);
    console.log('ID:', order._id);
    console.log('CREATED AT:', order.createdAt);

    // Check embedded paymentRecords
    console.log('PAYMENT RECORDS (Snapshot):', JSON.stringify(order.paymentRecords, null, 2));

    // Check actual payments
    const payments = await Payment.find({ _id: { $in: order.payments } }).lean();
    console.log('PAYMENT DOCUMENTS:', JSON.stringify(payments.map(p => ({
        id: p._id,
        amount: p.amount,
        method: p.method,
        tendered: p.amountTendered,
        change: p.changeGiven,
        breakdown: p.changeGivenBreakdown
    })), null, 2));

    await app.close();
    process.exit(0);
}
bootstrap();
