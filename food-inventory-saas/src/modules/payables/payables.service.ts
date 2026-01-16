import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Payable, PayableDocument } from "../../schemas/payable.schema";
import { AccountingService } from "../accounting/accounting.service";
import { EventsService } from "../events/events.service";
import { ExchangeRateService } from "../exchange-rate/exchange-rate.service";
import {
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  IsMongoId,
  IsEnum,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { PaginationDto, PaginationHelper } from "../../dto/pagination.dto";
import {
  SanitizeString,
  SanitizeText,
} from "../../decorators/sanitize.decorator";

// --- DTOs (definidos aquí temporalmente) ---

class CreatePayableLineDto {
  @IsString()
  @SanitizeString()
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
  @IsEnum([
    "purchase_order",
    "payroll",
    "service_payment",
    "utility_bill",
    "other",
  ])
  type: string;

  @IsEnum(["supplier", "employee", "custom"])
  payeeType: string;

  @IsOptional()
  @IsMongoId()
  payeeId?: string;

  @IsString()
  @SanitizeString()
  payeeName: string;

  @IsDateString()
  issueDate: Date;

  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  @SanitizeText()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePayableLineDto)
  lines: CreatePayableLineDto[];

  @IsOptional()
  @IsString()
  @SanitizeText()
  notes?: string;

  @IsOptional()
  @IsMongoId()
  relatedPurchaseOrderId?: string;

  // Nuevos campos para tracking de moneda y forma de pago
  @IsOptional()
  @IsEnum(["USD", "VES", "EUR", "USD_BCV", "EUR_BCV"])
  expectedCurrency?: string;

  @IsOptional()
  @IsBoolean()
  isCredit?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expectedPaymentMethods?: string[];
}

export class UpdatePayableDto {
  @IsOptional()
  @IsEnum([
    "purchase_order",
    "payroll",
    "service_payment",
    "utility_bill",
    "other",
  ])
  type?: string;

  @IsOptional()
  @IsEnum(["supplier", "employee", "custom"])
  payeeType?: string;

  @IsOptional()
  @IsMongoId()
  payeeId?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  payeeName?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: Date;

  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  @SanitizeText()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePayableLineDto)
  lines?: CreatePayableLineDto[];

  @IsOptional()
  @IsString()
  @SanitizeText()
  notes?: string;

  @IsOptional()
  @IsEnum(["draft", "open", "partially_paid", "paid", "void"])
  status?: string;
}

@Injectable()
export class PayablesService {
  private readonly logger = new Logger(PayablesService.name);

  constructor(
    @InjectModel(Payable.name) private payableModel: Model<PayableDocument>,
    private readonly accountingService: AccountingService,
    private readonly eventsService: EventsService,
    private readonly exchangeRateService: ExchangeRateService,
  ) { }

  async create(
    createPayableDto: CreatePayableDto,
    tenantId: string,
    userId: string,
  ): Promise<Payable> {
    const totalAmount = createPayableDto.lines.reduce(
      (sum, line) => sum + line.amount,
      0,
    );

    // Calcular totalAmountVes usando la tasa de cambio actual
    let totalAmountVes = 0;
    try {
      const rateData = await this.exchangeRateService.getBCVRate();
      totalAmountVes = totalAmount * rateData.rate;
      this.logger.log(
        `Calculated totalAmountVes for payable: ${totalAmountVes} (rate: ${rateData.rate})`,
      );
    } catch (error) {
      this.logger.warn(
        "Failed to get exchange rate for payable, totalAmountVes will be 0",
      );
    }

    const payableNumber = `PAY-${Date.now()}`;

    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const newPayable = new this.payableModel({
      ...createPayableDto,
      tenantId: tenantObjectId,
      createdBy: userId,
      totalAmount,
      totalAmountVes,
      payableNumber,
      paidAmount: 0,
      paidAmountVes: 0,
      status: "open", // FIXED: Changed from 'draft' to 'open' so payables appear as pending immediately
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
            description:
              savedPayable.description ||
              `Pago pendiente por $${savedPayable.totalAmount} - ${savedPayable.payableNumber}`,
            start: new Date(savedPayable.dueDate).toISOString(),
            allDay: true,
            color: "#ef4444", // Red color for payables
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

    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    // Ejecutar query con paginación
    const [payables, total] = await Promise.all([
      this.payableModel
        .find({ tenantId: tenantObjectId })
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.payableModel.countDocuments({ tenantId: tenantObjectId }).exec(),
    ]);

    return {
      payables,
      ...PaginationHelper.createPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, tenantId: string): Promise<Payable> {
    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const payable = await this.payableModel
      .findOne({ _id: id, tenantId: tenantObjectId })
      .exec();
    if (!payable) {
      throw new NotFoundException(`Payable con ID "${id}" no encontrado`);
    }
    return payable;
  }

  async update(
    id: string,
    tenantId: string,
    updatePayableDto: UpdatePayableDto,
  ): Promise<Payable> {
    const updatePayload: any = { ...updatePayableDto };

    if (updatePayableDto.lines) {
      updatePayload.totalAmount = updatePayableDto.lines.reduce(
        (sum, line) => sum + line.amount,
        0,
      );
    }

    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const updatedPayable = await this.payableModel
      .findOneAndUpdate(
        { _id: id, tenantId: tenantObjectId },
        { $set: updatePayload },
        { new: true },
      )
      .exec();

    if (!updatedPayable) {
      throw new NotFoundException(`Payable con ID "${id}" no encontrado`);
    }

    return updatedPayable;
  }

  async remove(
    id: string,
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    // Validar que el payable existe y pertenece al tenant antes de anular
    const payable = await this.payableModel.findOne({
      _id: id,
      tenantId: tenantObjectId,
    });
    if (!payable) {
      throw new NotFoundException(
        `Payable con ID "${id}" no encontrado o no tiene permisos para anularlo`,
      );
    }

    const result = await this.payableModel.updateOne(
      { _id: id, tenantId: tenantObjectId },
      { $set: { status: "void" } },
    );

    if (result.modifiedCount === 0) {
      throw new NotFoundException(
        `Payable con ID "${id}" no encontrado o ya estaba anulado`,
      );
    }

    return { success: true, message: "Payable anulado exitosamente" };
  }

  async migrateDraftToOpen(
    tenantId: string,
  ): Promise<{ updated: number; payables: any[] }> {
    this.logger.log(
      `[Migration] Starting migration of draft payables to open for tenant ${tenantId}`,
    );

    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    // Find all payables with status 'draft' and paidAmount = 0
    const draftPayables = await this.payableModel
      .find({
        tenantId: tenantObjectId,
        status: "draft",
        paidAmount: 0,
      })
      .exec();

    this.logger.log(
      `[Migration] Found ${draftPayables.length} draft payables to migrate`,
    );

    // Update all draft payables to open
    const result = await this.payableModel.updateMany(
      { tenantId: tenantObjectId, status: "draft", paidAmount: 0 },
      { $set: { status: "open" } },
    );

    this.logger.log(
      `[Migration] Updated ${result.modifiedCount} payables from draft to open`,
    );

    return {
      updated: result.modifiedCount,
      payables: draftPayables.map((p) => ({
        id: p._id,
        payeeName: p.payeeName,
        totalAmount: p.totalAmount,
        oldStatus: "draft",
        newStatus: "open",
      })),
    };
  }

  /**
   * Get summary of payables with totals by currency and aging report
   * Used for dashboard cards in the UI
   */
  async getSummary(tenantId: string): Promise<{
    total: { count: number; amount: number; amountVes: number };
    byCurrency: Record<string, { count: number; amount: number }>;
    aging: {
      current: { count: number; amount: number };
      days30: { count: number; amount: number };
      days60: { count: number; amount: number };
      days90plus: { count: number; amount: number };
    };
    byStatus: Record<string, { count: number; amount: number }>;
  }> {
    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const now = new Date();
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days60Ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get all non-void payables
    const payables = await this.payableModel
      .find({
        tenantId: tenantObjectId,
        status: { $nin: ["void", "paid"] },
      })
      .lean()
      .exec();

    // Initialize result structure
    const result = {
      total: { count: 0, amount: 0, amountVes: 0 },
      byCurrency: {} as Record<string, { count: number; amount: number }>,
      aging: {
        current: { count: 0, amount: 0 },
        days30: { count: 0, amount: 0 },
        days60: { count: 0, amount: 0 },
        days90plus: { count: 0, amount: 0 },
      },
      byStatus: {} as Record<string, { count: number; amount: number }>,
    };

    // Process each payable
    for (const payable of payables) {
      const remainingAmount = payable.totalAmount - (payable.paidAmount || 0);
      const remainingAmountVes =
        (payable.totalAmountVes || 0) - (payable.paidAmountVes || 0);

      if (remainingAmount <= 0) continue;

      // Total
      result.total.count++;
      result.total.amount += remainingAmount;
      result.total.amountVes += remainingAmountVes;

      // By Currency
      const currency = (payable as any).expectedCurrency || "USD";
      if (!result.byCurrency[currency]) {
        result.byCurrency[currency] = { count: 0, amount: 0 };
      }
      result.byCurrency[currency].count++;
      result.byCurrency[currency].amount += remainingAmount;

      // By Status
      const status = payable.status || "open";
      if (!result.byStatus[status]) {
        result.byStatus[status] = { count: 0, amount: 0 };
      }
      result.byStatus[status].count++;
      result.byStatus[status].amount += remainingAmount;

      // Aging (based on dueDate)
      const dueDate = payable.dueDate ? new Date(payable.dueDate) : null;

      if (!dueDate || dueDate >= now) {
        // Not yet due
        result.aging.current.count++;
        result.aging.current.amount += remainingAmount;
      } else if (dueDate >= days30Ago) {
        // 1-30 days overdue
        result.aging.days30.count++;
        result.aging.days30.amount += remainingAmount;
      } else if (dueDate >= days60Ago) {
        // 31-60 days overdue
        result.aging.days60.count++;
        result.aging.days60.amount += remainingAmount;
      } else {
        // 90+ days overdue
        result.aging.days90plus.count++;
        result.aging.days90plus.amount += remainingAmount;
      }
    }

    this.logger.log(
      `Summary for tenant ${tenantId}: Total ${result.total.count} payables, $${result.total.amount}`,
    );

    return result;
  }

  /**
   * Find payables with optional filters
   */
  async findAllWithFilters(
    tenantId: string,
    filters: {
      expectedCurrency?: string;
      status?: string;
      overdue?: boolean;
      aging?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    payables: Payable[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      expectedCurrency,
      status,
      overdue,
      aging,
    } = filters;

    const skip = PaginationHelper.getSkip(page, limit);

    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    // Build query
    const query: any = {
      tenantId: tenantObjectId,
      status: { $nin: ["void"] },
    };

    // Filter by currency
    if (expectedCurrency) {
      query.expectedCurrency = expectedCurrency;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter overdue payables
    if (overdue === true) {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ["void", "paid"] };
    }

    // Filter by aging bucket
    if (aging) {
      const now = new Date();
      const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const days60Ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      query.status = { $nin: ["void", "paid"] };

      switch (aging) {
        case "current":
          // Not yet due or no due date
          query.$or = [{ dueDate: { $gte: now } }, { dueDate: null }];
          break;
        case "days30":
          // 1-30 days overdue
          query.dueDate = { $lt: now, $gte: days30Ago };
          break;
        case "days60":
          // 31-60 days overdue
          query.dueDate = { $lt: days30Ago, $gte: days60Ago };
          break;
        case "days90plus":
          // 90+ days overdue (more than 60 days ago)
          query.dueDate = { $lt: days60Ago };
          break;
      }
    }

    const [payables, total] = await Promise.all([
      this.payableModel
        .find(query)
        .sort({ dueDate: 1, issueDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.payableModel.countDocuments(query).exec(),
    ]);

    return {
      payables,
      ...PaginationHelper.createPaginationMeta(page, limit, total),
    };
  }
}
