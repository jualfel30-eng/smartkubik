import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../../dto/product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(createProductDto: CreateProductDto, user: any): Promise<ProductDocument> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku}`);

    // Generar número único de producto si no se proporciona
    const productNumber = await this.generateProductNumber(user.tenantId);

    // Validar que el SKU no exista
    const existingProduct = await this.productModel.findOne({
      sku: createProductDto.sku,
      tenantId: user.tenantId,
    });

    if (existingProduct) {
      throw new Error(`El SKU ${createProductDto.sku} ya existe`);
    }

    // Validar SKUs de variantes únicos
    const variantSkus = createProductDto.variants.map(v => v.sku);
    const duplicateSkus = variantSkus.filter((sku, index) => variantSkus.indexOf(sku) !== index);
    if (duplicateSkus.length > 0) {
      throw new Error(`SKUs de variantes duplicados: ${duplicateSkus.join(', ')}`);
    }

    // Validar códigos de barras únicos
    const barcodes = createProductDto.variants.map(v => v.barcode);
    const duplicateBarcodes = barcodes.filter((barcode, index) => barcodes.indexOf(barcode) !== index);
    if (duplicateBarcodes.length > 0) {
      throw new Error(`Códigos de barras duplicados: ${duplicateBarcodes.join(', ')}`);
    }

    // Validaciones específicas para productos perecederos
    if (createProductDto.isPerishable) {
      if (!createProductDto.shelfLifeDays || createProductDto.shelfLifeDays <= 0) {
        throw new Error('Los productos perecederos deben tener una vida útil válida');
      }
      if (!createProductDto.storageTemperature) {
        throw new Error('Los productos perecederos deben especificar temperatura de almacenamiento');
      }
      // Habilitar FEFO automáticamente para productos perecederos
      createProductDto.inventoryConfig.fefoEnabled = true;
      createProductDto.inventoryConfig.trackExpiration = true;
    }

    // Validar configuración de precios
    if (createProductDto.pricingRules.minimumMargin < 0 || createProductDto.pricingRules.minimumMargin > 1) {
      throw new Error('El margen mínimo debe estar entre 0 y 1 (0% - 100%)');
    }

    const productData = {
      ...createProductDto,
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const createdProduct = new this.productModel(productData);
    const savedProduct = await createdProduct.save();

    this.logger.log(`Product created successfully with ID: ${savedProduct._id}`);
    return savedProduct;
  }

  async findAll(query: ProductQueryDto, tenantId: string) {
    this.logger.log(`Finding products for tenant: ${tenantId}`);

    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      isActive = true,
      isPerishable,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = { tenantId: new Types.ObjectId(tenantId) };

    // Filtro por estado activo
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Filtro por productos perecederos
    if (isPerishable !== undefined) {
      filter.isPerishable = isPerishable;
    }

    // Filtro por categoría
    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }

    // Filtro por marca
    if (brand) {
      filter.brand = { $regex: brand, $options: 'i' };
    }

    // Búsqueda de texto
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { 'variants.sku': { $regex: search, $options: 'i' } },
        { 'variants.barcode': { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('suppliers.supplierId', 'name')
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
    this.logger.log(`Finding product by ID: ${id}`);

    return this.productModel
      .findOne({ _id: id, tenantId })
      .populate('suppliers.supplierId', 'name contactInfo')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
  }

  async findBySku(sku: string, tenantId: string): Promise<ProductDocument | null> {
    this.logger.log(`Finding product by SKU: ${sku}`);

    return this.productModel
      .findOne({ sku, tenantId })
      .populate('suppliers.supplierId', 'name contactInfo')
      .exec();
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    user: any,
  ): Promise<ProductDocument | null> {
    this.logger.log(`Updating product with ID: ${id}`);

    // Validaciones específicas para productos perecederos
    if (updateProductDto.isPerishable !== undefined) {
      if (updateProductDto.isPerishable && updateProductDto.shelfLifeDays && updateProductDto.shelfLifeDays <= 0) {
        throw new Error('Los productos perecederos deben tener una vida útil válida');
      }
    }

    const updateData = {
      ...updateProductDto,
      updatedBy: user.id,
    };

    return this.productModel
      .findOneAndUpdate(
        { _id: id, tenantId: user.tenantId },
        updateData,
        { new: true, runValidators: true },
      )
      .populate('suppliers.supplierId', 'name')
      .exec();
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    this.logger.log(`Soft deleting product with ID: ${id}`);

    const result = await this.productModel.updateOne(
      { _id: id, tenantId },
      { isActive: false },
    );

    return result.modifiedCount > 0;
  }

  async getCategories(tenantId: string): Promise<string[]> {
    this.logger.log(`Getting categories for tenant: ${tenantId}`);

    const categories = await this.productModel.distinct('category', {
      tenantId,
      isActive: true,
    });

    return categories.sort();
  }

  async getBrands(tenantId: string): Promise<string[]> {
    this.logger.log(`Getting brands for tenant: ${tenantId}`);

    const brands = await this.productModel.distinct('brand', {
      tenantId,
      isActive: true,
    });

    return brands.sort();
  }

  async addVariant(id: string, variantDto: any, user: any): Promise<ProductDocument | null> {
    this.logger.log(`Adding variant to product: ${id}`);

    // Validar que el SKU de la variante no exista
    const existingProduct = await this.productModel.findOne({
      $or: [
        { 'variants.sku': variantDto.sku },
        { 'variants.barcode': variantDto.barcode },
      ],
      tenantId: user.tenantId,
    });

    if (existingProduct) {
      throw new Error('El SKU o código de barras de la variante ya existe');
    }

    return this.productModel
      .findOneAndUpdate(
        { _id: id, tenantId: user.tenantId },
        {
          $push: { variants: variantDto },
          updatedBy: user.id,
        },
        { new: true, runValidators: true },
      )
      .exec();
  }

  async addSupplier(id: string, supplierDto: any, user: any): Promise<ProductDocument | null> {
    this.logger.log(`Adding supplier to product: ${id}`);

    // Validar que el proveedor no esté ya asociado
    const existingProduct = await this.productModel.findOne({
      _id: id,
      'suppliers.supplierId': supplierDto.supplierId,
      tenantId: user.tenantId,
    });

    if (existingProduct) {
      throw new Error('El proveedor ya está asociado a este producto');
    }

    return this.productModel
      .findOneAndUpdate(
        { _id: id, tenantId: user.tenantId },
        {
          $push: { suppliers: supplierDto },
          updatedBy: user.id,
        },
        { new: true, runValidators: true },
      )
      .exec();
  }

  async findByVariantSku(variantSku: string, tenantId: string): Promise<ProductDocument | null> {
    this.logger.log(`Finding product by variant SKU: ${variantSku}`);

    return this.productModel
      .findOne({
        'variants.sku': variantSku,
        tenantId,
        isActive: true,
      })
      .exec();
  }

  async findByBarcode(barcode: string, tenantId: string): Promise<ProductDocument | null> {
    this.logger.log(`Finding product by barcode: ${barcode}`);

    return this.productModel
      .findOne({
        'variants.barcode': barcode,
        tenantId,
        isActive: true,
      })
      .exec();
  }

  async getPerishableProducts(tenantId: string, daysToExpire: number = 7): Promise<ProductDocument[]> {
    this.logger.log(`Getting perishable products expiring in ${daysToExpire} days`);

    return this.productModel
      .find({
        tenantId,
        isActive: true,
        isPerishable: true,
        shelfLifeDays: { $lte: daysToExpire },
      })
      .exec();
  }

  private async generateProductNumber(tenantId: string): Promise<string> {
    const count = await this.productModel.countDocuments({ tenantId });
    return `PROD-${(count + 1).toString().padStart(6, '0')}`;
  }

  async validateProductAvailability(
    productSku: string,
    variantSku: string | undefined,
    tenantId: string,
  ): Promise<{ isAvailable: boolean; product: ProductDocument | null }> {
    const product = await this.productModel
      .findOne({
        sku: productSku,
        tenantId,
        isActive: true,
      })
      .exec();

    if (!product) {
      return { isAvailable: false, product: null };
    }

    // Si se especifica variante, validar que exista y esté activa
    if (variantSku) {
      const variant = product.variants.find(v => v.sku === variantSku && v.isActive);
      if (!variant) {
        return { isAvailable: false, product };
      }
    }

    return { isAvailable: true, product };
  }
}

