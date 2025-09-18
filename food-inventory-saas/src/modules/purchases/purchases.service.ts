import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { PurchaseOrder, PurchaseOrderDocument } from '../../schemas/purchase-order.schema';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { CreatePurchaseOrderDto } from '../../dto/purchase-order.dto';
import { CreateCustomerDto } from '../../dto/customer.dto'; // CHANGED
import { CustomersService } from '../customers/customers.service'; // CHANGED
import { InventoryService } from '../inventory/inventory.service';
import { AccountingService } from '../accounting/accounting.service';




@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly customersService: CustomersService, // CHANGED
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
  ) {}

  async create(dto: CreatePurchaseOrderDto, user: any, session?: ClientSession): Promise<PurchaseOrderDocument> {
    let supplierId = dto.supplierId;
    let supplierName = '';

    // This logic is now unified to use the Customer entity as the source for suppliers
    if (!supplierId) {
      if (!dto.newSupplierName || !dto.newSupplierRif || !dto.newSupplierContactName) {
        throw new BadRequestException('Para un nuevo proveedor, se requiere Nombre, RIF y Nombre del Contacto.');
      }
      const newCustomerDto: CreateCustomerDto = {
        name: dto.newSupplierContactName, // Salesperson
        companyName: dto.newSupplierName, // Company
        customerType: 'supplier',
        taxInfo: {
          taxId: dto.newSupplierRif,
          taxType: dto.newSupplierRif.charAt(0),
        },
        contacts: [
          { type: 'phone', value: dto.newSupplierContactPhone ?? '', isPrimary: true },
          { type: 'email', value: dto.newSupplierContactEmail ?? '', isPrimary: false }
        ].filter(c => c.value) // Filter out empty contacts
      };
      const newSupplier = await this.customersService.create(newCustomerDto, user);
      supplierId = newSupplier._id.toString();
      supplierName = newSupplier.companyName || newSupplier.name;
      this.logger.log(`New supplier (as customer) created: ${supplierName} (${supplierId})`);
    } else {
        const existingSupplier = await this.customersService.findOne(supplierId, user.tenantId);
        if (!existingSupplier) {
          throw new NotFoundException(`Proveedor (Cliente) con ID "${supplierId}" no encontrado.`);
        }
        supplierName = existingSupplier.companyName || existingSupplier.name;
    }

    let totalAmount = 0;
    const poItems = dto.items.map(item => {
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
      status: 'pending',
      history: [{
        status: 'pending',
        changedAt: new Date(),
        changedBy: user.id,
        notes: 'Orden de compra creada.',
      }],
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

  async receivePurchaseOrder(id: string, user: any, session?: ClientSession): Promise<PurchaseOrderDocument> {
    const purchaseOrder = await this.poModel.findOne({ _id: id, tenantId: user.tenantId }).session(session ?? null);

    if (!purchaseOrder) {
      throw new NotFoundException(`Orden de compra con ID "${id}" no encontrada.`);
    }

    if (purchaseOrder.status !== 'pending') {
      throw new BadRequestException(`La orden de compra ya ha sido procesada o cancelada. Estado actual: ${purchaseOrder.status}`);
    }

    this.logger.log(`Receiving purchase order: ${purchaseOrder.poNumber}`);

    for (const item of purchaseOrder.items) {
      await this.inventoryService.addStockFromPurchase({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        costPrice: item.costPrice,
        lotNumber: item.lotNumber,
        expirationDate: item.expirationDate,
        supplierId: purchaseOrder.supplierId,
        purchaseOrderId: purchaseOrder._id,
      }, user, session);
    }

    purchaseOrder.status = 'received';
    purchaseOrder.history.push({
        status: 'received',
        changedAt: new Date(),
        changedBy: user.id,
        notes: 'Orden de compra recibida y stock actualizado.',
    });

    const savedPurchaseOrder = await purchaseOrder.save({ session });

    try {
      this.logger.log(`Attempting to create journal entry for purchase order ${savedPurchaseOrder.poNumber}`);
      await this.accountingService.createJournalEntryForPurchase(savedPurchaseOrder, user.tenantId);
    } catch (accountingError) {
      this.logger.error(
        `Failed to create journal entry for purchase order ${savedPurchaseOrder.poNumber}. The purchase was processed correctly, but accounting needs review.`,
        accountingError.stack,
      );
    }

    return savedPurchaseOrder;
  }

  private async generatePoNumber(tenantId: string): Promise<string> {
    const count = await this.poModel.countDocuments({ tenantId });
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    return `OC-${year}${month}-${(count + 1).toString().padStart(6, '0')}`;
  }
}
