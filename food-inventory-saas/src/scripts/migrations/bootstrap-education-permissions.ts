/**
 * Standalone script: seed education vertical permissions into MongoDB.
 * Run without a live backend — connects directly to Mongoose.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrations/bootstrap-education-permissions.ts
 *
 * Safe to run multiple times (idempotent).
 */

import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/food-inventory-saas";

const PERMISSIONS = [
  { name: "edu_students_read",    description: "Ver alumnos",                    module: "education" },
  { name: "edu_students_write",   description: "Crear y editar alumnos",          module: "education" },
  { name: "edu_classrooms_read",  description: "Ver salones",                    module: "education" },
  { name: "edu_classrooms_write", description: "Crear y editar salones",          module: "education" },
  { name: "edu_subjects_read",    description: "Ver materias",                   module: "education" },
  { name: "edu_subjects_write",   description: "Crear y editar materias",         module: "education" },
  { name: "edu_schedules_read",   description: "Ver horarios",                   module: "education" },
  { name: "edu_schedules_write",  description: "Crear y editar horarios",         module: "education" },
  { name: "edu_grades_read",      description: "Ver calificaciones",             module: "education" },
  { name: "edu_grades_write",     description: "Editar calificaciones",           module: "education" },
  { name: "edu_grades_publish",   description: "Publicar y despublicar notas",   module: "education" },
  { name: "edu_attendance_read",  description: "Ver asistencia",                 module: "education" },
  { name: "edu_attendance_write", description: "Registrar asistencia",            module: "education" },
  { name: "edu_tuition_read",     description: "Ver cuotas y matrículas",        module: "education" },
  { name: "edu_tuition_write",    description: "Gestionar cuotas y matrículas",  module: "education" },
  { name: "edu_dashboard_read",   description: "Ver dashboard educativo",        module: "education" },
];

const ROLES_TO_GRANT = ["admin"];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Connected to: ${MONGO_URI}`);

  const db = mongoose.connection.db;
  const permissions = db.collection("permissions");
  const roles = db.collection("roles");

  let inserted = 0;
  let existed = 0;
  const allIds: any[] = [];

  for (const perm of PERMISSIONS) {
    const existing = await permissions.findOne({ name: perm.name });

    if (existing) {
      console.log(`⏭️  Already exists: ${perm.name}`);
      existed++;
      allIds.push(existing._id);
      continue;
    }

    const now = new Date();
    const parts = perm.name.split("_");
    const action = parts[parts.length - 1];

    const result = await permissions.insertOne({
      ...perm,
      action,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`✅ Inserted: ${perm.name}`);
    inserted++;
    allIds.push(result.insertedId);
  }

  const grant = await roles.updateMany(
    { name: { $in: ROLES_TO_GRANT } },
    { $addToSet: { permissions: { $each: allIds } } } as any,
  );

  console.log(`\n📊 Summary:`);
  console.log(`   Permissions inserted : ${inserted}`);
  console.log(`   Already existed      : ${existed}`);
  console.log(`   Roles updated        : ${grant.modifiedCount}`);

  await mongoose.disconnect();
  console.log("✅ Done. Connection closed.");
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
