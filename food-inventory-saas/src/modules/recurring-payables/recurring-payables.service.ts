import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RecurringPayable, RecurringPayableDocument } from '../../schemas/recurring-payable.schema';
import { CreateRecurringPayableDto } from '../../dto/recurring-payable.dto';
import { PayablesService, CreatePayableDto } from '../payables/payables.service';
import * as moment from 'moment-timezone';

@Injectable()
export class RecurringPayablesService {
  constructor(
    @InjectModel(RecurringPayable.name) private recurringPayableModel: Model<RecurringPayableDocument>,
    private readonly payablesService: PayablesService,
  ) {}

  async findAll(tenantId: string): Promise<RecurringPayable[]> {
    return this.recurringPayableModel.find({ tenantId }).exec();
  }

  async create(dto: CreateRecurringPayableDto, tenantId: string, userId: string): Promise<RecurringPayable> {
    const totalAmount = dto.lines.reduce((sum, line) => sum + line.amount, 0);
    
    const nextDueDate = moment(dto.startDate).tz('America/Caracas').toDate();

    const newRecurringPayable = new this.recurringPayableModel({
      ...dto,
      tenantId,
      createdBy: userId,
      totalAmount,
      nextDueDate,
      isActive: true,
    });
    return newRecurringPayable.save();
  }

  async generatePayable(id: string, tenantId: string, userId: string): Promise<any> {
    const template = await this.recurringPayableModel.findOne({ _id: id, tenantId }).exec();
    if (!template || !template.isActive) {
      throw new NotFoundException('Plantilla de pago recurrente no encontrada o inactiva');
    }

    // Create a new Payable DTO from the template
    const createPayableDto: CreatePayableDto = {
      type: template.type as any,
      payeeType: template.payeeType as any,
      payeeName: template.payeeName,
      issueDate: new Date(),
      dueDate: template.nextDueDate,
      description: `${template.templateName} - ${moment(template.nextDueDate).format('MMMM YYYY')}`,
      lines: template.lines.map(l => ({ 
        ...l,
        accountId: l.accountId.toString(),
        productId: l.productId?.toString(),
      })),
      notes: template.notes,
    };

    const newPayable = await this.payablesService.create(createPayableDto, tenantId, userId);

    // Update the next due date on the template
    const newNextDueDate = moment(template.nextDueDate).add(1, 'month').toDate(); // Simple month addition
    await this.recurringPayableModel.updateOne({ _id: id }, { nextDueDate: newNextDueDate });

    return newPayable;
  }
}
