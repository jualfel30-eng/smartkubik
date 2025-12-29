import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { PermissionsSeed } from "./permissions.seed";

interface Role {
  name: string;
  displayName: string;
  description: string;
  isSystemRole: boolean;
  permissionNames: string[];
}

@Injectable()
export class RolesSeed {
  private readonly logger = new Logger(RolesSeed.name);

  // Roles básicos del sistema
  private readonly roles: Role[] = [
    {
      name: "admin",
      displayName: "Administrador",
      description: "Acceso completo al sistema",
      isSystemRole: true,
      permissionNames: [], // Se llenará con todos los permisos
    },
    {
      name: "manager",
      displayName: "Gerente",
      description: "Acceso a gestión operativa",
      isSystemRole: true,
      permissionNames: [
        "dashboard_read",
        "customers_read",
        "customers_create",
        "customers_update",
        "orders_read",
        "orders_create",
        "orders_update",
        "products_read",
        "products_create",
        "products_update",
        "products_write",
        "inventory_read",
        "inventory_update",
        "inventory_write",
        "reports_read",
        "accounting_read",
        "purchases_read",
        "purchases_create",
        "purchases_update",
        "events_read",
        "events_create",
        "events_update",
        "payroll_employees_read",
        "payroll_employees_read",
        "payroll_employees_write",
        "opportunities_read",
        "opportunities_create",
        "opportunities_update",
        "opportunities_delete",
        "opportunities_view_all",
      ],
    },
    {
      name: "employee",
      displayName: "Empleado",
      description: "Acceso básico operativo",
      isSystemRole: true,
      permissionNames: [
        "dashboard_read",
        "customers_read",
        "orders_read",
        "orders_create",
        "products_read",
        "inventory_read",
        "events_read",
        "opportunities_read",
        "opportunities_create",
        "opportunities_update",
      ],
    },
  ];

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly permissionsSeed: PermissionsSeed,
  ) { }

  async seed(): Promise<void> {
    try {
      const db = this.connection.db;
      const rolesCollection = db.collection("roles");

      // Verificar si ya existen roles del sistema
      const existingSystemRoles = await rolesCollection.countDocuments({
        isSystemRole: true,
      });

      if (existingSystemRoles > 0) {
        this.logger.log(
          `✅ System roles already seeded (${existingSystemRoles} found). Skipping...`,
        );
        return;
      }

      this.logger.log(`🌱 Seeding ${this.roles.length} system roles...`);

      // Obtener todos los IDs de permisos para el rol admin
      const allPermissionIds = await this.permissionsSeed.getAllPermissionIds();

      const rolesToInsert: any[] = [];

      for (const role of this.roles) {
        let permissionIds;

        if (role.name === "admin") {
          // Admin tiene todos los permisos
          permissionIds = allPermissionIds;
        } else {
          // Otros roles tienen permisos específicos
          permissionIds = await this.permissionsSeed.getPermissionIds(
            role.permissionNames,
          );
        }

        rolesToInsert.push({
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          isSystemRole: role.isSystemRole,
          permissions: permissionIds,
          tenantId: null, // Los roles del sistema no pertenecen a ningún tenant
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await rolesCollection.insertMany(rolesToInsert);

      this.logger.log(
        `✅ Successfully seeded ${this.roles.length} system roles`,
      );
    } catch (error) {
      this.logger.error("❌ Error seeding roles:", error.message);
      throw error;
    }
  }
}
