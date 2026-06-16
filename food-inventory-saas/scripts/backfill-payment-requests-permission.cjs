/**
 * Backfill: garantiza la permission `payment_requests_review` y la otorga a
 * todos los roles `admin`/`employee` de TODOS los tenants.
 *
 * 1. Backup JSON de las colecciones `roles` y `permissions` (restaurable).
 * 2. Inserta la permission si falta.
 * 3. $addToSet del _id (ObjectId) a roles admin/employee que no la tengan.
 *
 * Idempotente. Pensado para correr en el box de prod con el node_modules y el
 * .env del API:  node backfill-payment-requests-permission.cjs
 */
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const API_DIR = "/home/deployer/smartkubik/api";
const BACKUP_DIR = "/home/deployer/smartkubik/backups";

function readMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const envPath = path.join(API_DIR, ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*MONGODB_URI\s*=\s*(.+)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  throw new Error("MONGODB_URI no encontrado en env ni en .env");
}

const PERMISSION = {
  name: "payment_requests_review",
  description: "Revisar y confirmar solicitudes de pago",
  module: "payment_requests",
  action: "review",
};
const ROLES_TO_GRANT = ["admin", "employee"];

(async () => {
  const uri = readMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(); // DB tomada del path del URI (test)
  const permissions = db.collection("permissions");
  const roles = db.collection("roles");

  // 1. BACKUP
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const rolesDump = await roles.find({}).toArray();
  const permsDump = await permissions.find({}).toArray();
  const rolesFile = path.join(BACKUP_DIR, `roles_${ts}.json`);
  const permsFile = path.join(BACKUP_DIR, `permissions_${ts}.json`);
  fs.writeFileSync(rolesFile, JSON.stringify(rolesDump, null, 2));
  fs.writeFileSync(permsFile, JSON.stringify(permsDump, null, 2));
  console.log(`📦 Backup roles (${rolesDump.length}) -> ${rolesFile}`);
  console.log(`📦 Backup permissions (${permsDump.length}) -> ${permsFile}`);

  // 2. Asegurar permission
  let permDoc = await permissions.findOne({ name: PERMISSION.name });
  let inserted = false;
  if (!permDoc) {
    const now = new Date();
    const r = await permissions.insertOne({ ...PERMISSION, createdAt: now, updatedAt: now });
    permDoc = await permissions.findOne({ _id: r.insertedId });
    inserted = true;
    console.log(`✅ Permission insertada: ${PERMISSION.name}`);
  } else {
    console.log(`⏭️  Permission ya existe: ${PERMISSION.name} (${permDoc._id})`);
  }

  // Diagnóstico previo: cuántos roles admin/employee la tienen ya
  const totalTargets = await roles.countDocuments({ name: { $in: ROLES_TO_GRANT } });
  const already = await roles.countDocuments({
    name: { $in: ROLES_TO_GRANT },
    permissions: permDoc._id,
  });
  console.log(`ℹ️  Roles admin/employee: ${totalTargets} | ya con permission: ${already}`);

  // 3. Grant
  const grant = await roles.updateMany(
    { name: { $in: ROLES_TO_GRANT }, permissions: { $ne: permDoc._id } },
    { $addToSet: { permissions: permDoc._id } },
  );
  console.log(`✅ Otorgada a ${grant.modifiedCount} rol(es) [${ROLES_TO_GRANT.join(", ")}]`);

  const afterAlready = await roles.countDocuments({
    name: { $in: ROLES_TO_GRANT },
    permissions: permDoc._id,
  });
  console.log(`📊 Resultado: ${afterAlready}/${totalTargets} roles admin/employee con la permission`);
  console.log(`   permissionInserted=${inserted} rolesUpdated=${grant.modifiedCount}`);

  await client.close();
})().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
