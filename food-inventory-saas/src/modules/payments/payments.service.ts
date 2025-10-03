import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from '../../schemas/payment.schema';
import { Payable, PayableDocument } from '../../schemas/payable.schema';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { CreatePaymentDto } from '../../dto/payment.dto';
import { AccountingService } from '../accounting/accounting.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Payable.name) private payableModel: Model<PayableDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>, // Injected OrderModel
    private readonly accountingService: AccountingService,
    private readonly bankAccountsService: BankAccountsService,
  ) {}

  async create(dto: CreatePaymentDto, user: any): Promise<PaymentDocument> {
    const { paymentType, orderId, payableId, ...paymentDetails } = dto;
    const { tenantId, id: userId } = user;

    if (!orderId && !payableId) {
      throw new BadRequestException('Payment must be associated with an order or a payable.');
    }

    // Create and save the core payment document first
    const newPayment = new this.paymentModel({
      ...paymentDetails,
      paymentType,
      orderId,
      payableId,
      tenantId,
      createdBy: userId,
      confirmedBy: userId,
      confirmedAt: new Date(),
    });
    await newPayment.save();
    this.logger.log(`Created new payment document ${newPayment._id} of type ${paymentType}`);

    // Handle the specific logic for each payment type
    if (paymentType === 'sale' && orderId) {
      await this.handleSalePayment(orderId, newPayment, tenantId);
    } else if (paymentType === 'payable' && payableId) {
      await this.handlePayablePayment(payableId, newPayment, tenantId);
    } else {
      // This case should ideally not be reached due to initial validation
      throw new BadRequestException('Invalid payment type or missing ID.');
    }

    // Update bank account balance if bankAccountId is provided
    if (newPayment.bankAccountId) {
      try {
        const adjustment = paymentType === 'sale' ? newPayment.amount : -newPayment.amount;
        await this.bankAccountsService.updateBalance(
          newPayment.bankAccountId.toString(),
          adjustment,
          tenantId
        );
        this.logger.log(`Updated bank account ${newPayment.bankAccountId} balance by ${adjustment}`);
      } catch (error) {
        this.logger.error(`Failed to update bank account balance: ${error.message}`);
        // Don't fail the payment if bank account update fails
      }
    }

    return newPayment;
  }

  private async handleSalePayment(orderId: string, payment: PaymentDocument, tenantId: string): Promise<void> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    // Add the payment reference to the order
    order.payments.push(payment._id);

    // Recalculate paid amount and status
    const allPayments = await this.paymentModel.find({ _id: { $in: order.payments } });
    const paidAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);

    if (paidAmount >= order.totalAmount) {
      order.paymentStatus = 'paid';
    } else {
      order.paymentStatus = 'partial';
    }
    
    await order.save();
    this.logger.log(`Updated order ${orderId} with new payment ${payment._id}`);

    // --- Automatic Journal Entry Creation ---
    this.logger.log(`[Accounting Hook] Attempting to create journal entry for sale payment ${payment._id}.`);
    this.logger.debug(`[Accounting Hook] Payment data: ${JSON.stringify(payment, null, 2)}`);
    this.logger.debug(`[Accounting Hook] Order data: ${JSON.stringify(order, null, 2)}`);
    try {
      // Note: The accounting service expects the embedded payment type, but our new PaymentDocument is compatible.
      // We cast it to `any` to satisfy TypeScript for now. This is acceptable because the structure is correct.
      await this.accountingService.createJournalEntryForPayment(order, payment as any, tenantId);
      this.logger.log(`[Accounting Hook] SUCCESS: Journal entry created for sale payment ${payment._id}`);
    } catch (accountingError) {
      this.logger.error(
          `[Accounting Hook] FAILED to create journal entry for sale payment ${payment._id}. The payment was processed correctly, but accounting needs review.`,
          accountingError.stack,
      );
    }
  }

  private async handlePayablePayment(payableId: string, payment: PaymentDocument, tenantId: string): Promise<void> {
    const payable = await this.payableModel.findById(payableId).exec();
    if (!payable) {
      throw new NotFoundException(`Payable with ID ${payableId} not found.`);
    }

    // Recalculate paid amount and status
    const allPayments = await this.paymentModel.find({ payableId: payable._id });
    const paidAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);

    if (paidAmount > payable.totalAmount) {
        throw new BadRequestException(`Payment amount exceeds the remaining balance.`);
    }

    payable.paidAmount = paidAmount;
    if (paidAmount >= payable.totalAmount) {
      payable.status = 'paid';
    } else {
      payable.status = 'partially_paid';
    }
    
    await payable.save();
    this.logger.log(`Updated payable ${payableId} with new payment ${payment._id}`);

    // --- Automatic Journal Entry Creation ---
    try {
      await this.accountingService.createJournalEntryForPayablePayment(payment, payable, tenantId);
      this.logger.log(`Successfully created journal entry for payable payment ${payment._id}`);
    } catch (accountingError) {
      this.logger.error(
          `Failed to create journal entry for payable payment ${payment._id}. The payment was processed correctly, but accounting needs review.`,
          accountingError.stack,
      );
    }
  }

  async findAll(tenantId: string): Promise<Payment[]> {
    return this.paymentModel
      .find({ tenantId })
      .sort({ date: -1 })
      .populate({ path: 'payableId', select: 'description payeeName' })
      .populate({ path: 'orderId', select: 'orderNumber customerName' })
      .exec();
  }
}
