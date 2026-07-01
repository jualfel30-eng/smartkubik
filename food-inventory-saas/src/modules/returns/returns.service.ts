import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { MovementType } from "../../dto/inventory-movement.dto";
import { InventoryService } from "../inventory/inventory.service";
import { InventoryMovementsService } from "../inventory/inventory-movements.service";
import { CashRegisterService } from "../cash-register/cash-register.service";
import { PaymentsService } from "../payments/payments.service";
import { StoreCreditService } from "../store-credit/store-credit.service";
import { CreateReturnDto, ReturnItemInputDto } from "./dto/create-return.dto";
import { ReturnsAccountingService } from "./returns-accounting.service";
import { Return, ReturnDocument } from "./schemas/return.schema";

/** Una línea de la orden planificada para devolver, con la cantidad devuelta. */
interface PlannedLine {
  item: any; // subdocumento OrderItem (mongoose) — se muta returnedQuantity
  qtyReturned: number;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Orquestador de devoluciones. NO reinventa: reúne los subsistemas existentes
 * (inventario, caja, contabilidad, pagos) alrededor de un documento Return
 * auditable.
 *
 * - **Total** (sin `items`): devuelve todo lo que quede pendiente por devolver.
 * - **Parcial** (con `items`): devuelve las líneas/cantidades indicadas; la
 *   orden queda `partially_returned` mientras le quede saldo, `refunded` cuando
 *   se devolvió todo. El reembolso es **proporcional a lo pagado** por valor de
 *   ítem.
 *
 * Reembolso (`refundMethod`):
 *  - `cash`: sale de la sesión de caja abierta del usuario (exige una).
 *  - `store_credit`: acredita saldo a favor del cliente (no toca caja); el
 *    asiento acredita el pasivo "Saldo a favor de clientes" (2104).
 *
 * Contrato (validado antes de mutar nada, fail-fast):
 *  - la orden existe y pertenece al tenant
 *  - está pagada (`paymentStatus === 'paid'`)
 *  - no está cancelada ni totalmente devuelta
 *  - no tiene factura fiscal (la Nota de Crédito llega en una fase posterior)
 *  - si el reembolso es en efectivo, hay una sesión de caja abierta
 *
 * Efectos: reingreso de stock (IN, unidad base), reembolso (caja o saldo a
 * favor), asiento contable (best-effort), pagos → refunded (sólo si la
 * devolución completa la orden) y el documento Return.
 */
@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    @InjectModel(Return.name)
    private readonly returnModel: Model<ReturnDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly inventoryService: InventoryService,
    private readonly inventoryMovementsService: InventoryMovementsService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly paymentsService: PaymentsService,
    private readonly returnsAccountingService: ReturnsAccountingService,
    private readonly storeCreditService: StoreCreditService,
  ) {}

  async createReturn(
    orderId: string,
    dto: CreateReturnDto,
    user: any,
    opts: { isExchange?: boolean } = {},
  ): Promise<ReturnDocument> {
    const tenantId: string = user?.tenantId?.toString();

    // ---- 1. Cargar y validar la orden (fail-fast, sin mutar nada) ----
    const order = await this.orderModel.findOne({
      _id: orderId,
      tenantId: user.tenantId,
    });
    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }
    if (order.status === "cancelled") {
      throw new BadRequestException("No se puede devolver una orden cancelada");
    }
    if (order.status === "refunded") {
      throw new BadRequestException("La orden ya fue devuelta por completo");
    }
    if (order.paymentStatus !== "paid") {
      throw new BadRequestException(
        "Sólo se pueden devolver órdenes pagadas por completo",
      );
    }
    if ((order as any).billingDocumentId) {
      throw new BadRequestException(
        "La orden tiene factura fiscal. Devolver órdenes facturadas requiere Nota de Crédito, no soportado aún.",
      );
    }
    if (!order.items?.length) {
      throw new BadRequestException("La orden no tiene ítems que devolver");
    }

    // ---- 2. Planificar líneas a devolver (parcial vs total) ----
    const planned = this.planReturnLines(order, dto.items);
    if (!planned.length) {
      throw new BadRequestException("No hay ítems pendientes por devolver");
    }

    // ---- 3. Método de reembolso: efectivo (caja) o saldo a favor ----
    const refundMethod = dto.refundMethod || "cash";
    const isStoreCredit = refundMethod === "store_credit";

    // Efectivo exige sesión de caja abierta; saldo a favor no toca la caja.
    const session = isStoreCredit
      ? null
      : await this.cashRegisterService.getOpenSession(user);
    if (!isStoreCredit && !session) {
      throw new BadRequestException(
        "Necesitas una sesión de caja abierta para reembolsar en efectivo",
      );
    }

    // ---- 4. Reembolso proporcional a lo pagado, por valor de ítem ----
    // Base de proporción = valor de TODAS las líneas originales de la orden.
    // Para una devolución total nunca-antes-devuelta esto reembolsa exactamente
    // lo pagado; para parciales/repetidas reembolsa sólo la porción que toca.
    const itemsTotalOriginal = order.items.reduce(
      (sum, it) => sum + (it.totalPrice || 0),
      0,
    );
    const paidUsd =
      order.paidAmount && order.paidAmount > 0
        ? order.paidAmount
        : order.totalAmount || 0;
    const paidVes = order.paidAmountVes || 0;

    const lines = planned.map((p) => {
      const unitValue = p.item.quantity
        ? (p.item.totalPrice || 0) / p.item.quantity
        : 0;
      const lineValue = unitValue * p.qtyReturned;
      const share = itemsTotalOriginal > 0 ? lineValue / itemsTotalOriginal : 0;
      return { ...p, lineValue, lineUsd: round2(paidUsd * share) };
    });
    const totalReturnedValue = lines.reduce((s, l) => s + l.lineValue, 0);
    const refundUsd = round2(lines.reduce((s, l) => s + l.lineUsd, 0));
    const refundVes =
      itemsTotalOriginal > 0
        ? round2((paidVes * totalReturnedValue) / itemsTotalOriginal)
        : 0;

    // Saldo a favor: monto ÚNICO en USD = valor devuelto en USD incluyendo la
    // porción pagada en VES convertida con la tasa de la propia orden.
    const vesRate =
      order.totalAmount > 0 && order.totalAmountVes > 0
        ? order.totalAmountVes / order.totalAmount
        : 0;
    const refundVesInUsd = vesRate > 0 ? refundVes / vesRate : 0;
    const creditAmount = round2(refundUsd + refundVesInUsd);

    // El número de devolución se usa como referencia del movimiento de saldo.
    const returnNumber = await this.generateReturnNumber(tenantId);

    // ---- 5. Reingreso de stock (movimiento IN por línea devuelta) ----
    const returnItems: any[] = [];
    const inventoryMovementIds: Types.ObjectId[] = [];
    for (const l of lines) {
      const item = l.item;
      // Cantidad en unidad base proporcional a lo devuelto.
      const perUnitBase =
        item.quantityInBaseUnit != null && item.quantity
          ? item.quantityInBaseUnit / item.quantity
          : item.conversionFactor || 1;
      const baseQty = round2(perUnitBase * l.qtyReturned);

      const inv =
        (await this.inventoryService.findByProductSku(
          item.productSku,
          tenantId,
        )) ||
        (await this.inventoryService.findByProductId(
          item.productId.toString(),
          tenantId,
        ));

      let movementId: Types.ObjectId | undefined;
      if (!inv) {
        this.logger.warn(
          `Sin inventario para SKU ${item.productSku} al devolver orden ${order.orderNumber}; ítem no reingresado`,
        );
      } else if (baseQty > 0) {
        const movement = await this.inventoryMovementsService.create(
          {
            inventoryId: inv._id.toString(),
            movementType: MovementType.IN,
            quantity: baseQty,
            unitCost: inv.averageCostPrice || 0,
            reason: `Devolución - Orden ${order.orderNumber}`,
            warehouseId: inv.warehouseId?.toString(),
          },
          tenantId,
          user.id,
          false,
          { orderId: order._id.toString(), origin: "return" },
        );
        movementId = movement._id as Types.ObjectId;
        inventoryMovementIds.push(movementId);
      }

      returnItems.push({
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        quantity: l.qtyReturned,
        selectedUnit: item.selectedUnit,
        conversionFactor: item.conversionFactor,
        quantityInBaseUnit: baseQty,
        unitPrice: item.unitPrice,
        refundAmount: l.lineUsd,
        warehouseId: inv?.warehouseId,
        inventoryMovementId: movementId,
      });
    }

    // ---- 6. Reembolso: efectivo (sale de caja) o saldo a favor (ledger) ----
    let storeCreditMovementId: Types.ObjectId | undefined;
    if (isStoreCredit) {
      if (creditAmount > 0) {
        const { movement } = await this.storeCreditService.credit({
          tenantId,
          customerId: order.customerId.toString(),
          amount: creditAmount,
          source: "return",
          referenceId: order._id.toString(),
          reference: returnNumber,
          reason: `Devolución orden ${order.orderNumber}`,
          createdBy: user.id,
        });
        storeCreditMovementId = movement._id as Types.ObjectId;
      }
    } else if (session) {
      if (refundUsd > 0) {
        await this.cashRegisterService.addCashMovement(
          session._id.toString(),
          {
            type: "out",
            amount: refundUsd,
            currency: "USD",
            reason: "refund",
            description: `Reembolso devolución - Orden ${order.orderNumber}`,
            reference: order.orderNumber,
          },
          user,
        );
      }
      if (refundVes > 0) {
        await this.cashRegisterService.addCashMovement(
          session._id.toString(),
          {
            type: "out",
            amount: refundVes,
            currency: "VES",
            reason: "refund",
            description: `Reembolso devolución - Orden ${order.orderNumber}`,
            reference: order.orderNumber,
          },
          user,
        );
      }
    }

    // ---- 7. Actualizar cantidades devueltas y determinar si quedó completa ----
    for (const l of lines) {
      l.item.returnedQuantity = (l.item.returnedQuantity || 0) + l.qtyReturned;
    }
    order.markModified("items");
    const fullyReturned = order.items.every(
      (it) => (it.returnedQuantity || 0) >= it.quantity,
    );

    // ---- 8. Efectos best-effort (no abortan la devolución) ----
    // 8a. Asiento contable: crédito a Caja (efectivo) o a Saldo a favor (pasivo).
    let journalEntryId: Types.ObjectId | undefined;
    try {
      const entry = await this.returnsAccountingService.createRefundEntry({
        tenantId,
        refundAmount: isStoreCredit ? creditAmount : refundUsd,
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        returnNumber,
        transactionDate: new Date(),
        refundMethod: isStoreCredit ? "store_credit" : "cash",
      });
      if (entry?._id) journalEntryId = entry._id as Types.ObjectId;
    } catch (err) {
      this.logger.error(
        `Asiento de devolución falló para orden ${order.orderNumber}: ${err.message}`,
      );
    }

    // 8b. Marcar pagos como refunded SÓLO si la devolución completa la orden
    //     (un pago no se reembolsa "a medias").
    const refundedPaymentIds: Types.ObjectId[] = [];
    if (fullyReturned) {
      for (const paymentId of order.payments || []) {
        try {
          await this.paymentsService.updateStatus(
            paymentId.toString(),
            "refunded" as any,
            user,
            `Devolución ${returnNumber}`,
          );
          refundedPaymentIds.push(paymentId as Types.ObjectId);
        } catch (err) {
          this.logger.warn(
            `No se pudo marcar el pago ${paymentId} como refunded (orden ${order.orderNumber}): ${err.message}`,
          );
        }
      }
    }

    // ---- 9. Persistir el documento de devolución ----
    const returnDoc = await this.returnModel.create({
      returnNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      items: returnItems,
      refundMethod,
      refundAmountUsd: isStoreCredit ? creditAmount : refundUsd,
      refundAmountVes: isStoreCredit ? 0 : refundVes,
      currency: "USD",
      isPartial: !fullyReturned,
      isExchange: !!opts.isExchange,
      reason: dto.reason,
      status: "completed",
      cashSessionId: session?._id,
      journalEntryId,
      storeCreditMovementId,
      inventoryMovementIds,
      refundedPaymentIds,
      createdBy: new Types.ObjectId(user.id),
      tenantId: new Types.ObjectId(tenantId),
    });

    // ---- 10. Actualizar el estado de la orden ----
    if (fullyReturned) {
      order.status = "refunded";
      order.paymentStatus = "refunded";
    } else {
      order.status = "partially_returned";
      // paymentStatus permanece 'paid': los ítems que se quedó sí están pagados.
    }
    await order.save();

    this.logger.log(
      `Devolución ${returnNumber} (${
        fullyReturned ? "total" : "parcial"
      }, ${refundMethod}) creada para orden ${order.orderNumber} — ${
        isStoreCredit
          ? `saldo a favor USD ${creditAmount}`
          : `efectivo USD ${refundUsd} / VES ${refundVes}`
      }`,
    );

    return returnDoc;
  }

  /**
   * Inicia un cambio (exchange): procesa la devolución de los ítems indicados
   * SIEMPRE a saldo a favor (para financiar la orden nueva) y marca el Return
   * como `isExchange`. Devuelve el saldo resultante del cliente para que la UI
   * redirija al POS con contexto. La orden nueva la crea el POS; el saldo se
   * aplica al cobrarla (ver flujo en el wiki de returns).
   */
  async createExchange(
    orderId: string,
    dto: CreateReturnDto,
    user: any,
  ): Promise<{
    return: ReturnDocument;
    customerId?: string;
    customerName?: string;
    storeCreditBalance: number;
  }> {
    const returnDoc = await this.createReturn(
      orderId,
      { ...dto, refundMethod: "store_credit" },
      user,
      { isExchange: true },
    );

    const customerId = returnDoc.customerId?.toString();
    const storeCreditBalance = customerId
      ? await this.storeCreditService.getBalance(
          user.tenantId.toString(),
          customerId,
        )
      : 0;

    return {
      return: returnDoc,
      customerId,
      customerName: returnDoc.customerName,
      storeCreditBalance,
    };
  }

  async findByOrder(orderId: string, user: any): Promise<ReturnDocument[]> {
    return this.returnModel
      .find({
        orderId: new Types.ObjectId(orderId),
        tenantId: new Types.ObjectId(user.tenantId.toString()),
      })
      .sort({ createdAt: -1 });
  }

  /**
   * Resuelve qué líneas y cantidades se devuelven.
   * - `requested` presente → parcial: valida que cada línea exista y que la
   *   cantidad no supere lo pendiente (`quantity - returnedQuantity`).
   * - `requested` ausente → total: todo lo que quede pendiente por devolver.
   */
  private planReturnLines(
    order: OrderDocument,
    requested?: ReturnItemInputDto[],
  ): PlannedLine[] {
    const items = order.items || [];

    if (requested && requested.length) {
      const seen = new Set<string>();
      const planned: PlannedLine[] = [];
      for (const req of requested) {
        if (seen.has(req.orderItemId)) {
          throw new BadRequestException(
            "Un ítem aparece duplicado en la solicitud de devolución",
          );
        }
        seen.add(req.orderItemId);

        const item = items.find(
          (it) => (it as any)._id?.toString() === req.orderItemId,
        );
        if (!item) {
          throw new BadRequestException(
            `El ítem ${req.orderItemId} no pertenece a la orden`,
          );
        }
        const remaining = (item.quantity || 0) - (item.returnedQuantity || 0);
        if (req.quantity > remaining) {
          throw new BadRequestException(
            `Cantidad a devolver (${req.quantity}) supera lo pendiente (${remaining}) de ${item.productName}`,
          );
        }
        planned.push({ item, qtyReturned: req.quantity });
      }
      return planned;
    }

    // Total: todo lo pendiente por devolver.
    return items
      .map((item) => ({
        item,
        qtyReturned: (item.quantity || 0) - (item.returnedQuantity || 0),
      }))
      .filter((p) => p.qtyReturned > 0);
  }

  /**
   * Número de devolución secuencial por tenant: RET-<año>-NNNN.
   * MAX+1 (no count+1) — ver docs/wiki/patterns/sequential-number-races.md.
   */
  private async generateReturnNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RET-${year}-`;
    const last = await this.returnModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        returnNumber: { $regex: `^${prefix}` },
      })
      .sort({ returnNumber: -1 })
      .lean();

    let next = 1;
    if (last?.returnNumber) {
      const parsed = parseInt(last.returnNumber.slice(prefix.length), 10);
      if (!Number.isNaN(parsed)) next = parsed + 1;
    }
    return `${prefix}${String(next).padStart(4, "0")}`;
  }
}
