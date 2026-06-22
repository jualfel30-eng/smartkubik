/**
 * Migración idempotente: backfill del teléfono en customers walk-in.
 *
 * Por un bug del auto-registro (beauty-bookings.service hacía create({phone}) pero
 * el schema de Customer no tiene `phone` top-level → se dropeaba), los clientes
 * walk-in quedaron SIN teléfono en contacts[]. Esta migración les copia el
 * teléfono desde sus beauty bookings ya enlazadas (booking.customerId).
 *
 * Requiere correr antes: backfill-beauty-booking-customerid.cjs
 *
 * Uso:
 *   node scripts/migrations/backfill-walkin-customer-phone.cjs --dry-run
 *   node scripts/migrations/backfill-walkin-customer-phone.cjs
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

function loadUri() {
  const env = fs.readFileSync(path.join(__dirname, '..', '..', '.env'), 'utf8');
  const m = env.match(/^MONGODB_URI=(.+)$/m);
  if (!m) throw new Error('MONGODB_URI no encontrado en .env');
  return m[1].trim();
}

(async () => {
  await mongoose.connect(loadUri());
  const db = mongoose.connection.db;
  console.log(`DB: ${db.databaseName} | modo: ${DRY_RUN ? 'DRY-RUN' : 'ESCRITURA'}`);

  const bookings = db.collection('beautybookings');
  const customers = db.collection('customers');

  // Mapa customerId -> phone (primer teléfono no vacío de sus bookings)
  const cur = bookings.find(
    { customerId: { $exists: true, $ne: null }, 'client.phone': { $exists: true, $ne: '' } },
    { projection: { customerId: 1, 'client.phone': 1 } },
  );
  const phoneByCustomer = new Map();
  for await (const b of cur) {
    const key = String(b.customerId);
    if (!phoneByCustomer.has(key)) phoneByCustomer.set(key, b.client.phone);
  }
  console.log(`Customers con booking enlazada y teléfono: ${phoneByCustomer.size}`);

  let updated = 0;
  let alreadyHad = 0;
  for (const [cidStr, phone] of phoneByCustomer) {
    const variants = [cidStr];
    if (cidStr.length === 24) {
      try { variants.push(new mongoose.Types.ObjectId(cidStr)); } catch { /* noop */ }
    }
    const c = await customers.findOne(
      { _id: { $in: variants } },
      { projection: { contacts: 1 } },
    );
    if (!c) continue;

    const hasPhone = (c.contacts || []).some(
      (ct) => ct.type === 'phone' && ct.value,
    );
    if (hasPhone) { alreadyHad++; continue; }

    updated++;
    if (!DRY_RUN) {
      await customers.updateOne(
        { _id: c._id },
        {
          $push: {
            contacts: {
              type: 'phone',
              value: phone,
              isPrimary: (c.contacts || []).length === 0,
              isActive: true,
            },
          },
        },
      );
    }
  }

  console.log(`\nResultado:`);
  console.log(`  customers con teléfono añadido: ${updated}`);
  console.log(`  ya tenían teléfono: ${alreadyHad}`);
  if (DRY_RUN) console.log(`  (DRY-RUN: no se escribió nada)`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
