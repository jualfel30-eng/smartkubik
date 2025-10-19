import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

interface Permission {
  name: string;
  description: string;
  category: string;
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
      category: "dashboard",
    },

    // Customers
    {
      name: "customers_read",
      description: "Ver clientes",
      category: "customers",
    },
    {
      name: "customers_create",
      description: "Crear clientes",
      category: "customers",
    },
    {
      name: "customers_update",
      description: "Actualizar clientes",
      category: "customers",
    },
    {
      name: "customers_delete",
      description: "Eliminar clientes",
      category: "customers",
    },

    // Orders
    { name: "orders_read", description: "Ver órdenes", category: "orders" },
    { name: "orders_create", description: "Crear órdenes", category: "orders" },
    {
      name: "orders_update",
      description: "Actualizar órdenes",
      category: "orders",
    },
    {
      name: "orders_delete",
      description: "Eliminar órdenes",
      category: "orders",
    },

    // Products
    {
      name: "products_read",
      description: "Ver productos",
      category: "products",
    },
    {
      name: "products_create",
      description: "Crear productos",
      category: "products",
    },
    {
      name: "products_update",
      description: "Actualizar productos",
      category: "products",
    },
    {
      name: "products_delete",
      description: "Eliminar productos",
      category: "products",
    },

    // Inventory
    {
      name: "inventory_read",
      description: "Ver inventario",
      category: "inventory",
    },
    {
      name: "inventory_update",
      description: "Actualizar inventario",
      category: "inventory",
    },

    // Users
    { name: "users_read", description: "Ver usuarios", category: "users" },
    { name: "users_create", description: "Crear usuarios", category: "users" },
    {
      name: "users_update",
      description: "Actualizar usuarios",
      category: "users",
    },
    {
      name: "users_delete",
      description: "Eliminar usuarios",
      category: "users",
    },

    // Roles
    { name: "roles_read", description: "Ver roles", category: "roles" },
    { name: "roles_create", description: "Crear roles", category: "roles" },
    {
      name: "roles_update",
      description: "Actualizar roles",
      category: "roles",
    },
    { name: "roles_delete", description: "Eliminar roles", category: "roles" },

    // Reports
    { name: "reports_read", description: "Ver reportes", category: "reports" },

    // Settings
    {
      name: "settings_read",
      description: "Ver configuración",
      category: "settings",
    },
    {
      name: "settings_update",
      description: "Actualizar configuración",
      category: "settings",
    },
    {
      name: "tenant_settings_read",
      description: "Ver configuración del tenant",
      category: "settings",
    },
    {
      name: "tenant_settings_update",
      description: "Actualizar configuración del tenant",
      category: "settings",
    },

    // Accounting
    {
      name: "accounting_read",
      description: "Ver contabilidad",
      category: "accounting",
    },
    {
      name: "accounting_create",
      description: "Crear registros contables",
      category: "accounting",
    },
    {
      name: "accounting_update",
      description: "Actualizar registros contables",
      category: "accounting",
    },
    {
      name: "accounting_delete",
      description: "Eliminar registros contables",
      category: "accounting",
    },

    // Purchases
    {
      name: "purchases_read",
      description: "Ver compras",
      category: "purchases",
    },
    {
      name: "purchases_create",
      description: "Crear compras",
      category: "purchases",
    },
    {
      name: "purchases_update",
      description: "Actualizar compras",
      category: "purchases",
    },
    {
      name: "purchases_delete",
      description: "Eliminar compras",
      category: "purchases",
    },

    // Events/Calendar
    {
      name: "events_read",
      description: "Ver eventos/calendario",
      category: "events",
    },
    { name: "events_create", description: "Crear eventos", category: "events" },
    {
      name: "events_update",
      description: "Actualizar eventos",
      category: "events",
    },
    {
      name: "events_delete",
      description: "Eliminar eventos",
      category: "events",
    },

    // Payables
    {
      name: "payables_read",
      description: "Ver cuentas por pagar",
      category: "payables",
    },
    {
      name: "payables_create",
      description: "Crear cuentas por pagar",
      category: "payables",
    },
    {
      name: "payables_update",
      description: "Actualizar cuentas por pagar",
      category: "payables",
    },
    {
      name: "payables_delete",
      description: "Eliminar cuentas por pagar",
      category: "payables",
    },
  ];

  constructor(@InjectConnection() private readonly connection: Connection) {}

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

      const permissionsToInsert = this.permissions.map((p) => ({
        ...p,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

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
