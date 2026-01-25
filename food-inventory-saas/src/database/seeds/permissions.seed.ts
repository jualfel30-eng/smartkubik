import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

interface Permission {
  name: string;
  description: string;
  module: string;
}

@Injectable()
export class PermissionsSeed {
  private readonly logger = new Logger(PermissionsSeed.name);

  // Todos los permisos que necesita el sistema
  private readonly permissions: Permission[] = [
    // Dashboard
    {
      name: "dashboard_read",
      description: "Ver dashboard",
      module: "dashboard",
    },

    // Customers
    {
      name: "customers_read",
      description: "Ver clientes",
      module: "customers",
    },
    {
      name: "customers_create",
      description: "Crear clientes",
      module: "customers",
    },
    {
      name: "customers_update",
      description: "Actualizar clientes",
      module: "customers",
    },
    {
      name: "customers_delete",
      description: "Eliminar clientes",
      module: "customers",
    },

    // Orders
    { name: "orders_read", description: "Ver órdenes", module: "orders" },
    { name: "orders_create", description: "Crear órdenes", module: "orders" },
    {
      name: "orders_update",
      description: "Actualizar órdenes",
      module: "orders",
    },
    {
      name: "orders_delete",
      description: "Eliminar órdenes",
      module: "orders",
    },
    {
      name: "apply_discounts",
      description: "Aplicar descuentos a productos y órdenes",
      module: "orders",
    },

    // Products
    {
      name: "products_read",
      description: "Ver productos",
      module: "products",
    },
    {
      name: "products_create",
      description: "Crear productos",
      module: "products",
    },
    {
      name: "products_update",
      description: "Actualizar productos",
      module: "products",
    },
    {
      name: "products_delete",
      description: "Eliminar productos",
      module: "products",
    },
    {
      name: "products_write",
      description: "Crear y modificar configuraciones de productos",
      module: "products",
    },

    // Inventory
    {
      name: "inventory_read",
      description: "Ver inventario",
      module: "inventory",
    },
    {
      name: "inventory_update",
      description: "Actualizar inventario",
      module: "inventory",
    },
    {
      name: "inventory_write",
      description: "Registrar movimientos y consumos de inventario",
      module: "inventory",
    },

    // Users
    { name: "users_read", description: "Ver usuarios", module: "users" },
    { name: "users_create", description: "Crear usuarios", module: "users" },
    {
      name: "users_update",
      description: "Actualizar usuarios",
      module: "users",
    },
    {
      name: "users_delete",
      description: "Eliminar usuarios",
      module: "users",
    },

    // Roles
    { name: "roles_read", description: "Ver roles", module: "roles" },
    { name: "roles_create", description: "Crear roles", module: "roles" },
    {
      name: "roles_update",
      description: "Actualizar roles",
      module: "roles",
    },
    { name: "roles_delete", description: "Eliminar roles", module: "roles" },

    // Reports
    { name: "reports_read", description: "Ver reportes", module: "reports" },

    // Settings
    {
      name: "settings_read",
      description: "Ver configuración",
      module: "settings",
    },
    {
      name: "settings_update",
      description: "Actualizar configuración",
      module: "settings",
    },
    {
      name: "tenant_settings_read",
      description: "Ver configuración del tenant",
      module: "settings",
    },
    {
      name: "tenant_settings_update",
      description: "Actualizar configuración del tenant",
      module: "settings",
    },

    // Accounting
    {
      name: "accounting_read",
      description: "Ver contabilidad",
      module: "accounting",
    },
    {
      name: "accounting_create",
      description: "Crear registros contables",
      module: "accounting",
    },
    {
      name: "accounting_update",
      description: "Actualizar registros contables",
      module: "accounting",
    },
    {
      name: "accounting_delete",
      description: "Eliminar registros contables",
      module: "accounting",
    },

    // Purchases
    {
      name: "purchases_read",
      description: "Ver compras",
      module: "purchases",
    },
    {
      name: "purchases_create",
      description: "Crear compras",
      module: "purchases",
    },
    {
      name: "purchases_update",
      description: "Actualizar compras",
      module: "purchases",
    },
    {
      name: "purchases_delete",
      description: "Eliminar compras",
      module: "purchases",
    },

    // Events/Calendar
    {
      name: "events_read",
      description: "Ver eventos/calendario",
      module: "events",
    },
    { name: "events_create", description: "Crear eventos", module: "events" },
    {
      name: "events_update",
      description: "Actualizar eventos",
      module: "events",
    },
    {
      name: "events_delete",
      description: "Eliminar eventos",
      module: "events",
    },

    // Payables
    {
      name: "payables_read",
      description: "Ver cuentas por pagar",
      module: "payables",
    },
    {
      name: "payables_create",
      description: "Crear cuentas por pagar",
      module: "payables",
    },
    {
      name: "payables_update",
      description: "Actualizar cuentas por pagar",
      module: "payables",
    },
    {
      name: "payables_delete",
      description: "Eliminar cuentas por pagar",
      module: "payables",
    },

    // Production Module (Manufacturing vertical)
    {
      name: "production_read",
      description: "Ver módulo de producción",
      module: "production",
    },
    {
      name: "production_orders_read",
      description: "Ver órdenes de producción",
      module: "production",
    },
    {
      name: "production_orders_create",
      description: "Crear órdenes de producción",
      module: "production",
    },
    {
      name: "production_orders_update",
      description: "Actualizar órdenes de producción",
      module: "production",
    },
    {
      name: "production_orders_delete",
      description: "Eliminar órdenes de producción",
      module: "production",
    },
    {
      name: "production_orders_start",
      description: "Iniciar órdenes de producción",
      module: "production",
    },
    {
      name: "production_orders_complete",
      description: "Completar órdenes de producción",
      module: "production",
    },
    {
      name: "production_orders_cancel",
      description: "Cancelar órdenes de producción",
      module: "production",
    },
    {
      name: "bom_read",
      description: "Ver listas de materiales (BOM)",
      module: "production",
    },
    {
      name: "bom_create",
      description: "Crear BOMs",
      module: "production",
    },
    {
      name: "bom_update",
      description: "Actualizar BOMs",
      module: "production",
    },
    {
      name: "bom_delete",
      description: "Eliminar BOMs",
      module: "production",
    },
    {
      name: "routing_read",
      description: "Ver rutas de producción",
      module: "production",
    },
    {
      name: "routing_create",
      description: "Crear rutas de producción",
      module: "production",
    },
    {
      name: "routing_update",
      description: "Actualizar rutas de producción",
      module: "production",
    },
    {
      name: "routing_delete",
      description: "Eliminar rutas de producción",
      module: "production",
    },
    {
      name: "work_centers_read",
      description: "Ver centros de trabajo",
      module: "production",
    },
    {
      name: "work_centers_create",
      description: "Crear centros de trabajo",
      module: "production",
    },
    {
      name: "work_centers_update",
      description: "Actualizar centros de trabajo",
      module: "production",
    },
    {
      name: "work_centers_delete",
      description: "Eliminar centros de trabajo",
      module: "production",
    },
    {
      name: "mrp_read",
      description: "Ver planificación de materiales (MRP)",
      module: "production",
    },
    {
      name: "mrp_run",
      description: "Ejecutar MRP",
      module: "production",
    },
    {
      name: "mrp_write",
      description: "Crear/actualizar registros MRP",
      module: "production",
    },

    // Restaurant Module
    {
      name: "restaurant_read",
      description: "Ver módulo de restaurante",
      module: "restaurant",
    },
    {
      name: "restaurant_write",
      description: "Gestionar módulo de restaurante",
      module: "restaurant",
    },

    // Chat Module
    {
      name: "chat_read",
      description: "Ver conversaciones y mensajes",
      module: "communication",
    },
    {
      name: "chat_write",
      description: "Enviar mensajes y gestionar conversaciones",
      module: "communication",
    },

    // Marketing Module
    {
      name: "marketing_read",
      description: "Ver campañas de marketing y analíticas",
      module: "marketing",
    },
    {
      name: "marketing_write",
      description: "Crear y gestionar campañas de marketing",
      module: "marketing",
    },

    // Payroll Module
    {
      name: "payroll_employees_read",
      description: "Ver información de nómina de empleados",
      module: "payroll",
    },
    {
      name: "payroll_employees_write",
      description: "Gestionar nómina de empleados",
      module: "payroll",
    },

    // Tips Module (CORE - available for all verticals)
    {
      name: "tips_read",
      description: "Ver propinas/comisiones",
      module: "tips",
    },
    {
      name: "tips_write",
      description: "Registrar y gestionar propinas/comisiones",
      module: "tips",
    },
    {
      name: "tips_distribute",
      description: "Distribuir propinas/comisiones",
      module: "tips",
    },

    // CRM / Opportunities (Phase 1.2)
    {
      name: "opportunities_read",
      description: "Ver oportunidades (propias)",
      module: "opportunities",
    },
    {
      name: "opportunities_create",
      description: "Crear oportunidades",
      module: "opportunities",
    },
    {
      name: "opportunities_update",
      description: "Actualizar oportunidades",
      module: "opportunities",
    },
    {
      name: "opportunities_delete",
      description: "Eliminar oportunidades",
      module: "opportunities",
    },
    {
      name: "opportunities_view_all",
      description: "Ver todas las oportunidades del tenant (Manager)",
      module: "opportunities",
    },

    // Commissions Module
    {
      name: "commissions_read",
      description: "Ver planes y registros de comisiones",
      module: "commissions",
    },
    {
      name: "commissions_write",
      description: "Crear y gestionar planes de comisiones",
      module: "commissions",
    },
    {
      name: "commissions_approve",
      description: "Aprobar o rechazar comisiones pendientes",
      module: "commissions",
    },

    // Goals Module
    {
      name: "goals_read",
      description: "Ver metas de ventas y progreso",
      module: "goals",
    },
    {
      name: "goals_write",
      description: "Crear y gestionar metas de ventas",
      module: "goals",
    },

    // Bonuses Module
    {
      name: "bonuses_read",
      description: "Ver bonos de empleados",
      module: "bonuses",
    },
    {
      name: "bonuses_write",
      description: "Crear y gestionar bonos de empleados",
      module: "bonuses",
    },
    {
      name: "bonuses_approve",
      description: "Aprobar o rechazar bonos pendientes",
      module: "bonuses",
    },
  ];

  constructor(@InjectConnection() private readonly connection: Connection) { }

  async seed(): Promise<void> {
    try {
      const db = this.connection.db;
      const permissionsCollection = db.collection("permissions");

      // Verificar si ya existen permisos
      const existingCount = await permissionsCollection.countDocuments();

      if (existingCount > 0) {
        this.logger.log(
          `✅ Permissions already seeded (${existingCount} found). Skipping...`,
        );
        return;
      }

      this.logger.log(`🌱 Seeding ${this.permissions.length} permissions...`);

      const permissionsToInsert = this.permissions.map((p) => {
        // Extract action from permission name (e.g., "dashboard_read" -> "read")
        const parts = p.name.split("_");
        const action = parts[parts.length - 1]; // Last part is the action

        return {
          ...p,
          action,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      await permissionsCollection.insertMany(permissionsToInsert);

      this.logger.log(
        `✅ Successfully seeded ${this.permissions.length} permissions`,
      );
    } catch (error) {
      this.logger.error("❌ Error seeding permissions:", error.message);
      throw error;
    }
  }

  async getPermissionIds(permissionNames: string[]): Promise<any[]> {
    const db = this.connection.db;
    const permissions = await db
      .collection("permissions")
      .find({ name: { $in: permissionNames } })
      .toArray();

    return permissions.map((p) => p._id);
  }

  async getAllPermissionIds(): Promise<any[]> {
    const db = this.connection.db;
    const permissions = await db.collection("permissions").find({}).toArray();
    return permissions.map((p) => p._id);
  }
}
