import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { Payment, PaymentDocument } from "../../schemas/payment.schema";

/**
 * Migration: Link Payments to Orders
 *
 * PROBLEMA:
 * Después de restaurar el backup del 15 de noviembre, los pagos existen en la BD
 * pero NO están vinculados a las órdenes en el campo order.payments[].
 *
 * SOLUCIÓN:
 * Esta migración reconstruye las relaciones payment-order basándose en:
 * 1. El campo payment.allocations[] que contiene las asignaciones a órdenes
 * 2. El campo payment.orderId (si existe) para pagos antiguos
 *
 * Para cada pago:
 * - Lee las allocations con documentType="order"
 * - Agrega el payment._id al array order.payments[]
 * - Recalcula order.paidAmount sumando todas las allocations
 * - Actualiza order.paymentStatus (paid/partial/pending)
 */
@Injectable()
export class LinkPaymentsToOrdersMigration {
  private readonly logger = new Logger(LinkPaymentsToOrdersMigration.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async run(): Promise<void> {
    this.logger.log("🔄 Iniciando migración: Link Payments to Orders");

    // Step 1: Reset all orders - clear payments array and reset amounts
    this.logger.log("📋 Paso 1: Limpiando datos antiguos en órdenes...");
    const resetResult = await this.orderModel.updateMany(
      {},
      {
        $set: {
          payments: [],
          paidAmount: 0,
          paymentStatus: "pending",
        },
      },
    );
    this.logger.log(
      `   ✅ ${resetResult.modifiedCount} órdenes reseteadas`,
    );

    // Step 2: Find all payments with allocations to orders
    this.logger.log(
      "📋 Paso 2: Buscando pagos con asignaciones a órdenes...",
    );
    const payments = await this.paymentModel
      .find({
        allocations: { $exists: true, $ne: [] },
      })
      .exec();

    this.logger.log(`   🔍 Encontrados ${payments.length} pagos con allocations`);

    // Step 3: Process each payment and link to orders
    let linkedCount = 0;
    let errorCount = 0;
    const orderUpdates = new Map<
      string,
      { paymentIds: Set<Types.ObjectId>; totalPaid: number }
    >();

    for (const payment of payments) {
      try {
        // Find allocations to orders
        const orderAllocations =
          payment.allocations?.filter((a) => a.documentType === "order") || [];

        for (const allocation of orderAllocations) {
          const orderId = allocation.documentId.toString();

          if (!orderUpdates.has(orderId)) {
            orderUpdates.set(orderId, {
              paymentIds: new Set<Types.ObjectId>(),
              totalPaid: 0,
            });
          }

          const orderUpdate = orderUpdates.get(orderId)!;
          orderUpdate.paymentIds.add(payment._id);
          orderUpdate.totalPaid += allocation.amount;
        }

        linkedCount++;
      } catch (error) {
        this.logger.error(
          `   ❌ Error procesando payment ${payment._id}: ${error.message}`,
        );
        errorCount++;
      }
    }

    this.logger.log(`   ✅ ${linkedCount} pagos procesados`);
    this.logger.log(`   📊 ${orderUpdates.size} órdenes afectadas`);

    // Step 4: Update orders with payment references and amounts
    this.logger.log("📋 Paso 4: Actualizando órdenes con pagos vinculados...");
    let updatedOrders = 0;

    for (const [orderIdStr, updateData] of orderUpdates.entries()) {
      try {
        const order = await this.orderModel.findById(orderIdStr);

        if (!order) {
          this.logger.warn(
            `   ⚠️  Orden ${orderIdStr} no encontrada - asignación huérfana`,
          );
          continue;
        }

        // Calculate payment status
        const totalAmount = Number(order.totalAmount || 0);
        const paidAmount = updateData.totalPaid;
        let paymentStatus: "pending" | "partial" | "paid" = "pending";

        if (paidAmount >= totalAmount && totalAmount > 0) {
          paymentStatus = "paid";
        } else if (paidAmount > 0) {
          paymentStatus = "partial";
        }

        // Update order
        order.payments = Array.from(updateData.paymentIds);
        order.paidAmount = paidAmount;
        order.paymentStatus = paymentStatus;

        await order.save();
        updatedOrders++;

        this.logger.debug(
          `   ✓ Orden ${order.orderNumber}: ${updateData.paymentIds.size} pagos, $${paidAmount.toFixed(2)} pagado, status: ${paymentStatus}`,
        );
      } catch (error) {
        this.logger.error(
          `   ❌ Error actualizando orden ${orderIdStr}: ${error.message}`,
        );
        errorCount++;
      }
    }

    // Step 5: Handle old payments with orderId field (fallback for legacy data)
    this.logger.log(
      "📋 Paso 5: Procesando pagos legacy con orderId directo...",
    );
    const legacyPayments = await this.paymentModel
      .find({
        orderId: { $exists: true, $ne: null },
      })
      .exec();

    this.logger.log(
      `   🔍 Encontrados ${legacyPayments.length} pagos legacy`,
    );

    let legacyLinked = 0;
    for (const payment of legacyPayments) {
      try {
        const order = await this.orderModel.findById(payment.orderId);

        if (!order) {
          this.logger.warn(
            `   ⚠️  Orden ${payment.orderId} no encontrada para pago ${payment._id}`,
          );
          continue;
        }

        // Check if payment is already linked
        if (
          order.payments?.some((p) => p.toString() === payment._id.toString())
        ) {
          continue; // Already linked in previous step
        }

        // Add payment to order
        order.payments = order.payments || [];
        order.payments.push(payment._id);

        // Update paid amount
        order.paidAmount = (order.paidAmount || 0) + (payment.amount || 0);

        // Update payment status
        const totalAmount = Number(order.totalAmount || 0);
        if (order.paidAmount >= totalAmount && totalAmount > 0) {
          order.paymentStatus = "paid";
        } else if (order.paidAmount > 0) {
          order.paymentStatus = "partial";
        }

        await order.save();
        legacyLinked++;

        this.logger.debug(
          `   ✓ Pago legacy vinculado: ${payment._id} → Orden ${order.orderNumber}`,
        );
      } catch (error) {
        this.logger.error(
          `   ❌ Error vinculando pago legacy ${payment._id}: ${error.message}`,
        );
        errorCount++;
      }
    }

    // Final Report
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log("✅ MIGRACIÓN COMPLETADA: Link Payments to Orders");
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log(`📊 Estadísticas:`);
    this.logger.log(`   - Órdenes reseteadas: ${resetResult.modifiedCount}`);
    this.logger.log(`   - Pagos procesados: ${linkedCount}`);
    this.logger.log(`   - Órdenes actualizadas: ${updatedOrders}`);
    this.logger.log(`   - Pagos legacy vinculados: ${legacyLinked}`);
    this.logger.log(`   - Errores: ${errorCount}`);
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (errorCount > 0) {
      this.logger.warn(
        `⚠️  Se encontraron ${errorCount} errores. Revisa los logs arriba.`,
      );
    }
  }
}
