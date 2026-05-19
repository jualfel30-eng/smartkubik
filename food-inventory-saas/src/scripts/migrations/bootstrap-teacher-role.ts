/**
 * Standalone script: seed TEACHER role for all EDUCATION tenants.
 * Run without a live backend — connects directly to Mongoose.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrations/bootstrap-teacher-role.ts
 *
 * Safe to run multiple times (idempotent).
 */

import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/food-inventory-saas";

const TEACHER_PERMISSIONS = [
  "edu_grades_read",
  "edu_grades_write",
  "edu_attendance_read",
  "edu_attendance_write",
  "edu_schedules_read",
  "edu_classrooms_read",
  "edu_students_read",
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Connected to: ${MONGO_URI}`);

  const db = mongoose.connection.db;
  const permissions = db.collection("permissions");
  const roles = db.collection("roles");
  const tenants = db.collection("tenants");

  const permDocs = await permissions
    .find({ name: { $in: TEACHER_PERMISSIONS } })
    .toArray();

  const permIds = permDocs.map((p) => p._id);
  const foundNames = permDocs.map((p) => p.name);
  const missing = TEACHER_PERMISSIONS.filter((n) => !foundNames.includes(n));
  if (missing.length > 0) {
    console.warn(`⚠️  Missing permissions (will skip them): ${missing.join(", ")}`);
  }

  const educationTenants = await tenants
    .find({ vertical: "EDUCATION" })
    .project({ _id: 1 })
    .toArray();

  console.log(`Found ${educationTenants.length} EDUCATION tenant(s)`);

  let created = 0;
  let skipped = 0;

  for (const tenant of educationTenants) {
    const existing = await roles.findOne({ name: "TEACHER", tenantId: tenant._id });

    if (existing) {
      console.log(`⏭️  TEACHER role already exists for tenant ${tenant._id}`);
      skipped++;
      continue;
    }

    await roles.insertOne({
      name: "TEACHER",
      label: "Docente",
      description: "Acceso al portal docente: calificaciones, asistencia y horarios",
      tenantId: tenant._id,
      permissions: permIds,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ TEACHER role created for tenant ${tenant._id}`);
    created++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   TEACHER roles created : ${created}`);
  console.log(`   Already existed       : ${skipped}`);
  console.log(`   Tenants processed     : ${educationTenants.length}`);

  await mongoose.disconnect();
  console.log("✅ Done. Connection closed.");
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
