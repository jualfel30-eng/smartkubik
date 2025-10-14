
import { connect, disconnect, model, Types } from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { Organization, OrganizationSchema } from '../src/schemas/organization.schema';

async function diagnoseTenants() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  console.log(`[DIAGNOSE] Connecting to: ${MONGODB_URI}`);

  try {
    await connect(MONGODB_URI);
    console.log('[DIAGNOSE] DB Connection successful.');

    const TenantModel = model(Tenant.name, TenantSchema, 'tenants');
    const OrganizationModel = model(Organization.name, OrganizationSchema, 'organizations');

    console.log('\n--- Checking Tenant: earlyadopter ---');
    const earlyAdopterTenant = await TenantModel.findOne({ tenantCode: 'earlyadopter' });

    if (earlyAdopterTenant) {
      console.log('Found Tenant:', {
        id: earlyAdopterTenant._id,
        name: earlyAdopterTenant.name,
        tenantCode: earlyAdopterTenant.tenantCode,
        organizationId: earlyAdopterTenant.organizationId,
      });

      if (earlyAdopterTenant.organizationId) {
        const org = await OrganizationModel.findById(earlyAdopterTenant.organizationId);
        console.log('Found corresponding Organization:', org);
      } else {
        console.log('This tenant does NOT have an organizationId.');
      }
    } else {
      console.log('Tenant "earlyadopter" not found.');
    }

    console.log('\n--- Checking Tenant: Tiendas-Broas ---');
    const tiendasBroasTenant = await TenantModel.findOne({ tenantCode: 'Tiendas-Broas' });

    if (tiendasBroasTenant) {
      console.log('Found Tenant:', {
        id: tiendasBroasTenant._id,
        name: tiendasBroasTenant.name,
        tenantCode: tiendasBroasTenant.tenantCode,
        organizationId: tiendasBroasTenant.organizationId,
      });

      if (tiendasBroasTenant.organizationId) {
        const org = await OrganizationModel.findById(tiendasBroasTenant.organizationId);
        console.log('Found corresponding Organization:', org);
      } else {
        console.log('This tenant does NOT have an organizationId.');
      }
    } else {
      console.log('Tenant "Tiendas-Broas" not found.');
    }

  } catch (error) {
    console.error('[DIAGNOSE] An error occurred:', error);
  } finally {
    await disconnect();
    console.log('\n[DIAGNOSE] Disconnected.');
  }
}

diagnoseTenants();
