// food-inventory-saas/scripts/direct-fix-tenant.js

// This script directly updates the database to fix a user's tenantId using mongoose.
// It should be used when a user is incorrectly assigned to a tenant.

// IMPORTANT: Ensure MONGODB_URI is set in your .env file.
require('dotenv').config({ path: './.env' });

const mongoose = require('mongoose');

// --- CONFIGURATION ---
// Values are now passed as command-line arguments
// -------------------- 

// Define minimal schemas to interact with the collections
const TenantSchema = new mongoose.Schema({
  name: String,
  // code: String, // Deprecated
});
const UserSchema = new mongoose.Schema({
  email: String,
  tenantId: mongoose.Schema.Types.ObjectId,
});

const Tenant = mongoose.model('Tenant', TenantSchema, 'tenants');
const User = mongoose.model('User', UserSchema, 'users');

async function fixUserTenant(userEmail, targetTenantId) {
  if (!userEmail || !targetTenantId) {
    console.error('FATAL ERROR: Missing arguments.');
    console.log('Usage: node scripts/direct-fix-tenant.js <user_email> <target_tenant_id>');
    console.log('Example: node scripts/direct-fix-tenant.js user@example.com 60d21b4667d0d8992e610c85');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('FATAL ERROR: MONGODB_URI is not defined in your .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB via Mongoose.');

    // 1. Find the target tenant
    console.log(`\n1. Searching for tenant with ID: "${targetTenantId}"...`);
    let tenant;
    try {
        tenant = await Tenant.findById(targetTenantId);
    } catch(e) {
        console.error(`\n❌ ERROR: The provided tenant ID "${targetTenantId}" is not a valid ObjectId.`);
        return;
    }

    if (!tenant) {
      console.error(`\n❌ ERROR: Tenant with ID "${targetTenantId}" not found.`);
      console.error('   Please verify the tenant ID is correct.');
      return;
    }

    const correctTenantId = tenant._id;
    console.log(`   Found tenant: "${tenant.name}" with ID: ${correctTenantId}`);

    // 2. Find the user and check their current tenantId
    console.log(`\n2. Searching for user with email: "${userEmail}"...`);
    const user = await User.findOne({ email: userEmail });

    if (!user) {
        console.error(`\n❌ ERROR: User with email "${userEmail}" not found.`);
        return;
    }

    console.log(`   Found user. Current tenantId: ${user.tenantId}`);

    if (user.tenantId && user.tenantId.toString() === correctTenantId.toString()) {
        console.log('\n✅ SUCCESS: User is already assigned to the correct tenant. No update needed.');
        return;
    }

    // 3. Update the user with the correct tenantId
    console.log(`\n3. Updating user's tenantId to: ${correctTenantId}...`);
    
    const result = await User.updateOne(
      { _id: user._id },
      { $set: { tenantId: correctTenantId } }
    );

    if (result.modifiedCount > 0) {
      console.log('\n✅ SUCCESS: User tenantId updated successfully.');
      console.log(`   The user is now correctly associated with the tenant "${tenant.name}".`);
    } else {
      console.log('\n⚠️ WARNING: User was not updated. This could be because the tenantId was already correct or another issue occurred.');
    }

  } catch (error) {
    console.error('\n❌ An unexpected error occurred:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB.');
  }
}

const userEmailArg = process.argv[2];
const tenantIdArg = process.argv[3];

fixUserTenant(userEmailArg, tenantIdArg);