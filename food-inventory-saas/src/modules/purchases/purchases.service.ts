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
import { InventoryMovementsService } from "../inventory/inventory-movements.service";
import { MovementType } from "../../dto/inventory-movement.dto";
import { SuppliersService } from "../suppliers/suppliers.service";
import { OpenaiService } from "../openai/openai.service";
import * as sharp from "sharp";

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
    private readonly inventoryMovementsService: InventoryMovementsService,
    private readonly suppliersService: SuppliersService,
    private readonly openaiService: OpenaiService,
  ) { }

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

    // --- Sync supplier profile from purchase data (GAPs 1, 3, 4, 5) ---
    this.suppliersService.syncFromPurchaseOrder(
      supplierId!,
      {
        totalAmount,
        paymentTerms: dto.paymentTerms,
        newSupplierContactName: dto.newSupplierContactName,
        newSupplierContactPhone: dto.newSupplierContactPhone,
        newSupplierContactEmail: dto.newSupplierContactEmail,
        isReceiving: false,
      },
      user,
    ).catch(err => {
      this.logger.error(`Failed to sync supplier from PO creation: ${err.message}`);
    });

    return savedPurchaseOrder;
  }

  async findAll(tenantId: string, query?: any) {
    // Convert tenantId to ObjectId to handle both string and ObjectId types in database
    const { Types } = require("mongoose");
    const tenantObjectId = new Types.ObjectId(tenantId);
    const filter: any = { tenantId: tenantObjectId };

    if (query?.supplierId) {
      filter.supplierId = new Types.ObjectId(query.supplierId);
    }
    // Also support status filtering if needed for future
    if (query?.status) {
      filter.status = query.status;
    }

    const page = Math.max(Number(query?.page) || 1, 1);
    const limit = Math.max(Number(query?.limit) || 25, 1);
    const skip = (page - 1) * limit;

    const [purchases, total] = await Promise.all([
      this.poModel
        .find(filter)
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.poModel.countDocuments(filter),
    ]);

    return {
      purchases,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
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

      // Registrar movimiento IN con referencia a la PO
      const inv =
        (await this.inventoryService.findByProductSku(
          item.productSku,
          user.tenantId,
        )) ||
        (await this.inventoryService.findByProductId(
          item.productId.toString(),
          user.tenantId,
        ));
      if (inv) {
        await this.inventoryMovementsService.create(
          {
            inventoryId: inv._id.toString(),
            movementType: MovementType.IN,
            quantity: item.quantity,
            unitCost: item.costPrice || inv.averageCostPrice || 0,
            reason: "Recepción de compra",
            warehouseId: inv.warehouseId?.toString(),
          },
          user.tenantId,
          user.id,
          false,
          { origin: "purchase", orderId: purchaseOrder._id.toString() },
        );
      } else {
        this.logger.warn(
          `No se pudo registrar movimiento IN: inventario no encontrado para SKU ${item.productSku}`,
        );
      }
    }

    // --- GAP 2: Link each purchased product to the supplier in Product.suppliers[] ---
    for (const item of purchaseOrder.items) {
      this.suppliersService.linkProductToSupplier(
        item.productId.toString(),
        purchaseOrder.supplierId.toString(),
        user.tenantId,
        {
          supplierName: purchaseOrder.supplierName,
          costPrice: item.costPrice,
          productSku: item.variantSku || item.productSku,
        },
      ).catch(err => {
        this.logger.error(
          `Failed to link product ${item.productSku} to supplier: ${err.message}`,
        );
      });
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
          // Propagate payment info from PO
          expectedCurrency: paymentTerms.expectedCurrency || "USD",
          expectedPaymentMethods: paymentTerms.paymentMethods || [],
          isCredit: paymentTerms.isCredit || false,
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
          // Propagate payment info from PO
          expectedCurrency: paymentTerms.expectedCurrency || "USD",
          expectedPaymentMethods: paymentTerms.paymentMethods || [],
          isCredit: paymentTerms.isCredit || false,
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
          // Propagate payment info from PO
          expectedCurrency: paymentTerms?.expectedCurrency || "USD",
          expectedPaymentMethods: paymentTerms?.paymentMethods || [],
          isCredit: paymentTerms?.isCredit || false,
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

  /**
   * Scan an invoice/delivery note image using AI (GPT-4o-mini Vision).
   * Extracts structured purchase data and attempts to match products/suppliers.
   *
   * Returns a pre-filled PO DTO that the frontend can use to populate the form.
   */
  async scanInvoiceImage(
    imageBase64: string,
    mimeType: string,
    tenantId: string,
  ): Promise<{
    supplier: {
      name: string;
      rif: string;
      contactName: string;
      contactPhone: string;
      contactEmail: string;
      matchedSupplierId: string | null;
      confidence: number;
    };
    items: Array<{
      productName: string;
      productSku: string;
      quantity: number;
      costPrice: number;
      lotNumber: string;
      expirationDate: string;
      matchedProductId: string | null;
      matchedVariantId: string | null;
      confidence: number;
    }>;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    paymentTerms: {
      isCredit: boolean;
      paymentMethods: string[];
      expectedCurrency: string;
    };
    notes: string;
    overallConfidence: number;
  }> {
    const { Types } = require("mongoose");

    // 1. Call GPT-4o-mini Vision to extract data from the invoice image
    const extractionPrompt = `Eres un experto en lectura de facturas, notas de entrega y documentos comerciales de América Latina (especialmente Venezuela).

Analiza esta imagen de factura/nota de entrega y extrae TODA la información que puedas en formato JSON estricto.

IMPORTANTE:
- Si un campo no es legible o no existe, usa null
- Los precios deben ser numéricos (sin símbolos de moneda)
- El RIF venezolano tiene formato: J-12345678-9 o V-12345678-9 (letra-números-dígito verificador)
- Busca datos del PROVEEDOR (quien emite la factura), no del cliente
- Identifica cada producto/item con nombre, cantidad, precio unitario
- Detecta si es a crédito o contado
- Detecta la moneda (USD, VES, EUR)

Responde SOLO con JSON válido, sin markdown ni texto adicional:
{
  "supplier": {
    "companyName": "string o null",
    "rif": "string o null",
    "contactName": "string o null",
    "contactPhone": "string o null",
    "contactEmail": "string o null",
    "address": "string o null"
  },
  "invoice": {
    "number": "string o null",
    "date": "YYYY-MM-DD o null",
    "dueDate": "YYYY-MM-DD o null"
  },
  "items": [
    {
      "description": "nombre del producto",
      "sku": "código o null",
      "quantity": 0,
      "unitPrice": 0,
      "totalPrice": 0,
      "lotNumber": "string o null",
      "expirationDate": "YYYY-MM-DD o null"
    }
  ],
  "totals": {
    "subtotal": 0,
    "tax": 0,
    "total": 0,
    "currency": "USD | VES | EUR"
  },
  "payment": {
    "isCredit": false,
    "creditDays": 0,
    "methods": [],
    "notes": "string o null"
  },
  "notes": "cualquier nota adicional relevante"
}`;

    let extractedData: any;

    // Compress and resize image to reduce memory usage and API cost
    let optimizedBase64: string;
    let optimizedMimeType: string;
    try {
      const inputBuffer = Buffer.from(imageBase64, "base64");
      const optimizedBuffer = await sharp(inputBuffer)
        .resize(1600, 2200, { fit: "inside", withoutEnlargement: true }) // Max 1600x2200px (enough for invoices)
        .jpeg({ quality: 75 }) // Convert to JPEG at 75% quality
        .toBuffer();
      optimizedBase64 = optimizedBuffer.toString("base64");
      optimizedMimeType = "image/jpeg";
      this.logger.log(
        `Invoice scan: Image optimized from ${(inputBuffer.length / 1024).toFixed(0)}KB to ${(optimizedBuffer.length / 1024).toFixed(0)}KB`,
      );
    } catch (compressError) {
      this.logger.warn(`Invoice scan: Image compression failed, using original: ${compressError.message}`);
      optimizedBase64 = imageBase64;
      optimizedMimeType = mimeType;
    }

    try {
      const response = await this.openaiService.createChatCompletion({
        messages: [
          { role: "system", content: extractionPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${optimizedMimeType};base64,${optimizedBase64}`,
                  detail: "low",
                },
              },
            ] as any,
          },
        ],
        model: "gpt-4o-mini",
        temperature: 0.1,
        maxTokens: 2000,
      });

      const rawContent = response.choices?.[0]?.message?.content || "{}";
      // Clean potential markdown wrapping
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extractedData = JSON.parse(cleaned);
    } catch (parseError) {
      this.logger.error(`Invoice scan: Failed to parse AI response: ${parseError.message}`);
      throw new BadRequestException(
        "No se pudo interpretar la imagen. Asegúrese de que sea una factura o nota de entrega legible.",
      );
    }

    // 2. Match extracted supplier against existing suppliers
    let matchedSupplierId: string | null = null;
    let supplierConfidence = 0;

    if (extractedData.supplier?.rif) {
      // Try exact RIF match via the Supplier model first, then Customer
      try {
        const supplierByRif = await this.suppliersService.findAll(tenantId, extractedData.supplier.rif);
        if (Array.isArray(supplierByRif) && supplierByRif.length > 0) {
          matchedSupplierId = supplierByRif[0]._id.toString();
          supplierConfidence = 0.95;
        }
      } catch {
        // Ignore search errors
      }
    }

    if (!matchedSupplierId && extractedData.supplier?.companyName) {
      // Try fuzzy name match via suppliers
      try {
        const suppliersByName = await this.suppliersService.findAll(tenantId, extractedData.supplier.companyName);
        if (Array.isArray(suppliersByName) && suppliersByName.length > 0) {
          matchedSupplierId = suppliersByName[0]._id.toString();
          supplierConfidence = 0.7;
        }
      } catch {
        // Ignore search errors
      }
    }

    // 3. Match extracted items against existing products
    const tenantObjectId = new Types.ObjectId(tenantId);
    const matchedItems: Array<{
      productName: string;
      productSku: string;
      quantity: number;
      costPrice: number;
      lotNumber: string;
      expirationDate: string;
      matchedProductId: string | null;
      matchedVariantId: string | null;
      confidence: number;
    }> = [];

    for (const item of extractedData.items || []) {
      let matchedProductId: string | null = null;
      let matchedVariantId: string | null = null;
      let itemConfidence = 0;

      // Try SKU match first
      if (item.sku) {
        const productBySku = await this.productModel
          .findOne({
            tenantId: tenantObjectId,
            $or: [
              { sku: item.sku },
              { "variants.sku": item.sku },
            ],
          })
          .lean();

        if (productBySku) {
          matchedProductId = productBySku._id.toString();
          itemConfidence = 0.95;

          // Check if it matches a variant
          const matchedVariant = (productBySku as any).variants?.find(
            (v: any) => v.sku === item.sku,
          );
          if (matchedVariant) {
            matchedVariantId = matchedVariant._id.toString();
          }
        }
      }

      // Try name match if SKU didn't work
      if (!matchedProductId && item.description) {
        const productByName = await this.productModel
          .findOne({
            tenantId: tenantObjectId,
            name: { $regex: this.escapeRegex(item.description), $options: "i" },
          })
          .lean();

        if (productByName) {
          matchedProductId = productByName._id.toString();
          itemConfidence = 0.7;
        }
      }

      matchedItems.push({
        productName: item.description || "",
        productSku: item.sku || "",
        quantity: Number(item.quantity) || 0,
        costPrice: Number(item.unitPrice) || 0,
        lotNumber: item.lotNumber || "",
        expirationDate: item.expirationDate || "",
        matchedProductId,
        matchedVariantId,
        confidence: itemConfidence,
      });
    }

    // 4. Calculate overall confidence based on extraction quality + matching bonus
    // Base: how much data the AI actually extracted (0-0.7)
    let extractionScore = 0;
    if (extractedData.supplier?.companyName) extractionScore += 0.15;
    if (extractedData.supplier?.rif) extractionScore += 0.1;
    if (extractedData.invoice?.number) extractionScore += 0.1;
    if ((extractedData.items || []).length > 0) extractionScore += 0.2;
    if (extractedData.totals?.total) extractionScore += 0.1;
    if (extractedData.invoice?.date) extractionScore += 0.05;

    // Bonus: matching against existing data (0-0.3)
    const matchBonus = (supplierConfidence > 0 ? 0.15 : 0) +
      (matchedItems.filter(i => i.matchedProductId).length > 0
        ? 0.15 * (matchedItems.filter(i => i.matchedProductId).length / Math.max(matchedItems.length, 1))
        : 0);

    const overallConfidence = Math.min(extractionScore + matchBonus, 1);

    // Determine currency mapping
    const currencyMap: Record<string, string> = {
      USD: "USD",
      VES: "VES",
      BS: "VES",
      EUR: "EUR",
      BOLIVARES: "VES",
      DOLARES: "USD",
    };
    const rawCurrency = (extractedData.totals?.currency || "USD").toUpperCase();
    const expectedCurrency = currencyMap[rawCurrency] || "USD";

    return {
      supplier: {
        name: extractedData.supplier?.companyName || "",
        rif: extractedData.supplier?.rif || "",
        contactName: extractedData.supplier?.contactName || "",
        contactPhone: extractedData.supplier?.contactPhone || "",
        contactEmail: extractedData.supplier?.contactEmail || "",
        matchedSupplierId,
        confidence: supplierConfidence,
      },
      items: matchedItems,
      invoiceNumber: extractedData.invoice?.number || "",
      invoiceDate: extractedData.invoice?.date || "",
      totalAmount: Number(extractedData.totals?.total) || 0,
      paymentTerms: {
        isCredit: extractedData.payment?.isCredit || false,
        paymentMethods: extractedData.payment?.methods || [],
        expectedCurrency,
      },
      notes: extractedData.notes || "",
      overallConfidence,
    };
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Reconcile all received POs: detect and repair missing supplier syncs.
   * Checks that each received PO has:
   * 1. A proper Supplier entity (not just Customer)
   * 2. Products linked to the supplier in Product.suppliers[]
   * 3. Supplier metrics updated
   *
   * Returns a report of what was found and fixed.
   */
  async reconcilePurchaseOrders(tenantId: string, user: any): Promise<{
    totalPOs: number;
    suppliersCreated: number;
    productsLinked: number;
    metricsUpdated: number;
    errors: string[];
  }> {
    const { Types } = require("mongoose");
    const tenantObjectId = new Types.ObjectId(tenantId);

    const receivedPOs = await this.poModel
      .find({ tenantId: tenantObjectId, status: 'received' })
      .sort({ purchaseDate: 1 })
      .lean();

    const report = {
      totalPOs: receivedPOs.length,
      suppliersCreated: 0,
      productsLinked: 0,
      metricsUpdated: 0,
      errors: [] as string[],
    };

    this.logger.log(`Reconciliation: Processing ${receivedPOs.length} received POs for tenant ${tenantId}`);

    for (const po of receivedPOs) {
      try {
        // 1. Ensure Supplier profile exists
        await this.suppliersService.syncFromPurchaseOrder(
          po.supplierId.toString(),
          {
            totalAmount: po.totalAmount,
            paymentTerms: po.paymentTerms,
            isReceiving: true,
          },
          user,
        );
        report.metricsUpdated++;

        // 2. Link products to supplier
        for (const item of po.items) {
          try {
            await this.suppliersService.linkProductToSupplier(
              item.productId.toString(),
              po.supplierId.toString(),
              tenantId,
              {
                supplierName: po.supplierName,
                costPrice: item.costPrice,
                productSku: item.variantSku || item.productSku,
              },
            );
            report.productsLinked++;
          } catch (linkErr) {
            report.errors.push(`PO ${po.poNumber} - Product ${item.productSku}: ${linkErr.message}`);
          }
        }
      } catch (syncErr) {
        report.errors.push(`PO ${po.poNumber} - Supplier sync: ${syncErr.message}`);
      }
    }

    this.logger.log(
      `Reconciliation complete: ${report.metricsUpdated} suppliers synced, ${report.productsLinked} products linked, ${report.errors.length} errors`,
    );

    return report;
  }

  /**
   * Find all products that have been purchased using a specific payment method.
   * Used for "Smart Pricing" bulk updates.
   */
  async findProductIdsByPaymentMethod(
    tenantId: string,
    paymentMethod: string,
  ): Promise<string[]> {
    const { Types } = require("mongoose");
    const tenantObjectId = new Types.ObjectId(tenantId);

    // Find POs that used this payment method
    // Note: paymentMethods is an array of strings in the schema
    const purchaseOrders = await this.poModel
      .find({
        tenantId: tenantObjectId,
        "paymentTerms.paymentMethods": paymentMethod,
      })
      .select("items.productId")
      .lean();

    // Extract unique product IDs
    const productIds = new Set<string>();
    for (const po of purchaseOrders) {
      if (po.items) {
        for (const item of po.items) {
          if (item.productId) {
            productIds.add(item.productId.toString());
          }
        }
      }
    }

    return Array.from(productIds);
  }
}
