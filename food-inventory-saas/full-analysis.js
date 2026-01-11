require('dotenv').config();
const mongoose = require('mongoose');

async function analyze() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const tenantId = new mongoose.Types.ObjectId("68d371dffdb57e5c800f2fcd");
    
    console.log('=== FULL ANALYSIS OF INVENTORY DATA ISSUES ===\n');
    
    // Get all active inventory
    const inventories = await db.collection('inventories').find({ 
      tenantId: tenantId,
      isActive: true,
      totalQuantity: { $gt: 0 }
    }).toArray();
    
    console.log('Total active inventory items: ' + inventories.length + '\n');
    
    // Analyze data type issues
    let productIdString = 0;
    let productIdObjectId = 0;
    let tenantIdString = 0;
    let tenantIdObjectId = 0;
    let productNotFound = 0;
    let variantNotFound = 0;
    let zeroBasePrice = 0;
    
    const issues = [];
    
    for (const inv of inventories) {
      const issue = {
        name: inv.productName,
        qty: inv.totalQuantity,
        cost: inv.averageCostPrice,
        problems: []
      };
      
      // Check productId type
      if (typeof inv.productId === 'string') {
        productIdString++;
        issue.problems.push('productId is STRING');
      } else if (inv.productId instanceof mongoose.Types.ObjectId) {
        productIdObjectId++;
      }
      
      // Check tenantId type
      if (typeof inv.tenantId === 'string') {
        tenantIdString++;
        issue.problems.push('tenantId is STRING');
      } else if (inv.tenantId instanceof mongoose.Types.ObjectId) {
        tenantIdObjectId++;
      }
      
      // Try to find product
      const productIdObj = typeof inv.productId === 'string' 
        ? new mongoose.Types.ObjectId(inv.productId) 
        : inv.productId;
        
      const product = await db.collection('products').findOne({ _id: productIdObj });
      
      if (!product) {
        productNotFound++;
        issue.problems.push('PRODUCT NOT FOUND');
        issue.totalCost = inv.totalQuantity * inv.averageCostPrice;
        issue.totalRetail = 0;
        issues.push(issue);
        continue;
      }
      
      // Check if variant exists
      if (!product.variants || product.variants.length === 0) {
        variantNotFound++;
        issue.problems.push('NO VARIANTS in product');
        issue.totalCost = inv.totalQuantity * inv.averageCostPrice;
        issue.totalRetail = 0;
        issues.push(issue);
        continue;
      }
      
      // Try to find matching variant
      const variant = product.variants.find(v => v.sku === inv.variantSku);
      
      if (!variant) {
        variantNotFound++;
        issue.problems.push('VARIANT SKU MISMATCH');
        issue.invSku = inv.variantSku;
        issue.productSkus = product.variants.map(v => v.sku);
        issue.totalCost = inv.totalQuantity * inv.averageCostPrice;
        issue.totalRetail = 0;
        issues.push(issue);
        continue;
      }
      
      // Check if basePrice is zero
      if (!variant.basePrice || variant.basePrice === 0) {
        zeroBasePrice++;
        issue.problems.push('ZERO BASE PRICE in variant');
        issue.variantCost = variant.costPrice;
        issue.variantBase = variant.basePrice;
        issue.totalCost = inv.totalQuantity * (variant.costPrice || inv.averageCostPrice);
        issue.totalRetail = 0;
        issues.push(issue);
      }
    }
    
    console.log('=== DATA TYPE ISSUES ===');
    console.log('productId as String: ' + productIdString);
    console.log('productId as ObjectId: ' + productIdObjectId);
    console.log('tenantId as String: ' + tenantIdString);
    console.log('tenantId as ObjectId: ' + tenantIdObjectId);
    console.log('');
    
    console.log('=== DATA INTEGRITY ISSUES ===');
    console.log('Products not found: ' + productNotFound);
    console.log('Variants not found/mismatch: ' + variantNotFound);
    console.log('Zero base price: ' + zeroBasePrice);
    console.log('');
    
    console.log('=== ITEMS WITH PROBLEMS (sorted by cost impact) ===\n');
    
    issues.sort((a, b) => b.totalCost - a.totalCost);
    
    let totalLostRetail = 0;
    let totalLostCost = 0;
    
    issues.forEach((item, i) => {
      if (i < 20) {
        console.log((i + 1) + '. ' + item.name);
        console.log('   Qty: ' + item.qty + ', Cost: $' + item.cost);
        console.log('   Problems: ' + item.problems.join(', '));
        if (item.invSku) {
          console.log('   Inv SKU: ' + item.invSku);
          console.log('   Product SKUs: ' + item.productSkus.join(', '));
        }
        if (item.variantCost !== undefined) {
          console.log('   Variant cost: $' + item.variantCost + ', base: $' + item.variantBase);
        }
        console.log('   Lost retail value: $' + item.totalCost.toFixed(2));
        console.log('');
      }
      totalLostRetail += item.totalCost;
      totalLostCost += item.totalCost;
    });
    
    console.log('TOTAL LOST RETAIL VALUE: $' + totalLostRetail.toFixed(2));
    console.log('(This is the cost of inventory without proper retail prices)');
    console.log('');
    console.log('Items with problems: ' + issues.length + ' out of ' + inventories.length);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyze();
