import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Types, Connection } from "mongoose";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from "../../dto/product.dto";
import { CreateProductWithPurchaseDto } from "../../dto/composite.dto";
import { CustomersService } from "../customers/customers.service"; // CHANGED
import { InventoryService } from "../inventory/inventory.service";
import { PurchasesService } from "../purchases/purchases.service";
import { CreateCustomerDto } from "../../dto/customer.dto"; // CHANGED

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private readonly customersService: CustomersService, // CHANGED
    private readonly inventoryService: InventoryService,
    private readonly purchasesService: PurchasesService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async createWithInitialPurchase(
    dto: CreateProductWithPurchaseDto,
    user: any,
  ) {
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
    }

    if (tenant.usage.currentProducts >= tenant.limits.maxProducts) {
      throw new BadRequestException("Límite de productos alcanzado para su plan de suscripción.");
    }

    const newImagesSize = this.calculateImagesSize(dto.product.variants);
    if (tenant.usage.currentStorage + newImagesSize > tenant.limits.maxStorage) {
      throw new BadRequestException("Límite de almacenamiento alcanzado para su plan de suscripción.");
    }

    const existingProduct = await this.productModel.findOne({
      sku: dto.product.sku,
      tenantId: user.tenantId,
    });
    if (existingProduct) {
      throw new BadRequestException(
        `El producto con SKU "${dto.product.sku}" ya existe.`,
      );
    }

    try {
      // 1. Supplier (now a Customer of type 'supplier')
      let supplierId = dto.supplier.supplierId;
      let supplierName = "";
      if (!supplierId) {
        if (
          !dto.supplier.newSupplierName ||
          !dto.supplier.newSupplierRif ||
          !dto.supplier.newSupplierContactName
        ) {
          throw new BadRequestException("New supplier data is incomplete.");
        }
        // Create a DTO that matches what the CRM form would create
        const newCustomerDto: CreateCustomerDto = {
          name: dto.supplier.newSupplierContactName, // Salesperson Name
          companyName: dto.supplier.newSupplierName, // Company Name
          customerType: "supplier",
          taxInfo: {
            taxId: dto.supplier.newSupplierRif,
            taxType: dto.supplier.newSupplierRif.charAt(0),
          },
          contacts: [
            {
              type: "phone",
              value: dto.supplier.newSupplierContactPhone ?? "",
              isPrimary: true,
            },
          ].filter((c) => c.value),
        };
        const newSupplier = await this.customersService.create(
          newCustomerDto,
          user,
        );
        supplierId = newSupplier._id.toString();
        supplierName = newSupplier.companyName || newSupplier.name; // Use companyName for consistency
      } else {
        const existingSupplier = await this.customersService.findOne(
          supplierId,
          user.tenantId,
        );
        if (!existingSupplier) {
          throw new NotFoundException(
            `Supplier (Customer) with ID "${supplierId}" not found.`,
          );
        }
        supplierName = existingSupplier.companyName || existingSupplier.name;
      }

      // 2. Product
      const productData = {
        ...dto.product,
        suppliers: [
          {
            supplierId: new Types.ObjectId(supplierId),
            supplierName: supplierName,
            costPrice: dto.inventory.costPrice,
            supplierSku: dto.product.sku, // Default to product SKU
            leadTimeDays: 1, // Default
            minimumOrderQuantity: 1, // Default
          },
        ],
        createdBy: user.id,
        tenantId: user.tenantId,
      };
      const createdProduct = new this.productModel(productData);
      const savedProduct = await createdProduct.save();
      
      await this.tenantModel.findByIdAndUpdate(user.tenantId, { 
        $inc: { 
          'usage.currentProducts': 1,
          'usage.currentStorage': newImagesSize,
        }
      });

      // 3. Inventory
      const inventoryDto: any = {
        productId: savedProduct._id,
        productSku: savedProduct.sku,
        productName: savedProduct.name,
        totalQuantity: dto.inventory.quantity,
        averageCostPrice: dto.inventory.costPrice,
        lots: [],
      };

      if (savedProduct.isPerishable) {
        if (!dto.inventory.lotNumber || !dto.inventory.expirationDate) {
          throw new BadRequestException(
            "Lot number and expiration date are required for perishable products.",
          );
        }
        inventoryDto.lots.push({
          lotNumber: dto.inventory.lotNumber,
          quantity: dto.inventory.quantity,
          expirationDate: new Date(dto.inventory.expirationDate),
          costPrice: dto.inventory.costPrice,
          receivedDate: new Date(dto.purchaseDate),
        });
      }
      await this.inventoryService.create(inventoryDto, user);

      // 4. Purchase Order
      const purchaseDto: any = {
        supplierId: supplierId,
        purchaseDate: dto.purchaseDate,
        items: [
          {
            productId: savedProduct._id.toString(),
            productName: savedProduct.name,
            productSku: savedProduct.sku,
            quantity: dto.inventory.quantity,
            costPrice: dto.inventory.costPrice,
          },
        ],
        notes: dto.notes,
      };
      await this.purchasesService.create(purchaseDto, user);

      return savedProduct;
    } catch (error) {
      this.logger.error(
        `Failed to create product with initial purchase: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async create(
    createProductDto: CreateProductDto,
    user: any,
  ): Promise<ProductDocument> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku}`);

    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
    }

    if (tenant.usage.currentProducts >= tenant.limits.maxProducts) {
      throw new BadRequestException("Límite de productos alcanzado para su plan de suscripción.");
    }

    const newImagesSize = this.calculateImagesSize(createProductDto.variants);
    if (tenant.usage.currentStorage + newImagesSize > tenant.limits.maxStorage) {
      throw new BadRequestException("Límite de almacenamiento alcanzado para su plan de suscripción.");
    }

    const existingProduct = await this.productModel.findOne({
      sku: createProductDto.sku,
      tenantId: user.tenantId,
    });
    if (existingProduct) {
      throw new Error(`El SKU ${createProductDto.sku} ya existe`);
    }
    const productData = {
      ...createProductDto,
      isActive: true, // Explicitly set new products as active
      createdBy: user.id,
      tenantId: user.tenantId,
    };
    const createdProduct = new this.productModel(productData);
    const savedProduct = await createdProduct.save();

    await this.tenantModel.findByIdAndUpdate(user.tenantId, { 
      $inc: { 
        'usage.currentProducts': 1,
        'usage.currentStorage': newImagesSize,
      }
    });

    return savedProduct;
  }

  async findAll(query: ProductQueryDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      isActive = true,
    } = query;
    const filter: any = { tenantId: tenantId, isActive };
    if (search) {
      filter.$text = { $search: search };
    }
    if (category) {
      filter.category = category;
    }
    if (brand) {
      filter.brand = brand;
    }
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.productModel
        .find(filter)
        .select('+isSoldByWeight +unitOfMeasure') // Explicitly include the fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter),
    ]);
    return {
      products,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string): Promise<ProductDocument | null> {
    return this.productModel.findOne({ _id: id, tenantId }).exec();
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    user: any,
  ): Promise<ProductDocument | null> {
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
    }

    const productBeforeUpdate = await this.productModel.findById(id).lean();
    if (!productBeforeUpdate) {
      throw new NotFoundException("Producto no encontrado");
    }

    const oldImagesSize = this.calculateImagesSize(productBeforeUpdate.variants);
    let newImagesSize = oldImagesSize;
    if ('variants' in updateProductDto) {
      newImagesSize = this.calculateImagesSize(updateProductDto.variants);
    }
    const storageDifference = newImagesSize - oldImagesSize;

    if (tenant.usage.currentStorage + storageDifference > tenant.limits.maxStorage) {
      throw new BadRequestException("Límite de almacenamiento alcanzado para su plan de suscripción.");
    }

    const updateData = { ...updateProductDto, updatedBy: user.id };
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (storageDifference !== 0) {
        await this.tenantModel.findByIdAndUpdate(user.tenantId, { 
            $inc: { 'usage.currentStorage': storageDifference }
        });
    }

    return updatedProduct;
  }

  async remove(id: string, tenantId: string): Promise<any> {
    const productToRemove = await this.productModel.findOne({ _id: id, tenantId }).lean();
    if (!productToRemove) {
        throw new NotFoundException("Producto no encontrado");
    }

    const imagesSize = this.calculateImagesSize(productToRemove.variants);

    const result = await this.productModel.deleteOne({ _id: id, tenantId }).exec();

    if (result.deletedCount > 0) {
      await this.tenantModel.findByIdAndUpdate(tenantId, { 
          $inc: { 
              'usage.currentProducts': -1,
              'usage.currentStorage': -imagesSize
            }
        });
    }
    return result;
  }

  async getCategories(tenantId: string): Promise<string[]> {
    return this.productModel
      .distinct("category", { tenantId: tenantId })
      .exec();
  }

  async getSubcategories(tenantId: string): Promise<string[]> {
    return this.productModel
      .distinct("subcategory", { tenantId: tenantId })
      .exec();
  }

  private calculateImagesSize(variants: any[] | undefined): number {
    if (!variants || variants.length === 0) {
      return 0;
    }

    let totalSize = 0;
    for (const variant of variants) {
      if (variant.images && variant.images.length > 0) {
        for (const image of variant.images) {
          const padding = image.endsWith('==') ? 2 : image.endsWith('=') ? 1 : 0;
          const sizeInBytes = (image.length * 3) / 4 - padding;
          totalSize += sizeInBytes;
        }
      }
    }

    return totalSize / (1024 * 1024); // Convert to MB
  }
}
