
import { connect, disconnect, model } from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { Organization, OrganizationSchema } from '../src/schemas/organization.schema';
import { User, UserSchema } from '../src/schemas/user.schema';

async function diagnoseByEmail(email: string) {
  console.log(`\n========================================`);
  console.log(`[DIAGNOSE] Running for email: ${email}`);
  console.log(`========================================`);

  const UserModel = model(User.name, UserSchema);
  const TenantModel = model(Tenant.name, TenantSchema);
  const OrganizationModel = model(Organization.name, OrganizationSchema);

  const user = await UserModel.findOne({ email: email.toLowerCase() });

  if (!user) {
    console.log('❌ User not found.');
    return;
  }

  console.log('✅ Found User:', {
    _id: user._id,
    email: user.email,
    roles: user.roles,
    tenantId: user.tenantId, // Legacy field
    memberships: user.memberships, // New field
  });

  if (user.memberships && user.memberships.length > 0) {
    console.log(`\n  ➥ Found ${user.memberships.length} membership(s). Checking them...`);
    for (const membership of user.memberships) {
        const org = await OrganizationModel.findById(membership.organizationId);
        if (org) {
            console.log('    ✅ Found Organization via membership:', {
                _id: org._id,
                name: org.name,
                owner: org.owner,
            });
        } else {
            console.log(`    ❌ Organization with ID ${membership.organizationId} not found.`);
        }
    }
  } else {
    console.log('\n  ➥ No memberships found for this user.');
  }

  if (user.tenantId) {
    console.log(`\n  ➥ Found legacy tenantId. Checking it...`);
    const tenant = await TenantModel.findById(user.tenantId);
    if (tenant) {
      console.log('    ✅ Found Tenant via legacy tenantId:', {
        _id: tenant._id,
        name: tenant.name,
        tenantCode: tenant.tenantCode,
        organizationId: tenant.organizationId,
      });

      if (tenant.organizationId) {
        const org = await OrganizationModel.findById(tenant.organizationId);
        if (org) {
            console.log('    ✅ Found Organization via tenant.organizationId:', {
                _id: org._id,
                name: org.name,
                owner: org.owner,
            });
        } else {
            console.log(`    ❌ Organization with ID ${tenant.organizationId} not found.`);
        }
      } else {
        console.log('    ❌ Tenant does not have an organizationId.');
      }
    } else {
      console.log(`    ❌ Tenant with ID ${user.tenantId} not found.`);
    }
  } else {
    console.log('\n  ➥ No legacy tenantId found for this user.');
  }
}

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI env variable');
    process.exit(1);
  }

  try {
    await connect(MONGODB_URI);
    console.log('[DIAGNOSE] DB Connection successful.');
    await diagnoseByEmail('admin@earlyadopter.com');
    await diagnoseByEmail('broastiendas@gmail.com');
  } catch (error) {
    console.error('[DIAGNOSE] An error occurred:', error);
  } finally {
    await disconnect();
    console.log('\n[DIAGNOSE] Disconnected.');
  }
}

run();
