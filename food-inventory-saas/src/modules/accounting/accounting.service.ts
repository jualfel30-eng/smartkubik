import {
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as moment from "moment-timezone";
import { format } from "date-fns";
import {
  ChartOfAccounts,
  ChartOfAccountsDocument,
} from "../../schemas/chart-of-accounts.schema";
import {
  JournalEntry,
  JournalEntryDocument,
} from "../../schemas/journal-entry.schema";
import {
  CreateChartOfAccountDto,
  CreateJournalEntryDto,
} from "../../dto/accounting.dto";
import { Order, OrderDocument } from "../../schemas/order.schema"; // <-- FIXED
import { PurchaseOrderDocument } from "../../schemas/purchase-order.schema";
import { PaymentDocument } from "../../schemas/payment.schema";
import { Payable, PayableDocument } from "../../schemas/payable.schema";
import { PayrollConcept } from "../../schemas/payroll-concept.schema";
import { PayrollRunDocument } from "../../schemas/payroll-run.schema";
import {
  BillingDocument,
  BillingDocumentDocument,
} from "../../schemas/billing-document.schema";

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    @InjectModel(ChartOfAccounts.name)
    private chartOfAccountsModel: Model<ChartOfAccountsDocument>,
    @InjectModel(JournalEntry.name)
    private journalEntryModel: Model<JournalEntryDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Payable.name) private payableModel: Model<PayableDocument>,
    @InjectModel(BillingDocument.name)
    private billingModel: Model<BillingDocumentDocument>,
  ) {}

  private async generateNextCode(
    type: string,
    tenantId: string,
  ): Promise<string> {
    const typePrefix = {
      Activo: "1",
      Pasivo: "2",
      Patrimonio: "3",
      Ingreso: "4",
      Gasto: "5",
    }[type];

    if (!typePrefix) {
      throw new InternalServerErrorException(
        `Prefijo de tipo de cuenta inválido: ${type}`,
      );
    }

    const lastAccount = await this.chartOfAccountsModel
      .findOne(
        {
          tenantId: tenantId,
          code: { $regex: `^${typePrefix}` },
        },
        { code: 1 },
        { sort: { code: -1 } },
      )
      .exec();

    if (lastAccount && lastAccount.code) {
      const lastNumber = parseInt(lastAccount.code.slice(1), 10);
      return `${typePrefix}${(lastNumber + 1).toString().padStart(2, "0")}`;
    }

    return `${typePrefix}01`;
  }

  async createAccount(
    createAccountDto: CreateChartOfAccountDto,
    tenantId: string,
  ): Promise<ChartOfAccounts> {
    const code = await this.generateNextCode(createAccountDto.type, tenantId);

    const newAccount = new this.chartOfAccountsModel({
      ...createAccountDto,
      tenantId: tenantId,
      code,
    });
    return newAccount.save();
  }

  async findAllAccounts(tenantId: string): Promise<ChartOfAccounts[]> {
    return this.chartOfAccountsModel
      .find({ tenantId: tenantId })
      .sort({ code: 1 })
      .exec();
  }

  async findAllJournalEntries(
    tenantId: string,
    page: number,
    limit: number,
    isAutomatic?: boolean,
  ): Promise<any> {
    const tenantObjectId = tenantId;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { tenantId: tenantObjectId };
    if (isAutomatic !== undefined) {
      filter.isAutomatic = isAutomatic;
    }

    const [entries, total] = await Promise.all([
      this.journalEntryModel
        .find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate("lines.account", "name code")
        .exec(),
      this.journalEntryModel.countDocuments(filter),
    ]);

    return {
      data: entries,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async fixJournalEntryDates(tenantId: string): Promise<void> {
    const stringEntries = await this.journalEntryModel.find({
      tenantId: tenantId,
      date: { $type: "string" } as any,
    });

    if (stringEntries.length > 0) {
      this.logger.log(
        `[DateFixer] Found ${stringEntries.length} journal entries with string dates to fix.`,
      );
      for (const entry of stringEntries) {
        const dateStr = entry.date as any;
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const year = parseInt(parts[2], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const day = parseInt(parts[0], 10);
          const validDate = new Date(year, month, day);

          if (!isNaN(validDate.getTime())) {
            await this.journalEntryModel.updateOne(
              { _id: entry._id },
              { $set: { date: validDate } },
            );
          }
        }
      }
    }
  }

  async createJournalEntry(
    createDto: CreateJournalEntryDto,
    tenantId: string,
  ): Promise<JournalEntryDocument> {
    const { lines, description } = createDto;

    const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredits = lines.reduce(
      (sum, line) => sum + (line.credit || 0),
      0,
    );

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new BadRequestException("Total debits must equal total credits.");
    }

    if (totalDebits === 0 && totalCredits === 0) {
      throw new BadRequestException(
        "Journal entry must have non-zero debit or credit values.",
      );
    }

    const newJournalEntry = new this.journalEntryModel({
      ...createDto,
      date: new Date(createDto.date),
      lines: createDto.lines.map((line) => ({
        account: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description || description,
      })),
      tenantId: tenantId,
      isAutomatic: false,
    });

    return newJournalEntry.save();
  }
  async createJournalEntryForPayrollRun(params: {
    run: PayrollRunDocument;
    conceptMap: Map<string, PayrollConcept>;
    tenantId: string;
  }) {
    const { run, conceptMap, tenantId } = params;
    if (!run.entries?.length) {
      return null;
    }
    const aggregate = new Map<
      string,
      {
        debitAccountId: string;
        creditAccountId: string;
        amount: number;
        description: string;
      }
    >();
    run.entries.forEach((entry) => {
      const concept = conceptMap.get(entry.conceptCode);
      if (!concept?.debitAccountId || !concept?.creditAccountId) {
        return;
      }
      const debitAccountId = concept.debitAccountId.toString();
      const creditAccountId = concept.creditAccountId.toString();
      const key = `${debitAccountId}:${creditAccountId}`;
      const record = aggregate.get(key) || {
        debitAccountId,
        creditAccountId,
        amount: 0,
        description: concept.name || entry.conceptCode,
      };
      record.amount += entry.amount;
      aggregate.set(key, record);
    });
    if (!aggregate.size) {
      return null;
    }
    const lines: CreateJournalEntryDto["lines"] = [];
    aggregate.forEach((record) => {
      const amount = Number(record.amount.toFixed(2));
      if (amount <= 0) return;
      lines.push({
        accountId: record.debitAccountId,
        debit: amount,
        credit: 0,
        description: record.description,
      });
      lines.push({
        accountId: record.creditAccountId,
        debit: 0,
        credit: amount,
        description: record.description,
      });
    });
    if (!lines.length) {
      return null;
    }
    const payload: CreateJournalEntryDto = {
      date: (run.periodEnd || run.createdAt || new Date()).toISOString(),
      description:
        run.label ||
        `Nómina ${format(run.periodEnd || new Date(), "dd/MM/yyyy")}`,
      lines,
    };
    const entry = await this.createJournalEntry(payload, tenantId);
    return entry._id.toString();
  }

  private async findAccountByCode(
    code: string,
    tenantId: string,
  ): Promise<ChartOfAccountsDocument> {
    const account = await this.chartOfAccountsModel
      .findOne({ code, tenantId: tenantId })
      .exec();
    if (!account) {
      this.logger.error(
        `Automatic accounting failed: Account with code "${code}" not found for tenant "${tenantId}".`,
      );
      throw new InternalServerErrorException(
        `Configuración de cuenta contable automática faltante: No se encontró la cuenta con código ${code}.`,
      );
    }
    return account;
  }

  private async findOrCreateAccount(
    accountDetails: {
      code: string;
      name: string;
      type: "Activo" | "Pasivo" | "Patrimonio" | "Ingreso" | "Gasto";
    },
    tenantId: string,
  ): Promise<ChartOfAccountsDocument> {
    const tenantObjectId = tenantId;
    const existingAccount = await this.chartOfAccountsModel
      .findOne({ code: accountDetails.code, tenantId: tenantObjectId })
      .exec();
    if (existingAccount) {
      return existingAccount;
    }

    this.logger.log(
      `Account with code ${accountDetails.code} not found, creating it: "${accountDetails.name}"`,
    );
    const newAccount = new this.chartOfAccountsModel({
      ...accountDetails,
      isSystemAccount: true,
      isEditable: false,
      tenantId: tenantObjectId,
    });
    return newAccount.save();
  }

  async createJournalEntryForSale(
    order: OrderDocument,
    tenantId: string,
  ): Promise<JournalEntryDocument> {
    this.logger.log(
      `Creating detailed automatic journal entry for sale ${order.orderNumber}`,
    );

    // 1. Get all necessary accounts
    const accountsReceivableAcc = await this.findAccountByCode(
      "1102",
      tenantId,
    );
    const salesRevenueAcc = await this.findAccountByCode("4101", tenantId);
    const taxPayableAcc = await this.findAccountByCode("2102", tenantId);

    const shippingIncomeAcc =
      order.shippingCost > 0
        ? await this.findOrCreateAccount(
            { code: "4102", name: "Ingresos por Envío", type: "Ingreso" },
            tenantId,
          )
        : null;

    const salesDiscountAcc =
      order.discountAmount > 0
        ? await this.findOrCreateAccount(
            { code: "4103", name: "Descuentos sobre Venta", type: "Ingreso" }, // Contra-revenue
            tenantId,
          )
        : null;

    // 2. Build the journal entry lines
    const lines: {
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }[] = [];

    // Debit side
    lines.push({
      accountId: accountsReceivableAcc._id.toString(),
      debit: order.totalAmount,
      credit: 0,
      description: `Cuentas por cobrar por orden ${order.orderNumber}`,
    });

    if (salesDiscountAcc && order.discountAmount > 0) {
      lines.push({
        accountId: salesDiscountAcc._id.toString(),
        debit: order.discountAmount,
        credit: 0,
        description: `Descuento en venta para la orden ${order.orderNumber}`,
      });
    }

    // Credit side
    lines.push({
      accountId: salesRevenueAcc._id.toString(),
      debit: 0,
      credit: order.subtotal,
      description: `Ingreso por venta ${order.orderNumber}`,
    });

    const totalTax = order.ivaTotal + order.igtfTotal;
    if (totalTax > 0) {
      lines.push({
        accountId: taxPayableAcc._id.toString(),
        debit: 0,
        credit: totalTax,
        description: `Impuestos (IVA/IGTF) por venta ${order.orderNumber}`,
      });
    }

    if (shippingIncomeAcc && order.shippingCost > 0) {
      lines.push({
        accountId: shippingIncomeAcc._id.toString(),
        debit: 0,
        credit: order.shippingCost,
        description: `Ingreso por envío para la orden ${order.orderNumber}`,
      });
    }

    // 3. Create and save the journal entry
    const entryDto: CreateJournalEntryDto = {
      date: new Date().toISOString(),
      description: `Asiento automático por venta de orden ${order.orderNumber}`,
      lines,
    };

    const newEntry = new this.journalEntryModel({
      ...entryDto,
      date: new Date(entryDto.date),
      lines: entryDto.lines.map((line) => ({
        account: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      })),
      tenantId: tenantId,
      isAutomatic: true,
    });

    return newEntry.save();
  }

  /**
   * Asiento automático para BillingDocument (factura) emitido desde módulo billing.
   * Usa AR 1102, Ingresos 4101 y 2102 Impuestos por Pagar.
   */
  async createJournalEntryForBillingDocument(
    billing: BillingDocumentDocument,
    tenantId: string,
  ): Promise<JournalEntryDocument | null> {
    const total = billing.totals?.grandTotal || 0;
    if (total <= 0) {
      return null;
    }
    const taxTotal = (billing.totals?.taxes || []).reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    const subtotal = billing.totals?.subtotal ?? Math.max(total - taxTotal, 0);

    const accountsReceivableAcc = await this.findAccountByCode(
      "1102",
      tenantId,
    );
    const salesRevenueAcc = await this.findAccountByCode("4101", tenantId);
    const taxPayableAcc = await this.findAccountByCode("2102", tenantId);

    const lines = [
      {
        accountId: accountsReceivableAcc._id.toString(),
        debit: total,
        credit: 0,
        description: `Cuentas por cobrar doc ${billing.documentNumber}`,
      },
      {
        accountId: salesRevenueAcc._id.toString(),
        debit: 0,
        credit: subtotal,
        description: `Ingreso doc ${billing.documentNumber}`,
      },
    ];

    if (taxTotal > 0) {
      lines.push({
        accountId: taxPayableAcc._id.toString(),
        debit: 0,
        credit: taxTotal,
        description: `Impuestos doc ${billing.documentNumber}`,
      });
    }

    const entry = await this.createJournalEntry(
      {
        description: `Asiento automático por factura ${billing.documentNumber}`,
        date: billing.issueDate || new Date(),
        lines,
        isAutomatic: true,
        source: {
          module: "billing",
          documentId: billing._id.toString(),
          controlNumber: billing.controlNumber,
        },
      } as any,
      tenantId,
    );

    return entry;
  }

  async createJournalEntryForCOGS(
    order: OrderDocument,
    tenantId: string,
  ): Promise<JournalEntryDocument | null> {
    this.logger.log(
      `Creating automatic COGS journal entry for sale ${order.orderNumber}`,
    );

    const totalCost = order.items.reduce(
      (sum, item) => sum + (item.costPrice || 0) * item.quantity,
      0,
    );

    if (totalCost === 0) {
      this.logger.log(
        `COGS for order ${order.orderNumber} is zero. Skipping journal entry.`,
      );
      return null;
    }

    const inventoryAcc = await this.findOrCreateAccount(
      {
        code: "1103",
        name: "Inventario",
        type: "Activo",
      },
      tenantId,
    );

    const cogsAcc = await this.findOrCreateAccount(
      {
        code: "5101",
        name: "Costo de Mercancía Vendida",
        type: "Gasto",
      },
      tenantId,
    );

    const lines: {
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }[] = [
      {
        accountId: cogsAcc._id.toString(),
        debit: totalCost,
        credit: 0,
        description: `Costo de venta para la orden ${order.orderNumber}`,
      },
      {
        accountId: inventoryAcc._id.toString(),
        debit: 0,
        credit: totalCost,
        description: `Disminución de inventario por orden ${order.orderNumber}`,
      },
    ];

    const entryDto: CreateJournalEntryDto = {
      date: new Date().toISOString(),
      description: `Asiento de costo de venta para la orden ${order.orderNumber}`,
      lines,
    };

    const newEntry = new this.journalEntryModel({
      ...entryDto,
      date: new Date(entryDto.date),
      lines: entryDto.lines.map((line) => ({
        account: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      })),
      tenantId: tenantId,
      isAutomatic: true,
    });

    return newEntry.save();
  }

  async createJournalEntryForPurchase(
    purchaseOrder: PurchaseOrderDocument,
    tenantId: string,
  ): Promise<JournalEntryDocument> {
    this.logger.log(
      `Creating automatic journal entry for purchase ${purchaseOrder.poNumber}`,
    );

    const inventoryAccount = await this.findOrCreateAccount(
      {
        code: "1103",
        name: "Inventario",
        type: "Activo",
      },
      tenantId,
    );

    const accountsPayableAcc = await this.findOrCreateAccount(
      {
        code: "2101",
        name: "Cuentas por Pagar",
        type: "Pasivo",
      },
      tenantId,
    );

    const lines: {
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }[] = [
      {
        accountId: inventoryAccount._id.toString(),
        debit: purchaseOrder.totalAmount,
        credit: 0,
        description: `Compra según orden ${purchaseOrder.poNumber}`,
      },
      {
        accountId: accountsPayableAcc._id.toString(),
        debit: 0,
        credit: purchaseOrder.totalAmount,
        description: `Cuentas por pagar por orden ${purchaseOrder.poNumber}`,
      },
    ];

    const entryDto: CreateJournalEntryDto = {
      date: moment
        .tz(purchaseOrder.purchaseDate, "America/Caracas")
        .startOf("day")
        .toISOString(),
      description: `Asiento automático por compra ${purchaseOrder.poNumber}`,
      lines,
    };

    const newEntry = new this.journalEntryModel({
      date: new Date(entryDto.date),
      description: entryDto.description,
      lines: entryDto.lines.map((line) => ({
        account: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      })),
      tenantId: tenantId,
      isAutomatic: true,
    });

    return newEntry.save();
  }

  async createJournalEntryForPayable(
    payable: PayableDocument,
    tenantId: string,
  ): Promise<JournalEntryDocument> {
    this.logger.log(
      `Creating automatic journal entry for payable ${payable.payableNumber}`,
    );

    const accountsPayableAcc = await this.findOrCreateAccount(
      {
        code: "2101",
        name: "Cuentas por Pagar",
        type: "Pasivo",
      },
      tenantId,
    );

    const lines: {
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }[] = [];

    // Debit each expense account from the payable lines, verifying it exists first
    for (const line of payable.lines) {
      const expenseAccount = await this.chartOfAccountsModel
        .findById(line.accountId)
        .exec();
      if (!expenseAccount) {
        throw new BadRequestException(
          `La cuenta de gasto con ID "${line.accountId}" para la línea "${line.description}" no fue encontrada.`,
        );
      }
      lines.push({
        accountId: expenseAccount._id.toString(),
        debit: line.amount,
        credit: 0,
        description: line.description || `Gasto por ${payable.description}`,
      });
    }

    // Credit the total to Accounts Payable
    lines.push({
      accountId: accountsPayableAcc._id.toString(),
      debit: 0,
      credit: payable.totalAmount,
      description: `Cuentas por pagar por ${payable.payableNumber}`,
    });

    const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new InternalServerErrorException(
        "El asiento para la cuenta por pagar está desbalanceado.",
      );
    }

    const entryDto: CreateJournalEntryDto = {
      date: new Date(payable.issueDate).toISOString(),
      description: `Asiento automático por cuenta por pagar ${payable.payableNumber}: ${payable.description}`,
      lines,
    };

    const newEntry = new this.journalEntryModel({
      date: new Date(entryDto.date),
      description: entryDto.description,
      lines: entryDto.lines.map((line) => ({
        account: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      })),
      tenantId: tenantId,
      isAutomatic: true,
    });

    return newEntry.save();
  }

  async createJournalEntryForPayment(
    order: OrderDocument,
    payment: PaymentDocument, // <-- FIXED
    tenantId: string,
    igtfAmount = 0,
  ): Promise<JournalEntryDocument> {
    this.logger.log(
      `Creating automatic journal entry for payment on order ${order.orderNumber}, IGTF: ${igtfAmount}`,
    );

    const cashOrBankAcc = await this.findAccountByCode("1101", tenantId);
    const accountsReceivableAcc = await this.findAccountByCode(
      "1102",
      tenantId,
    );

    const lines: {
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }[] = [
      {
        accountId: cashOrBankAcc._id.toString(),
        debit: payment.amount,
        credit: 0,
        description: `Cobro de orden ${order.orderNumber}`,
      },
      {
        accountId: accountsReceivableAcc._id.toString(),
        debit: 0,
        credit: payment.amount,
        description: `Cancelación de Cuentas por Cobrar por orden ${order.orderNumber}`,
      },
    ];

    if (igtfAmount > 0) {
      const igtfExpenseAccount = await this.findOrCreateAccount(
        {
          code: "599",
          name: "Gasto IGTF",
          type: "Gasto",
        },
        tenantId,
      );

      const taxPayableAccount = await this.findAccountByCode("2102", tenantId);

      lines.push({
        accountId: igtfExpenseAccount._id.toString(),
        debit: igtfAmount,
        credit: 0,
        description: `Gasto IGTF por cobro de orden ${order.orderNumber}`,
      });

      lines.push({
        accountId: taxPayableAccount._id.toString(),
        debit: 0,
        credit: igtfAmount,
        description: `Provisión IGTF por cobro de orden ${order.orderNumber}`,
      });
    }

    const entryDto: CreateJournalEntryDto = {
      date: (payment.confirmedAt || new Date()).toISOString(),
      description: `Asiento automático por cobro de orden ${order.orderNumber}`,
      lines,
    };

    const newEntry = new this.journalEntryModel({
      ...entryDto,
      date: new Date(entryDto.date),
      lines: entryDto.lines.map((line) => ({
        account: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      })),
      tenantId: tenantId,
      isAutomatic: true,
    });

    return newEntry.save();
  }

  async createJournalEntryForManualDeposit(params: {
    tenantId: string;
    amount: number;
    currency?: string;
    appointmentId: string;
    appointmentNumber?: string;
    customerName?: string;
    serviceName?: string;
    reference?: string;
    method?: string;
    transactionDate: Date;
  }): Promise<JournalEntryDocument> {
    const {
      tenantId,
      amount,
      appointmentId,
      appointmentNumber,
      customerName,
      serviceName,
      reference,
      method,
      transactionDate,
    } = params;

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        "El monto del depósito debe ser mayor a 0 para generar el asiento.",
      );
    }

    const cashOrBankAcc = await this.findAccountByCode("1101", tenantId);
    const customerAdvanceAccount = await this.findOrCreateAccount(
      {
        code: "2103",
        name: "Anticipos de Clientes",
        type: "Pasivo",
      },
      tenantId,
    );

    const descriptionParts = [
      "Depósito manual de reserva",
      serviceName ? `(${serviceName})` : undefined,
      customerName ? `- ${customerName}` : undefined,
    ].filter(Boolean);

    const description =
      descriptionParts.length > 0
        ? descriptionParts.join(" ")
        : `Depósito manual cita ${appointmentNumber || appointmentId}`;

    const entryDto: CreateJournalEntryDto = {
      date: transactionDate.toISOString(),
      description,
      lines: [
        {
          accountId: cashOrBankAcc._id.toString(),
          debit: amount,
          credit: 0,
          description,
        },
        {
          accountId: customerAdvanceAccount._id.toString(),
          debit: 0,
          credit: amount,
          description:
            reference || `Anticipo de cliente (${method || "manual"})`,
        },
      ],
    };

    const newEntry = new this.journalEntryModel({
      ...entryDto,
      date: new Date(entryDto.date),
      lines: entryDto.lines.map((line) => ({
        account: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      })),
      tenantId,
      isAutomatic: true,
      metadata: {
        createdFrom: "appointments_manual_deposit",
        appointmentId,
        appointmentNumber: appointmentNumber ?? null,
        customerName: customerName ?? null,
        serviceName: serviceName ?? null,
        reference,
        method,
      },
    });

    return newEntry.save();
  }

  async getProfitAndLoss(tenantId: string, from: Date, to: Date): Promise<any> {
    await this.fixJournalEntryDates(tenantId);
    const tenantObjectId = tenantId;

    const allAccounts = await this.chartOfAccountsModel
      .find({ tenantId: tenantObjectId })
      .exec();

    const incomeAccountIds = allAccounts
      .filter((a) => a.type === "Ingreso" || a.type === "Ingresos")
      .map((a) => a._id);

    const expenseAccountIds = allAccounts
      .filter((a) => a.type === "Gasto" || a.type === "Gastos")
      .map((a) => a._id);

    const journalEntries = await this.journalEntryModel
      .find({
        tenantId: tenantObjectId,
        date: { $gte: from, $lte: to },
      })
      .populate("lines.account")
      .exec();

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        if (!line.account) continue;

        const accountId = (line.account as any)._id;
        if (incomeAccountIds.some((id) => id.equals(accountId))) {
          totalIncome += line.credit - line.debit;
        }
        if (expenseAccountIds.some((id) => id.equals(accountId))) {
          totalExpenses += line.debit - line.credit;
        }
      }
    }

    return {
      period: {
        from,
        to,
      },
      summary: {
        totalRevenue: totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
      },
    };
  }

  async getBalanceSheet(tenantId: string, asOfDate: Date): Promise<any> {
    await this.fixJournalEntryDates(tenantId);
    const tenantObjectId = tenantId;

    const allAccounts = await this.chartOfAccountsModel
      .find({ tenantId: tenantObjectId })
      .lean();
    const journalEntries = await this.journalEntryModel
      .find({
        tenantId: tenantObjectId,
        date: { $lte: asOfDate },
      })
      .lean();

    const accountBalances = new Map<string, number>();

    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        const accountId = line.account.toString();
        const currentBalance = accountBalances.get(accountId) || 0;
        const balanceChange = line.debit - line.credit;
        accountBalances.set(accountId, currentBalance + balanceChange);
      }
    }

    const assets: { name: string; code: string; balance: number }[] = [];
    const liabilities: { name: string; code: string; balance: number }[] = [];
    const equity: { name: string; code: string; balance: number }[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let netIncome = 0;

    for (const account of allAccounts) {
      const accountId = account._id.toString();
      const balance = accountBalances.get(accountId) || 0;

      if (balance === 0) continue;

      const accountInfo = {
        name: account.name,
        code: account.code,
        balance: 0,
      };

      switch (account.type) {
        case "Activo":
          accountInfo.balance = balance;
          assets.push(accountInfo);
          totalAssets += balance;
          break;
        case "Pasivo":
          accountInfo.balance = -balance;
          liabilities.push(accountInfo);
          totalLiabilities += accountInfo.balance;
          break;
        case "Patrimonio":
          accountInfo.balance = -balance;
          equity.push(accountInfo);
          totalEquity += accountInfo.balance;
          break;
        case "Ingreso":
        case "Ingresos":
          netIncome -= balance;
          break;
        case "Gasto":
        case "Gastos":
          netIncome += balance;
          break;
      }
    }

    equity.push({
      name: "Utilidad Neta del Período",
      code: "399",
      balance: netIncome,
    });
    totalEquity += netIncome;

    return {
      asOfDate,
      assets: {
        accounts: assets.sort((a, b) => a.code.localeCompare(b.code)),
        total: totalAssets,
      },
      liabilities: {
        accounts: liabilities.sort((a, b) => a.code.localeCompare(b.code)),
        total: totalLiabilities,
      },
      equity: {
        accounts: equity.sort((a, b) => a.code.localeCompare(b.code)),
        total: totalEquity,
      },
      verification: {
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        difference: totalAssets - (totalLiabilities + totalEquity),
      },
    };
  }

  async getAccountsReceivable(tenantId: string): Promise<any> {
    const tenantObjectId = tenantId;

    const unpaidOrders = await this.orderModel
      .find({
        tenantId: tenantObjectId,
        paymentStatus: { $in: ["pending", "partial"] },
      })
      .populate("customerId", "name")
      .populate("payments")
      .exec(); // <-- FIXED

    const report = unpaidOrders.map((order) => {
      // Safely handle payments array - it might be undefined, null, or empty
      const payments = order.payments || [];
      const totalPaid = (payments as unknown as PaymentDocument[]).reduce(
        (acc, p) => {
          // Handle case where payment might not be fully populated
          if (p && typeof p === 'object' && 'amount' in p) {
            return acc + (p.amount || 0);
          }
          return acc;
        },
        0,
      );
      const balance = order.totalAmount - totalPaid;
      return {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        orderDate: (order as any).createdAt,
        dueDate: (order as any).createdAt, // This should be improved
        totalAmount: order.totalAmount,
        paidAmount: totalPaid,
        balance: balance,
        status: order.paymentStatus,
      };
    });

    return report;
  }

  async getAccountsPayable(tenantId: string): Promise<any> {
    const tenantObjectId = tenantId;

    const unpaidPayables = await this.payableModel
      .find({
        tenantId: tenantObjectId,
        status: { $in: ["open", "partially_paid"] },
      })
      .exec();

    const report = unpaidPayables.map((payable) => {
      const balance = payable.totalAmount - payable.paidAmount;
      return {
        payableNumber: payable.payableNumber,
        payeeName: payable.payeeName,
        issueDate: payable.issueDate,
        dueDate: payable.dueDate,
        totalAmount: payable.totalAmount,
        paidAmount: payable.paidAmount,
        balance: balance,
        status: payable.status,
      };
    });

    return report;
  }

  async getCashFlowStatement(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<any> {
    // CRUCIAL FIX: Ensure dates are in the correct format before querying
    await this.fixJournalEntryDates(tenantId);

    const tenantObjectId = tenantId;

    // FINAL, PRECISE FIX: Find the cash account by its hardcoded code used for payments.
    const cashAccount = await this.chartOfAccountsModel
      .findOne({
        tenantId: tenantObjectId,
        code: "1101",
      })
      .exec();

    // Add a log to be 100% certain what account is being used.
    this.logger.log(
      `[CASH FLOW] Using cash account found for code 1101: ${cashAccount ? cashAccount.name : "NONE FOUND"}`,
    );

    if (!cashAccount) {
      this.logger.warn(
        `No cash account found for code '1101' for tenant ${tenantId}. Cash flow will be zero.`,
      );
      return {
        period: { from, to },
        cashInflows: { total: 0, details: [] },
        cashOutflows: { total: 0, details: [] },
        netCashFlow: 0,
      };
    }

    const cashAccountIds = [cashAccount._id]; // Now an array with one ID

    // Step 2: Fetch all journal entries in the period that involve the cash account
    const journalEntries = await this.journalEntryModel
      .find({
        tenantId: tenantObjectId,
        date: { $gte: from, $lte: to },
        "lines.account": { $in: cashAccountIds },
      })
      .populate("lines.account")
      .exec();

    let totalCashInflow = 0;
    const cashInflows: { date: Date; description: string; amount: number }[] =
      [];
    let totalCashOutflow = 0;
    const cashOutflows: { date: Date; description: string; amount: number }[] =
      [];

    // Step 3: Process each journal entry
    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        // Check if the line's account is our cash account
        if (cashAccount._id.equals((line.account as any)._id)) {
          // Debit to a cash account is an INFLOW
          if (line.debit > 0) {
            totalCashInflow += line.debit;
            cashInflows.push({
              date: entry.date,
              description: entry.description,
              amount: line.debit,
            });
          }
          // Credit to a cash account is an OUTFLOW
          if (line.credit > 0) {
            totalCashOutflow += line.credit;
            cashOutflows.push({
              date: entry.date,
              description: entry.description,
              amount: line.credit,
            });
          }
        }
      }
    }

    // Step 4: Calculate totals and return
    const netCashFlow = totalCashInflow - totalCashOutflow;

    return {
      period: { from, to },
      cashInflows: {
        total: totalCashInflow,
        details: cashInflows,
      },
      cashOutflows: {
        total: totalCashOutflow,
        details: cashOutflows,
      },
      netCashFlow,
    };
  }

  async createJournalEntryForPayablePayment(
    payment: PaymentDocument,
    payable: PayableDocument,
    tenantId: string,
  ): Promise<JournalEntryDocument> {
    this.logger.log(
      `Creating automatic journal entry for payment on payable ${payable.payableNumber}`,
    );

    const accountsPayableAcc = await this.findAccountByCode("2101", tenantId);
    const cashOrBankAcc = await this.findAccountByCode("1101", tenantId);

    const lines: {
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }[] = [
      {
        accountId: accountsPayableAcc._id.toString(),
        debit: payment.amount,
        credit: 0,
        description: `Pago de Cta por Pagar ${payable.payableNumber}`,
      },
      {
        accountId: cashOrBankAcc._id.toString(),
        debit: 0,
        credit: payment.amount,
        description: `Salida de dinero por pago de ${payable.payableNumber}`,
      },
    ];

    const entryDto: CreateJournalEntryDto = {
      date: new Date(payment.date).toISOString(),
      description: `Asiento automático por pago de Cta por Pagar ${payable.payableNumber}`,
      lines,
    };

    const newEntry = new this.journalEntryModel({
      ...entryDto,
      date: new Date(entryDto.date),
      lines: entryDto.lines.map((line) => ({
        account: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      })),
      tenantId: tenantId,
      isAutomatic: true,
    });

    return newEntry.save();
  }

  // ==================== PHASE 2: Advanced Accounting Reports ====================

  /**
   * Get Trial Balance (Balance de Comprobación)
   * Lists all accounts with their debit/credit balances
   * Validates that total debits = total credits
   */
  async getTrialBalance(
    tenantId: string,
    startDate?: string,
    endDate?: string,
    accountType?: string,
    includeZeroBalances = false,
  ) {
    // Build date filter
    const dateFilter: any = { tenantId };
    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get all accounts
    let accountsQuery: any = { tenantId };
    if (accountType) {
      accountsQuery.type = accountType;
    }

    const accounts = await this.chartOfAccountsModel
      .find(accountsQuery)
      .sort({ code: 1 })
      .lean();

    // Calculate balance for each account
    const accountBalances: Array<{
      accountCode: string;
      accountName: string;
      accountType: string;
      debit: number;
      credit: number;
      balance: number;
    }> = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      // Get all journal entry lines for this account
      const entries = await this.journalEntryModel.find(dateFilter).lean();

      let accountDebit = 0;
      let accountCredit = 0;

      for (const entry of entries) {
        for (const line of entry.lines) {
          if (line.account.toString() === account._id.toString()) {
            accountDebit += line.debit || 0;
            accountCredit += line.credit || 0;
          }
        }
      }

      const balance = accountDebit - accountCredit;

      // Skip zero balances if requested
      if (!includeZeroBalances && balance === 0 && accountDebit === 0 && accountCredit === 0) {
        continue;
      }

      accountBalances.push({
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        debit: accountDebit,
        credit: accountCredit,
        balance: balance,
      });

      totalDebits += accountDebit;
      totalCredits += accountCredit;
    }

    // Validation check
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01; // Allow small rounding errors

    return {
      period: {
        startDate: startDate || 'Inicio',
        endDate: endDate || 'Actual',
      },
      accounts: accountBalances,
      totals: {
        totalDebits,
        totalCredits,
        difference: totalDebits - totalCredits,
        isBalanced,
      },
    };
  }

  /**
   * Get General Ledger (Libro Mayor) for a specific account
   * Shows all transactions for an account with running balance
   */
  async getGeneralLedger(
    tenantId: string,
    accountCode: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 100,
  ) {
    // Find the account
    const account = await this.chartOfAccountsModel.findOne({
      tenantId,
      code: accountCode,
    });

    if (!account) {
      throw new NotFoundException(
        `Cuenta con código ${accountCode} no encontrada`,
      );
    }

    // Build date filter
    const dateFilter: any = { tenantId };
    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get all journal entries
    const entries = await this.journalEntryModel
      .find(dateFilter)
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // Filter and transform to ledger format
    const ledgerEntries: Array<{
      date: Date;
      entryId: any;
      description: string;
      debit: number;
      credit: number;
      balance: number;
      isAutomatic: boolean;
    }> = [];
    let runningBalance = 0;

    // Calculate opening balance if startDate is provided
    if (startDate) {
      const openingEntries = await this.journalEntryModel
        .find({
          tenantId,
          date: { $lt: new Date(startDate) },
        })
        .lean();

      for (const entry of openingEntries) {
        for (const line of entry.lines) {
          if (line.account.toString() === account._id.toString()) {
            runningBalance += (line.debit || 0) - (line.credit || 0);
          }
        }
      }
    }

    const openingBalance = runningBalance;

    // Process each entry
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.account.toString() === account._id.toString()) {
          const debit = line.debit || 0;
          const credit = line.credit || 0;
          runningBalance += debit - credit;

          ledgerEntries.push({
            date: entry.date,
            entryId: entry._id,
            description: line.description || entry.description,
            debit,
            credit,
            balance: runningBalance,
            isAutomatic: entry.isAutomatic || false,
          });
        }
      }
    }

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedEntries = ledgerEntries.slice(skip, skip + limit);

    return {
      account: {
        code: account.code,
        name: account.name,
        type: account.type,
      },
      period: {
        startDate: startDate || 'Inicio',
        endDate: endDate || 'Actual',
      },
      openingBalance,
      closingBalance: runningBalance,
      entries: paginatedEntries,
      pagination: {
        total: ledgerEntries.length,
        page,
        limit,
        totalPages: Math.ceil(ledgerEntries.length / limit),
      },
    };
  }
}
