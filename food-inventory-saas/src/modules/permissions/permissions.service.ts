import { Injectable } from "@nestjs/common";
import { ALL_PERMISSIONS } from "./constants";

@Injectable()
export class PermissionsService {
  findAll() {
    return ALL_PERMISSIONS;
  }

  findByModules(modules: string[]) {
    if (!modules || modules.length === 0) {
      return [];
    }

    const lowercasedModules = modules.map((m) => m.toLowerCase());
    const coreModules = [
      "dashboard",
      "users",
      "roles",
      "tenant",
      "events",
      "crm",
      "products",
      "payables",
      "storefront",
      "accounting",
      "cash", // Cash Register module (cierre de caja)
      "billing", // Billing/Invoicing module (facturación)
    ];

    const allRequiredModules = [
      ...new Set([...lowercasedModules, ...coreModules]),
    ];

    return ALL_PERMISSIONS.filter((permission) => {
      const moduleName = permission.split("_")[0];
      return allRequiredModules.includes(moduleName.toLowerCase());
    });
  }
}
