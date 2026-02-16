import 'dotenv/config';
import mongoose from 'mongoose';

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food-inventory?tls=false';
    await mongoose.connect(uri);
    console.log('Connected to DB...');

    // 1. Get the target closing (the one with the issue: CIE-2026-0007)
    const closing = await mongoose.connection.collection('cashregisterclosings').findOne({ closingNumber: 'CIE-2026-0007' });
    if (!closing) {
        // Fallback to last
        console.log('Target closing CIE-2026-0007 not found, finding last...');
        const last = await mongoose.connection.collection('cashregisterclosings').find({}).sort({ periodEnd: -1 }).limit(1).next();
        if (!last) { console.log('No closing found'); process.exit(0); }
        console.log('Using last closing:', last.closingNumber);
    } else {
        console.log('Repairing target closing:', closing.closingNumber);
    }

    const targetClosing = closing || (await mongoose.connection.collection('cashregisterclosings').find({}).sort({ periodEnd: -1 }).limit(1).next());

    if (!targetClosing) {
        console.log('No target closing found to repair.');
        process.exit(1);
    }


    // 2. Get Session
    const session = await mongoose.connection.collection('cashregistersessions').findOne({ _id: targetClosing.sessionId });
    if (!session) { console.log('Session not found'); process.exit(1); }

    // 3. Get Orders
    const orders = await mongoose.connection.collection('orders').find({
        cashSessionId: targetClosing.sessionId,
        status: { $nin: ['draft', 'cancelled'] }
    }).toArray();

    // --- RECALCULATE TOTALS ---
    let cashReceivedUsd = 0;
    let cashReceivedVes = 0;
    let changeGivenUsd = 0;
    let changeGivenVes = 0;
    let totalTransactions = orders.length;
    let totalGrossSalesUsd = 0;
    let totalGrossSalesVes = 0;

    for (const order of orders) {
        totalGrossSalesUsd += (order.totalAmount || 0);
        totalGrossSalesVes += (order.totalAmountVes || 0);

        if (order.paymentRecords) {
            for (const p of order.paymentRecords) {
                const method = (p.method || '').toLowerCase();
                const isCash = method.includes('efectivo') || method.includes('cash');
                const currency = p.currency || 'USD';

                if (isCash) {
                    // Tendered
                    const tendered = (p.amountTendered !== undefined && p.amountTendered !== null) ? p.amountTendered : (p.amountVes || p.amount || 0);
                    if (currency === 'USD') cashReceivedUsd += tendered;
                    else cashReceivedVes += tendered;

                    // Change
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

    // --- RECALCULATE MOVEMENTS ---
    const movements = session.cashMovements || [];
    const cashInUsd = movements.filter(m => m.type === 'in' && m.currency === 'USD').reduce((s, m) => s + m.amount, 0);
    const cashInVes = movements.filter(m => m.type === 'in' && m.currency === 'VES').reduce((s, m) => s + m.amount, 0);
    const cashOutUsd = movements.filter(m => m.type === 'out' && m.currency === 'USD').reduce((s, m) => s + m.amount, 0);
    const cashOutVes = movements.filter(m => m.type === 'out' && m.currency === 'VES').reduce((s, m) => s + m.amount, 0);

    // --- RECALCULATE EXPECTED ---
    // Expected = Opening + CashReceived + CashIn - CashOut - ChangeGiven
    const openingUsd = session.openingAmountUsd || 0;
    const openingVes = session.openingAmountVes || 0;

    // Note: CashReceived here is TENDERED (Gross Cash In hand before change)
    const expectedUsd = openingUsd + cashReceivedUsd + cashInUsd - cashOutUsd - changeGivenUsd;
    const expectedVes = openingVes + cashReceivedVes + cashInVes - cashOutVes - changeGivenVes;

    // --- RECALCULATE DIFFERENCES ---
    const declaredUsd = targetClosing.closingFundUsd || targetClosing.closingAmountUsd || 0;
    const declaredVes = targetClosing.closingFundVes || targetClosing.closingAmountVes || 0;

    const diffUsd = declaredUsd - expectedUsd;
    const diffVes = declaredVes - expectedVes;

    console.log('--- RECALCULATION RESULTS ---');
    console.log(`Transactions: ${totalTransactions}`);
    console.log(`Gross Sales: $${totalGrossSalesUsd} / Bs${totalGrossSalesVes}`);
    console.log(`Cash Received (Tendered): $${cashReceivedUsd} / Bs${cashReceivedVes}`);
    console.log(`Change Given: $${changeGivenUsd} / Bs${changeGivenVes}`);
    console.log(`Movements In: $${cashInUsd} / Bs${cashInVes}`);
    console.log(`Movements Out: $${cashOutUsd} / Bs${cashOutVes}`);
    console.log(`Opening: $${openingUsd} / Bs${openingVes}`);
    console.log('-----------------------------');
    console.log(`Expected: $${expectedUsd} / Bs${expectedVes}`);
    console.log(`Declared: $${declaredUsd} / Bs${declaredVes}`);
    console.log(`Difference: $${diffUsd} / Bs${diffVes}`);

    // --- UPDATE ---
    await mongoose.connection.collection('cashregisterclosings').updateOne(
        { _id: targetClosing._id },
        {
            $set: {
                totalTransactions,
                totalGrossSalesUsd,
                totalGrossSalesVes,
                cashReceivedUsd,
                cashReceivedVes,
                changeGiven: [
                    { currency: 'USD', totalChangeGiven: changeGivenUsd, transactionCount: 0 },
                    { currency: 'VES', totalChangeGiven: changeGivenVes, transactionCount: 0 }
                ],
                cashDifferences: [
                    {
                        currency: 'USD',
                        expectedAmount: expectedUsd,
                        declaredAmount: declaredUsd,
                        difference: diffUsd,
                        status: Math.abs(diffUsd) < 0.01 ? 'balanced' : diffUsd > 0 ? 'surplus' : 'shortage'
                    },
                    {
                        currency: 'VES',
                        expectedAmount: expectedVes,
                        declaredAmount: declaredVes,
                        difference: diffVes,
                        status: Math.abs(diffVes) < 1 ? 'balanced' : diffVes > 0 ? 'surplus' : 'shortage'
                    }
                ],
                hasDifferences: (Math.abs(diffUsd) > 0.01 || Math.abs(diffVes) > 1),
                repairedAt: new Date(),
                repairedBy: 'admin-script'
            }
        }
    );

    console.log('Closing fully repaired.');
    await mongoose.disconnect();
}
run();
