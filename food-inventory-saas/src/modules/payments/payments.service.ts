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
    this.logger.log(`Attempting to add payment to order ${orderId}`);

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    if (order.paymentStatus === 'paid') {
        throw new BadRequestException('Order is already fully paid.');
    }

    const newPayment: OrderPayment = {
      amount: createPaymentDto.amount,
      method: createPaymentDto.method,
      date: new Date(createPaymentDto.date),
      reference: createPaymentDto.reference,
      currency: 'VES', // Assuming VES for now, this should be part of the DTO later
      status: 'confirmed', // Assuming payment is confirmed upon creation
      confirmedAt: new Date(),
      confirmedBy: user.id,
    };

    order.payments.push(newPayment);

    // Recalculate payment status
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid >= order.totalAmount) {
      order.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      order.paymentStatus = 'partial';
    } else {
      order.paymentStatus = 'pending';
    }
    
    const updatedOrder = await order.save();
    this.logger.log(`Payment added to order ${orderId}. New payment status: ${order.paymentStatus}`);

    // --- Trigger Accounting Entry for Payment ---
    try {
      this.logger.log(`Attempting to create journal entry for payment of order ${order.orderNumber}`);
      await this.accountingService.createJournalEntryForPayment(updatedOrder, newPayment, user.tenantId);
    } catch (accountingError) {
      this.logger.error(
        `Failed to create journal entry for payment on order ${order.orderNumber}. The payment was processed correctly, but accounting needs review.`,
        accountingError.stack,
      );
      // Do not re-throw error
    }
    // --- End of Accounting ---

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
        { id: 'zelle_usd', name: 'Zelle', igtfApplicable: false },
        { id: 'transferencia_usd', name: 'Transferencia (USD)', igtfApplicable: false },
        { id: 'pago_mixto', name: 'Pago Mixto', igtfApplicable: false },
    ];
    return { methods: defaultMethods };
  }
}
