/**
 * Migración idempotente: backfill de `customerId` en beautybookings.
 *
 * Las beauty bookings guardan al cliente como snapshot embebido `client {name,phone}`
 * y, históricamente, no referenciaban el registro Customer del CRM por ID. El
 * servicio ya auto-registra/encuentra el Customer por teléfono; esta migración
 * enlaza las bookings existentes a su Customer por `client.phone` (match exacto,
 * mismo string que escribió el servicio), para que las métricas del cliente
 * (gasto, visitas, actividad) puedan agregar las bookings por customerId.
 *
 * Uso:
 *   node scripts/migrations/backfill-beauty-booking-customerid.cjs --dry-run
 *   node scripts/migrations/backfill-beauty-booking-customerid.cjs
 *
 * Idempotente: solo toca bookings sin customerId.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

function loadUri() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  const env = fs.readFileSync(envPath, 'utf8');
  const m = env.match(/^MONGODB_URI=(.+)$/m);
  if (!m) throw new Error('MONGODB_URI no encontrado en .env');
  return m[1].trim();
}

function tenantVariants(tid) {
  const out = [tid];
  const s = String(tid);
  if (s.length === 24) {
    try { out.push(new mongoose.Types.ObjectId(s)); } catch { /* noop */ }
  }
  if (typeof tid !== 'string') out.push(s);
  return out;
}

// Teléfono canónico: solo dígitos, últimos 10 (neutraliza +58 / 0 inicial / formato).
// Bookings guardan "+584120402324"; customers guardan en contacts[].value "04120402324".
function canonPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : d;
}

// Construye mapa canónico(phone) -> customerId para un tenant, leyendo contacts[]
// (type phone) y phone top-level si existe.
async function buildPhoneMap(customers, tid) {
  const map = new Map();
  const cur = customers.find(
    { tenantId: { $in: tenantVariants(tid) } },
    { projection: { _id: 1, phone: 1, contacts: 1 } },
  );
  for await (const c of cur) {
    const phones = [];
    if (c.phone) phones.push(c.phone);
    for (const ct of c.contacts || []) {
      if (ct?.value && (!ct.type || ct.type === 'phone')) phones.push(ct.value);
    }
    for (const p of phones) {
      const key = canonPhone(p);
      if (key && key.length >= 7 && !map.has(key)) map.set(key, c._id);
    }
  }
  return map;
}

(async () => {
  await mongoose.connect(loadUri());
  const db = mongoose.connection.db;
  console.log(`DB: ${db.databaseName} | modo: ${DRY_RUN ? 'DRY-RUN' : 'ESCRITURA'}`);

  const bookings = db.collection('beautybookings');
  const customers = db.collection('customers');

  const pending = await bookings
    .find({
      customerId: { $in: [null, undefined] },
      'client.phone': { $exists: true, $ne: '' },
    })
    .project({ _id: 1, tenantId: 1, 'client.phone': 1, 'client.name': 1 })
    .toArray();

  console.log(`Bookings sin customerId con teléfono: ${pending.length}`);

  let matchedPhone = 0;
  let matchedName = 0;
  let noCustomer = 0;
  const phoneMapByTenant = new Map(); // tenant string -> Map(canonPhone -> customerId)

  for (const b of pending) {
    const phone = b.client?.phone;
    const name = b.client?.name;
    const tKey = String(b.tenantId);

    let phoneMap = phoneMapByTenant.get(tKey);
    if (!phoneMap) {
      phoneMap = await buildPhoneMap(customers, b.tenantId);
      phoneMapByTenant.set(tKey, phoneMap);
    }

    // 1) Match por teléfono normalizado (preferido)
    let cid = phone ? phoneMap.get(canonPhone(phone)) : null;
    let via = 'phone';

    // 2) Fallback por nombre exacto dentro del tenant (los walk-in se crearon
    //    con dto.client.name; muchos quedaron sin teléfono por un bug del servicio).
    if (!cid && name) {
      const byName = await customers.findOne(
        { tenantId: { $in: tenantVariants(b.tenantId) }, name },
        { projection: { _id: 1 } },
      );
      cid = byName?._id || null;
      via = 'name';
    }

    if (!cid) {
      noCustomer++;
      continue;
    }

    if (via === 'phone') matchedPhone++;
    else matchedName++;
    if (!DRY_RUN) {
      await bookings.updateOne({ _id: b._id }, { $set: { customerId: cid } });
    }
  }

  console.log(`\nResultado:`);
  console.log(`  enlazadas por teléfono: ${matchedPhone}`);
  console.log(`  enlazadas por nombre:   ${matchedName}`);
  console.log(`  no enlazadas (sin Customer): ${noCustomer}`);
  if (DRY_RUN) console.log(`  (DRY-RUN: no se escribió nada)`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
