import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from '../../schemas/payment.schema';
import { Payable, PayableDocument } from '../../schemas/payable.schema';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { CreatePaymentDto } from '../../dto/payment.dto';
import { AccountingService } from '../accounting/accounting.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import { BankTransactionsService } from '../bank-accounts/bank-transactions.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Payable.name) private payableModel: Model<PayableDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>, // Injected OrderModel
    private readonly accountingService: AccountingService,
    private readonly bankAccountsService: BankAccountsService,
    private readonly bankTransactionsService: BankTransactionsService,
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
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      payableId: payableId ? new Types.ObjectId(payableId) : undefined,
      tenantId,
      createdBy: userId,
      confirmedBy: userId,
      confirmedAt: new Date(),
    });
    await newPayment.save();
    this.logger.log(`Created new payment document ${newPayment._id} of type ${paymentType}`);
    this.logger.debug(`🔍 [DEBUG] Payment saved with: payableId=${newPayment.payableId}, orderId=${newPayment.orderId}, amount=${newPayment.amount}`);

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
        const updatedAccount = await this.bankAccountsService.updateBalance(
          newPayment.bankAccountId.toString(),
          adjustment,
          tenantId,
          undefined,
          { userId }
        );
        await this.bankTransactionsService.recordPaymentMovement(
          tenantId,
          userId,
          {
            bankAccountId: newPayment.bankAccountId.toString(),
            paymentId: newPayment._id.toString(),
            paymentType: paymentType as 'sale' | 'payable',
            amount: newPayment.amount,
            method: newPayment.method,
            reference: newPayment.reference,
            description:
              paymentType === 'sale'
                ? `Cobro orden ${orderId ?? ''}`.trim()
                : `Pago documento ${payableId ?? ''}`.trim(),
            transactionDate: newPayment.date.toISOString(),
            metadata: {
              currency: newPayment.currency,
            },
            balanceAfter: updatedAccount.currentBalance,
          },
        );
        this.logger.log(`Updated bank account ${newPayment.bankAccountId} balance by ${adjustment} and recorded movement`);
      } catch (error) {
        this.logger.error(`Failed to update bank account balance or record movement: ${error.message}`);
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

    this.logger.debug(`🔍 [DEBUG] Incoming payment details: id=${payment._id}, payableId=${payment.payableId}, amount=${payment.amount}`);

    // Recalculate paid amount and status
    const allPayments = await this.paymentModel.find({ payableId: payable._id });

    this.logger.debug(`🔍 [DEBUG] Query for payments with payableId=${payable._id}`);
    this.logger.debug(`🔍 [DEBUG] Found ${allPayments.length} payments: ${JSON.stringify(allPayments.map(p => ({ id: p._id, amount: p.amount, payableId: p.payableId })))}`);

    const paidAmountRaw = allPayments.reduce(
      (sum, p) => sum + Number(p?.amount ?? 0),
      0,
    );
    const payableTotal = Number(payable.totalAmount ?? 0);

    this.logger.debug(`🔍 [DEBUG] paidAmountRaw calculated: ${paidAmountRaw} from ${allPayments.length} payments`);

    if (paidAmountRaw > payableTotal + 0.009) {
      throw new BadRequestException(`Payment amount exceeds the remaining balance.`);
    }

    const paidAmount = Math.max(0, Math.round((paidAmountRaw + Number.EPSILON) * 100) / 100);
    const totalAmountRounded = Math.round((payableTotal + Number.EPSILON) * 100) / 100;
    const remainingBalance = Math.max(0, totalAmountRounded - paidAmount);
    const tolerance = Math.max(0.01, Number((totalAmountRounded * 0.001).toFixed(2)));
    const isFullyPaid = remainingBalance <= tolerance;

    // Determine next status based on payment amount
    const nextStatus = isFullyPaid
      ? 'paid'
      : paidAmount > 0
        ? 'partially_paid'
        : 'open'; // Default to 'open' for unpaid payables

    this.logger.debug(
      `Payable ${payableId} payment summary → total: ${totalAmountRounded}, paid: ${paidAmount}, remaining: ${remainingBalance}, tolerance: ${tolerance}, fullyPaid: ${isFullyPaid}, previousStatus: ${payable.status}`,
    );

    payable.paidAmount = isFullyPaid ? totalAmountRounded : paidAmount;
    payable.status = nextStatus;

    await payable.save();

    this.logger.log(
      `Updated payable ${payableId} with new payment ${payment._id} – status: ${nextStatus} (paid: ${paidAmount}/${totalAmountRounded}, remaining: ${remainingBalance})`,
    );

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
