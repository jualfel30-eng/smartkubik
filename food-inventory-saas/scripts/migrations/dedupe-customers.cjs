/**
 * Migración: deduplicación de customers (legado del bug de auto-registro que no
 * deduplicaba y creaba un Customer por cada booking).
 *
 * Regla SEGURA: agrupa por nombre normalizado dentro de un tenant. Fusiona un
 * grupo SOLO si no hay teléfonos en conflicto (≤1 teléfono canónico distinto
 * entre sus miembros). Si hay teléfonos distintos → se asume que son personas
 * distintas y NO se fusiona (se reporta como ambiguo).
 *
 * Al fusionar: elige un customer "primario" (más bookings enlazadas → con
 * teléfono → más antiguo), re-apunta customerId de beautybookings/appointments/
 * orders al primario, fusiona contacts/tags/beautyPreferences, y borra las copias.
 *
 * Uso:
 *   node scripts/migrations/dedupe-customers.cjs --tenant=<id> --dry-run
 *   node scripts/migrations/dedupe-customers.cjs --tenant=<id>
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');
const tenantArg = process.argv.find((a) => a.startsWith('--tenant='));
const TENANT = tenantArg ? tenantArg.split('=')[1] : null;

function loadUri() {
  const env = fs.readFileSync(path.join(__dirname, '..', '..', '.env'), 'utf8');
  return env.match(/^MONGODB_URI=(.+)$/m)[1].trim();
}
function canonPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : d;
}
function normName(n) {
  return String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function tenantVariants(tid) {
  const out = [tid];
  const s = String(tid);
  if (s.length === 24) { try { out.push(new mongoose.Types.ObjectId(s)); } catch { /* */ } }
  return out;
}
function phonesOf(c) {
  const out = [];
  if (c.phone) out.push(canonPhone(c.phone));
  for (const ct of c.contacts || []) {
    if (ct?.value && (!ct.type || ct.type === 'phone')) out.push(canonPhone(ct.value));
  }
  return out.filter((p) => p && p.length >= 7);
}

(async () => {
  if (!TENANT) throw new Error('Falta --tenant=<id>');
  await mongoose.connect(loadUri());
  const db = mongoose.connection.db;
  console.log(`DB: ${db.databaseName} | tenant: ${TENANT} | modo: ${DRY_RUN ? 'DRY-RUN' : 'ESCRITURA'}`);

  const customersC = db.collection('customers');
  const tM = { $in: tenantVariants(TENANT) };
  const customers = await customersC.find({ tenantId: tM }).toArray();

  // Conteo de bookings/citas/orders por customerId (para elegir primario)
  const linkCount = async (coll, id) =>
    db.collection(coll).countDocuments({ customerId: { $in: [id, String(id), new mongoose.Types.ObjectId(String(id))] } });

  // Agrupar por nombre normalizado
  const groups = new Map();
  for (const c of customers) {
    const k = normName(c.name);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }

  let mergedGroups = 0, deleted = 0, repointed = 0, ambiguous = 0;

  for (const [name, members] of groups) {
    if (members.length < 2) continue;

    const distinctPhones = new Set();
    members.forEach((m) => phonesOf(m).forEach((p) => distinctPhones.add(p)));
    if (distinctPhones.size > 1) {
      ambiguous++;
      console.log(`  ⚠️  "${name}": ${members.length} copias con teléfonos distintos (${[...distinctPhones].join(', ')}) → NO se fusiona`);
      continue;
    }

    // Elegir primario: más bookings → con teléfono → más antiguo
    const scored = [];
    for (const m of members) {
      const bk = await linkCount('beautybookings', m._id);
      const ap = await linkCount('appointments', m._id);
      scored.push({ m, links: bk + ap, hasPhone: phonesOf(m).length > 0 });
    }
    scored.sort((a, b) =>
      b.links - a.links ||
      (b.hasPhone ? 1 : 0) - (a.hasPhone ? 1 : 0) ||
      String(a.m._id).localeCompare(String(b.m._id)),
    );
    const primary = scored[0].m;
    const dups = scored.slice(1).map((s) => s.m);

    // Merge de campos en el primario
    const mergedContacts = [...(primary.contacts || [])];
    const mergedTags = new Set(primary.tags || []);
    let beautyPreferences = primary.beautyPreferences;
    for (const d of dups) {
      for (const ct of d.contacts || []) {
        if (!mergedContacts.some((x) => x.type === ct.type && x.value === ct.value)) mergedContacts.push(ct);
      }
      (d.tags || []).forEach((t) => mergedTags.add(t));
      if (!beautyPreferences && d.beautyPreferences) beautyPreferences = d.beautyPreferences;
    }

    const dupIds = dups.map((d) => d._id);
    const dupIdVariants = dupIds.flatMap((id) => [id, String(id), new mongoose.Types.ObjectId(String(id))]);

    console.log(`  ✓ "${name}": ${members.length} → 1 | primario=${primary._id} (${scored[0].links} links) | borra ${dups.length}`);

    if (!DRY_RUN) {
      // Re-apuntar referencias
      for (const coll of ['beautybookings', 'appointments', 'orders']) {
        const r = await db.collection(coll).updateMany(
          { tenantId: tM, customerId: { $in: dupIdVariants } },
          { $set: { customerId: primary._id } },
        );
        repointed += r.modifiedCount || 0;
      }
      // Actualizar primario con campos fusionados
      await customersC.updateOne(
        { _id: primary._id },
        { $set: { contacts: mergedContacts, tags: [...mergedTags], ...(beautyPreferences ? { beautyPreferences } : {}) } },
      );
      // Borrar duplicados
      const del = await customersC.deleteMany({ _id: { $in: dupIds } });
      deleted += del.deletedCount || 0;
    } else {
      deleted += dups.length;
    }
    mergedGroups++;
  }

  console.log(`\nResultado:`);
  console.log(`  grupos fusionados: ${mergedGroups}`);
  console.log(`  customers a borrar: ${deleted}`);
  console.log(`  referencias re-apuntadas: ${repointed}${DRY_RUN ? ' (dry-run: 0 real)' : ''}`);
  console.log(`  grupos ambiguos (no tocados): ${ambiguous}`);
  if (DRY_RUN) console.log(`  (DRY-RUN: no se escribió nada)`);

  await mongoose.disconnect();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
