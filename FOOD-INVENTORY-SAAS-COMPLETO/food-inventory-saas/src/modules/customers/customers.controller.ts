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

@ApiTags("customers")
@Controller("customers")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(private readonly customersService: CustomersService) {}

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
