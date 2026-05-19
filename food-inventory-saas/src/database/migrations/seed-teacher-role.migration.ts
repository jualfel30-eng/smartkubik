import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

@Injectable()
export class SeedTeacherRoleMigration {
  private readonly logger = new Logger(SeedTeacherRoleMigration.name);

  private readonly TEACHER_PERMISSIONS = [
    "edu_grades_read",
    "edu_grades_write",
    "edu_attendance_read",
    "edu_attendance_write",
    "edu_schedules_read",
    "edu_classrooms_read",
    "edu_students_read",
  ];

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run(): Promise<{ rolesCreated: number; rolesSkipped: number; tenantsProcessed: number }> {
    const db = this.connection.db;
    const permissions = db.collection("permissions");
    const roles = db.collection("roles");
    const tenants = db.collection("tenants");

    this.logger.log("🔄 Seeding TEACHER role for EDUCATION tenants...");

    const permDocs = await permissions
      .find({ name: { $in: this.TEACHER_PERMISSIONS } })
      .toArray();

    const permIds = permDocs.map((p) => p._id);
    const foundNames = permDocs.map((p) => p.name);
    const missing = this.TEACHER_PERMISSIONS.filter((n) => !foundNames.includes(n));
    if (missing.length > 0) {
      this.logger.warn(`⚠️  Missing permissions (will skip them): ${missing.join(", ")}`);
    }

    const educationTenants = await tenants
      .find({ vertical: "EDUCATION" })
      .project({ _id: 1 })
      .toArray();

    this.logger.log(`Found ${educationTenants.length} EDUCATION tenant(s)`);

    let rolesCreated = 0;
    let rolesSkipped = 0;

    for (const tenant of educationTenants) {
      const existing = await roles.findOne({ name: "TEACHER", tenantId: tenant._id });

      if (existing) {
        this.logger.log(`⏭️  TEACHER role already exists for tenant ${tenant._id}`);
        rolesSkipped++;
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

      this.logger.log(`✅ TEACHER role created for tenant ${tenant._id}`);
      rolesCreated++;
    }

    this.logger.log(
      `✅ TEACHER role migration done — created: ${rolesCreated}, skipped: ${rolesSkipped}, tenants: ${educationTenants.length}`,
    );

    return {
      rolesCreated,
      rolesSkipped,
      tenantsProcessed: educationTenants.length,
    };
  }
}
