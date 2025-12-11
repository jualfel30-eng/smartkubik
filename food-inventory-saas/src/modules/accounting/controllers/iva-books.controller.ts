import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TenantGuard } from '../../../guards/tenant.guard';
import { Permissions } from '../../../decorators/permissions.decorator';
import { PermissionsGuard } from '../../../guards/permissions.guard';
import { IvaPurchaseBookService } from '../services/iva-purchase-book.service';
import { IvaSalesBookService } from '../services/iva-sales-book.service';
import {
  CreateIvaPurchaseBookDto,
  UpdateIvaPurchaseBookDto,
  CreateIvaSalesBookDto,
  UpdateIvaSalesBookDto,
  AnnulSalesEntryDto,
} from '../../../dto/iva-books.dto';

@Controller('accounting/iva-books')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class IvaBooksController {
  constructor(
    private readonly purchaseBookService: IvaPurchaseBookService,
    private readonly salesBookService: IvaSalesBookService,
  ) {}

  // ============ LIBRO DE COMPRAS ============

  /**
   * GET /accounting/iva-books/purchases
   * Obtener entradas del libro de compras
   */
  @Get('purchases')
  @Permissions('accounting_read')
  async findAllPurchases(@Req() req: any, @Query() filters: any) {
    return await this.purchaseBookService.findAll(req.user.tenantId, filters);
  }

  /**
   * GET /accounting/iva-books/purchases/:id
   * Obtener entrada de compra por ID
   */
  @Get('purchases/:id')
  @Permissions('accounting_read')
  async findOnePurchase(@Param('id') id: string, @Req() req: any) {
    return await this.purchaseBookService.findOne(id, req.user.tenantId);
  }

  /**
   * GET /accounting/iva-books/purchases/period/:month/:year
   * Obtener libro de compras por período
   */
  @Get('purchases/period/:month/:year')
  @Permissions('accounting_read')
  async getPurchaseBookByPeriod(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
  ) {
    return await this.purchaseBookService.getBookByPeriod(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );
  }

  /**
   * GET /accounting/iva-books/purchases/summary/:month/:year
   * Obtener resumen del libro de compras
   */
  @Get('purchases/summary/:month/:year')
  @Permissions('accounting_read')
  async getPurchaseSummary(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
  ) {
    return await this.purchaseBookService.getSummary(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );
  }

  /**
   * GET /accounting/iva-books/purchases/validate/:month/:year
   * Validar integridad del libro de compras
   */
  @Get('purchases/validate/:month/:year')
  @Permissions('accounting_read')
  async validatePurchaseBook(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
  ) {
    return await this.purchaseBookService.validateBook(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );
  }

  /**
   * GET /accounting/iva-books/purchases/export/:month/:year
   * Exportar libro de compras a TXT SENIAT
   */
  @Get('purchases/export/:month/:year')
  @Permissions('accounting_read')
  async exportPurchaseBook(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const txtContent = await this.purchaseBookService.exportToTXT(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );

    const filename = `Libro-Compras-${month}-${year}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(txtContent);
  }

  /**
   * POST /accounting/iva-books/purchases
   * Crear entrada en libro de compras
   */
  @Post('purchases')
  @Permissions('accounting_create')
  async createPurchase(@Body() dto: CreateIvaPurchaseBookDto, @Req() req: any) {
    return await this.purchaseBookService.create(dto, req.user);
  }

  /**
   * PUT /accounting/iva-books/purchases/:id
   * Actualizar entrada de compra
   */
  @Put('purchases/:id')
  @Permissions('accounting_update')
  async updatePurchase(
    @Param('id') id: string,
    @Body() dto: UpdateIvaPurchaseBookDto,
    @Req() req: any,
  ) {
    return await this.purchaseBookService.update(id, dto, req.user);
  }

  /**
   * DELETE /accounting/iva-books/purchases/:id
   * Eliminar entrada de compra
   */
  @Delete('purchases/:id')
  @Permissions('accounting_delete')
  async deletePurchase(@Param('id') id: string, @Req() req: any) {
    await this.purchaseBookService.delete(id, req.user.tenantId);
    return { message: 'Entrada eliminada exitosamente' };
  }

  // ============ LIBRO DE VENTAS ============

  /**
   * GET /accounting/iva-books/sales
   * Obtener entradas del libro de ventas
   */
  @Get('sales')
  @Permissions('accounting_read')
  async findAllSales(@Req() req: any, @Query() filters: any) {
    return await this.salesBookService.findAll(req.user.tenantId, filters);
  }

  /**
   * GET /accounting/iva-books/sales/:id
   * Obtener entrada de venta por ID
   */
  @Get('sales/:id')
  @Permissions('accounting_read')
  async findOneSale(@Param('id') id: string, @Req() req: any) {
    return await this.salesBookService.findOne(id, req.user.tenantId);
  }

  /**
   * GET /accounting/iva-books/sales/period/:month/:year
   * Obtener libro de ventas por período
   */
  @Get('sales/period/:month/:year')
  @Permissions('accounting_read')
  async getSalesBookByPeriod(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
  ) {
    return await this.salesBookService.getBookByPeriod(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );
  }

  /**
   * GET /accounting/iva-books/sales/summary/:month/:year
   * Obtener resumen del libro de ventas
   */
  @Get('sales/summary/:month/:year')
  @Permissions('accounting_read')
  async getSalesSummary(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
  ) {
    return await this.salesBookService.getSummary(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );
  }

  /**
   * GET /accounting/iva-books/sales/validate/:month/:year
   * Validar integridad del libro de ventas
   */
  @Get('sales/validate/:month/:year')
  @Permissions('accounting_read')
  async validateSalesBook(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
  ) {
    return await this.salesBookService.validateBook(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );
  }

  /**
   * GET /accounting/iva-books/sales/export/:month/:year
   * Exportar libro de ventas a TXT SENIAT
   */
  @Get('sales/export/:month/:year')
  @Permissions('accounting_read')
  async exportSalesBook(
    @Param('month') month: string,
    @Param('year') year: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const txtContent = await this.salesBookService.exportToTXT(
      parseInt(month),
      parseInt(year),
      req.user.tenantId,
    );

    const filename = `Libro-Ventas-${month}-${year}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(txtContent);
  }

  /**
   * POST /accounting/iva-books/sales
   * Crear entrada en libro de ventas
   */
  @Post('sales')
  @Permissions('accounting_create')
  async createSale(@Body() dto: CreateIvaSalesBookDto, @Req() req: any) {
    return await this.salesBookService.create(dto, req.user);
  }

  /**
   * PUT /accounting/iva-books/sales/:id
   * Actualizar entrada de venta
   */
  @Put('sales/:id')
  @Permissions('accounting_update')
  async updateSale(
    @Param('id') id: string,
    @Body() dto: UpdateIvaSalesBookDto,
    @Req() req: any,
  ) {
    return await this.salesBookService.update(id, dto, req.user);
  }

  /**
   * PUT /accounting/iva-books/sales/:id/annul
   * Anular factura
   */
  @Put('sales/:id/annul')
  @Permissions('accounting_delete')
  async annulSale(
    @Param('id') id: string,
    @Body() dto: AnnulSalesEntryDto,
    @Req() req: any,
  ) {
    return await this.salesBookService.annul(id, dto, req.user);
  }

  /**
   * DELETE /accounting/iva-books/sales/:id
   * Eliminar entrada de venta
   */
  @Delete('sales/:id')
  @Permissions('accounting_delete')
  async deleteSale(@Param('id') id: string, @Req() req: any) {
    await this.salesBookService.delete(id, req.user.tenantId);
    return { message: 'Entrada eliminada exitosamente' };
  }

  /**
   * GET /accounting/iva-books/sales/next-invoice-number
   * Generar siguiente número de factura
   */
  @Get('sales/next-invoice-number')
  @Permissions('accounting_read')
  async getNextInvoiceNumber(@Req() req: any, @Query('prefix') prefix?: string) {
    const invoiceNumber = await this.salesBookService.generateNextInvoiceNumber(
      req.user.tenantId,
      prefix || 'FAC',
    );
    return { invoiceNumber };
  }
}
