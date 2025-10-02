import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { SuppliersService } from "./suppliers.service";
import { CreateSupplierDto } from "../../dto/supplier.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto, @Req() req) {
    return this.suppliersService.create(createSupplierDto, req.user);
  }

  @Get()
  findAll(@Req() req, @Query("search") search: string) {
    return this.suppliersService.findAll(req.user.tenantId, search);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req) {
    return this.suppliersService.findOne(id, req.user.tenantId);
  }
}
