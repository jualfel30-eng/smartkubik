import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { RoutingService } from "./routing.service";
import {
  CreateRoutingDto,
  UpdateRoutingDto,
  RoutingQueryDto,
} from "../../dto/routing.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("routings")
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post()
  async create(@Body() dto: CreateRoutingDto, @Request() req) {
    const data = await this.routingService.create(dto, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: RoutingQueryDto, @Request() req) {
    const result = await this.routingService.findAll(query, req.user);
    return { success: true, ...result };
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req) {
    const data = await this.routingService.findOne(id, req.user);
    return { success: true, data };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateRoutingDto,
    @Request() req,
  ) {
    const data = await this.routingService.update(id, dto, req.user);
    return { success: true, data };
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Request() req) {
    await this.routingService.delete(id, req.user);
    return { success: true, message: "Routing eliminado correctamente" };
  }
}
