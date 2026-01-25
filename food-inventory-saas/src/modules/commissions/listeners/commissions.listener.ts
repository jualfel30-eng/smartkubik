import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { CommissionService } from "../services/commission.service";
import { GoalService } from "../services/goal.service";
import { BonusService } from "../services/bonus.service";

/**
 * Evento emitido cuando una orden es completada/pagada
 */
interface OrderCompletedEvent {
  orderId: string;
  orderNumber: string;
  tenantId: string;
  totalAmount: number;
  subtotal: number;
  salesPersonId?: string;
  assignedWaiterId?: string;
  createdBy?: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    category?: string;
  }>;
}

/**
 * Evento emitido cuando una orden es cancelada
 */
interface OrderCancelledEvent {
  orderId: string;
  tenantId: string;
}

/**
 * Evento emitido cuando se alcanza una meta
 */
interface GoalAchievedEvent {
  goalProgressId: string;
  tenantId: string;
  employeeId: string;
  goalId: string;
  achievementPercentage: number;
  bonusAmount: number;
  autoAwardBonus: boolean;
}

/**
 * Listener para eventos relacionados con comisiones
 *
 * Este listener escucha eventos del sistema y:
 * 1. Calcula comisiones cuando una orden es completada
 * 2. Actualiza progreso de metas cuando hay ventas
 * 3. Otorga bonos automáticamente cuando se alcanzan metas
 */
@Injectable()
export class CommissionsListener {
  private readonly logger = new Logger(CommissionsListener.name);

  constructor(
    private readonly commissionService: CommissionService,
    private readonly goalService: GoalService,
    private readonly bonusService: BonusService,
  ) {}

  /**
   * Evento: Orden completada (pagada)
   * Calcula comisión y actualiza progreso de metas
   */
  @OnEvent("order.completed")
  async handleOrderCompleted(event: OrderCompletedEvent) {
    this.logger.log(
      `Processing order.completed event for order ${event.orderNumber} in tenant ${event.tenantId}`,
    );

    try {
      // 1. Calcular comisión para la orden
      await this.calculateOrderCommission(event);

      // 2. Actualizar progreso de metas
      await this.updateGoalProgress(event);

      this.logger.log(
        `Successfully processed commissions for order ${event.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing commissions for order ${event.orderNumber}: ${error.message}`,
        error.stack,
      );
      // No lanzamos error para no interrumpir el flujo de la orden
    }
  }

  /**
   * Evento: Orden pagada (alias de order.completed)
   */
  @OnEvent("order.paid")
  async handleOrderPaid(event: OrderCompletedEvent) {
    // Reutilizamos la lógica de order.completed
    await this.handleOrderCompleted(event);
  }

  /**
   * Evento: Orden cancelada
   * Podría revertir comisiones si se implementa
   */
  @OnEvent("order.cancelled")
  async handleOrderCancelled(event: OrderCancelledEvent) {
    this.logger.log(
      `Processing order.cancelled event for order ${event.orderId} in tenant ${event.tenantId}`,
    );

    // TODO: Implementar reversión de comisiones si es necesario
    // Por ahora, las comisiones canceladas se manejan manualmente
    // o a través del proceso de aprobación

    this.logger.debug(
      `Order ${event.orderId} cancelled - commission reversal handled manually`,
    );
  }

  /**
   * Evento: Meta alcanzada
   * Otorga bono automáticamente si está configurado
   */
  @OnEvent("goal.achieved")
  async handleGoalAchieved(event: GoalAchievedEvent) {
    this.logger.log(
      `Processing goal.achieved event for progress ${event.goalProgressId} in tenant ${event.tenantId}`,
    );

    try {
      if (event.autoAwardBonus && event.bonusAmount > 0) {
        await this.bonusService.awardGoalBonus(
          event.goalProgressId,
          event.tenantId,
        );

        this.logger.log(
          `Auto-awarded bonus of $${event.bonusAmount} for goal progress ${event.goalProgressId}`,
        );
      } else {
        this.logger.log(
          `Goal achieved but bonus not auto-awarded (autoAwardBonus=${event.autoAwardBonus}, amount=${event.bonusAmount})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error awarding bonus for goal progress ${event.goalProgressId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Evento: Milestone de meta alcanzado
   * Útil para notificaciones
   */
  @OnEvent("goal.milestone.reached")
  async handleGoalMilestoneReached(event: {
    goalProgressId: string;
    tenantId: string;
    employeeId: string;
    milestone: number;
    currentPercentage: number;
  }) {
    this.logger.log(
      `Milestone ${event.milestone}% reached for goal progress ${event.goalProgressId}`,
    );

    // Aquí se podría emitir una notificación
    // Por ahora solo logueamos
  }

  /**
   * Calcular comisión para una orden
   */
  private async calculateOrderCommission(event: OrderCompletedEvent) {
    try {
      const result = await this.commissionService.calculateCommission(
        event.orderId,
        event.tenantId,
      );

      if (result) {
        this.logger.log(
          `Commission calculated for order ${event.orderNumber}: $${result.commissionAmount} (${result.commissionPercentage}%)`,
        );
      } else {
        this.logger.debug(
          `No commission calculated for order ${event.orderNumber} (no applicable plan or already calculated)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error calculating commission for order ${event.orderId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Actualizar progreso de metas de ventas
   */
  private async updateGoalProgress(event: OrderCompletedEvent) {
    const salesPersonId =
      event.salesPersonId || event.assignedWaiterId || event.createdBy;

    if (!salesPersonId) {
      this.logger.debug(
        `No salesperson identified for order ${event.orderNumber}, skipping goal progress`,
      );
      return;
    }

    try {
      const orderContribution = {
        orderId: event.orderId,
        orderNumber: event.orderNumber,
        amount: event.totalAmount,
        subtotal: event.subtotal,
        items: event.items,
      };

      await this.goalService.updateGoalProgressForOrder(
        salesPersonId,
        orderContribution,
        event.tenantId,
      );

      this.logger.log(
        `Goal progress updated for employee ${salesPersonId} with order ${event.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating goal progress for order ${event.orderId}: ${error.message}`,
      );
      throw error;
    }
  }
}
