// food-inventory-saas/scripts/direct-fix-tenant.js

// This script directly updates the database to fix a user's tenantId using mongoose.
// It is intended for a one-time, emergency fix.

// IMPORTANT: Ensure MONGODB_URI is set in your .env file.
require('dotenv').config({ path: './.env' });

const mongoose = require('mongoose');

// --- CONFIGURATION ---
const USER_EMAIL_TO_FIX = 'admin@earlyadopter.com';
const TARGET_TENANT_CODE = 'EARLYADOPTER';
// ---------------------

// Define minimal schemas to interact with the collections
const TenantSchema = new mongoose.Schema({
  name: String,
  code: String,
});
const UserSchema = new mongoose.Schema({
  email: String,
  tenantId: mongoose.Schema.Types.ObjectId,
});

const Tenant = mongoose.model('Tenant', TenantSchema, 'tenants');
const User = mongoose.model('User', UserSchema, 'users');

async function fixUserTenant() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('FATAL ERROR: MONGODB_URI is not defined in your .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB via Mongoose.');

    // 1. Find the target tenant
    console.log(`\n1. Searching for tenant with code: "${TARGET_TENANT_CODE}"...`);
    const tenant = await Tenant.findOne({ code: TARGET_TENANT_CODE });

    if (!tenant) {
      console.error(`\n❌ ERROR: Tenant with code "${TARGET_TENANT_CODE}" not found.`);
      console.error('   Please verify the tenant code is correct.');
      return;
    }

    const correctTenantId = tenant._id;
    console.log(`   Found tenant: "${tenant.name}" with ID: ${correctTenantId}`);

    // 2. Find the user and check their current tenantId
    console.log(`\n2. Searching for user with email: "${USER_EMAIL_TO_FIX}"...`);
    const user = await User.findOne({ email: USER_EMAIL_TO_FIX });

    if (!user) {
        console.error(`\n❌ ERROR: User with email "${USER_EMAIL_TO_FIX}" not found.`);
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
      console.log('   The user is now correctly associated with the EARLYADOPTER tenant.');
      console.log('\n🔥 ACTION REQUIRED: Please log out, clear browser cache/data, and log back in to see the changes.');
    } else {
      console.log('\n⚠️ WARNING: User was not updated. This could be because the tenantId was already correct.');
    }

  } catch (error) {
    console.error('\n❌ An unexpected error occurred:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB.');
  }
}

fixUserTenant();
