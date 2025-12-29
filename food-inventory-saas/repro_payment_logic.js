
const simulatePaymentLogic = (payload) => {
    const p = payload;
    let usdAmount = p.amount;
    let vesAmount = p.amountVes;
    const rate = p.exchangeRate || 1;
    const isVes = (p.currency === 'VES' || p.currency === 'Bs');

    console.log(`Input: amount=${usdAmount}, amountVes=${vesAmount}, currency=${p.currency}, rate=${rate}, isVes=${isVes}`);

    if (isVes) {
        if (!vesAmount && usdAmount) {
            console.log('Case 1: No VES amount, assuming USD amount is meant to be VES');
            vesAmount = usdAmount;
            usdAmount = vesAmount / (rate > 0 ? rate : 1);
        } else if (vesAmount && usdAmount === vesAmount) {
            console.log('Case 2: VES amount present, but equal to USD amount (unlikely unless 1:1)');
            usdAmount = vesAmount / (rate > 0 ? rate : 1);
        } else {
            console.log('Case 3: All good, falling through');
        }
    } else {
        if (usdAmount && !vesAmount) {
            console.log('Case 4: USD payment, calculating VES');
            vesAmount = usdAmount * rate;
        }
    }

    console.log(`Output: usdAmount=${usdAmount}, vesAmount=${vesAmount}`);

    // Simulate total calculation
    const totalPaidUSD = (usdAmount || 0) + (p.igtf || 0);
    console.log(`Total Paid USD: ${totalPaidUSD}`);
    console.log('---');
};

console.log('--- Test Case 1: Paying 100 Bs (Rate 50) -> $2 USD ---');
// Frontend sends calculated values: amount = 100/50 = 2. amountVes = 100.
simulatePaymentLogic({
    amount: 2,
    amountVes: 100,
    currency: "VES",
    exchangeRate: 50
});

console.log('--- Test Case 2: Paying 5000 Bs (Rate 50) -> $100 USD ---');
// Frontend sends: amount = 5000/50 = 100. amountVes = 5000.
simulatePaymentLogic({
    amount: 100,
    amountVes: 5000,
    currency: "VES",
    exchangeRate: 50
});

console.log('--- Test Case 3: Frontend Bug/Weirdness? Sending only amount? ---');
simulatePaymentLogic({
    amount: 100,
    amountVes: undefined,
    currency: "VES",
    exchangeRate: 50
});

console.log('--- Test Case 4: Frontend sends same amount in both fields (bug)? ---');
simulatePaymentLogic({
    amount: 5000,
    amountVes: 5000,
    currency: "VES",
    exchangeRate: 50
});
