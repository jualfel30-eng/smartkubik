
/**
 * Verification Script for Pricing Formula
 * 
 * Usage: npx ts-node scripts/verify_pricing_math.ts
 */

const testCases = [
    {
        costPriceUSD: 100,
        parallelRate: 40,
        bcvRate: 30,
        margin: 0.30, // 30%
        expectedDesc: "Cost $100, Margin 30%, Par 40, BCV 30"
    },
    {
        costPriceUSD: 50,
        parallelRate: 40,
        bcvRate: 35,
        margin: 0.10, // 10%
        expectedDesc: "Cost $10, Margin 10%, Par 40, BCV 35"
    },
    {
        // User's Example
        costPriceUSD: 11,
        parallelRate: 700,
        bcvRate: 320,
        margin: 0.30, // 30%
        expectedDesc: "Almonds: Cost $11, Margin 30%, Par 700, BCV 320. Expected ~$31.20 (Official USD)"
    }
];

function calculateOldLogic(cost: number, bcv: number, parallel: number, margin: number) {
    // Old Logic as per my analysis of the code (simplified reconstruction)
    // const estimatedCostUSD = costPrice / bcvRate;
    // const targetSellingPriceBs = estimatedCostUSD * (1 + targetMargin) * parallelRate;

    // IF inputs are Cost=VES (which was the old assumption typically)
    // Let's assume input cost is treated as VES in old logic
    const estimatedCostUSD = cost / bcv;
    const targetSellingPriceBs = estimatedCostUSD * (1 + margin) * parallel;
    return Math.ceil(targetSellingPriceBs);
}

function calculateNewLogic(costUSD: number, bcv: number, parallel: number, margin: number) {
    // New Formula:
    // Price of cost = (Price of cost in $) X ($ paralelo) / ($ del BCV)
    // + Margin

    const adjustedCostUSD = costUSD * (parallel / bcv);
    const targetPriceUSD = adjustedCostUSD * (1 + margin);
    const finalPriceVES = targetPriceUSD * bcv;

    // Simplified: costUSD * (parallel / bcv) * (1 + margin) * bcv
    // = costUSD * parallel * (1 + margin)

    return Math.ceil(finalPriceVES);
}

console.log("--- Pricing Formula Verification ---");

testCases.forEach((tc, index) => {
    console.log(`\nTest Case ${index + 1}: ${tc.expectedDesc}`);

    const oldRes = calculateOldLogic(tc.costPriceUSD * tc.bcvRate, tc.bcvRate, tc.parallelRate, tc.margin);
    // Note: For old logic, we simulated passing VES cost to compare apples to apples if we assumed input was VES

    const newRes = calculateNewLogic(tc.costPriceUSD, tc.bcvRate, tc.parallelRate, tc.margin);

    console.log(`  Inputs: Cost=$${tc.costPriceUSD}, Par=${tc.parallelRate}, BCV=${tc.bcvRate}, Margin=${tc.margin * 100}%`);
    console.log(`  New Formula Result (VES): ${newRes}`);
    console.log(`  (Math Check: ${tc.costPriceUSD} * ${tc.parallelRate} * 1.3 = ${tc.costPriceUSD * tc.parallelRate * (1 + tc.margin)})`);
});
