/**
 * Migration script: Create Customer records for walk-in clients
 * that only exist as embedded objects in beauty-bookings.
 *
 * Usage: node scripts/migrate-walkin-customers.js <tenantId>
 *
 * This script:
 * 1. Reads all beauty-bookings for the tenant
 * 2. Extracts unique clients by phone
 * 3. Checks if a Customer record already exists
 * 4. Creates missing Customer records
 */
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://smartkubik:smartkubik2024@cluster0.mongodb.net/test';
const tenantId = process.argv[2];

if (!tenantId) {
  console.error('Usage: node scripts/migrate-walkin-customers.js <tenantId>');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  const tenantOid = new ObjectId(tenantId);

  // 1. Get all beauty bookings with client phone
  const bookings = await db.collection('beautybookings').find({
    tenantId: tenantOid,
    'client.phone': { $exists: true, $ne: '' },
  }).toArray();

  console.log(`Found ${bookings.length} bookings for tenant ${tenantId}`);

  // 2. Extract unique clients by phone
  const clientsByPhone = {};
  for (const b of bookings) {
    const phone = b.client?.phone;
    if (!phone) continue;
    if (!clientsByPhone[phone]) {
      clientsByPhone[phone] = {
        name: b.client.name || 'Walk-in',
        phone,
        email: b.client.email || undefined,
      };
    }
  }

  const uniquePhones = Object.keys(clientsByPhone);
  console.log(`Found ${uniquePhones.length} unique clients by phone`);

  // 3. Check which ones already exist in customers
  const existingCustomers = await db.collection('customers').find({
    tenantId: tenantOid,
    phone: { $in: uniquePhones },
  }).toArray();

  const existingPhones = new Set(existingCustomers.map(c => c.phone));
  console.log(`${existingPhones.size} already exist as Customer records`);

  // 4. Find the highest CLI- number
  const lastCli = await db.collection('customers')
    .find({ tenantId: tenantOid, customerNumber: /^CLI-/ })
    .sort({ customerNumber: -1 })
    .limit(1)
    .toArray();

  let nextNum = 1;
  if (lastCli.length > 0 && lastCli[0].customerNumber) {
    const match = lastCli[0].customerNumber.match(/CLI-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  // 5. Create missing customers
  let created = 0;
  for (const phone of uniquePhones) {
    if (existingPhones.has(phone)) continue;

    const cl = clientsByPhone[phone];
    const customerNumber = `CLI-${String(nextNum).padStart(6, '0')}`;
    nextNum++;

    await db.collection('customers').insertOne({
      tenantId: tenantOid,
      customerNumber,
      name: cl.name,
      phone: cl.phone,
      email: cl.email || undefined,
      customerType: 'individual',
      tags: ['walk-in'],
      source: 'walk-in',
      status: 'active',
      createdBy: tenantOid, // Use tenant as fallback
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`  Created ${customerNumber}: ${cl.name} (${cl.phone})`);
    created++;
  }

  console.log(`\nDone. Created ${created} new Customer records.`);
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
