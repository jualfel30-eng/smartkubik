import { ClientSession } from "mongoose";

// NOTA: Las referencias a los DTOs se ajustarán en pasos posteriores.
// Por ahora, usamos 'any' para definir el contrato de la interfaz.

export const IInventoryServiceProvider = "IInventoryService";

export interface IInventoryService {
  create(
    createInventoryDto: any,
    user: any,
    session?: ClientSession,
  ): Promise<any>;
  createMovement(
    movementDto: any,
    user: any,
    session?: ClientSession,
  ): Promise<any>;
  reserveInventory(
    reserveDto: any,
    user: any,
    session?: ClientSession,
  ): Promise<void>;
  releaseInventory(
    releaseDto: any,
    user: any,
    session?: ClientSession,
  ): Promise<void>;
  commitInventory(
    order: any,
    user: any,
    session?: ClientSession,
  ): Promise<void>;
  adjustInventory(
    adjustDto: any,
    user: any,
    session?: ClientSession,
  ): Promise<any>;
  addStockFromPurchase(
    item: any,
    user: any,
    session?: ClientSession,
  ): Promise<void>;
  findAll(query: any, tenantId: string): Promise<any>;
  findOne(id: string, tenantId: string): Promise<any | null>;
  findByProductSku(productSku: string, tenantId: string): Promise<any | null>;
  getMovements(query: any, tenantId: string): Promise<any>;
  getLowStockAlerts(tenantId: string): Promise<any>;
  getExpirationAlerts(tenantId: string, days?: number): Promise<any>;
  getInventorySummary(tenantId: string): Promise<any>;
}
