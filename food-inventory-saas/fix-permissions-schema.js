const { MongoClient } = require('mongodb');

async function fixPermissionsSchema() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();

    console.log('\n🔧 Fixing Permission Schema - Adding "module" field\n');

    // Mapping from permission name to module
    const permissionModuleMapping = {
      // Restaurant
      'restaurant_read': 'restaurant',
      'restaurant_write': 'restaurant',

      // Chat/Communication
      'chat_read': 'communication',
      'chat_write': 'communication',

      // Marketing
      'marketing_read': 'marketing',
      'marketing_write': 'marketing',

      // Payroll
      'payroll_employees_read': 'payroll',
      'payroll_employees_write': 'payroll',

      // Add more as needed based on your permissions
      'users_create': 'users',
      'users_read': 'users',
      'users_update': 'users',
      'users_delete': 'users',

      'roles_create': 'roles',
      'roles_read': 'roles',
      'roles_update': 'roles',
      'roles_delete': 'roles',

      'customers_create': 'customers',
      'customers_read': 'customers',
      'customers_update': 'customers',
      'customers_delete': 'customers',

      'dashboard_read': 'dashboard',

      'events_create': 'events',
      'events_read': 'events',
      'events_update': 'events',
      'events_delete': 'events',

      'inventory_create': 'inventory',
      'inventory_read': 'inventory',
      'inventory_update': 'inventory',
      'inventory_delete': 'inventory',
      'inventory_write': 'inventory',

      'orders_create': 'orders',
      'orders_read': 'orders',
      'orders_update': 'orders',
      'orders_write': 'orders',
      'orders_apply_discounts': 'orders',

      'payables_create': 'payables',
      'payables_read': 'payables',
      'payables_update': 'payables',
      'payables_delete': 'payables',

      'pricing_calculate': 'pricing',

      'products_create': 'products',
      'products_read': 'products',
      'products_update': 'products',
      'products_delete': 'products',
      'products_write': 'products',

      'appointments_create': 'appointments',
      'appointments_read': 'appointments',
      'appointments_update': 'appointments',
      'appointments_delete': 'appointments',

      'services_create': 'services',
      'services_read': 'services',
      'services_update': 'services',
      'services_delete': 'services',

      'resources_create': 'resources',
      'resources_read': 'resources',
      'resources_update': 'resources',
      'resources_delete': 'resources',

      'storefront_create': 'storefront',
      'storefront_read': 'storefront',
      'storefront_update': 'storefront',
      'storefront_delete': 'storefront',

      'accounting_read': 'accounting',
      'accounting_write': 'accounting',

      'tenant_settings_read': 'tenant',

      'reports_read': 'reports',

      'billing_read': 'billing',

      'MANAGE_TENANTS': 'super-admin',
    };

    const permissions = await db.collection('permissions').find({}).toArray();

    console.log(`📊 Found ${permissions.length} permissions in database\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const permission of permissions) {
      // Check if it already has module field
      if (permission.module) {
        console.log(`⏭️  ${permission.name} already has module: ${permission.module}`);
        skippedCount++;
        continue;
      }

      // Get module from mapping or derive from category
      const module = permissionModuleMapping[permission.name] ||
                     permission.category ||
                     'other';

      // Update permission with module field
      await db.collection('permissions').updateOne(
        { _id: permission._id },
        {
          $set: {
            module: module,
            updatedAt: new Date()
          },
          $unset: { category: "" }  // Remove old category field
        }
      );

      console.log(`✅ Updated ${permission.name} → module: ${module}`);
      updatedCount++;
    }

    console.log(`\n✅ Schema fix completed!`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}\n`);

    // Verify the result
    console.log('📋 Verification - Marketing Permissions:');
    const marketingPerms = await db.collection('permissions').find({
      name: { $in: ['marketing_read', 'marketing_write'] }
    }).toArray();

    marketingPerms.forEach(p => {
      console.log(`   ${p.name}`);
      console.log(`      module: ${p.module || 'NOT SET ❌'}`);
      console.log(`      category: ${p.category || 'none (removed ✅)'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

fixPermissionsSchema();
