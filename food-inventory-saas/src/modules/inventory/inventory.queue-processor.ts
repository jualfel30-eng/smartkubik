import { Injectable, Logger } from "@nestjs/common";
import { TaskQueueService } from "../task-queue/task-queue.service";
import { InventoryService } from "./inventory.service";
import { InventoryMaintenanceJobData } from "../task-queue/task-queue.types";

@Injectable()
export class InventoryQueueProcessor {
  private readonly logger = new Logger(InventoryQueueProcessor.name);

  constructor(
    private readonly taskQueueService: TaskQueueService,
    private readonly inventoryService: InventoryService,
  ) {
    this.taskQueueService.registerHandler(
      "inventory-maintenance",
      (payload) => this.handleInventoryMaintenance(payload as InventoryMaintenanceJobData),
    );
  }

  private async handleInventoryMaintenance(
    payload: InventoryMaintenanceJobData,
  ): Promise<void> {
    try {
      await this.inventoryService.runMaintenanceJob(payload);
    } catch (error) {
      this.logger.error(
        `Error procesando mantenimiento de inventario ${payload.inventoryId}: ${
          error instanceof Error ? error.message : error
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
