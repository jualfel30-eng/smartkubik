import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Delete,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
} from "../../dto/customer.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { TransactionHistoryService } from "../../services/transaction-history.service";

@ApiTags("customers")
@Controller("customers")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(
    private readonly customersService: CustomersService,
    private readonly transactionHistoryService: TransactionHistoryService,
  ) {}

  @Post()
  @Permissions("customers_create")
  @ApiOperation({ summary: "Crear nuevo cliente" })
  @ApiResponse({ status: 201, description: "Cliente creado exitosamente" })
  async create(@Body() createCustomerDto: CreateCustomerDto, @Request() req) {
    this.logger.log(
      `Attempting to create customer with DTO: ${JSON.stringify(createCustomerDto)}`,
    );
    try {
      const customer = await this.customersService.create(
        createCustomerDto,
        req.user,
      );
      return {
        success: true,
        message: "Cliente creado exitosamente",
        data: customer,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear el cliente",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Permissions("customers_read")
  @ApiOperation({ summary: "Obtener lista de clientes" })
  @ApiResponse({ status: 200, description: "Clientes obtenidos exitosamente" })
  async findAll(@Query() query: CustomerQueryDto, @Request() req) {
    try {
      const result = await this.customersService.findAll(
        query,
        req.user.tenantId,
      );
      return {
        success: true,
        message: "Clientes obtenidos exitosamente",
        data: result.customers,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener los clientes",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @Permissions("customers_read")
  @ApiOperation({ summary: "Obtener cliente por ID" })
  @ApiResponse({ status: 200, description: "Cliente obtenido exitosamente" })
  async findOne(@Param("id") id: string, @Request() req) {
    try {
      const customer = await this.customersService.findOne(
        id,
        req.user.tenantId,
      );
      if (!customer) {
        throw new HttpException("Cliente no encontrado", HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: "Cliente obtenido exitosamente",
        data: customer,
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || "Error al obtener el cliente",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id/product-history")
  @Permissions("customers_read")
  @ApiOperation({
    summary: "Obtener historial de productos comprados por un cliente",
  })
  @ApiResponse({
    status: 200,
    description: "Historial de productos obtenido exitosamente",
  })
  async getProductHistory(@Param("id") id: string, @Request() req) {
    try {
      const productHistory = await this.customersService.getProductHistory(
        id,
        req.user.tenantId,
      );
      return {
        success: true,
        message: "Historial de productos obtenido exitosamente",
        data: productHistory,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener el historial de productos",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id/transactions")
  @Permissions("customers_read")
  @ApiOperation({
    summary: "Obtener historial completo de transacciones de un cliente",
  })
  @ApiResponse({
    status: 200,
    description: "Historial de transacciones obtenido exitosamente",
  })
  async getTransactions(
    @Param("id") id: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string,
    @Query("minAmount") minAmount?: number,
    @Query("maxAmount") maxAmount?: number,
    @Query("productId") productId?: string,
    @Query("category") category?: string,
    @Request() req?: any,
  ) {
    try {
      // Sanitize numeric filters - prevent NaN values
      const sanitizedMinAmount =
        minAmount !== undefined && !isNaN(Number(minAmount))
          ? Number(minAmount)
          : undefined;
      const sanitizedMaxAmount =
        maxAmount !== undefined && !isNaN(Number(maxAmount))
          ? Number(maxAmount)
          : undefined;

      // Query orders collection directly (always has data)
      const transactions =
        await this.customersService.getCustomerOrderHistory(
          id,
          req.user.tenantId,
          {
            startDate,
            endDate,
            status,
            minAmount: sanitizedMinAmount,
            maxAmount: sanitizedMaxAmount,
          },
        );

      return {
        success: true,
        message: "Historial de transacciones obtenido exitosamente",
        data: transactions,
        count: transactions.length,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener el historial de transacciones",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id/transaction-stats")
  @Permissions("customers_read")
  @ApiOperation({
    summary: "Obtener estadísticas de transacciones de un cliente",
  })
  @ApiResponse({
    status: 200,
    description: "Estadísticas obtenidas exitosamente",
  })
  async getTransactionStats(@Param("id") id: string, @Request() req) {
    try {
      // Query orders collection directly (always has data)
      const statsWithProducts =
        await this.customersService.getCustomerOrderStats(
          id,
          req.user.tenantId,
        );

      return {
        success: true,
        message: "Estadísticas obtenidas exitosamente",
        data: statsWithProducts,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener las estadísticas",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id")
  @Permissions("customers_update")
  @ApiOperation({ summary: "Actualizar un cliente" })
  @ApiResponse({ status: 200, description: "Cliente actualizado exitosamente" })
  async update(
    @Param("id") id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Request() req,
  ) {
    try {
      const customer = await this.customersService.update(
        id,
        updateCustomerDto,
        req.user,
      );
      if (!customer) {
        throw new HttpException("Cliente no encontrado", HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: "Cliente actualizado exitosamente",
        data: customer,
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || "Error al actualizar el cliente",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(":id")
  @Permissions("customers_delete")
  @ApiOperation({ summary: "Eliminar un cliente (borrado lógico)" })
  @ApiResponse({ status: 200, description: "Cliente eliminado exitosamente" })
  async remove(@Param("id") id: string, @Request() req) {
    try {
      const result = await this.customersService.remove(id, req.user.tenantId);
      if (!result) {
        throw new HttpException("Cliente no encontrado", HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: "Cliente eliminado exitosamente",
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || "Error al eliminar el cliente",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
