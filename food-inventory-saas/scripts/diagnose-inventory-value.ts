// @ts-nocheck
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
import mongoose from 'mongoose';
import { InventorySchema } from '../src/schemas/inventory.schema';
import { TenantSchema } from '../src/schemas/tenant.schema';
import { ProductSchema } from '../src/schemas/product.schema';

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food-inventory';
    // Mask password just in case
    console.log('Connecting to DB...');

    try {
        await mongoose.connect(uri);
        console.log('Connected!');

        const Inventory = mongoose.model('Inventory', InventorySchema);
        const Tenant = mongoose.model('Tenant', TenantSchema);
        const Product = mongoose.model('Product', ProductSchema);

        // 1. Find Tenant "Tiendas Broas"
        const tenant = await Tenant.findOne({ name: /Broas/i });

        if (!tenant) {
            console.error("Could not find tenant 'Tiendas Broas'");
            await mongoose.disconnect();
            return;
        }

        console.log(`Found tenant: ${tenant.name} (${tenant._id})`);
        const tenantObjectId = tenant._id;

        // 2. Run Aggregation
        // NOTE: We are using preserveNullAndEmptyArrays: FALSE to filter out orphans (The Fix)
        const aggregation = [
            {
                $match: {
                    tenantId: tenantObjectId,
                    isActive: true, // Only active inventory
                    totalQuantity: { $gt: 0 },
                },
            },
            {
                $addFields: {
                    productIdAsObjectId: {
                        $cond: {
                            if: { $eq: [{ $type: "$productId" }, "string"] },
                            then: { $toObjectId: "$productId" },
                            else: "$productId"
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "productIdAsObjectId",
                    foreignField: "_id",
                    as: "productInfo",
                },
            },
            {
                $unwind: {
                    path: "$productInfo",
                    preserveNullAndEmptyArrays: false, // <--- THE FIX: Exclude if product not found
                },
            },
            {
                $addFields: {
                    matchedVariant: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: ["$variantSku", null] },
                                    { $isArray: "$productInfo.variants" }
                                ]
                            },
                            then: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: "$productInfo.variants",
                                            as: "variant",
                                            cond: { $eq: ["$$variant.sku", "$variantSku"] }
                                        }
                                    },
                                    0
                                ]
                            },
                            else: {
                                $arrayElemAt: ["$productInfo.variants", 0]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    costPrice: {
                        $cond: {
                            if: { $gt: [{ $toDouble: "$averageCostPrice" }, 0] },
                            then: { $toDouble: "$averageCostPrice" },
                            else: { $ifNull: ["$matchedVariant.costPrice", 0] }
                        }
                    },
                    basePrice: {
                        $ifNull: ["$matchedVariant.basePrice", 0],
                    },
                },
            },
            {
                $project: {
                    productId: 1,
                    variantSku: 1,
                    totalQuantity: 1,
                    costPrice: 1,
                    basePrice: 1,
                    productName: "$productInfo.name",
                    costValue: { $multiply: ["$totalQuantity", "$costPrice"] },
                    retailValue: { $multiply: ["$totalQuantity", "$basePrice"] },
                    difference: {
                        $subtract: [
                            { $multiply: ["$totalQuantity", "$basePrice"] },
                            { $multiply: ["$totalQuantity", "$costPrice"] }
                        ]
                    }
                }
            },
            // Filter to see if any negative profit items REMAIN
            {
                $match: {
                    $or: [
                        { difference: { $lt: 0 } },
                        { basePrice: 0 }
                    ]
                }
            },
            { $sort: { difference: 1 } },
            { $limit: 20 }
        ];

        console.log("Running detailed aggregation check with FIX applied...");
        const results = await Inventory.aggregate(aggregation);

        if (results.length === 0) {
            console.log("✅ SUCCESS: No problematic inventory items found with the fix applied.");
        } else {
            console.log(`⚠️  WARNING: Found ${results.length} problematic items even with fix:`);
            results.forEach(item => {
                console.log(`- ${item.productName} (${item.variantSku}): Cost $${item.costPrice} | Retail $${item.basePrice} | Profit $${item.difference.toFixed(2)}`);
            });
        }

        // 3. Run Summary Aggregation to get final totals
        const summaryAggregation = [
            {
                $match: {
                    tenantId: tenantObjectId,
                    isActive: true,
                    totalQuantity: { $gt: 0 },
                },
            },
            {
                $addFields: {
                    productIdAsObjectId: {
                        $cond: {
                            if: { $eq: [{ $type: "$productId" }, "string"] },
                            then: { $toObjectId: "$productId" },
                            else: "$productId"
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "productIdAsObjectId",
                    foreignField: "_id",
                    as: "productInfo",
                },
            },
            {
                $unwind: {
                    path: "$productInfo",
                    preserveNullAndEmptyArrays: false, // <--- THE FIX
                },
            },
            {
                $addFields: {
                    matchedVariant: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: ["$variantSku", null] },
                                    { $isArray: "$productInfo.variants" }
                                ]
                            },
                            then: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: "$productInfo.variants",
                                            as: "variant",
                                            cond: { $eq: ["$$variant.sku", "$variantSku"] }
                                        }
                                    },
                                    0
                                ]
                            },
                            else: {
                                $arrayElemAt: ["$productInfo.variants", 0]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    costPrice: {
                        $cond: {
                            if: { $gt: [{ $toDouble: "$averageCostPrice" }, 0] },
                            then: { $toDouble: "$averageCostPrice" },
                            else: { $ifNull: ["$matchedVariant.costPrice", 0] }
                        }
                    },
                    basePrice: {
                        $ifNull: ["$matchedVariant.basePrice", 0],
                    },
                },
            },
            {
                $project: {
                    totalQuantity: 1,
                    costPrice: 1,
                    basePrice: 1,
                    costValue: { $multiply: ["$totalQuantity", "$costPrice"] },
                    retailValue: { $multiply: ["$totalQuantity", "$basePrice"] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalCostValue: { $sum: "$costValue" },
                    totalRetailValue: { $sum: "$retailValue" },
                    totalItems: { $sum: "$totalQuantity" },
                },
            },
        ];

        console.log("\nRunning summary aggregation with FIX applied...");
        const summary = await Inventory.aggregate(summaryAggregation);

        if (summary.length > 0) {
            const s = summary[0];
            const profit = s.totalRetailValue - s.totalCostValue;
            console.log("-----------------------------------------");
            console.log("FINAL INVENTORY SUMMARY (Predicted Dashboard):");
            console.log(`Total Items: ${s.totalItems.toLocaleString()}`);
            console.log(`Total Cost Value:   $${s.totalCostValue.toFixed(2)}`);
            console.log(`Total Retail Value: $${s.totalRetailValue.toFixed(2)}`);
            console.log(`Potential Profit:   $${profit.toFixed(2)}`);
            console.log("-----------------------------------------");

            if (profit > 0) {
                console.log("✅ RESULT: Profit is now POSITIVE.");
            } else {
                console.log("❌ RESULT: Profit is still NEGATIVE.");
            }
        } else {
            console.log("No inventory found.");
        }

    } catch (error) {
        console.error("Script Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
