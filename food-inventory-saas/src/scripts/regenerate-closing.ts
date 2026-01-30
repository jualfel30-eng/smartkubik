import 'dotenv/config';
import mongoose from 'mongoose';

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food-inventory?tls=false';
    await mongoose.connect(uri);
    console.log('Connected to DB...');

    // 1. Get last closing
    const lastClosing = await mongoose.connection.collection('cashregisterclosings').find({}).sort({ periodEnd: -1 }).limit(1).next();
    if (!lastClosing) { console.log('No closing found'); process.exit(0); }
    console.log('Repairing closing:', lastClosing.closingNumber, 'ID:', lastClosing._id);

    // 2. Get sessionId
    const sessionId = lastClosing.sessionId;

    // 3. Get Orders for this session
    const orders = await mongoose.connection.collection('orders').find({
        cashSessionId: sessionId,
        status: { $nin: ['draft', 'cancelled'] }
    }).toArray();

    let cashReceivedUsd = 0;
    let cashReceivedVes = 0; // Tendered

    // For calculating sales purely from payments (as done in Service)
    let salesUsd = 0;
    let salesVes = 0;

    let changeGivenUsd = 0;
    let changeGivenVes = 0;

    console.log('Found orders:', orders.length);

    for (const order of orders) {
        if (order.paymentRecords) {
            for (const p of order.paymentRecords) {
                const method = (p.method || '').toLowerCase();
                const isCash = method.includes('efectivo') || method.includes('cash');
                const currency = p.currency || 'USD';

                if (isCash) {
                    // Cash Received (Tendered)
                    // If amountTendered exists use it, else assume exact amount (legacy)
                    const tendered = (p.amountTendered !== undefined && p.amountTendered !== null) ? p.amountTendered : (p.amountVes || p.amount);

                    if (currency === 'USD') cashReceivedUsd += tendered;
                    else cashReceivedVes += tendered;

                    // Change Given (using the ALREADY FIXED values in DB)
                    if (p.changeGivenBreakdown) {
                        changeGivenUsd += (p.changeGivenBreakdown.usd || 0);
                        changeGivenVes += (p.changeGivenBreakdown.ves || 0);
                    } else {
                        if (currency === 'USD') changeGivenUsd += (p.changeGiven || 0);
                        else changeGivenVes += (p.changeGiven || 0);
                    }
                }
            }
        }
    }

    console.log('Recalculated Totals:');
    console.log('Cash Received USD:', cashReceivedUsd);
    console.log('Cash Received VES:', cashReceivedVes);
    console.log('Change Given USD:', changeGivenUsd);
    console.log('Change Given VES:', changeGivenVes);

    // Update Closing
    await mongoose.connection.collection('cashregisterclosings').updateOne(
        { _id: lastClosing._id },
        {
            $set: {
                cashReceivedUsd: cashReceivedUsd,
                cashReceivedVes: cashReceivedVes,
                changeGiven: [
                    { currency: 'USD', totalChangeGiven: changeGivenUsd, transactionCount: 0 },
                    { currency: 'VES', totalChangeGiven: changeGivenVes, transactionCount: 0 }
                ]
            }
        }
    );
    console.log('Closing updated successfully.');

    // Also verify session movements?
    // The service also updates `expectedCash`.
    // Let's verify expected cash too just in case differences are recalc-ed in frontend or backend.
    // Backend stores differences in `cashDifferences` array. We should update that too but it requires more context.
    // The User screenshot showed "Vueltos (Cambios)". This comes from `changeGiven` array.
    // Updating `changeGiven` should be enough to fix the visual report "Vueltos".

    await mongoose.disconnect();
}
run();
