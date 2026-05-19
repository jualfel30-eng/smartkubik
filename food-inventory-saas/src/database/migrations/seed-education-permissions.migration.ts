import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

@Injectable()
export class SeedEducationPermissionsMigration {
  private readonly logger = new Logger(SeedEducationPermissionsMigration.name);

  private readonly PERMISSIONS = [
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

  private readonly ROLES_TO_GRANT = ["admin"];

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run(): Promise<{
    permissionsInserted: number;
    alreadyExisted: number;
    rolesUpdated: number;
  }> {
    const db = this.connection.db;
    const permissions = db.collection("permissions");
    const roles = db.collection("roles");

    this.logger.log("🔄 Seeding education vertical permissions...");

    let permissionsInserted = 0;
    let alreadyExisted = 0;
    const insertedIds: any[] = [];

    for (const perm of this.PERMISSIONS) {
      const existing = await permissions.findOne({ name: perm.name });

      if (existing) {
        this.logger.log(`⏭️  Already exists: ${perm.name}`);
        alreadyExisted++;
        insertedIds.push(existing._id);
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

      this.logger.log(`✅ Inserted: ${perm.name}`);
      permissionsInserted++;
      insertedIds.push(result.insertedId);
    }

    // Grant to admin roles via $addToSet (idempotent)
    const grant = await roles.updateMany(
      { name: { $in: this.ROLES_TO_GRANT } },
      { $addToSet: { permissions: { $each: insertedIds } } } as any,
    );

    this.logger.log(
      `✅ Education permissions seeded — inserted: ${permissionsInserted}, existed: ${alreadyExisted}, roles updated: ${grant.modifiedCount}`,
    );

    return { permissionsInserted, alreadyExisted, rolesUpdated: grant.modifiedCount };
  }
}
