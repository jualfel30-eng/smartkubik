import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ProductsService } from "./products.service";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from "../../dto/product.dto";
import { CreateProductWithPurchaseDto } from "../../dto/composite.dto";
import { BulkCreateProductsDto } from "./dto/bulk-create-products.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import {
  shouldBypassTenantConfirmation,
  isTenantConfirmationEnforced,
} from "../../config/tenant-confirmation";

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  private ensureTenantConfirmed(req: any) {
    if (shouldBypassTenantConfirmation()) {
      return;
    }

    const tenantConfirmed =
      req?.tenant?.isConfirmed !== false || !isTenantConfirmationEnforced();
    const userConfirmed =
      req?.user?.tenantConfirmed !== false || !isTenantConfirmationEnforced();

    if (!tenantConfirmed || !userConfirmed) {
      throw new ForbiddenException(
        "Tu cuenta aún no está confirmada. Ingresa el código enviado por correo para habilitar la creación de productos.",
      );
    }
  }

  @Post("/with-initial-purchase")
  @Permissions("products_create")
  async createWithInitialPurchase(
    @Body() createDto: CreateProductWithPurchaseDto,
    @Request() req,
  ) {
    this.ensureTenantConfirmed(req);
    const product = await this.productsService.createWithInitialPurchase(
      createDto,
      req.user,
    );
    return { success: true, data: product };
  }

  @Post()
  @Permissions("products_create")
  async create(@Body() createProductDto: CreateProductDto, @Request() req) {
    this.ensureTenantConfirmed(req);
    const product = await this.productsService.create(
      createProductDto,
      req.user,
    );
    return { success: true, data: product };
  }

  @Post("bulk")
  @Permissions("products_create")
  async bulkCreate(
    @Body() bulkCreateProductsDto: BulkCreateProductsDto,
    @Request() req,
  ) {
    this.ensureTenantConfirmed(req);
    const result = await this.productsService.bulkCreate(
      bulkCreateProductsDto,
      req.user,
    );
    return { success: true, data: result };
  }

  @Get()
  @Permissions("products_read")
  async findAll(@Query() query: ProductQueryDto, @Request() req) {
    console.log(`GET /products called with query:`, query, `User:`, req.user.email);
    const result = await this.productsService.findAll(query, req.user.tenantId);
    return {
      success: true,
      data: result.products,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(":id")
  @Permissions("products_read")
  async findOne(@Param("id") id: string, @Request() req) {
    const product = await this.productsService.findOne(id, req.user.tenantId);
    return { success: true, data: product };
  }

  @Get("lookup/barcode/:barcode")
  @Permissions("products_read")
  async findByBarcode(@Param("barcode") barcode: string, @Request() req) {
    const result = await this.productsService.findByBarcode(
      barcode,
      req.user.tenantId,
    );
    return { success: true, data: result };
  }

  @Patch(":id")
  @Permissions("products_update")
  async update(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ) {
    const product = await this.productsService.update(
      id,
      updateProductDto,
      req.user,
    );
    return { success: true, data: product };
  }

  @Delete(":id")
  @Permissions("products_delete")
  async remove(@Param("id") id: string, @Request() req) {
    const result = await this.productsService.remove(id, req.user.tenantId);
    return { success: true, data: result };
  }

  @Post(":id/suppliers")
  @Permissions("products_update")
  async addSupplier(
    @Param("id") id: string,
    @Body() dto: any, // Typed as AddSupplierToProductDto but using any to avoid import loop for now if DTO not exported yet
    @Request() req,
  ) {
    const product = await this.productsService.addSupplier(id, dto, req.user);
    return { success: true, data: product };
  }

  @Get("categories/list")
  @Permissions("products_read")
  async getCategories(@Request() req) {
    const categories = await this.productsService.getCategories(
      req.user.tenantId,
    );
    return { success: true, data: categories };
  }

  @Get("subcategories/list")
  @Permissions("products_read")
  async getSubcategories(@Query("category") category: string, @Request() req) {
    const subcategories = await this.productsService.getSubcategories(
      req.user.tenantId,
      category,
    );
    return { success: true, data: subcategories };
  }

  /**
   * Scan product label images (up to 3) using AI to extract product data.
   * Accepts multipart form data with 1-3 image files.
   */
  @Post("scan-label")
  @Permissions("products_create")
  @UseInterceptors(
    FilesInterceptor("images", 3, {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp|heic)$/)) {
          cb(new BadRequestException("Solo se permiten imágenes (JPEG, PNG, WebP, HEIC)"), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async scanLabel(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("Debe cargar al menos una imagen de la etiqueta del producto.");
    }

    const images = files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype }));
    const result = await this.productsService.scanProductLabel(images, req.user.tenantId);

    return {
      success: true,
      data: result,
      message: `Etiqueta escaneada con ${Math.round(result.overallConfidence * 100)}% de confianza`,
    };
  }
}
