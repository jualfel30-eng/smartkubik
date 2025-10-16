import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payable, PayableDocument } from '../../schemas/payable.schema';
import { AccountingService } from '../accounting/accounting.service';
import { EventsService } from '../events/events.service';
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
import { PaginationDto, PaginationHelper } from '../../dto/pagination.dto';

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

  @IsOptional()
  @IsMongoId()
  relatedPurchaseOrderId?: string;
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
    private readonly eventsService: EventsService,
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
      status: 'open', // FIXED: Changed from 'draft' to 'open' so payables appear as pending immediately
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

    // --- Create Calendar Event for Payment Due Date ---
    if (savedPayable.dueDate) {
      try {
        this.logger.log(
          `Creating calendar event for payable ${savedPayable.payableNumber} due on ${savedPayable.dueDate}`,
        );

        await this.eventsService.create(
          {
            title: `💳 Pago: ${savedPayable.payeeName} - $${savedPayable.totalAmount}`,
            description: savedPayable.description || `Pago pendiente por $${savedPayable.totalAmount} - ${savedPayable.payableNumber}`,
            start: new Date(savedPayable.dueDate).toISOString(),
            allDay: true,
            color: '#ef4444', // Red color for payables
          },
          { id: userId, tenantId },
        );

        this.logger.log(
          `Successfully created calendar event for payable ${savedPayable.payableNumber}`,
        );
      } catch (eventError) {
        this.logger.error(
          `Failed to create calendar event for payable ${savedPayable.payableNumber}. The payable was created successfully.`,
          eventError.stack,
        );
        // No re-throw - calendar event creation is not critical
      }
    }
    // --- End of Calendar Event Creation ---

    return savedPayable;
  }

  async findAll(
    tenantId: string,
    paginationDto: PaginationDto = {},
  ): Promise<{
    payables: Payable[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = paginationDto;

    // Calcular skip para paginación
    const skip = PaginationHelper.getSkip(page, limit);

    // Ejecutar query con paginación
    const [payables, total] = await Promise.all([
      this.payableModel
        .find({ tenantId })
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.payableModel.countDocuments({ tenantId }).exec(),
    ]);

    return {
      payables,
      ...PaginationHelper.createPaginationMeta(page, limit, total),
    };
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
    // Validar que el payable existe y pertenece al tenant antes de anular
    const payable = await this.payableModel.findOne({ _id: id, tenantId });
    if (!payable) {
      throw new NotFoundException(`Payable con ID "${id}" no encontrado o no tiene permisos para anularlo`);
    }

    const result = await this.payableModel.updateOne(
      { _id: id, tenantId },
      { $set: { status: 'void' } },
    );

    if (result.modifiedCount === 0) {
      throw new NotFoundException(`Payable con ID "${id}" no encontrado o ya estaba anulado`);
    }

    return { success: true, message: 'Payable anulado exitosamente' };
  }

  async migrateDraftToOpen(tenantId: string): Promise<{ updated: number; payables: any[] }> {
    this.logger.log(`[Migration] Starting migration of draft payables to open for tenant ${tenantId}`);

    // Find all payables with status 'draft' and paidAmount = 0
    const draftPayables = await this.payableModel.find({
      tenantId,
      status: 'draft',
      paidAmount: 0,
    }).exec();

    this.logger.log(`[Migration] Found ${draftPayables.length} draft payables to migrate`);

    // Update all draft payables to open
    const result = await this.payableModel.updateMany(
      { tenantId, status: 'draft', paidAmount: 0 },
      { $set: { status: 'open' } },
    );

    this.logger.log(`[Migration] Updated ${result.modifiedCount} payables from draft to open`);

    return {
      updated: result.modifiedCount,
      payables: draftPayables.map(p => ({
        id: p._id,
        payeeName: p.payeeName,
        totalAmount: p.totalAmount,
        oldStatus: 'draft',
        newStatus: 'open',
      })),
    };
  }
}