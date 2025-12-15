import { Body, Controller, Delete, Get, Param, Post, Put, Request } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PlaybooksService } from "./playbooks.service";

@ApiTags("playbooks")
@Controller("playbooks")
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  @Get()
  @ApiOperation({ summary: "Listar playbooks del tenant" })
  async findAll(@Request() req) {
    const data = await this.playbooksService.findAll(req.user.tenantId);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: "Crear playbook" })
  async create(@Body() dto: any, @Request() req) {
    const data = await this.playbooksService.create({ ...dto, tenantId: req.user.tenantId });
    return { success: true, data };
  }

  @Put(":id")
  @ApiOperation({ summary: "Actualizar playbook" })
  async update(@Param("id") id: string, @Body() dto: any, @Request() req) {
    const data = await this.playbooksService.update(id, dto, req.user.tenantId);
    return { success: true, data };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Eliminar playbook" })
  async remove(@Param("id") id: string, @Request() req) {
    const data = await this.playbooksService.delete(id, req.user.tenantId);
    return { success: true, data };
  }
}
