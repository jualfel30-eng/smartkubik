/**
 * Standalone script: create a test EDUCATION tenant with admin user.
 * Mirrors what OnboardingService.createTenantAndAdmin does.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrations/bootstrap-education-tenant.ts
 */

import mongoose, { Types } from "mongoose";
import bcrypt from "bcrypt";

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

// ── Datos del tenant ──────────────────────────────────────────────────────────
const TENANT_NAME     = "Colegio Demo SmartKubik";
const TENANT_SLUG     = "colegio-demo-smartkubik";
const BUSINESS_TYPE   = "colegio";
const ADMIN_FIRST     = "Admin";
const ADMIN_LAST      = "Education";
const ADMIN_EMAIL     = "admin@educacion.demo";
const ADMIN_PASSWORD  = "Edu2024Demo!";
// ─────────────────────────────────────────────────────────────────────────────

const EDU_PERMISSIONS = [
  "edu_students_read",
  "edu_students_write",
  "edu_classrooms_read",
  "edu_classrooms_write",
  "edu_subjects_read",
  "edu_subjects_write",
  "edu_schedules_read",
  "edu_schedules_write",
  "edu_grades_read",
  "edu_grades_write",
  "edu_grades_publish",
  "edu_attendance_read",
  "edu_attendance_write",
  "edu_tuition_read",
  "edu_tuition_write",
  "edu_dashboard_read",
];

const EDUCATION_ENABLED_MODULES = {
  inventory: false,
  orders: false,
  customers: true,
  suppliers: false,
  reports: true,
  accounting: true,
  payroll: true,
  bankAccounts: true,
  hrCore: true,
  timeAndAttendance: false,
  cashRegister: false,
  chat: true,
  marketing: false,
  restaurant: false, tables: false, recipes: false, kitchenDisplay: false,
  menuEngineering: false, reservations: false, tips: false, commissions: false,
  pos: false, variants: false, ecommerce: false, loyaltyProgram: false,
  appointments: false, resources: false, booking: false, servicePackages: false,
  fixedAssets: false, investments: false, fulfillment: false, driver: false,
  shipments: false, tracking: false, routes: false, fleet: false,
  warehousing: false, dispatch: false,
  production: false, bom: false, routing: false, workCenters: false,
  mrp: false, qualityControl: false, maintenance: false,
  productionScheduling: false, shopFloorControl: false, traceability: false,
  costing: false, plm: false, capacityPlanning: false, compliance: false,
  eduStudents: true,
  eduClassrooms: true,
  eduSubjects: true,
  eduSchedules: true,
  eduGrades: true,
  eduAttendance: true,
  eduTuition: true,
  eduDashboard: true,
};

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Connected to MongoDB`);

  const db = mongoose.connection.db;
  const tenants      = db.collection("tenants");
  const users        = db.collection("users");
  const roles        = db.collection("roles");
  const permissions  = db.collection("permissions");
  const memberships  = db.collection("usertenantmemberships");

  // ── Idempotency check ────────────────────────────────────────────────────
  const existingTenant = await tenants.findOne({ slug: TENANT_SLUG });
  if (existingTenant) {
    console.log(`⏭️  Tenant "${TENANT_SLUG}" ya existe (${existingTenant._id}). Nada que hacer.`);
    await mongoose.disconnect();
    return;
  }

  // ── 1. Obtener IDs de permisos edu_* (ya seedeados por seed-education-permissions) ──
  const permDocs = await permissions
    .find({ name: { $in: EDU_PERMISSIONS } })
    .toArray();

  const permIds = permDocs.map((p) => p._id);
  const foundNames = permDocs.map((p) => p.name);
  const missing = EDU_PERMISSIONS.filter((n) => !foundNames.includes(n));
  if (missing.length) {
    console.warn(`⚠️  Permisos edu_* no encontrados en la DB: ${missing.join(", ")}`);
    console.warn("   Corre primero: POST /migrations/seed-education-permissions");
  }

  // También añadir permisos admin estándar que aplican a educación
  const adminPermNames = [
    "users_create", "users_read", "users_update", "users_delete",
    "roles_create", "roles_read", "roles_update", "roles_delete",
    "customers_read", "customers_create", "customers_update", "customers_delete",
    "dashboard_read", "reports_read", "accounting_read", "accounting_write",
    "tenant_settings_read", "billing_read", "billing_create",
    "payroll_employees_read", "payroll_employees_write",
    "chat_read", "chat_write",
  ];
  const adminPermDocs = await permissions
    .find({ name: { $in: adminPermNames } })
    .toArray();
  const allPermIds = [
    ...permIds,
    ...adminPermDocs.map((p) => p._id),
  ];

  // ── 2. Crear tenant ──────────────────────────────────────────────────────
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const tenantId = new Types.ObjectId();

  await tenants.insertOne({
    _id: tenantId,
    name: TENANT_NAME,
    slug: TENANT_SLUG,
    businessType: BUSINESS_TYPE,
    vertical: "EDUCATION",
    enabledModules: EDUCATION_ENABLED_MODULES,
    status: "active",
    subscriptionPlan: "Trial",
    isConfirmed: true,
    trialStartDate: now,
    trialEndDate: trialEnd,
    subscriptionExpiresAt: trialEnd,
    limits: {
      maxUsers: 10,
      maxProducts: 500,
      maxOrders: 1000,
      maxStorage: 1073741824,
    },
    usage: {
      currentUsers: 1,
      currentProducts: 0,
      currentOrders: 0,
      currentStorage: 0,
    },
    verticalProfile: { key: "education", overrides: {} },
    onboardingCompleted: false,
    onboardingStep: 0,
    onboardingStepsCompleted: [],
    contactInfo: { email: ADMIN_EMAIL, phone: "" },
    createdAt: now,
    updatedAt: now,
  });
  console.log(`✅ Tenant creado: ${tenantId}`);

  // ── 3. Crear rol admin ──────────────────────────────────────────────────
  const roleId = new Types.ObjectId();
  await roles.insertOne({
    _id: roleId,
    name: "admin",
    label: "Administrador",
    description: "Acceso completo",
    tenantId,
    permissions: allPermIds,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`✅ Rol admin creado: ${roleId}`);

  // ── 4. Crear usuario admin ───────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const userId = new Types.ObjectId();
  await users.insertOne({
    _id: userId,
    firstName: ADMIN_FIRST,
    lastName: ADMIN_LAST,
    email: ADMIN_EMAIL,
    password: passwordHash,
    role: roleId,
    tenantId,
    isActive: true,
    emailVerified: true,
    loginAttempts: 0,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`✅ Usuario admin creado: ${userId}`);

  // ── 5. Crear membresía ───────────────────────────────────────────────────
  await memberships.insertOne({
    userId,
    tenantId,
    roleId,
    status: "active",
    isDefault: true,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`✅ Membresía creada`);

  console.log(`\n📊 Tenant de educación listo:`);
  console.log(`   Nombre    : ${TENANT_NAME}`);
  console.log(`   Slug      : ${TENANT_SLUG}`);
  console.log(`   Email     : ${ADMIN_EMAIL}`);
  console.log(`   Password  : ${ADMIN_PASSWORD}`);
  console.log(`   TenantId  : ${tenantId}`);
  console.log(`\n   ⚠️  Ejecuta ahora: POST /migrations/seed-teacher-role`);

  await mongoose.disconnect();
  console.log("✅ Done.");
}

run().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
