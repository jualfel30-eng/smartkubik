import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { Public } from "../../decorators/public.decorator";
import { Types, Model } from "mongoose";
import { ProductType } from "../../schemas/product.schema";
import {
  ProductConsumableConfig,
  ProductConsumableConfigDocument,
} from "../../schemas/product-consumable-config.schema";
import { InjectModel } from "@nestjs/mongoose";

@ApiTags("Products Public")
// Nota: usamos prefix global "api/v1" en main.ts, por eso aquí solo se define la parte pública
@Controller("public/products")
export class ProductsPublicController {
  constructor(
    private readonly productsService: ProductsService,
    @InjectModel(ProductConsumableConfig.name)
    private readonly consumableConfigModel: Model<ProductConsumableConfigDocument>,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "Obtener productos de un tenant (público)",
    description:
      "Endpoint público para obtener productos de un tenant específico con filtros opcionales",
  })
  @ApiQuery({
    name: "tenantId",
    description: "ID del tenant (requerido)",
    required: true,
    example: "507f1f77bcf86cd799439011",
  })
  @ApiQuery({
    name: "category",
    description: "Filtrar por categoría",
    required: false,
    example: "Granos",
  })
  @ApiQuery({
    name: "search",
    description: "Buscar en nombre y descripción",
    required: false,
    example: "arroz",
  })
  @ApiQuery({
    name: "page",
    description: "Número de página",
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    description: "Productos por página",
    required: false,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: "Lista de productos obtenida exitosamente",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              _id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              price: { type: "number" },
              stock: { type: "number" },
              image: { type: "string" },
            },
          },
        },
        pagination: {
          type: "object",
          properties: {
            page: { type: "number" },
            limit: { type: "number" },
            total: { type: "number" },
            totalPages: { type: "number" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Parámetros inválidos",
  })
  async findAll(
    @Query("tenantId") tenantId: string,
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    // Validar tenantId
    if (!tenantId) {
      throw new BadRequestException("El parámetro tenantId es requerido");
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException("ID de tenant inválido");
    }

    // Construir query
    const query: any = {
      page: page || 1,
      limit: limit || 20,
    };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.search = search;
    }

    // Solo productos vendibles en storefront (excluir consumibles/suministros)
    query.productType = ProductType.SIMPLE;
    // Excluir productos configurados como consumibles (nueva capa de seguridad)
    const consumableConfigs = await this.consumableConfigModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .select("productId")
      .lean();
    if (consumableConfigs.length) {
      query.excludeProductIds = consumableConfigs
        .map((c) => c.productId?.toString?.())
        .filter(Boolean);
    }

    // Obtener productos
    const result = await this.productsService.findAll(query, tenantId, {
      includeInventory: true,
      minAvailableQuantity: 1, // Solo mostrar productos con stock disponible
    });

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

  @Public()
  @Get(":id")
  @ApiOperation({
    summary: "Obtener un producto por ID (público)",
    description:
      "Endpoint público para obtener los detalles de un producto específico",
  })
  @ApiParam({
    name: "id",
    description: "ID del producto",
    example: "507f1f77bcf86cd799439011",
  })
  @ApiQuery({
    name: "tenantId",
    description: "ID del tenant (requerido)",
    required: true,
    example: "507f1f77bcf86cd799439011",
  })
  @ApiResponse({
    status: 200,
    description: "Producto obtenido exitosamente",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        data: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            subcategory: { type: "string" },
            price: { type: "number" },
            cost: { type: "number" },
            stock: { type: "number" },
            image: { type: "string" },
            sku: { type: "string" },
            barcode: { type: "string" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Parámetros inválidos",
  })
  @ApiResponse({
    status: 404,
    description: "Producto no encontrado",
  })
  async findOne(@Param("id") id: string, @Query("tenantId") tenantId: string) {
    // Validar tenantId
    if (!tenantId) {
      throw new BadRequestException("El parámetro tenantId es requerido");
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException("ID de tenant inválido");
    }

    // Obtener producto
    const product = await this.productsService.findOne(id, tenantId);

    return {
      success: true,
      data: product,
    };
  }

  @Public()
  @Get("categories/list")
  @ApiOperation({
    summary: "Obtener categorías de productos de un tenant (público)",
    description:
      "Endpoint público para obtener la lista de categorías disponibles",
  })
  @ApiQuery({
    name: "tenantId",
    description: "ID del tenant (requerido)",
    required: true,
    example: "507f1f77bcf86cd799439011",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de categorías obtenida exitosamente",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        data: {
          type: "array",
          items: { type: "string" },
          example: ["Granos", "Aceites", "Pastas", "Endulzantes", "Bebidas"],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Parámetros inválidos",
  })
  async getCategories(@Query("tenantId") tenantId: string) {
    // Validar tenantId
    if (!tenantId) {
      throw new BadRequestException("El parámetro tenantId es requerido");
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException("ID de tenant inválido");
    }

    // Obtener categorías
    const categories = await this.productsService.getCategories(tenantId, {
      productTypes: [ProductType.SIMPLE],
      onlyActive: true,
    });

    return {
      success: true,
      data: categories,
    };
  }
}
