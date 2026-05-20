/**
 * Seed de demo para la vertical EDUCATION.
 * Popula el tenant "Colegio Demo SmartKubik" con datos realistas:
 *   - 5 profesores (Customer + EmployeeProfile + User TEACHER)
 *   - 4 salones (1°A, 2°A, 3°A, 3°B)
 *   - 6 materias por salón
 *   - 31 alumnos distribuidos entre los salones
 *   - Horario semanal completo (Lun–Vie)
 *   - Calificaciones Lapso 1 (publicadas) y Lapso 2 (publicadas)
 *   - Asistencia de las últimas 10 clases
 *   - Cuotas: matrícula + Oct (pagada) + Nov (mayormente pagada) + Dic (pendiente)
 *
 * Idempotente: detecta datos existentes y omite la inserción si ya existen.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." npx ts-node -r tsconfig-paths/register \
 *     src/scripts/migrations/seed-education-demo.ts
 */

import mongoose, { Types } from "mongoose";
import bcrypt from "bcrypt";

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

const TENANT_SLUG    = "colegio-demo-smartkubik";
const ACADEMIC_YEAR  = "2024-2025";
const ADMIN_PASSWORD = "Edu2024Demo!";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function oid() { return new Types.ObjectId(); }
function now() { return new Date(); }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
// School day dates: skip weekends, going backwards from today
function schoolDays(count: number): Date[] {
  const days: Date[] = [];
  let d = new Date();
  while (days.length < count) {
    d = new Date(d);
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  return days;
}
function grade(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Data definitions ─────────────────────────────────────────────────────────

const TEACHER_DEFS = [
  { firstName: "María",   lastName: "González",   email: "mgonzalez@colegio.demo",  subject: "Matemáticas",           empNum: "EMP-001" },
  { firstName: "Carlos",  lastName: "Rodríguez",  email: "crodriguez@colegio.demo", subject: "Lengua y Literatura",    empNum: "EMP-002" },
  { firstName: "Ana",     lastName: "Martínez",   email: "amartinez@colegio.demo",  subject: "Ciencias Naturales",     empNum: "EMP-003" },
  { firstName: "Pedro",   lastName: "Jiménez",    email: "pjimenez@colegio.demo",   subject: "Historia y Geografía",   empNum: "EMP-004" },
  { firstName: "Laura",   lastName: "Sánchez",    email: "lsanchez@colegio.demo",   subject: "Inglés",                 empNum: "EMP-005" },
];

const CLASSROOM_DEFS = [
  { name: "1° Grado A",  grade: "1", section: "A", capacity: 25 },
  { name: "2° Grado A",  grade: "2", section: "A", capacity: 25 },
  { name: "3° Grado A",  grade: "3", section: "A", capacity: 25 },
  { name: "3° Grado B",  grade: "3", section: "B", capacity: 25 },
];

// subjects[i] → teacherIndex in TEACHER_DEFS
const SUBJECT_DEFS = [
  { name: "Matemáticas",         code: "MAT", teacherIdx: 0, periodsPerWeek: 5 },
  { name: "Lengua y Literatura", code: "LEN", teacherIdx: 1, periodsPerWeek: 5 },
  { name: "Ciencias Naturales",  code: "CN",  teacherIdx: 2, periodsPerWeek: 4 },
  { name: "Historia y Geografía",code: "HIS", teacherIdx: 3, periodsPerWeek: 4 },
  { name: "Inglés",              code: "ING", teacherIdx: 4, periodsPerWeek: 4 },
  { name: "Educación Física",    code: "EF",  teacherIdx: 0, periodsPerWeek: 2 },
];

// Horario base: day 1-5 (Mon-Fri), startTime, endTime, subjectCode
const SCHEDULE_SLOTS = [
  { day: 1, start: "07:00", end: "07:45", subjCode: "MAT" },
  { day: 1, start: "07:45", end: "08:30", subjCode: "LEN" },
  { day: 1, start: "08:30", end: "09:15", subjCode: "CN"  },
  { day: 1, start: "09:30", end: "10:15", subjCode: "HIS" },
  { day: 1, start: "10:15", end: "11:00", subjCode: "ING" },
  { day: 2, start: "07:00", end: "07:45", subjCode: "MAT" },
  { day: 2, start: "07:45", end: "08:30", subjCode: "EF"  },
  { day: 2, start: "08:30", end: "09:15", subjCode: "LEN" },
  { day: 2, start: "09:30", end: "10:15", subjCode: "MAT" },
  { day: 2, start: "10:15", end: "11:00", subjCode: "HIS" },
  { day: 3, start: "07:00", end: "07:45", subjCode: "LEN" },
  { day: 3, start: "07:45", end: "08:30", subjCode: "CN"  },
  { day: 3, start: "08:30", end: "09:15", subjCode: "ING" },
  { day: 3, start: "09:30", end: "10:15", subjCode: "MAT" },
  { day: 3, start: "10:15", end: "11:00", subjCode: "EF"  },
  { day: 4, start: "07:00", end: "07:45", subjCode: "HIS" },
  { day: 4, start: "07:45", end: "08:30", subjCode: "MAT" },
  { day: 4, start: "08:30", end: "09:15", subjCode: "LEN" },
  { day: 4, start: "09:30", end: "10:15", subjCode: "CN"  },
  { day: 4, start: "10:15", end: "11:00", subjCode: "ING" },
  { day: 5, start: "07:00", end: "07:45", subjCode: "ING" },
  { day: 5, start: "07:45", end: "08:30", subjCode: "MAT" },
  { day: 5, start: "08:30", end: "09:15", subjCode: "HIS" },
  { day: 5, start: "09:30", end: "10:15", subjCode: "LEN" },
  { day: 5, start: "10:15", end: "11:00", subjCode: "CN"  },
];

// 8-8-8-7 students per classroom
const STUDENT_NAMES = [
  ["Sofía",    "Pedraza"],   ["Andrés",   "Fuentes"],   ["Valentina","Mora"],
  ["Diego",    "Castro"],    ["Camila",   "Vega"],       ["Mateo",    "Blanco"],
  ["Isabella", "Romero"],    ["Sebastián","Herrera"],
  ["Lucía",    "Torres"],    ["Emilio",   "Mendoza"],    ["Daniela",  "Flores"],
  ["Samuel",   "Cruz"],      ["María",    "Rojas"],      ["Tomás",    "Vargas"],
  ["Paula",    "Guzmán"],    ["Felipe",   "Ortega"],
  ["Elena",    "Castillo"],  ["Nicolás",  "Reyes"],      ["Gabriela", "Medina"],
  ["Alejandro","Muñoz"],     ["Sara",     "Díaz"],       ["Ricardo",  "León"],
  ["Mariana",  "Álvarez"],   ["Julián",   "Suárez"],
  ["Valeria",  "Jiménez"],   ["Adrián",   "Guerrero"],  ["Carolina", "Ramírez"],
  ["Miguel",   "Ríos"],      ["Natalia",  "Delgado"],   ["Eduardo",  "Paredes"],
  ["Ariana",   "Núñez"],
];

const GUARDIAN_NAMES = [
  "Rosa Pedraza",  "Marcos Fuentes",  "Carmen Mora",    "Luis Castro",
  "Patricia Vega", "Jorge Blanco",    "Ana Romero",     "Roberto Herrera",
  "Gloria Torres", "Héctor Mendoza",  "Beatriz Flores", "José Cruz",
  "Sandra Rojas",  "Ramón Vargas",    "Claudia Guzmán", "Ernesto Ortega",
  "Ximena Castillo","Álvaro Reyes",   "Mónica Medina",  "Alberto Muñoz",
  "Irene Díaz",    "Fernando León",   "Alicia Álvarez", "Raúl Suárez",
  "Verónica Jiménez","Hugo Guerrero", "Pilar Ramírez",  "Oscar Ríos",
  "Elisa Delgado", "Gilberto Paredes","Diana Núñez",
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  const db = mongoose.connection.db;
  const tenants      = db.collection("tenants");
  const customers    = db.collection("customers");
  const employees    = db.collection("employeeprofiles");
  const users        = db.collection("users");
  const roles        = db.collection("roles");
  const memberships  = db.collection("usertenantmemberships");
  const classrooms   = db.collection("educlassrooms");
  const subjects     = db.collection("edusubjects");
  const schedules    = db.collection("eduschedules");
  const students     = db.collection("edustudents");
  const grades       = db.collection("edugrades");
  const attendance   = db.collection("eduattendances");
  const tuition      = db.collection("edutuitionfees");

  // ── Find tenant ──────────────────────────────────────────────────────────
  const tenant = await tenants.findOne({ slug: TENANT_SLUG });
  if (!tenant) {
    console.error(`❌ Tenant "${TENANT_SLUG}" not found. Run bootstrap-education-tenant.ts first.`);
    process.exit(1);
  }
  const tenantId = tenant._id as Types.ObjectId;
  const adminUser = await users.findOne({ tenantId, email: "admin@educacion.demo" });
  const createdBy = adminUser?._id ?? tenantId;

  console.log(`📍 Tenant: ${tenant.name} (${tenantId})\n`);

  // ── Idempotency: skip if already seeded ──────────────────────────────────
  const existingClassroomCount = await classrooms.countDocuments({ tenantId, isDeleted: { $ne: true } });
  if (existingClassroomCount >= 4) {
    console.log("⏭️  Demo data already seeded. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  // ── Find TEACHER role ────────────────────────────────────────────────────
  const teacherRole = await roles.findOne({ name: "TEACHER", tenantId });
  if (!teacherRole) {
    console.error("❌ TEACHER role not found. Run bootstrap-teacher-role.ts first.");
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. TEACHERS — Customer + EmployeeProfile + User (TEACHER role)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("👩‍🏫 Creating teachers...");
  const teacherIds: Types.ObjectId[] = [];
  const teacherUserIds: Types.ObjectId[] = [];
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  for (const [i, t] of TEACHER_DEFS.entries()) {
    // Customer
    const custId = oid();
    await customers.insertOne({
      _id: custId,
      customerNumber: `C-PROF-${String(i + 1).padStart(3, "0")}`,
      name: t.firstName,
      lastName: t.lastName,
      email: t.email,
      customerType: "individual",
      source: "manual",
      status: "active",
      tenantId,
      createdBy,
      contacts: [],
      addresses: [],
      paymentMethods: [],
      segments: [],
      interactions: [],
      communicationEvents: [],
      metrics: { totalOrders: 0, totalSpent: 0, totalSpentUSD: 0, averageOrderValue: 0, orderFrequency: 0, lifetimeValue: 0, returnRate: 0, cancellationRate: 0, paymentDelayDays: 0 },
      createdAt: now(), updatedAt: now(),
    });

    // EmployeeProfile
    const empId = oid();
    await employees.insertOne({
      _id: empId,
      tenantId,
      customerId: custId,
      employeeNumber: t.empNum,
      position: "Docente",
      department: "Académico",
      status: "active",
      hireDate: daysAgo(365),
      tags: ["docente", t.subject.toLowerCase().split(" ")[0]],
      createdAt: now(), updatedAt: now(),
    });
    teacherIds.push(empId);

    // User with TEACHER role
    const userId = oid();
    await users.insertOne({
      _id: userId,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      password: passwordHash,
      role: teacherRole._id,
      tenantId,
      isActive: true,
      emailVerified: true,
      loginAttempts: 0,
      createdAt: now(), updatedAt: now(),
    });
    teacherUserIds.push(userId);

    // Membership
    await memberships.insertOne({
      userId, tenantId, roleId: teacherRole._id,
      status: "active", isDefault: true, joinedAt: now(),
      createdAt: now(), updatedAt: now(),
    });

    // Update EmployeeProfile with userId
    await employees.updateOne({ _id: empId }, { $set: { userId } });
    console.log(`   ✅ ${t.firstName} ${t.lastName} (${t.subject})`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CLASSROOMS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n🏫 Creating classrooms...");
  const classroomIds: Types.ObjectId[] = [];
  for (const [i, c] of CLASSROOM_DEFS.entries()) {
    const id = oid();
    await classrooms.insertOne({
      _id: id, tenantId, name: c.name, grade: c.grade,
      section: c.section, academicYear: ACADEMIC_YEAR,
      capacity: c.capacity, tutorId: teacherIds[i % teacherIds.length],
      studentIds: [], subjectIds: [], isDeleted: false, createdBy,
      createdAt: now(), updatedAt: now(),
    });
    classroomIds.push(id);
    console.log(`   ✅ ${c.name}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SUBJECTS (6 per classroom)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n📚 Creating subjects...");
  // subjectMap[classroomIndex][subjectCode] = subjectId
  const subjectMap: Record<number, Record<string, Types.ObjectId>> = {};

  for (const [ci, classroomId] of classroomIds.entries()) {
    subjectMap[ci] = {};
    const subjIds: Types.ObjectId[] = [];
    for (const s of SUBJECT_DEFS) {
      const id = oid();
      await subjects.insertOne({
        _id: id, tenantId, classroomId,
        teacherId: teacherIds[s.teacherIdx],
        name: s.name, code: s.code,
        periodsPerWeek: s.periodsPerWeek,
        gradeScale: { min: 1, max: 20, passing: 10 },
        academicYear: ACADEMIC_YEAR,
        isDeleted: false, createdBy,
        createdAt: now(), updatedAt: now(),
      });
      subjectMap[ci][s.code] = id;
      subjIds.push(id);
    }
    await classrooms.updateOne({ _id: classroomId }, { $set: { subjectIds: subjIds } });
  }
  console.log(`   ✅ ${SUBJECT_DEFS.length} subjects × ${classroomIds.length} classrooms`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SCHEDULES (Lun–Vie, same template per classroom)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n📅 Creating schedules...");
  const effectiveFrom = daysAgo(90);
  let scheduleCount = 0;
  for (const [ci, classroomId] of classroomIds.entries()) {
    for (const slot of SCHEDULE_SLOTS) {
      const subjectId = subjectMap[ci][slot.subjCode];
      const teacherIdx = SUBJECT_DEFS.find(s => s.code === slot.subjCode)!.teacherIdx;
      await schedules.insertOne({
        _id: oid(), tenantId, classroomId, subjectId,
        teacherId: teacherIds[teacherIdx],
        dayOfWeek: slot.day, startTime: slot.start, endTime: slot.end,
        academicYear: ACADEMIC_YEAR, effectiveFrom,
        isDeleted: false, createdBy,
        createdAt: now(), updatedAt: now(),
      });
      scheduleCount++;
    }
  }
  console.log(`   ✅ ${scheduleCount} schedule slots`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. STUDENTS (8-8-8-7 per classroom)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n🎒 Creating students...");
  const studentsPerClassroom = [8, 8, 8, 7];
  // studentsByClassroom[classroomIndex] = [{_id, ...}]
  const studentsByClassroom: Array<Array<{ _id: Types.ObjectId; firstName: string; lastName: string }>> = [];
  let nameIdx = 0;
  let enrollNum = 1;

  for (const [ci, classroomId] of classroomIds.entries()) {
    const classStudents: Array<{ _id: Types.ObjectId; firstName: string; lastName: string }> = [];
    const count = studentsPerClassroom[ci];
    for (let si = 0; si < count; si++) {
      const [fn, ln] = STUDENT_NAMES[nameIdx];
      const guardianName = GUARDIAN_NAMES[nameIdx];
      nameIdx++;
      const id = oid();
      const enrollDate = daysAgo(180 + Math.floor(Math.random() * 30));
      const studentHash = await bcrypt.hash(`alumno${String(enrollNum).padStart(4, "0")}`, 10);
      await students.insertOne({
        _id: id, tenantId,
        firstName: fn, lastName: ln,
        email: `${fn.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${ln.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "")}@alumnos.demo`,
        passwordHash: studentHash,
        enrollmentNumber: String(enrollNum).padStart(4, "0"),
        enrollmentDate: enrollDate,
        status: "active",
        classroomId,
        academicYear: ACADEMIC_YEAR,
        guardian: {
          name: guardianName,
          phone: `+584${String(Math.floor(10000000 + Math.random() * 89999999))}`,
          whatsapp: `+584${String(Math.floor(10000000 + Math.random() * 89999999))}`,
        },
        isDeleted: false, createdBy,
        createdAt: now(), updatedAt: now(),
      });
      classStudents.push({ _id: id, firstName: fn, lastName: ln });
      enrollNum++;
    }
    // Link students to classroom
    await classrooms.updateOne(
      { _id: classroomId },
      { $set: { studentIds: classStudents.map(s => s._id) } },
    );
    studentsByClassroom.push(classStudents);
    console.log(`   ✅ ${CLASSROOM_DEFS[ci].name}: ${count} alumnos`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. GRADES (Lapso 1 + Lapso 2, published)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n📝 Creating grades...");
  const periods = ["Lapso 1", "Lapso 2"];
  let gradeCount = 0;
  const publishedAt = daysAgo(10);

  for (const [ci, classroomId] of classroomIds.entries()) {
    for (const student of studentsByClassroom[ci]) {
      for (const subj of SUBJECT_DEFS) {
        const subjectId = subjectMap[ci][subj.code];
        for (const period of periods) {
          const score = grade(8, 19);
          await grades.insertOne({
            _id: oid(), tenantId,
            studentId: student._id, subjectId, classroomId,
            teacherId: teacherIds[subj.teacherIdx],
            period, academicYear: ACADEMIC_YEAR,
            score, maxScore: 20, isPassing: score >= 10,
            isPublished: true, publishedAt, publishedBy: createdBy,
            isDeleted: false, createdBy,
            createdAt: now(), updatedAt: now(),
          });
          gradeCount++;
        }
      }
    }
  }
  console.log(`   ✅ ${gradeCount} calificaciones`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ATTENDANCE (últimos 10 días hábiles, por salón)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n✋ Creating attendance...");
  const days = schoolDays(10);
  let attendanceCount = 0;

  for (const [ci, classroomId] of classroomIds.entries()) {
    for (const day of days) {
      const entries = studentsByClassroom[ci].map((student, idx) => {
        // 85% present, 10% late, 5% absent
        const r = Math.random();
        const status = r < 0.05 ? "absent" : r < 0.15 ? "late" : "present";
        return { studentId: student._id, status };
      });
      // Use main teacher (tutor) as attendance recorder
      const teacherId = teacherIds[ci % teacherIds.length];
      await attendance.insertOne({
        _id: oid(), tenantId, classroomId,
        teacherId, date: day, entries,
        isDeleted: false, createdBy,
        createdAt: now(), updatedAt: now(),
      });
      attendanceCount++;
    }
  }
  console.log(`   ✅ ${attendanceCount} registros de asistencia (${days.length} días × ${classroomIds.length} salones)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. TUITION FEES (matrícula + Oct + Nov + Dic)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n💳 Creating tuition fees...");
  let tuitionCount = 0;
  const allStudents = studentsByClassroom.flat();

  for (const [ci, classroomId] of classroomIds.entries()) {
    for (const student of studentsByClassroom[ci]) {
      // Matrícula — paid
      await tuition.insertOne({
        _id: oid(), tenantId, studentId: student._id, classroomId,
        type: "enrollment", academicYear: ACADEMIC_YEAR,
        description: "Matrícula 2024-2025",
        amount: 150, currency: "USD",
        dueDate: daysAgo(180),
        status: "paid",
        notificationsCount: 0, isDeleted: false, createdBy,
        createdAt: now(), updatedAt: now(),
      });
      tuitionCount++;

      // Octubre — paid
      await tuition.insertOne({
        _id: oid(), tenantId, studentId: student._id, classroomId,
        type: "monthly", academicYear: ACADEMIC_YEAR, month: 10,
        description: "Mensualidad Octubre 2024",
        amount: 80, currency: "USD",
        dueDate: new Date("2024-10-05"),
        status: "paid",
        notificationsCount: 0, isDeleted: false, createdBy,
        createdAt: now(), updatedAt: now(),
      });
      tuitionCount++;

      // Noviembre — paid 80%, overdue 20%
      const novStatus = Math.random() < 0.8 ? "paid" : "overdue";
      await tuition.insertOne({
        _id: oid(), tenantId, studentId: student._id, classroomId,
        type: "monthly", academicYear: ACADEMIC_YEAR, month: 11,
        description: "Mensualidad Noviembre 2024",
        amount: 80, currency: "USD",
        dueDate: new Date("2024-11-05"),
        status: novStatus,
        notificationsCount: novStatus === "overdue" ? 2 : 0,
        lastNotifiedAt: novStatus === "overdue" ? daysAgo(5) : undefined,
        isDeleted: false, createdBy,
        createdAt: now(), updatedAt: now(),
      });
      tuitionCount++;

      // Diciembre — pending
      await tuition.insertOne({
        _id: oid(), tenantId, studentId: student._id, classroomId,
        type: "monthly", academicYear: ACADEMIC_YEAR, month: 12,
        description: "Mensualidad Diciembre 2024",
        amount: 80, currency: "USD",
        dueDate: new Date("2024-12-05"),
        status: "pending",
        notificationsCount: 0, isDeleted: false, createdBy,
        createdAt: now(), updatedAt: now(),
      });
      tuitionCount++;
    }
  }
  console.log(`   ✅ ${tuitionCount} cuotas`);

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("🎉 DEMO SEED COMPLETADO");
  console.log("═".repeat(60));
  console.log(`   Tenant   : ${tenant.name}`);
  console.log(`   Profesores: ${TEACHER_DEFS.length}`);
  console.log(`   Salones   : ${classroomIds.length}`);
  console.log(`   Materias  : ${SUBJECT_DEFS.length * classroomIds.length}`);
  console.log(`   Alumnos   : ${allStudents.length}`);
  console.log(`   Notas     : ${gradeCount}`);
  console.log(`   Asistencias: ${attendanceCount}`);
  console.log(`   Cuotas    : ${tuitionCount}`);
  console.log("\n📋 Credenciales de acceso:");
  console.log(`   Admin        : admin@educacion.demo / ${ADMIN_PASSWORD}`);
  TEACHER_DEFS.forEach(t => {
    console.log(`   ${t.subject.padEnd(25)}: ${t.email} / ${ADMIN_PASSWORD}`);
  });
  console.log("\n   Alumnos (ejemplo): sofia.pedraza@alumnos.demo / alumno0001");

  await mongoose.disconnect();
  console.log("\n✅ Done.");
}

run().catch(err => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
