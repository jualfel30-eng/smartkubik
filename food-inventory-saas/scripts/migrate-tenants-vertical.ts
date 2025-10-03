import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from '../src/schemas/tenant.schema';
import { getDefaultModulesForVertical } from '../src/config/vertical-features.config';

/**
 * Migration Script: Add vertical and enabledModules to existing tenants
 *
 * This script migrates existing tenants by:
 * 1. Detecting their business type
 * 2. Assigning appropriate vertical based on business type
 * 3. Setting default enabledModules for that vertical
 *
 * Usage:
 *   npm run build
 *   node dist/scripts/migrate-tenants-vertical.js
 *
 * Or with ts-node:
 *   npx ts-node scripts/migrate-tenants-vertical.ts
 */

async function migrateTenants() {
  console.log('🚀 Starting tenant migration...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const tenantModel = app.get<Model<TenantDocument>>(getModelToken(Tenant.name));

  try {
    // Find all tenants that don't have vertical or enabledModules
    const tenantsToMigrate = await tenantModel.find({
      $or: [
        { vertical: { $exists: false } },
        { enabledModules: { $exists: false } },
      ],
    }).exec();

    console.log(`\n📊 Found ${tenantsToMigrate.length} tenants to migrate`);

    if (tenantsToMigrate.length === 0) {
      console.log('✅ All tenants are already migrated!');
      await app.close();
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const tenant of tenantsToMigrate) {
      console.log(`\n🔄 Processing tenant: ${tenant.code} (${tenant.name})`);

      // Determine vertical based on businessType
      let vertical = 'FOOD_SERVICE'; // default

      if (tenant.businessType) {
        const businessType = tenant.businessType.toLowerCase();

        // Map business types to verticals
        if (businessType.includes('restaurante') ||
            businessType.includes('cafetería') ||
            businessType.includes('bar') ||
            businessType.includes('comida')) {
          vertical = 'FOOD_SERVICE';
        } else if (businessType.includes('retail') ||
                   businessType.includes('tienda') ||
                   businessType.includes('comercio') ||
                   businessType.includes('venta')) {
          vertical = 'RETAIL';
        } else if (businessType.includes('servicio') ||
                   businessType.includes('consultoría') ||
                   businessType.includes('spa') ||
                   businessType.includes('salón')) {
          vertical = 'SERVICES';
        } else if (businessType.includes('logística') ||
                   businessType.includes('transporte') ||
                   businessType.includes('envío') ||
                   businessType.includes('distribución')) {
          vertical = 'LOGISTICS';
        }
      }

      console.log(`  📌 Business Type: ${tenant.businessType || 'N/A'}`);
      console.log(`  🎯 Assigned Vertical: ${vertical}`);

      // Get default modules for the vertical
      const enabledModules = getDefaultModulesForVertical(vertical);

      console.log(`  📦 Enabled Modules:`);
      Object.entries(enabledModules).forEach(([module, enabled]) => {
        if (enabled) {
          console.log(`     ✓ ${module}`);
        }
      });

      try {
        // Update tenant
        await tenantModel.updateOne(
          { _id: tenant._id },
          {
            $set: {
              vertical: vertical,
              enabledModules: enabledModules,
            },
          },
        );

        migratedCount++;
        console.log(`  ✅ Migration successful`);
      } catch (error) {
        skippedCount++;
        console.error(`  ❌ Migration failed: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${migratedCount}`);
    console.log(`❌ Skipped/Failed: ${skippedCount}`);
    console.log(`📊 Total processed: ${tenantsToMigrate.length}`);
    console.log('='.repeat(60));

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verificationResults = await tenantModel.find({
      vertical: { $exists: true },
      enabledModules: { $exists: true },
    }).exec();

    console.log(`✅ ${verificationResults.length} tenants now have vertical and enabledModules`);

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run migration
migrateTenants()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
