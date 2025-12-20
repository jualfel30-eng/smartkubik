import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { getConnectionToken } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { Order } from "../src/schemas/order.schema";
import { Payment } from "../src/schemas/payment.schema";

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const connection = app.get<Connection>(getConnectionToken());

    const orderModel = connection.model("Order");
    const paymentModel = connection.model("Payment");

    console.log("🔄 Starting recalculation of paidAmountVes...");

    // Find all orders that are NOT fully paid (based on paymentStatus) OR strictly where balance > 0
    // Actually, let's just check ALL orders to be safe, or at least recent ones (last 30 days) if volume is high.
    // Given user context, better check all orders with potential issues.

    const orders = await orderModel.find({}).cursor();

    let count = 0;
    let updated = 0;

    for await (const order of orders) {
        count++;
        if (count % 100 === 0) console.log(`Processed ${count} orders...`);

        // Calculate real paidAmountVes from linked payments
        let realPaidVes = 0;

        // 1. From linked payments
        if (order.payments && order.payments.length > 0) {
            const payments = await paymentModel.find({ _id: { $in: order.payments } });
            for (const p of payments) {
                // Use the allocation amount for this order if detailed, otherwise fallback to payment total if 1:1
                // Simplification: In 'link-payments' migration logic, full payment amount was added if allocated.
                // But wait, payments might be 'mixed' or allocated to multiple orders?
                // 'link-payments' migration handled allocations.
                // Here we just want the VES amount.
                // The Payment schema has 'amountVes'.

                // If payment has allocations, check specific allocation for this order
                if (p.allocations && p.allocations.length > 0) {
                    const allocation = p.allocations.find(a => a.documentId.toString() === order._id.toString());
                    if (allocation) {
                        // Allocation is in USD usually? Payment schema needs check.
                        // Assuming allocation matches the payment currency proportion.
                        // If payment is purely in VES, allocations are in VES equivalent? 
                        // Usually system stores amounts in base currency (USD).

                        // Let's look at order.paymentRecords (legacy) too, because link-payments DID NOT TOUCH IT?
                        // Wait, link-payments reset 'payments' array.

                        // Safe bet: Recalculate based on 'payments' array which is the source of truth now.
                        // If payment is in VES, add amountVes.
                        // If payment is in USD, amountVes = amount * exchangeRate.

                        if (p.currency === 'VES') {
                            // How much of this payment was for THIS order?
                            // ratio = allocation.amount / p.amount
                            const ratio = p.amount > 0 ? (allocation.amount / p.amount) : 0;
                            realPaidVes += (p.amountVes || 0) * ratio;
                        } else {
                            // USD payment.
                            // amountVes = amount * rate
                            const ratio = p.amount > 0 ? (allocation.amount / p.amount) : 0;
                            const vesVal = (p.amountVes || (p.amount * (p.exchangeRate || 0)));
                            realPaidVes += vesVal * ratio; // Approximate
                        }
                    }
                } else {
                    // Direct link (Legacy or simple)
                    realPaidVes += (p.amountVes || 0);
                }
            }
        }

        // 2. From embedded paymentRecords (Older/Client-side logic often pushes here)
        // The previous migration MIGHT have ignored these if they were not converted to Payment Documents.
        // BUT the 'link-payment' migration purely looked at Payment Documents.
        // If we only rely on Payment Documents, we might miss things?
        // No, 'link-payments' reset 'paidAmount'. So 'paidAmount' now strictly reflects 'payments' array.
        // So 'paidAmountVes' MUST also reflect 'payments' array to be consistent.

        // Correction:
        // If paidAmountVes in DB is HUGE (e.g. 4000) and paidAmount is 0,
        // and we calculate realPaidVes = 0 (because no payments linked),
        // then updating to 0 IS CORRECT.

        // Fix logic: Just sum amountVes of linked payments.

        // Logic refinement for 'Payment' schema:
        // If it has 'amountVes', use it.

        // Re-fetching linked payments efficiently?
        // Doing it one by one is slow but safer.

        if (Math.abs(order.paidAmountVes - realPaidVes) > 0.01) {
            // Only update if differ significantly
            // BUT wait, is 'realPaidVes' calculation robust?
            // If I set it to 0, will it break valid VES payments?
            // Only if 'payments' array is empty but 'paidAmount' > 0 (impossible after reset).
            // If 'payments' has items, we sum them.

            // Let's rely on the ratio of USD paid.
            // paidAmountVes should roughly be: paidAmount * (weighted average rate).
            // Or simpler: If paidAmount is 0, paidAmountVes MUST be 0.

            if (order.paidAmount === 0 && order.paidAmountVes > 0) {
                console.log(`Fixing Order ${order.orderNumber}: Paid USD=0, Paid VES=${order.paidAmountVes} -> Setting VES to 0`);
                await orderModel.updateOne({ _id: order._id }, { $set: { paidAmountVes: 0 } });
                updated++;
            } else if (order.paidAmount > 0 && Math.abs(order.paidAmountVes - realPaidVes) > 1.0) {
                console.log(`Fixing Order ${order.orderNumber}: DB VES=${order.paidAmountVes}, Calc VES=${realPaidVes}`);
                await orderModel.updateOne({ _id: order._id }, { $set: { paidAmountVes: realPaidVes } });
                updated++;
            }
        }
    }

    console.log(`✅ Completed. Updated ${updated} orders.`);
    await app.close();
    process.exit(0);
}

run();
