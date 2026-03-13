/**
 * Migration: Link existing subsidiary tenants to their parent
 *
 * This script finds tenants created via "new-location" type in the organizations
 * collection and sets parentTenantId + isSubsidiary on the corresponding tenant documents.
 *
 * Idempotent: safe to run multiple times.
 */
const { MongoClient, ObjectId } = require('mongodb');

async function linkSubsidiaries() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test');

    console.log('\n=== LINK EXISTING SUBSIDIARIES ===\n');

    // 1. Find all organizations with type "new-location" that have a parentOrganization
    const subsidiaryOrgs = await db.collection('organizations').find({
      type: 'new-location',
      parentOrganization: { $exists: true, $ne: null },
    }).toArray();

    console.log(`Found ${subsidiaryOrgs.length} subsidiary organizations:\n`);

    for (const org of subsidiaryOrgs) {
      const parentOrgId = org.parentOrganization;
      const childTenantId = org._id;

      // The Organization._id === Tenant._id (unified ID pattern)
      const childTenant = await db.collection('tenants').findOne({ _id: childTenantId });
      const parentTenant = await db.collection('tenants').findOne({ _id: parentOrgId });

      if (!childTenant) {
        console.log(`  SKIP: No tenant found for org ${org.name} (${childTenantId})`);
        continue;
      }
      if (!parentTenant) {
        console.log(`  SKIP: No parent tenant found for org ${org.name} (parent: ${parentOrgId})`);
        continue;
      }

      // Check if already linked
      if (childTenant.parentTenantId?.toString() === parentOrgId.toString()) {
        console.log(`  ALREADY LINKED: ${childTenant.name} → ${parentTenant.name}`);
        continue;
      }

      // Link the child to the parent
      const result = await db.collection('tenants').updateOne(
        { _id: childTenantId },
        {
          $set: {
            parentTenantId: parentOrgId,
            isSubsidiary: true,
          },
        },
      );

      console.log(`  LINKED: "${childTenant.name}" → parent "${parentTenant.name}" (modified: ${result.modifiedCount})`);
    }

    // 2. Also handle the specific Broas case manually if the organizations weren't created
    //    with the "new-location" type (they might have been created as separate businesses)
    console.log('\n=== CHECKING BROAS SPECIFIC CASE ===\n');

    const broasUser = await db.collection('users').findOne({ email: 'broas.admon@gmail.com' });
    if (broasUser) {
      const broasMemberships = await db.collection('usertenantmemberships').find({
        userId: broasUser._id,
      }).toArray();

      const broasTenantIds = broasMemberships.map(m => m.tenantId);
      const broasTenants = await db.collection('tenants').find({
        _id: { $in: broasTenantIds },
      }).toArray();

      console.log(`Broas user has ${broasTenants.length} tenants:`);
      for (const t of broasTenants) {
        console.log(`  - ${t.name} (${t._id}) | parentTenantId: ${t.parentTenantId || 'NONE'} | isSubsidiary: ${t.isSubsidiary || false}`);
      }

      // Find the main tenant (the one with products or the oldest one without parentTenantId)
      const mainTenant = broasTenants.find(t => !t.parentTenantId && !t.isSubsidiary);
      if (mainTenant) {
        const childTenants = broasTenants.filter(t => t._id.toString() !== mainTenant._id.toString());

        for (const child of childTenants) {
          if (child.parentTenantId) {
            console.log(`  ALREADY LINKED: ${child.name}`);
            continue;
          }

          // Check in organizations collection if this was created as new-location
          const childOrg = await db.collection('organizations').findOne({ _id: child._id });
          const isNewLocation = childOrg?.type === 'new-location' || childOrg?.parentOrganization;

          if (isNewLocation || child.name.includes('Parral') || child.name.includes('Periferico') || child.name.includes('Periférico')) {
            const result = await db.collection('tenants').updateOne(
              { _id: child._id },
              {
                $set: {
                  parentTenantId: mainTenant._id,
                  isSubsidiary: true,
                },
              },
            );
            console.log(`  LINKED (Broas): "${child.name}" → "${mainTenant.name}" (modified: ${result.modifiedCount})`);
          } else {
            console.log(`  SKIPPED: "${child.name}" — doesn't appear to be a Broas subsidiary`);
          }
        }
      }
    } else {
      console.log('  Broas user not found — skipping specific case');
    }

    // 3. Final verification
    console.log('\n=== VERIFICATION ===\n');
    const allSubsidiaries = await db.collection('tenants').find({
      isSubsidiary: true,
    }).toArray();

    console.log(`Total subsidiary tenants: ${allSubsidiaries.length}`);
    for (const s of allSubsidiaries) {
      const parent = await db.collection('tenants').findOne({ _id: s.parentTenantId });
      console.log(`  ${s.name} → parent: ${parent?.name || 'UNKNOWN'}`);
    }

  } finally {
    await client.close();
  }
}

linkSubsidiaries().catch(console.error);
