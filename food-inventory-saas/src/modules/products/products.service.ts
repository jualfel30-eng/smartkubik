import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException
} from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Connection, Types } from "mongoose";
import { Product, ProductDocument, ProductType } from "../../schemas/product.schema";
import { Inventory, InventoryDocument, InventoryMovement, InventoryMovementDocument } from "../../schemas/inventory.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { CustomersService } from "../customers/customers.service";
import { InventoryService } from "../inventory/inventory.service";
import { PurchasesService } from "../purchases/purchases.service";
import { SuppliersService } from "../suppliers/suppliers.service";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from "../../dto/product.dto";
import { CreateProductWithPurchaseDto } from "../../dto/composite.dto";
import { CreateCustomerDto } from "../../dto/customer.dto";
import { BulkCreateProductsDto } from "./dto/bulk-create-products.dto";

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
    @InjectModel(InventoryMovement.name)
    private inventoryMovementModel: Model<InventoryMovementDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private readonly customersService: CustomersService,
    private readonly inventoryService: InventoryService,
    private readonly purchasesService: PurchasesService,
    @Inject(forwardRef(() => SuppliersService)) private readonly suppliersService: SuppliersService, // Added injection
    @InjectConnection() private readonly connection: Connection,
  ) { }

  private collectNormalizedBarcodes(variants: any[]): string[] {
    const uniqueBarcodes = new Set<string>();
    for (const variant of variants || []) {
      const code = (variant?.barcode || "").trim();
      if (!code) {
        continue;
      }
      if (uniqueBarcodes.has(code)) {
        throw new BadRequestException(
          `El código de barras ${code} está duplicado dentro del mismo producto.`,
        );
      }
      uniqueBarcodes.add(code);
    }
    return Array.from(uniqueBarcodes);
  }

  private async ensureUniqueVariantBarcodes(
    variants: any[],
    tenantId: string | Types.ObjectId,
    excludeProductId?: string,
  ) {
    const barcodes = this.collectNormalizedBarcodes(variants);
    if (!barcodes.length) {
      return;
    }

    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      "variants.barcode": { $in: barcodes },
    };
    if (excludeProductId) {
      query._id = { $ne: new Types.ObjectId(excludeProductId) };
    }

    const conflict = await this.productModel
      .findOne(query)
      .select("name sku variants.barcode")
      .lean();

    if (conflict) {
      throw new BadRequestException(
        `El código de barras ya está asignado al producto ${conflict.name || conflict.sku}.`,
      );
    }
  }

  async createWithInitialPurchase(
    dto: CreateProductWithPurchaseDto,
    user: any,
  ) {
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
    }

    if (tenant.usage.currentProducts >= tenant.limits.maxProducts) {
      throw new BadRequestException(
        "Límite de productos alcanzado para su plan de suscripción.",
      );
    }

    const newImagesSize = this.calculateImagesSize(dto.product.variants);
    if (
      tenant.usage.currentStorage + newImagesSize >
      tenant.limits.maxStorage
    ) {
      throw new BadRequestException(
        "Límite de almacenamiento alcanzado para su plan de suscripción.",
      );
    }

    const existingProduct = await this.productModel.findOne({
      sku: dto.product.sku,
      tenantId: new Types.ObjectId(user.tenantId),
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
        tenantId: new Types.ObjectId(user.tenantId),
      };
      const createdProduct = new this.productModel(productData);
      const savedProduct = await createdProduct.save();

      await this.tenantModel.findByIdAndUpdate(user.tenantId, {
        $inc: {
          "usage.currentProducts": 1,
          "usage.currentStorage": newImagesSize,
        },
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
        paymentTerms: {
          isCredit: false,
          creditDays: 0,
          paymentMethods: dto.paymentMethods || [],
        },
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
      throw new BadRequestException(
        "Límite de productos alcanzado para su plan de suscripción.",
      );
    }

    const newImagesSize = this.calculateImagesSize(createProductDto.variants);
    if (
      tenant.usage.currentStorage + newImagesSize >
      tenant.limits.maxStorage
    ) {
      throw new BadRequestException(
        "Límite de almacenamiento alcanzado para su plan de suscripción.",
      );
    }

    const existingProduct = await this.productModel.findOne({
      sku: createProductDto.sku,
      tenantId: new Types.ObjectId(user.tenantId),
    });
    if (existingProduct) {
      throw new Error(`El SKU ${createProductDto.sku} ya existe`);
    }
    await this.ensureUniqueVariantBarcodes(
      createProductDto.variants,
      user.tenantId,
    );

    // VALIDATION: SIMPLE products should NOT use UnitConversion
    // They should use SellingUnits instead
    const productType = (createProductDto.productType ||
      ProductType.SIMPLE) as ProductType;
    if (
      productType === ProductType.SIMPLE &&
      (createProductDto as any).unitConversionConfig
    ) {
      throw new BadRequestException(
        "Los productos SIMPLE deben usar SellingUnits, no UnitConversion. " +
        "El sistema de conversión purchase/stock/consumption es solo para productos SUPPLY y CONSUMABLE.",
      );
    }

    // VALIDATION: SUPPLY/CONSUMABLE should not have selling-specific fields during creation
    // Those are configured after creation via dedicated configs
    if (
      [ProductType.SUPPLY, ProductType.CONSUMABLE].includes(productType) &&
      createProductDto.hasMultipleSellingUnits &&
      createProductDto.sellingUnits &&
      createProductDto.sellingUnits.length > 1
    ) {
      this.logger.warn(
        `Product ${createProductDto.sku} is SUPPLY/CONSUMABLE but has multiple selling units. ` +
        `Consider using ProductConsumableConfig or ProductSupplyConfig instead.`,
      );
    }

    const productData = {
      ...createProductDto,
      isActive: true, // Explicitly set new products as active
      createdBy: user.id,
      tenantId: new Types.ObjectId(user.tenantId),
    };
    const createdProduct = new this.productModel(productData);
    const savedProduct = await createdProduct.save();

    await this.tenantModel.findByIdAndUpdate(user.tenantId, {
      $inc: {
        "usage.currentProducts": 1,
        "usage.currentStorage": newImagesSize,
      },
    });

    return savedProduct;
  }

  async bulkCreate(bulkCreateProductsDto: BulkCreateProductsDto, user: any) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const createdProducts: any[] = [];
      for (const productDto of bulkCreateProductsDto.products) {
        const createProductDto: CreateProductDto = {
          sku: productDto.sku,
          name: productDto.name,
          category: productDto.category,
          subcategory: productDto.subcategory || [],
          brand: productDto.brand || "",
          unitOfMeasure: productDto.unitOfMeasure || "unidad",
          isSoldByWeight: productDto.isSoldByWeight || false,
          description: productDto.description,
          ingredients: productDto.ingredients,
          isPerishable: productDto.isPerishable,
          shelfLifeDays: productDto.shelfLifeDays,
          storageTemperature: productDto.storageTemperature,
          ivaApplicable: productDto.ivaApplicable,
          taxCategory: productDto.taxCategory || "general",
          attributes: productDto.productAttributes || undefined,
          pricingRules: {
            cashDiscount: 0,
            cardSurcharge: 0,
            minimumMargin: 0,
            maximumDiscount: 0,
          },
          inventoryConfig: {
            minimumStock: productDto.minimumStock ?? 10,
            maximumStock: productDto.maximumStock ?? 100,
            reorderPoint: productDto.reorderPoint ?? 20,
            reorderQuantity: productDto.reorderQuantity ?? 50,
            trackLots: true,
            trackExpiration: true,
            fefoEnabled: true,
          },
          variants: [
            {
              name: productDto.variantName,
              sku: productDto.variantSku || `${productDto.sku}-VAR1`,
              barcode: productDto.variantBarcode || "",
              unit: productDto.variantUnit,
              unitSize: productDto.variantUnitSize,
              basePrice: productDto.variantBasePrice,
              costPrice: productDto.variantCostPrice,
              images: [
                productDto.image1,
                productDto.image2,
                productDto.image3,
              ].filter(Boolean) as string[],
              attributes: productDto.variantAttributes || undefined,
            },
          ],
        };

        const createdProduct = await this.create(createProductDto, user);
        createdProducts.push(createdProduct);
      }

      await session.commitTransaction();
      return {
        success: true,
        message: `${createdProducts.length} productos creados exitosamente.`,
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Error durante la creación masiva de productos: ${error.message}`,
        error.stack,
      );
      throw new Error("Error al crear productos masivamente.");
    } finally {
      session.endSession();
    }
  }

  async findAll(
    query: ProductQueryDto,
    tenantId: string,
    options?: { includeInventory?: boolean; minAvailableQuantity?: number },
  ) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      productType,
      isActive = true,
      includeInactive = false,
      supplierId,
    } = query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 20, 1);
    const searchTerm = typeof search === "string" ? search.trim() : "";
    const isSearching = searchTerm.length > 0;
    let looksLikeCode = false;
    let useTextSearch = false;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };
    if (!includeInactive) {
      filter.isActive = isActive;
    }
    if (category) {
      filter.category = category;
    }
    if (brand) {
      filter.brand = brand;
    }
    if (productType) {
      filter.productType = productType;
    }
    if (supplierId && Types.ObjectId.isValid(supplierId)) {
      filter["suppliers.supplierId"] = new Types.ObjectId(supplierId);
    }
    if (query.excludeProductIds?.length) {
      const ids = query.excludeProductIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
      if (ids.length) {
        filter._id = { $nin: ids };
      }
    }

    // Optimization: Filter by specific IDs list
    if (query.ids?.length) {
      const includedIds = query.ids
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      if (includedIds.length) {
        // If we have both exclude and include, include takes precedence but respects exclude implicitly by intersection?
        // Mongo handles $in and $nin on same field by intersection? No, $in overrides $nin often or errors.
        // Let's explicitly combine: IDs in 'ids' AND not in 'exclude'
        if (filter._id && filter._id.$nin) {
          filter._id = { $in: includedIds, $nin: filter._id.$nin };
        } else {
          filter._id = { $in: includedIds };
        }
      }
    }
    // PERFORMANCE OPTIMIZATION: Use text search instead of regex for better performance
    if (isSearching) {
      // Check if search looks like a SKU or barcode (alphanumeric, no spaces)
      // Treat as SKU/barcode only if it has alphanumerics AND a delimiter or digit
      looksLikeCode =
        /^[A-Z0-9\-_]+$/i.test(searchTerm) && /[0-9\-_]/.test(searchTerm);

      if (looksLikeCode) {
        // For SKU/barcode searches, use optimized regex on indexed fields only
        const regex = new RegExp(`^${this.escapeRegExp(searchTerm)}`, "i");
        filter.$or = [
          { sku: regex },
          { "variants.sku": regex },
          { "variants.barcode": regex },
        ];
      } else {
        // Prefer MongoDB text search (leverages index on name/description/tags)
        filter.$text = { $search: searchTerm };
        useTextSearch = true;
      }
    }

    const skip = (pageNumber - 1) * limitNumber;

    // If caller requests only products with stock, pre-filter using inventory
    if (options?.minAvailableQuantity !== undefined) {
      const productIdsWithStock = await this.inventoryModel
        .find({
          tenantId: new Types.ObjectId(tenantId),
          availableQuantity: { $gte: options.minAvailableQuantity },
        })
        .distinct("productId")
        .exec();

      if (!productIdsWithStock.length) {
        return {
          products: [],
          page: pageNumber,
          limit: limitNumber,
          total: 0,
          totalPages: 0,
        };
      }

      filter._id = { $in: productIdsWithStock };
    }

    // Use text score for sorting when doing text search
    const sortOptions: Record<string, any> = useTextSearch
      ? { score: { $meta: "textScore" }, createdAt: -1 }
      : isSearching
        ? { name: 1 }
        : { createdAt: -1 };

    // Trim down fields for listing to reduce payload and speed up render
    const listingFields =
      "sku name brand origin description ingredients category subcategory productType isActive hasActivePromotion promotion " +
      "unitOfMeasure isSoldByWeight hasMultipleSellingUnits sellingUnits " +
      "price salePrice image imageUrl images attributes inventoryConfig " +
      "ivaApplicable igtfExempt taxCategory isPerishable shelfLifeDays storageTemperature sendToKitchen " +
      "variants.name variants.sku variants.isActive variants.barcode variants.basePrice variants.costPrice variants.price variants.unit variants.unitSize variants.images variants.attributes";

    // Build projection to include text score when doing text search
    const projection = useTextSearch ? { score: { $meta: "textScore" } } : {};

    this.logger.debug(
      `findAll -> tenantId=${tenantId}, includeInactive=${includeInactive}, isActive=${isActive}, page=${pageNumber}, limit=${limitNumber}, search=${searchTerm}, category=${category ?? ""}, brand=${brand ?? ""}, isSearching=${isSearching}, useTextSearch=${useTextSearch}`,
    );

    const [products, total] = await Promise.all([
      this.productModel
        .find(filter, projection)
        .select(listingFields)
        .select("+isSoldByWeight +unitOfMeasure")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNumber)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter),
    ]);

    if (options?.includeInventory && products.length) {
      const productIds = products.map((p: any) => p._id);
      const inventories = await this.inventoryModel
        .find({
          tenantId: new Types.ObjectId(tenantId),
          productId: { $in: productIds },
        })
        .select("productId availableQuantity totalQuantity lots")
        .lean();

      const inventoryMap = new Map(
        inventories.map((inv) => [
          inv.productId.toString(),
          {
            availableQuantity: inv.availableQuantity ?? 0,
            totalQuantity: inv.totalQuantity ?? 0,
            lots: inv.lots ?? [],
          },
        ]),
      );

      for (const product of products) {
        const inv = inventoryMap.get(product._id.toString());
        if (inv) {
          (product as any).inventory = {
            availableQuantity: inv.availableQuantity,
            totalQuantity: inv.totalQuantity,
            lots: inv.lots,
          };
          (product as any).availableQuantity = inv.availableQuantity;
        } else {
          (product as any).inventory = {
            availableQuantity: 0,
            totalQuantity: 0,
            lots: [],
          };
          (product as any).availableQuantity = 0;
        }
      }
    }

    return {
      products,
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
    };
  }

  async addSupplier(productId: string, dto: any, user: any) {
    const tenantId = user.tenantId;

    // 1. Validate Product
    const product = await this.productModel.findOne({
      _id: productId,
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!product) {
      throw new NotFoundException("Producto no encontrado");
    }

    // 2. Resolve Supplier (Check Explicit or Create from Virtual)
    let supplier;
    try {
      supplier = await this.suppliersService.ensureSupplierProfile(dto.supplierId, user);
    } catch (error) {
      throw new NotFoundException("Proveedor no encontrado");
    }

    // 3. Check if already linked
    const existingLink = product.suppliers?.find(
      (s: any) => s.supplierId.toString() === dto.supplierId,
    );
    if (existingLink) {
      throw new BadRequestException(
        "Este proveedor ya está asociado a este producto.",
      );
    }

    // 4. Update Product
    const update = {
      $push: {
        suppliers: {
          supplierId: new Types.ObjectId(dto.supplierId),
          supplierName: supplier.companyName || supplier.name,
          supplierSku: dto.supplierSku,
          costPrice: dto.costPrice,
          leadTimeDays: dto.leadTimeDays || 1,
          minimumOrderQuantity: dto.minimumOrderQuantity || 1,
          isPreferred: dto.isPreferred || false,
          lastUpdated: new Date(),
        },
      },
    };

    // If marked as preferred, unset others
    if (dto.isPreferred) {
      await this.productModel.updateOne(
        { _id: productId, tenantId: new Types.ObjectId(tenantId) },
        { $set: { "suppliers.$[].isPreferred": false } },
      );
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(productId, update, { new: true })
      .exec();

    return updatedProduct;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async findOne(id: string, tenantId: string): Promise<ProductDocument | null> {
    return this.productModel
      .findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) })
      .exec();
  }

  async findByBarcode(barcode: string, tenantId: string) {
    const normalized = (barcode || "").trim();
    if (!normalized) {
      throw new BadRequestException("El código de barras es requerido.");
    }

    const product = await this.productModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        "variants.barcode": normalized,
      })
      .select(
        "name sku brand category subcategory productType isActive hasActivePromotion promotion variants.name variants.sku variants.barcode variants.basePrice variants.price variants.images unitOfMeasure hasMultipleSellingUnits sellingUnits isSoldByWeight sendToKitchen",
      )
      .lean();

    if (!product) {
      throw new NotFoundException(
        "No se encontró un producto con ese código de barras.",
      );
    }

    const matchedVariant =
      product.variants?.find(
        (variant: any) =>
          (variant?.barcode || "").trim().toLowerCase() ===
          normalized.toLowerCase(),
      ) || null;

    return {
      product,
      variant: matchedVariant,
    };
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

    const oldImagesSize = this.calculateImagesSize(
      productBeforeUpdate.variants,
    );
    const variantsToValidate =
      "variants" in updateProductDto && updateProductDto.variants
        ? updateProductDto.variants
        : productBeforeUpdate.variants;
    await this.ensureUniqueVariantBarcodes(
      variantsToValidate,
      user.tenantId,
      id,
    );

    // VALIDATION: SIMPLE products should NOT use UnitConversion
    // UpdateProductDto doesn't allow changing productType, so we use the existing one
    const productType = productBeforeUpdate.productType;
    if (
      productType === ProductType.SIMPLE &&
      (updateProductDto as any).unitConversionConfig
    ) {
      throw new BadRequestException(
        "Los productos SIMPLE deben usar SellingUnits, no UnitConversion. " +
        "El sistema de conversión purchase/stock/consumption es solo para productos SUPPLY y CONSUMABLE.",
      );
    }

    let newImagesSize = oldImagesSize;
    if ("variants" in updateProductDto) {
      newImagesSize = this.calculateImagesSize(updateProductDto.variants);
    }
    const storageDifference = newImagesSize - oldImagesSize;

    if (
      tenant.usage.currentStorage + storageDifference >
      tenant.limits.maxStorage
    ) {
      throw new BadRequestException(
        "Límite de almacenamiento alcanzado para su plan de suscripción.",
      );
    }

    // Check if SKU is being updated
    if (updateProductDto.sku && updateProductDto.sku !== productBeforeUpdate.sku) {
      const existingProduct = await this.productModel.findOne({
        sku: updateProductDto.sku,
        tenantId: user.tenantId,
      });

      if (existingProduct) {
        throw new BadRequestException(
          `El SKU ${updateProductDto.sku} ya está en uso por otro producto.`,
        );
      }
    }

    const updateData = { ...updateProductDto, updatedBy: user.id };
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    // Cascade update to Inventory and InventoryMovement if SKU changed
    if (updateProductDto.sku && updateProductDto.sku !== productBeforeUpdate.sku) {
      await this.inventoryModel.updateMany(
        { productId: productBeforeUpdate._id },
        { $set: { productSku: updateProductDto.sku } },
      );

      await this.inventoryMovementModel.updateMany(
        { productId: productBeforeUpdate._id },
        { $set: { productSku: updateProductDto.sku } },
      );

      this.logger.log(
        `Cascaded SKU update from ${productBeforeUpdate.sku} to ${updateProductDto.sku} for product ${id}`,
      );
    }

    if (storageDifference !== 0) {
      await this.tenantModel.findByIdAndUpdate(user.tenantId, {
        $inc: { "usage.currentStorage": storageDifference },
      });
    }

    return updatedProduct;
  }

  async remove(id: string, tenantId: string): Promise<any> {
    const productToRemove = await this.productModel
      .findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) })
      .lean();
    if (!productToRemove) {
      throw new NotFoundException("Producto no encontrado");
    }

    const imagesSize = this.calculateImagesSize(productToRemove.variants);

    const result = await this.productModel
      .deleteOne({ _id: id, tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (result.deletedCount > 0) {
      await this.tenantModel.findByIdAndUpdate(tenantId, {
        $inc: {
          "usage.currentProducts": -1,
          "usage.currentStorage": -imagesSize,
        },
      });
    }
    return result;
  }

  async getCategories(
    tenantId: string,
    options?: {
      productTypes?: ProductType[];
      onlyActive?: boolean;
    },
  ): Promise<string[]> {
    const filter: any = { tenantId: new Types.ObjectId(tenantId) };

    if (options?.productTypes?.length) {
      filter.productType =
        options.productTypes.length === 1
          ? options.productTypes[0]
          : { $in: options.productTypes };
    }

    if (options?.onlyActive) {
      filter.isActive = true;
    }

    return this.productModel.distinct("category", filter).exec();
  }

  async getSubcategories(tenantId: string, category?: string): Promise<string[]> {
    const filter: any = { tenantId: new Types.ObjectId(tenantId) };
    if (category && category !== 'all') {
      filter.category = category;
    }
    return this.productModel
      .distinct("subcategory", filter)
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
          const padding = image.endsWith("==")
            ? 2
            : image.endsWith("=")
              ? 1
              : 0;
          const sizeInBytes = (image.length * 3) / 4 - padding;
          totalSize += sizeInBytes;
        }
      }
    }

    return totalSize / (1024 * 1024); // Convert to MB
  }
}
