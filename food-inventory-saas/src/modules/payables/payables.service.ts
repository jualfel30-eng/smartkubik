import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payable, PayableDocument } from '../../schemas/payable.schema';
import { AccountingService } from '../accounting/accounting.service';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  IsMongoId,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- DTOs (definidos aquí temporalmente) ---

class CreatePayableLineDto {
  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsMongoId()
  accountId: string;
}

export class CreatePayableDto {
  @IsEnum(['purchase_order', 'payroll', 'service_payment', 'utility_bill', 'other'])
  type: string;

  @IsEnum(['supplier', 'employee', 'custom'])
  payeeType: string;

  @IsOptional()
  @IsMongoId()
  payeeId?: string;

  @IsString()
  payeeName: string;

  @IsDateString()
  issueDate: Date;

  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePayableLineDto)
  lines: CreatePayableLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePayableDto {
  @IsOptional()
  @IsEnum(['purchase_order', 'payroll', 'service_payment', 'utility_bill', 'other'])
  type?: string;

  @IsOptional()
  @IsEnum(['supplier', 'employee', 'custom'])
  payeeType?: string;

  @IsOptional()
  @IsMongoId()
  payeeId?: string;

  @IsOptional()
  @IsString()
  payeeName?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: Date;

  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePayableLineDto)
  lines?: CreatePayableLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['draft', 'open', 'partially_paid', 'paid', 'void'])
  status?: string;
}

@Injectable()
export class PayablesService {
  private readonly logger = new Logger(PayablesService.name);

  constructor(
    @InjectModel(Payable.name) private payableModel: Model<PayableDocument>,
    private readonly accountingService: AccountingService,
  ) {}

  async create(createPayableDto: CreatePayableDto, tenantId: string, userId: string): Promise<Payable> {
    const totalAmount = createPayableDto.lines.reduce((sum, line) => sum + line.amount, 0);

    const payableNumber = `PAY-${Date.now()}`;

    const newPayable = new this.payableModel({
      ...createPayableDto,
      tenantId,
      createdBy: userId,
      totalAmount,
      payableNumber,
      paidAmount: 0,
      status: 'draft',
    });

    const savedPayable = await newPayable.save();

    // --- Automatic Journal Entry Creation ---
    try {
      this.logger.log(
        `Attempting to create journal entry for payable ${savedPayable.payableNumber}`,
      );
      await this.accountingService.createJournalEntryForPayable(
        savedPayable,
        tenantId,
      );
      this.logger.log(
        `Successfully created journal entry for payable ${savedPayable.payableNumber}`,
      );
    } catch (accountingError) {
      this.logger.error(
        `Failed to create journal entry for payable ${savedPayable.payableNumber}.`,
        accountingError.stack,
      );
      // Re-throw the error to make it visible to the client
      throw accountingError;
    }
    // --- End of Automatic Journal Entry Creation ---

    return savedPayable;
  }

  async findAll(tenantId: string): Promise<Payable[]> {
    return this.payableModel.find({ tenantId }).sort({ issueDate: -1 }).exec();
  }

  async findOne(id: string, tenantId: string): Promise<Payable> {
    const payable = await this.payableModel.findOne({ _id: id, tenantId }).exec();
    if (!payable) {
      throw new NotFoundException(`Payable con ID "${id}" no encontrado`);
    }
    return payable;
  }

  async update(id: string, tenantId: string, updatePayableDto: UpdatePayableDto): Promise<Payable> {
    const updatePayload: any = { ...updatePayableDto };

    if (updatePayableDto.lines) {
      updatePayload.totalAmount = updatePayableDto.lines.reduce((sum, line) => sum + line.amount, 0);
    }

    const updatedPayable = await this.payableModel.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: updatePayload },
      { new: true },
    ).exec();

    if (!updatedPayable) {
      throw new NotFoundException(`Payable con ID "${id}" no encontrado`);
    }

    return updatedPayable;
  }

  async remove(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.payableModel.updateOne(
      { _id: id, tenantId },
      { $set: { status: 'void' } },
    );

    if (result.modifiedCount === 0) {
      throw new NotFoundException(`Payable con ID "${id}" no encontrado o ya estaba anulado`);
    }

    return { success: true, message: 'Payable anulado exitosamente' };
  }
}