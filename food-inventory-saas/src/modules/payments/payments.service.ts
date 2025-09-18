import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from '../../schemas/payment.schema';
import { Payable, PayableDocument } from '../../schemas/payable.schema';
import { CreatePaymentDto } from '../../dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Payable.name) private payableModel: Model<PayableDocument>,
  ) {}

  async findAll(tenantId: string): Promise<Payment[]> {
    return this.paymentModel
      .find({ tenantId })
      .sort({ date: -1 })
      .populate({ path: 'payableId', select: 'description payeeName' })
      .exec();
  }

  async create(dto: CreatePaymentDto, tenantId: string, userId: string): Promise<Payment> {
    const payable = await this.payableModel.findOne({ _id: dto.payableId, tenantId }).exec();

    if (!payable) {
      throw new NotFoundException(`Payable with ID ${dto.payableId} not found.`);
    }

    const totalPaid = payable.paidAmount + dto.amount;
    const totalAmount = payable.lines.reduce((sum, line) => sum + line.amount, 0);

    if (totalPaid > totalAmount) {
      throw new BadRequestException(`Payment amount ($${dto.amount}) exceeds the remaining balance of $${totalAmount - payable.paidAmount}.`);
    }

    // Create and save the payment transaction
    const newPayment = new this.paymentModel({
      ...dto,
      tenantId,
      createdBy: userId,
    });
    await newPayment.save();

    // Update the payable's paidAmount and status
    payable.paidAmount = totalPaid;
    if (totalPaid >= totalAmount) {
      payable.status = 'Paid';
    } else {
      payable.status = 'Partial';
    }
    await payable.save();

    return newPayment;
  }
}