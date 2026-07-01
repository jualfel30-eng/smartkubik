import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { ReturnsService } from "./returns.service";
import { CreateReturnDto } from "./dto/create-return.dto";

@ApiTags("returns")
@Controller("orders")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post(":id/returns")
  @Permissions("orders_update")
  @ApiOperation({ summary: "Devolver una orden (reembolso en efectivo)" })
  async createReturn(
    @Param("id") id: string,
    @Body() dto: CreateReturnDto,
    @Request() req: any,
  ) {
    try {
      const data = await this.returnsService.createReturn(id, dto, req.user);
      return {
        success: true,
        message: "Devolución registrada exitosamente",
        data,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al registrar la devolución",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(":id/returns")
  @Permissions("orders_read")
  @ApiOperation({ summary: "Listar devoluciones de una orden" })
  async findByOrder(@Param("id") id: string, @Request() req: any) {
    const data = await this.returnsService.findByOrder(id, req.user);
    return { success: true, data };
  }
}
