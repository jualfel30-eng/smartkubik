const { MongoClient } = require('mongodb');
require('dotenv').config();

/**
 * MIGRATION SCRIPT: Sync Customer Tiers
 *
 * Problem: loyalty.tier and tier fields were out of sync
 * - loyalty.tier had values (diamante, oro, plata, bronce)
 * - tier (root field) only had "bronce" or "standard"
 * - Marketing filters search tier (root), not loyalty.tier
 *
 * Solution: Copy loyalty.tier → tier for all customers
 *
 * This ensures:
 * 1. Marketing audience filters work correctly
 * 2. Both fields stay in sync going forward
 */

async function syncCustomerTiers() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('test');
    const customersCollection = db.collection('customers');

    // Step 1: Find customers where loyalty.tier exists but differs from tier
    console.log('\n🔍 Finding customers with mismatched tiers...');

    const mismatchedCustomers = await customersCollection.find({
      'loyalty.tier': { $exists: true },
      $expr: {
        $ne: ['$tier', '$loyalty.tier']
      }
    }).toArray();

    console.log(`Found ${mismatchedCustomers.length} customers with mismatched tiers`);

    if (mismatchedCustomers.length === 0) {
      console.log('✅ All tiers are already in sync. Nothing to do.');
      return;
    }

    // Step 2: Show sample of what will be updated
    console.log('\n📋 Sample of updates (first 5):');
    mismatchedCustomers.slice(0, 5).forEach(customer => {
      console.log(`  - ${customer.name}: tier="${customer.tier}" → "${customer.loyalty.tier}"`);
    });

    // Step 3: Update all mismatched customers
    console.log('\n🔄 Syncing tiers...');

    const updatePromises = mismatchedCustomers.map(customer =>
      customersCollection.updateOne(
        { _id: customer._id },
        {
          $set: {
            tier: customer.loyalty.tier
          }
        }
      )
    );

    const results = await Promise.all(updatePromises);
    const modifiedCount = results.reduce((sum, result) => sum + result.modifiedCount, 0);

    console.log(`✅ Updated ${modifiedCount} customers`);

    // Step 4: Verify the fix
    console.log('\n🔍 Verifying tier distribution after sync...');

    const tierCounts = await customersCollection.aggregate([
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('\n📊 Tier distribution:');
    tierCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id || '(null/undefined)'}: ${count} customers`);
    });

    // Step 5: Test marketing filters
    console.log('\n🧪 Testing marketing filters:');
    const tiersToTest = ['diamante', 'oro', 'plata', 'bronce'];

    for (const tierValue of tiersToTest) {
      const count = await customersCollection.countDocuments({ tier: tierValue });
      console.log(`  tier="${tierValue}": ${count} customers`);
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

// Run the migration
syncCustomerTiers()
  .then(() => {
    console.log('\n🎉 All done! Marketing tier filters should now work correctly.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
