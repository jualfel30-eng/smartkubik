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
import { WorkCenterService } from "./work-center.service";
import {
  CreateWorkCenterDto,
  UpdateWorkCenterDto,
  WorkCenterQueryDto,
} from "../../dto/work-center.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("work-centers")
export class WorkCenterController {
  constructor(private readonly workCenterService: WorkCenterService) {}

  @Post()
  async create(@Body() dto: CreateWorkCenterDto, @Request() req) {
    const data = await this.workCenterService.create(dto, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: WorkCenterQueryDto, @Request() req) {
    const result = await this.workCenterService.findAll(query, req.user);
    return { success: true, ...result };
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req) {
    const data = await this.workCenterService.findOne(id, req.user);
    return { success: true, data };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateWorkCenterDto,
    @Request() req,
  ) {
    const data = await this.workCenterService.update(id, dto, req.user);
    return { success: true, data };
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Request() req) {
    await this.workCenterService.delete(id, req.user);
    return { success: true, message: "Work Center eliminado correctamente" };
  }
}
