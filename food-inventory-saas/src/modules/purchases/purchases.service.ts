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
import { PayablesService, CreatePayableDto } from "../payables/payables.service"; // Import PayablesService and DTO

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

    let totalAmount = 0;
    const poItems = dto.items.map((item) => {
      const totalCost = item.costPrice * item.quantity;
      totalAmount += totalCost;
      return { ...item, totalCost };
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
      notes: dto.notes,
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const newPurchaseOrder = new this.poModel(poData);
    const savedPurchaseOrder = await newPurchaseOrder.save({ session });

    this.logger.log(`Creating new purchase order: ${poNumber}`);
    return savedPurchaseOrder;
  }

  async findAll(tenantId: string) {
    return this.poModel.find({ tenantId }).sort({ purchaseDate: -1 }).exec();
  }

  async receivePurchaseOrder(
    id: string,
    user: any,
    session?: ClientSession,
  ): Promise<PurchaseOrderDocument> {
    const purchaseOrder = await this.poModel
      .findOne({ _id: id, tenantId: user.tenantId })
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

    // --- Create Payable from Purchase Order ---
    try {
      this.logger.log(
        `Attempting to create payable for purchase order ${savedPurchaseOrder.poNumber}`,
      );
      
      // The payable lines will reference the inventory account
      const inventoryAccount = await (this.accountingService as any).findOrCreateAccount(
        { code: "1103", name: "Inventario", type: "Activo" },
        user.tenantId,
      );

      const createPayableDto: CreatePayableDto = {
        type: 'purchase_order',
        payeeType: 'supplier',
        payeeId: savedPurchaseOrder.supplierId.toString(),
        payeeName: savedPurchaseOrder.supplierName,
        issueDate: savedPurchaseOrder.purchaseDate,
        description: `Factura por orden de compra #${savedPurchaseOrder.poNumber}`,
        lines: [
          {
            description: `Compra de mercancía según orden ${savedPurchaseOrder.poNumber}`,
            amount: savedPurchaseOrder.totalAmount,
            accountId: inventoryAccount._id.toString(),
          },
        ],
        relatedPurchaseOrderId: savedPurchaseOrder._id.toString(), // Link payable to PO
      };

      await this.payablesService.create(createPayableDto, user.tenantId, user.id);
      this.logger.log(
        `Successfully created payable for PO ${savedPurchaseOrder.poNumber}`
      );

    } catch (payableError) {
      this.logger.error(
        `Failed to create payable for purchase order ${savedPurchaseOrder.poNumber}. The purchase was processed correctly, but accounting needs review.`,
        payableError.stack,
      );
      // Do not re-throw, as the main operation (receiving stock) was successful
    }

    return savedPurchaseOrder;
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