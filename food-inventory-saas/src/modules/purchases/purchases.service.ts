import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ClientSession } from "mongoose";
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from "../../schemas/purchase-order.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { CreatePurchaseOrderDto } from "../../dto/purchase-order.dto";
import { CreateCustomerDto } from "../../dto/customer.dto";
import { CustomersService } from "../customers/customers.service";
import { InventoryService } from "../inventory/inventory.service";
import { AccountingService } from "../accounting/accounting.service";
import {
  PayablesService,
  CreatePayableDto,
} from "../payables/payables.service"; // Import PayablesService and DTO
import { EventsService } from "../events/events.service"; // Import EventsService
import { TransactionHistoryService } from "../../services/transaction-history.service"; // Import TransactionHistoryService

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectModel(PurchaseOrder.name)
    private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly customersService: CustomersService,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
    private readonly payablesService: PayablesService, // Inject PayablesService
    private readonly eventsService: EventsService, // Inject EventsService
    private readonly transactionHistoryService: TransactionHistoryService, // Inject TransactionHistoryService
  ) {}

  async create(
    dto: CreatePurchaseOrderDto,
    user: any,
    session?: ClientSession,
  ): Promise<PurchaseOrderDocument> {
    let supplierId = dto.supplierId;
    let supplierName = "";

    if (!supplierId) {
      if (
        !dto.newSupplierName ||
        !dto.newSupplierRif ||
        !dto.newSupplierContactName
      ) {
        throw new BadRequestException(
          "Para un nuevo proveedor, se requiere Nombre, RIF y Nombre del Contacto.",
        );
      }
      const newCustomerDto: CreateCustomerDto = {
        name: dto.newSupplierContactName,
        companyName: dto.newSupplierName,
        customerType: "supplier",
        taxInfo: {
          taxId: dto.newSupplierRif,
          taxType: dto.newSupplierRif.charAt(0),
        },
        contacts: [
          {
            type: "phone",
            value: dto.newSupplierContactPhone ?? "",
            isPrimary: true,
          },
          {
            type: "email",
            value: dto.newSupplierContactEmail ?? "",
            isPrimary: false,
          },
        ].filter((c) => c.value),
      };
      const newSupplier = await this.customersService.create(
        newCustomerDto,
        user,
      );
      supplierId = newSupplier._id.toString();
      supplierName = newSupplier.companyName || newSupplier.name;
      this.logger.log(
        `New supplier (as customer) created: ${supplierName} (${supplierId})`,
      );
    } else {
      const existingSupplier = await this.customersService.findOne(
        supplierId,
        user.tenantId,
      );
      if (!existingSupplier) {
        throw new NotFoundException(
          `Proveedor (Cliente) con ID "${supplierId}" no encontrado.`,
        );
      }
      supplierName = existingSupplier.companyName || existingSupplier.name;
    }

    const { Types } = require("mongoose");
    let totalAmount = 0;
    const poItems = dto.items.map((item) => {
      const totalCost = item.costPrice * item.quantity;
      totalAmount += totalCost;

      const resolvedVariantId =
        item.variantId && Types.ObjectId.isValid(item.variantId)
          ? new Types.ObjectId(item.variantId)
          : undefined;

      return {
        ...item,
        ...(resolvedVariantId ? { variantId: resolvedVariantId } : {}),
        variantSku: item.variantSku || item.productSku,
        totalCost,
      };
    });

    const poNumber = await this.generatePoNumber(user.tenantId);
    const poData = {
      poNumber,
      supplierId,
      supplierName,
      purchaseDate: dto.purchaseDate,
      items: poItems,
      totalAmount,
      status: "pending",
      history: [
        {
          status: "pending",
          changedAt: new Date(),
          changedBy: user.id,
          notes: "Orden de compra creada.",
        },
      ],
      paymentTerms: dto.paymentTerms || {
        isCredit: false,
        creditDays: 0,
        paymentMethods: ["efectivo"],
        requiresAdvancePayment: false,
        advancePaymentPercentage: 0,
        advancePaymentAmount: 0,
        remainingBalance: totalAmount,
      },
      notes: dto.notes,
      createdBy: user.id,
      tenantId: Types.ObjectId.isValid(user.tenantId)
        ? new Types.ObjectId(user.tenantId)
        : user.tenantId,
    };

    const newPurchaseOrder = new this.poModel(poData);
    const savedPurchaseOrder = await newPurchaseOrder.save({ session });

    // Crear evento y tarea automáticamente si tiene fecha de pago
    if (dto.paymentTerms?.paymentDueDate) {
      try {
        await this.eventsService.createFromPurchase(
          {
            _id: savedPurchaseOrder._id.toString(),
            purchaseOrderNumber: poNumber,
            supplierName,
            totalAmount,
            paymentDueDate: new Date(dto.paymentTerms.paymentDueDate),
          },
          user,
        );
        this.logger.log(
          `Created event and task for purchase order: ${poNumber}`,
        );
      } catch (error) {
        this.logger.error(
          `Error creating event for purchase order: ${error.message}`,
        );
        // No fallar la creación de la compra si falla el evento
      }
    }

    this.logger.log(`Creating new purchase order: ${poNumber}`);
    return savedPurchaseOrder;
  }

  async findAll(tenantId: string) {
    // Convert tenantId to ObjectId to handle both string and ObjectId types in database
    const { Types } = require("mongoose");
    const tenantObjectId = new Types.ObjectId(tenantId);
    return this.poModel
      .find({ tenantId: tenantObjectId })
      .sort({ purchaseDate: -1 })
      .exec();
  }

  async receivePurchaseOrder(
    id: string,
    user: any,
    session?: ClientSession,
  ): Promise<PurchaseOrderDocument> {
    const { Types } = require("mongoose");
    const tenantObjectId = Types.ObjectId.isValid(user.tenantId)
      ? new Types.ObjectId(user.tenantId)
      : user.tenantId;

    const purchaseOrder = await this.poModel
      .findOne({ _id: id, tenantId: tenantObjectId })
      .session(session ?? null);

    if (!purchaseOrder) {
      throw new NotFoundException(
        `Orden de compra con ID "${id}" no encontrada.`,
      );
    }

    if (purchaseOrder.status !== "pending") {
      throw new BadRequestException(
        `La orden de compra ya ha sido procesada o cancelada. Estado actual: ${purchaseOrder.status}`,
      );
    }

    this.logger.log(`Receiving purchase order: ${purchaseOrder.poNumber}`);

    for (const item of purchaseOrder.items) {
      await this.inventoryService.addStockFromPurchase(
        {
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          variantId: item.variantId,
          variantSku: item.variantSku,
          variantName: item.variantName,
          quantity: item.quantity,
          costPrice: item.costPrice,
          lotNumber: item.lotNumber,
          expirationDate: item.expirationDate,
          supplierId: purchaseOrder.supplierId,
          purchaseOrderId: purchaseOrder._id,
        },
        user,
        session,
      );
    }

    purchaseOrder.status = "received";
    purchaseOrder.history.push({
      status: "received",
      changedAt: new Date(),
      changedBy: user.id,
      notes: "Orden de compra recibida y stock actualizado.",
    });

    const savedPurchaseOrder = await purchaseOrder.save({ session });

    // --- Create Payable(s) from Purchase Order ---
    try {
      this.logger.log(
        `Attempting to create payable(s) for purchase order ${savedPurchaseOrder.poNumber}`,
      );

      // The payable lines will reference the inventory account
      const inventoryAccount = await (
        this.accountingService as any
      ).findOrCreateAccount(
        { code: "1103", name: "Inventario", type: "Activo" },
        user.tenantId,
      );

      const paymentTerms = savedPurchaseOrder.paymentTerms;

      // If advance payment is required, create TWO payables
      if (
        paymentTerms?.requiresAdvancePayment &&
        paymentTerms.advancePaymentAmount &&
        paymentTerms.advancePaymentAmount > 0 &&
        paymentTerms.remainingBalance &&
        paymentTerms.advancePaymentPercentage
      ) {
        this.logger.log(
          `Creating split payables: Advance $${paymentTerms.advancePaymentAmount}, Balance $${paymentTerms.remainingBalance}`,
        );

        // 1. Create payable for ADVANCE PAYMENT (due immediately)
        const advancePayableDto: CreatePayableDto = {
          type: "purchase_order",
          payeeType: "supplier",
          payeeId: savedPurchaseOrder.supplierId.toString(),
          payeeName: savedPurchaseOrder.supplierName,
          issueDate: savedPurchaseOrder.purchaseDate,
          dueDate: savedPurchaseOrder.purchaseDate, // Due immediately
          description: `Adelanto (${paymentTerms.advancePaymentPercentage}%) - OC #${savedPurchaseOrder.poNumber}`,
          lines: [
            {
              description: `Adelanto de ${paymentTerms.advancePaymentPercentage}% según orden ${savedPurchaseOrder.poNumber}`,
              amount: paymentTerms.advancePaymentAmount,
              accountId: inventoryAccount._id.toString(),
            },
          ],
          relatedPurchaseOrderId: savedPurchaseOrder._id.toString(),
        };

        await this.payablesService.create(
          advancePayableDto,
          user.tenantId,
          user.id,
        );
        this.logger.log(
          `Created advance payment payable: $${paymentTerms.advancePaymentAmount}`,
        );

        // 2. Create payable for REMAINING BALANCE (due on payment due date)
        const balancePayableDto: CreatePayableDto = {
          type: "purchase_order",
          payeeType: "supplier",
          payeeId: savedPurchaseOrder.supplierId.toString(),
          payeeName: savedPurchaseOrder.supplierName,
          issueDate: savedPurchaseOrder.purchaseDate,
          dueDate:
            paymentTerms.paymentDueDate || savedPurchaseOrder.purchaseDate,
          description: `Saldo restante - OC #${savedPurchaseOrder.poNumber}`,
          lines: [
            {
              description: `Saldo pendiente (${100 - paymentTerms.advancePaymentPercentage}%) según orden ${savedPurchaseOrder.poNumber}`,
              amount: paymentTerms.remainingBalance,
              accountId: inventoryAccount._id.toString(),
            },
          ],
          relatedPurchaseOrderId: savedPurchaseOrder._id.toString(),
        };

        await this.payablesService.create(
          balancePayableDto,
          user.tenantId,
          user.id,
        );
        this.logger.log(
          `Created balance payable: $${paymentTerms.remainingBalance}`,
        );
      } else {
        // No advance payment - create SINGLE payable
        const createPayableDto: CreatePayableDto = {
          type: "purchase_order",
          payeeType: "supplier",
          payeeId: savedPurchaseOrder.supplierId.toString(),
          payeeName: savedPurchaseOrder.supplierName,
          issueDate: savedPurchaseOrder.purchaseDate,
          dueDate:
            paymentTerms?.paymentDueDate || savedPurchaseOrder.purchaseDate,
          description: `Factura por orden de compra #${savedPurchaseOrder.poNumber}`,
          lines: [
            {
              description: `Compra de mercancía según orden ${savedPurchaseOrder.poNumber}`,
              amount: savedPurchaseOrder.totalAmount,
              accountId: inventoryAccount._id.toString(),
            },
          ],
          relatedPurchaseOrderId: savedPurchaseOrder._id.toString(),
        };

        await this.payablesService.create(
          createPayableDto,
          user.tenantId,
          user.id,
        );
        this.logger.log(
          `Successfully created single payable for PO ${savedPurchaseOrder.poNumber}`,
        );
      }
    } catch (payableError) {
      this.logger.error(
        `Failed to create payable for purchase order ${savedPurchaseOrder.poNumber}. The purchase was processed correctly, but accounting needs review.`,
        payableError.stack,
      );
      // Do not re-throw, as the main operation (receiving stock) was successful
    }

    // --- Record Supplier Transaction History ---
    try {
      await this.transactionHistoryService.recordSupplierTransaction(
        savedPurchaseOrder._id.toString(),
        user.tenantId,
      );
      this.logger.log(
        `Supplier transaction recorded for PO ${savedPurchaseOrder.poNumber}`,
      );
    } catch (transactionError) {
      this.logger.error(
        `Failed to record supplier transaction for PO ${savedPurchaseOrder.poNumber}. The purchase was processed correctly, but transaction history was not recorded.`,
        transactionError.stack,
      );
      // Do not re-throw - transaction history failure shouldn't block the main operation
    }

    return savedPurchaseOrder;
  }

  /**
   * Approve a Purchase Order
   * Phase 1.4: Approval Workflow
   */
  async approve(
    id: string,
    userId: string,
    tenantId: string,
    notes?: string,
  ): Promise<PurchaseOrderDocument> {
    const { Types } = require("mongoose");
    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const po = await this.poModel.findOne({
      _id: id,
      tenantId: tenantObjectId,
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID "${id}" not found.`);
    }

    if (po.status !== "pending" && po.status !== "draft") {
      throw new BadRequestException(
        `Cannot approve PO in status: ${po.status}`,
      );
    }

    po.status = "approved";
    po.approvedBy = new Types.ObjectId(userId);
    po.approvedAt = new Date();
    if (notes) po.approvalNotes = notes;

    po.history.push({
      status: "approved",
      changedAt: new Date(),
      changedBy: new Types.ObjectId(userId),
      notes: notes || "Purchase Order approved",
    });

    const saved = await po.save();
    this.logger.log(`PO ${po.poNumber} approved by user ${userId}`);

    // Emit event for notification
    try {
      await this.eventsService.create(
        {
          title: `PO Aprobada: ${po.poNumber}`,
          description: `Orden de compra ${po.poNumber} para ${po.supplierName} aprobada. Monto: $${po.totalAmount}`,
          start: new Date().toISOString(),
          allDay: false,
          type: "purchase",
          color: "#22c55e",
        },
        { id: userId, tenantId },
      );
    } catch (eventError) {
      this.logger.warn(`Failed to create event: ${eventError.message}`);
    }

    return saved;
  }

  /**
   * Reject a Purchase Order
   * Phase 1.4: Approval Workflow
   */
  async reject(
    id: string,
    userId: string,
    tenantId: string,
    reason: string,
  ): Promise<PurchaseOrderDocument> {
    const { Types } = require("mongoose");
    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const po = await this.poModel.findOne({
      _id: id,
      tenantId: tenantObjectId,
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID "${id}" not found.`);
    }

    if (po.status !== "pending" && po.status !== "draft") {
      throw new BadRequestException(`Cannot reject PO in status: ${po.status}`);
    }

    po.status = "rejected";
    po.rejectedBy = new Types.ObjectId(userId);
    po.rejectedAt = new Date();
    po.rejectionReason = reason;

    po.history.push({
      status: "rejected",
      changedAt: new Date(),
      changedBy: new Types.ObjectId(userId),
      notes: `Rejected: ${reason}`,
    });

    const saved = await po.save();
    this.logger.log(`PO ${po.poNumber} rejected by user ${userId}`);

    try {
      await this.eventsService.create(
        {
          title: `PO Rechazada: ${po.poNumber}`,
          description: `Orden de compra ${po.poNumber} para ${po.supplierName} rechazada. Razón: ${reason}`,
          start: new Date().toISOString(),
          allDay: false,
          type: "purchase",
          color: "#ef4444",
        },
        { id: userId, tenantId },
      );
    } catch (eventError) {
      this.logger.warn(`Failed to create event: ${eventError.message}`);
    }

    return saved;
  }

  /**
   * Find Purchase Orders pending approval
   * Phase 1.4: Approval Workflow
   */
  async findPendingApproval(
    tenantId: string,
  ): Promise<PurchaseOrderDocument[]> {
    const { Types } = require("mongoose");
    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    return this.poModel
      .find({
        tenantId: tenantObjectId,
        status: { $in: ["pending", "draft"] },
      })
      .populate("supplierId", "name companyName")
      .populate("createdBy", "email name")
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Auto-generate Purchase Orders based on low stock
   * Phase 1.4: Auto-generation
   */
  async autoGeneratePOs(tenantId: string): Promise<PurchaseOrderDocument[]> {
    const { Types } = require("mongoose");
    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;

    this.logger.log(`Auto-generating POs for tenant ${tenantId}`);

    // 1. Get products with low stock
    const lowStockAlerts =
      await this.inventoryService.getLowStockAlerts(tenantId);

    if (!lowStockAlerts || lowStockAlerts.length === 0) {
      this.logger.log("No low stock products found");
      return [];
    }

    this.logger.log(`Found ${lowStockAlerts.length} products with low stock`);

    // 2. Group by preferred supplier
    const supplierGroups = new Map<string, any[]>();

    for (const alert of lowStockAlerts) {
      // Get product details including preferred supplier
      const product = await this.productModel.findById(alert.productId);

      if (
        !product ||
        !(product as any).suppliers ||
        (product as any).suppliers.length === 0
      ) {
        this.logger.warn(
          `Product ${alert.productName || alert.productSku} has no suppliers configured`,
        );
        continue;
      }

      // Find preferred supplier or use first one
      const suppliers = (product as any).suppliers;
      const preferredSupplier =
        suppliers.find((s: any) => s.isPreferred) || suppliers[0];
      const supplierId = preferredSupplier.supplierId?.toString();

      if (!supplierId) {
        this.logger.warn(`No valid supplier ID for product ${product.name}`);
        continue;
      }

      if (!supplierGroups.has(supplierId)) {
        supplierGroups.set(supplierId, []);
      }

      // Calculate quantity to order
      const minimumStock = alert.minimumStock || 0;
      const currentQty = alert.availableQuantity || 0;
      const quantityToOrder = Math.max(
        minimumStock - currentQty,
        preferredSupplier.minimumOrderQuantity || 1,
      );

      supplierGroups.get(supplierId)!.push({
        product,
        alert,
        quantityToOrder,
        supplierPrice: preferredSupplier.costPrice || 0,
        supplier: preferredSupplier,
      });
    }

    this.logger.log(`Grouped products into ${supplierGroups.size} supplier(s)`);

    // 3. Create draft POs for each supplier
    const createdPOs: PurchaseOrderDocument[] = [];

    for (const [supplierId, items] of supplierGroups.entries()) {
      // Get supplier details
      const supplier = await this.customersService.findOne(
        supplierId,
        tenantId,
      );

      if (!supplier) {
        this.logger.warn(`Supplier ${supplierId} not found`);
        continue;
      }

      // Prepare PO items
      const poItems = items.map((item) => ({
        productId: item.product._id,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantityToOrder,
        costPrice: item.supplierPrice,
        totalCost: item.quantityToOrder * item.supplierPrice,
      }));

      const totalAmount = poItems.reduce(
        (sum, item) => sum + item.totalCost,
        0,
      );

      // Calculate expected delivery date (default 7 days)
      const expectedDeliveryDate = new Date();
      const leadTimeDays = 7; // Default lead time
      expectedDeliveryDate.setDate(
        expectedDeliveryDate.getDate() + leadTimeDays,
      );

      // Create draft PO
      const poNumber = await this.generatePoNumber(tenantId);

      const po = new this.poModel({
        poNumber,
        supplierId: supplier._id,
        supplierName: supplier.companyName || supplier.name,
        purchaseDate: new Date(),
        expectedDeliveryDate,
        items: poItems,
        totalAmount,
        status: "draft",
        autoGenerated: true,
        notes: `Auto-generated PO based on low stock levels. ${items.length} products included.`,
        history: [
          {
            status: "draft",
            changedAt: new Date(),
            changedBy: new Types.ObjectId("000000000000000000000000"), // System user
            notes: "Auto-generated by system",
          },
        ],
        paymentTerms: {
          isCredit: false,
          creditDays: 0,
          paymentMethods: ["efectivo", "transferencia"],
          requiresAdvancePayment: false,
        },
        createdBy: new Types.ObjectId("000000000000000000000000"), // System user
        tenantId: tenantObjectId,
      });

      const saved = await po.save();
      createdPOs.push(saved);

      this.logger.log(
        `Created auto-generated PO ${poNumber} for ${supplier.companyName || supplier.name} with ${items.length} items, total: $${totalAmount}`,
      );

      // Create event for notification
      try {
        await this.eventsService.create(
          {
            title: `PO Auto-generada: ${poNumber}`,
            description: `Orden de compra ${poNumber} generada automáticamente para ${supplier.companyName || supplier.name}. ${items.length} productos, total: $${totalAmount}`,
            start: new Date().toISOString(),
            allDay: false,
            type: "purchase",
            color: "#3b82f6",
          },
          { id: "system", tenantId },
        );
      } catch (eventError) {
        this.logger.warn(`Failed to create event: ${eventError.message}`);
      }
    }

    this.logger.log(
      `Successfully created ${createdPOs.length} auto-generated POs`,
    );

    return createdPOs;
  }

  private async generatePoNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const randomPart = Math.random().toString().slice(2, 8); // 6 random digits
    return `OC-${year}${month}${day}-${hours}${minutes}${seconds}-${randomPart}`;
  }
}
