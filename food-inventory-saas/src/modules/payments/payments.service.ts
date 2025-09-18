import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderPayment } from '../../schemas/order.schema';
import { CreatePaymentDto } from '../../dto/payment.dto';
import { AccountingService } from '../accounting/accounting.service';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private readonly accountingService: AccountingService,
  ) {}

  async createPayment(orderId: string, createPaymentDto: CreatePaymentDto, user: any): Promise<OrderDocument> {
    this.logger.log(`Attempting to add payments to order ${orderId}`);
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    // Although the frontend should prevent this, double-check.
    if (order.paymentStatus === 'paid') {
      this.logger.warn(`Attempted to add payment to already paid order ${orderId}`);
      // We allow adding payments to a paid order (e.g., tips), but the status logic will handle it.
    }

    const { methods: availablePaymentMethods } = await this.getPaymentMethods(user);
    let newIgtfFromPayments = 0;

    for (const paymentLine of createPaymentDto.payments) {
      const paymentMethodDetails = availablePaymentMethods.find(m => m.id === paymentLine.method);
      let igtfForThisPayment = 0;

      // Calculate IGTF for this specific payment if applicable
      if (paymentMethodDetails?.igtfApplicable) {
        igtfForThisPayment = paymentLine.amount * 0.03; // Assuming 3% IGTF
        newIgtfFromPayments += igtfForThisPayment;
        this.logger.log(`IGTF of ${igtfForThisPayment} calculated for payment of ${paymentLine.amount} via ${paymentLine.method}`);
      }

      const newPayment: OrderPayment = {
        amount: paymentLine.amount,
        method: paymentLine.method,
        date: new Date(paymentLine.date),
        reference: paymentLine.reference,
        currency: 'VES', // TODO: This should be dynamic based on the payment method
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: user.id,
      };

      order.payments.push(newPayment);

      // --- Trigger Accounting Entry for Payment ---
      try {
        this.logger.log(`Creating journal entry for payment of ${newPayment.amount} on order ${order.orderNumber}`);
        await this.accountingService.createJournalEntryForPayment(
          order, 
          newPayment, 
          user.tenantId, 
          igtfForThisPayment
        );
      } catch (accountingError) {
        this.logger.error(
          `Failed to create journal entry for a payment on order ${order.orderNumber}. The payment was processed, but accounting needs review.`,
          accountingError.stack,
        );
        // Do not re-throw error, as the payment itself was successful.
      }
    }

    // Update order totals with the newly generated IGTF
    if (newIgtfFromPayments > 0) {
      order.igtfTotal = (order.igtfTotal || 0) + newIgtfFromPayments;
      order.totalAmount = (order.totalAmount || 0) + newIgtfFromPayments;
      this.logger.log(`Order ${orderId} totals updated with new IGTF of ${newIgtfFromPayments}. New total: ${order.totalAmount}`);
    }

    // Recalculate payment status after all new payments and totals are updated
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid >= order.totalAmount) {
      order.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      order.paymentStatus = 'partial';
    } else {
      order.paymentStatus = 'pending';
    }

    const updatedOrder = await order.save();
    this.logger.log(`Successfully added payments to order ${orderId}. New payment status: ${order.paymentStatus}`);

    return updatedOrder;
  }

  async getPaymentMethods(user: any): Promise<{ methods: any[] }> {
    this.logger.log(`Fetching payment methods for tenant ${user.tenantId}`);
    
    const tenant = await this.tenantModel.findById(user.tenantId);

    if (tenant && tenant.settings && tenant.settings.paymentMethods && tenant.settings.paymentMethods.length > 0) {
      this.logger.log('Found custom payment methods in tenant settings.');
      return { methods: tenant.settings.paymentMethods };
    }

    this.logger.log('No custom payment methods found. Using default list.');
    const defaultMethods = [
        { id: 'efectivo_ves', name: 'Efectivo (VES)', igtfApplicable: false },
        { id: 'pago_movil_ves', name: 'Pago Móvil (VES)', igtfApplicable: false },
        { id: 'transferencia_ves', name: 'Transferencia (VES)', igtfApplicable: false },
        { id: 'tarjeta_ves', name: 'Tarjeta (VES)', igtfApplicable: false },
        { id: 'efectivo_usd', name: 'Efectivo (USD)', igtfApplicable: true },
        { id: 'zelle_usd', name: 'Zelle', igtfApplicable: true },
        { id: 'transferencia_usd', name: 'Transferencia (USD)', igtfApplicable: true },
        { id: 'pago_mixto', name: 'Pago Mixto', igtfApplicable: false },
    ];
    return { methods: defaultMethods };
  }
}
