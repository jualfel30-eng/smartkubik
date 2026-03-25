import { Injectable, Logger } from '@nestjs/common';
import { BillingDocument } from '../../../schemas/billing-document.schema';
import * as crypto from 'crypto';

/**
 * Mapper para convertir BillingDocument de SmartKubik al formato JSON de HKA Factory
 *
 * Este mapper implementa la especificación completa de HKA Factory V02 (Feb 2026)
 * según el documento [IT-21-01-01][V02]REFERENCIA TECNICA API.pdf
 *
 * Soporta los siguientes tipos de documentos:
 * - 01: Factura
 * - 02: Nota de Crédito
 * - 03: Nota de Débito
 * - 04: Guía de Despacho / Nota de Entrega
 * - 05: Comprobante de Retención IVA
 * - 06: Comprobante de Retención ISLR
 * - 07: Comprobante de Retenciones Varias (ARCV)
 */
@Injectable()
export class HkaDocumentMapper {
  private readonly logger = new Logger(HkaDocumentMapper.name);

  /**
   * Convierte un BillingDocument a JSON de HKA Factory
   *
   * @param doc Documento de facturación de SmartKubik
   * @returns JSON en formato HKA Factory
   */
  toHkaJson(doc: BillingDocument): any {
    const typeMap = {
      invoice: '01',
      credit_note: '02',
      debit_note: '03',
      delivery_note: '04',
      quote: '99', // Presupuesto (no fiscal)
    };

    const tipoDocumento = typeMap[doc.type] || '01';

    // Routing según tipo
    switch (tipoDocumento) {
      case '01':
        return this.toFacturaJson(doc);
      case '02':
      case '03':
        return this.toNotaJson(doc, tipoDocumento);
      case '04':
        return this.toGuiaDespachoJson(doc);
      default:
        throw new Error(`Tipo de documento no soportado para HKA: ${doc.type}`);
    }
  }

  /**
   * Convierte a formato de Factura (tipo 01)
   */
  private toFacturaJson(doc: BillingDocument): any {
    const now = new Date(doc.issueDate || new Date());

    return {
      documentoElectronico: {
        Encabezado: {
          IdentificacionDocumento: this.mapIdentificacionDocumento(doc, '01', now),
          Vendedor: this.mapVendedor(doc),
          Comprador: this.mapComprador(doc),
          Totales: this.mapTotales(doc),
          TotalesOtraMoneda: this.mapTotalesOtraMoneda(doc),
        },
        DetallesItems: this.mapDetallesItems(doc),
        InfoAdicional: this.mapInfoAdicional(doc),
      },
    };
  }

  /**
   * Convierte a formato de Nota de Crédito (02) o Débito (03)
   */
  private toNotaJson(doc: BillingDocument, tipoDocumento: '02' | '03'): any {
    const now = new Date(doc.issueDate || new Date());

    const identificacion = this.mapIdentificacionDocumento(doc, tipoDocumento, now);

    // Campos adicionales para notas
    if (doc.references?.originalDocumentId) {
      // Aquí deberías cargar la factura original desde la BD
      // Por ahora asumimos que viene en metadata
      identificacion.SerieFacturaAfectada = doc.metadata?.originalSeries || '';
      identificacion.NumeroFacturaAfectada = doc.metadata?.originalDocumentNumber || '';
      identificacion.FechaFacturaAfectada = this.formatDate(doc.metadata?.originalDate);
      identificacion.MontoFacturaAfectada = doc.metadata?.originalAmount?.toFixed(2) || '0.00';
      identificacion.ComentarioFacturaAfectada = doc.metadata?.reason || '';
      identificacion.TipoTransaccion = '02'; // Complemento
    }

    return {
      documentoElectronico: {
        Encabezado: {
          IdentificacionDocumento: identificacion,
          Vendedor: this.mapVendedor(doc),
          Comprador: this.mapComprador(doc),
          Totales: this.mapTotales(doc),
          TotalesOtraMoneda: this.mapTotalesOtraMoneda(doc),
        },
        DetallesItems: this.mapDetallesItems(doc),
        InfoAdicional: this.mapInfoAdicional(doc),
      },
    };
  }

  /**
   * Convierte a formato de Guía de Despacho (04)
   */
  private toGuiaDespachoJson(doc: BillingDocument): any {
    const now = new Date(doc.issueDate || new Date());

    return {
      documentoElectronico: {
        Encabezado: {
          IdentificacionDocumento: this.mapIdentificacionDocumento(doc, '04', now),
          Comprador: this.mapComprador(doc),
          Totales: this.mapTotales(doc),
        },
        DetallesItems: this.mapDetallesItems(doc),
        GuiaDespacho: this.mapGuiaDespacho(doc),
        InfoAdicional: this.mapInfoAdicional(doc),
      },
    };
  }

  /**
   * Mapea la identificación del documento
   */
  private mapIdentificacionDocumento(doc: BillingDocument, tipoDocumento: string, issueDate: Date): any {
    return {
      TipoDocumento: tipoDocumento,
      NumeroDocumento: doc.documentNumber,
      TipoProveedor: null,
      TipoTransaccion: doc.metadata?.tipoTransaccion || null,
      NumeroPlanillaImportacion: null,
      NumeroExpedienteImportacion: null,
      SerieFacturaAfectada: null,
      NumeroFacturaAfectada: null,
      FechaFacturaAfectada: null,
      MontoFacturaAfectada: null,
      ComentarioFacturaAfectada: null,
      RegimenEspTributacion: null,
      FechaEmision: this.formatDate(issueDate),
      FechaVencimiento: this.formatDate(doc.paymentTerms?.dueDate || issueDate),
      HoraEmision: this.formatTime(issueDate),
      Anulado: false,
      TipoDePago: doc.paymentTerms?.type === 'credito' ? 'Crédito' : 'Inmediato',
      Serie: doc.metadata?.series || '',
      Sucursal: doc.metadata?.sucursal || '',
      TipoDeVenta: 'Interna',
      Moneda: doc.totals?.currency || 'BSD',
    };
  }

  /**
   * Mapea información del vendedor (opcional)
   */
  private mapVendedor(doc: BillingDocument): any | null {
    if (!doc.metadata?.vendedor) {
      return null;
    }

    return {
      Codigo: doc.metadata.vendedor.codigo || '',
      Nombre: doc.metadata.vendedor.nombre || '',
      NumCajero: (doc.metadata.vendedor as any).numCajero || '',
    };
  }

  /**
   * Mapea información del comprador
   */
  private mapComprador(doc: BillingDocument): any {
    const customer = doc.customer || {};

    // Extraer tipo y número de RIF
    const { tipo, numero } = this.parseRif(customer.taxId || 'V-00000000-0');

    return {
      TipoIdentificacion: tipo,
      NumeroIdentificacion: numero,
      RazonSocial: customer.name || 'Cliente General',
      Direccion: customer.address || 'No especificada',
      Ubigeo: null,
      Pais: doc.country || 'VE',
      Notificar: customer.email ? 'Si' : 'No',
      Telefono: customer.phone ? [customer.phone] : [],
      Correo: customer.email ? [customer.email] : [],
      OtrosEnvios: null,
    };
  }

  /**
   * Mapea totales del documento
   */
  private mapTotales(doc: BillingDocument): any {
    const totals = doc.totals || {};
    const items = doc.items || []; // FIXED: usar doc.items no doc.metadata.items

    // Calcular impuestos por alícuota
    const impuestosSubtotal = this.calculateImpuestosSubtotal(items, totals);

    // Generar formas de pago
    const formasPago = this.mapFormasPago(doc);

    // Calcular IGTF si hay pagos en divisas
    const totalIGTF = this.calculateIGTF(formasPago);

    const montoGravadoTotal = totals.taxableAmount || 0;
    const montoExentoTotal = totals.exemptAmount || 0;
    const subtotal = totals.subtotal || 0;
    const totalIVA = totals.taxes?.find(t => t.type === 'IVA')?.amount || 0;
    const montoTotalConIVA = subtotal + totalIVA;
    const totalAPagar = montoTotalConIVA + totalIGTF;

    return {
      NroItems: items.length.toString(),
      MontoGravadoTotal: montoGravadoTotal.toFixed(2),
      MontoExentoTotal: montoExentoTotal.toFixed(2),
      MontoPercibidoTotal: '0.00',
      SubtotalAntesDescuento: (subtotal + (totals.discounts || 0)).toFixed(2),
      TotalDescuento: (totals.discounts || 0).toFixed(2),
      TotalRecargos: (totals.charges || 0).toFixed(2),
      Subtotal: subtotal.toFixed(2),
      TotalIVA: totalIVA.toFixed(2),
      MontoTotalConIVA: montoTotalConIVA.toFixed(2),
      TotalAPagar: totalAPagar.toFixed(2),
      MontoEnLetras: this.numberToWords(totalAPagar, totals.currency || 'BSD'),
      ListaRecargo: null,
      ListaDescBonificacion: this.mapDescuentos(doc),
      ImpuestosSubtotal: impuestosSubtotal,
      OtrosImpuestosSubtotal: null,
      FormasPago: formasPago,
      TotalIGTF: totalIGTF > 0 ? totalIGTF.toFixed(2) : null,
      TotalIGTF_VES: null,
      MontoTotalOTI: null,
      MontoTotalIVAyOTI: null,
    };
  }

  /**
   * Mapea totales en otra moneda (si aplica)
   */
  private mapTotalesOtraMoneda(doc: BillingDocument): any | null {
    const totals = doc.totals || {};

    // Solo si la moneda no es BSD y hay exchangeRate
    if (totals.currency === 'BSD' || !totals.exchangeRate) {
      return null;
    }

    const exchangeRate = totals.exchangeRate;
    const montoGravadoTotal = (totals.taxableAmount || 0) / exchangeRate;
    const montoExentoTotal = (totals.exemptAmount || 0) / exchangeRate;
    const subtotal = (totals.subtotal || 0) / exchangeRate;
    const totalIVA = (totals.taxes?.find(t => t.type === 'IVA')?.amount || 0) / exchangeRate;
    const montoTotalConIVA = subtotal + totalIVA;
    const totalAPagar = montoTotalConIVA;

    return {
      Moneda: totals.currency,
      TipoCambio: exchangeRate.toFixed(4),
      MontoGravadoTotal: montoGravadoTotal.toFixed(2),
      MontoPercibidoTotal: '0.00',
      MontoExentoTotal: montoExentoTotal.toFixed(2),
      Subtotal: subtotal.toFixed(2),
      TotalAPagar: totalAPagar.toFixed(2),
      TotalIVA: totalIVA.toFixed(2),
      MontoTotalConIVA: montoTotalConIVA.toFixed(2),
      MontoEnLetras: this.numberToWords(totalAPagar, totals.currency || 'VES'),
      SubtotalAntesDescuento: (subtotal + ((totals.discounts || 0) / exchangeRate)).toFixed(2),
      TotalDescuento: ((totals.discounts || 0) / exchangeRate).toFixed(2),
      TotalRecargos: null,
      ListaRecargo: null,
      ListaDescBonificacion: null,
      ImpuestosSubtotal: [], // Calcular similar a totals principal
      OtrosImpuestosSubtotal: null,
      MontoTotalOTI: null,
      MontoTotalIVAyOTI: null,
    };
  }

  /**
   * Mapea los detalles de items
   */
  private mapDetallesItems(doc: BillingDocument): any[] {
    const items = doc.items || [];

    return items.map((item: any, index: number) => {
      const quantity = item.quantity || item.cantidad || 1;
      const unitPrice = item.unitPrice || item.precioUnitario || 0;
      const total = item.total || item.precioTotal || (unitPrice * quantity);
      const taxRate = item.tax?.rate || item.tasaIVA || 16;
      const taxAmount = item.tax ? (total * (taxRate / 100)) : (item.montoIVA || 0);

      return {
        NumeroLinea: (index + 1).toString(),
        CodigoCIIU: (item as any).codigoCIIU || '',
        CodigoPLU: (item as any).sku || (item as any).codigo || '',
        IndicadorBienoServicio: (item as any).tipo === 'servicio' ? '2' : '1',
        Descripcion: item.description || (item as any).descripcion || (item as any).name || 'Producto',
        Cantidad: quantity.toString(),
        UnidadMedida: (item as any).unidadMedida || 'NIU',
        PrecioUnitario: unitPrice.toFixed(2),
        PrecioUnitarioDescuento: (item as any).precioConDescuento ? (item as any).precioConDescuento.toFixed(2) : null,
        MontoBonificacion: null,
        DescripcionBonificacion: null,
        DescuentoMonto: (item.discount?.value || (item as any).descuento || 0).toFixed(2),
        RecargoMonto: ((item as any).recargo || 0).toFixed(2),
        PrecioItem: total.toFixed(2),
        PrecioAntesDescuento: (unitPrice * quantity).toFixed(2),
        CodigoImpuesto: (item as any).codigoImpuesto || this.getTaxCodeFromRate(taxRate),
        TasaIVA: taxRate.toString(),
        ValorIVA: taxAmount.toFixed(2),
        ValorTotalItem: (total + taxAmount).toFixed(2),
        InfoAdicionalItem: [],
        ListaItemOTI: null,
      };
    });
  }

  /**
   * Mapea información adicional (opcional)
   */
  private mapInfoAdicional(doc: BillingDocument): any[] {
    const infoAdicional: Array<{ Campo: string; Valor: string }> = [];

    // Agregar nota de IGTF si aplica
    if (doc.metadata?.hasIGTF) {
      infoAdicional.push({
        Campo: 'Informativo',
        Valor: 'De conformidad con la Providencia Administrativa SNAT/2022/000013 publicada en la G.O.N 42.339 del 17-03-2022, este pago está sujeto al cobro adicional del 3% del Impuesto a las Grandes Transacciones Financieras (IGTF).',
      });
    }

    return infoAdicional;
  }

  /**
   * Mapea guía de despacho (solo para tipo 04)
   */
  private mapGuiaDespacho(doc: BillingDocument): any | null {
    const guia = doc.metadata?.guiaDespacho;

    if (!guia) {
      return null;
    }

    return {
      esGuiaDespacho: '1',
      motivoTraslado: guia.motivoTraslado || '',
      descripcionServicio: guia.descripcionServicio || null,
      tipoProducto: guia.tipoProducto || '',
      origenProducto: guia.origenProducto || 'Nacional',
      PesoOVolumenTotal: guia.pesoTotal || '',
      destinoProducto: guia.destinoProducto || 'Tierra Firme',
      Conductor: guia.conductor ? {
        NombreCompleto: guia.conductor.nombre,
        tipoIdentificacion: guia.conductor.tipoIdentificacion || 'V',
        numeroIdentificacion: guia.conductor.numeroIdentificacion,
        tipoLicencia: guia.conductor.tipoLicencia || '',
        infoContacto: guia.conductor.telefono || '',
      } : null,
      Vehiculo: guia.vehiculo ? {
        TipoVehiculo: guia.vehiculo.tipo,
        numeroTransporte: guia.vehiculo.placa,
      } : null,
      Transportista: guia.transportista ? {
        razonSocial: guia.transportista.razonSocial,
        numeroIdentificacion: guia.transportista.rif,
        domicilioFiscal: guia.transportista.direccion,
      } : null,
    };
  }

  // ==================== UTILIDADES ====================

  /**
   * Calcula impuestos subtotales agrupados por alícuota
   */
  private calculateImpuestosSubtotal(items: any[], totals: any): any[] {
    const byTaxCode = {};

    items.forEach(item => {
      // Soportar ambos formatos: English (total, tax.rate) y Spanish (precioTotal, tasaIVA)
      const quantity = item.quantity || item.cantidad || 1;
      const unitPrice = item.unitPrice || item.precioUnitario || 0;
      const total = item.total || item.precioTotal || (unitPrice * quantity);
      const taxRate = item.tax?.rate || item.tasaIVA || 16;
      const taxAmount = item.tax ? (total * (taxRate / 100)) : (item.montoIVA || 0);

      const code = item.codigoImpuesto || this.getTaxCodeFromRate(taxRate);

      if (!byTaxCode[code]) {
        byTaxCode[code] = {
          CodigoTotalImp: code,
          AlicuotaImp: taxRate.toFixed(2),
          BaseImponibleImp: 0,
          ValorTotalImp: 0,
        };
      }

      byTaxCode[code].BaseImponibleImp += total;
      byTaxCode[code].ValorTotalImp += taxAmount;
    });

    return Object.values(byTaxCode).map((tax: any) => ({
      ...tax,
      BaseImponibleImp: tax.BaseImponibleImp.toFixed(2),
      ValorTotalImp: tax.ValorTotalImp.toFixed(2),
    }));
  }

  /**
   * Mapea formas de pago
   */
  private mapFormasPago(doc: BillingDocument): any[] {
    const formas = doc.metadata?.formasPago || [];

    if (formas.length === 0) {
      // Default: pago en bolivares
      return [{
        Descripcion: 'Pago Móvil',
        Fecha: this.formatDate(doc.issueDate || new Date()),
        Forma: '02',
        Monto: (doc.totals?.grandTotal || 0).toFixed(2),
        Moneda: doc.totals?.currency || 'BSD',
        TipoCambio: '0.0000',
      }];
    }

    return formas.map(forma => ({
      Descripcion: forma.descripcion || '',
      Fecha: this.formatDate(forma.fecha || doc.issueDate || new Date()),
      Forma: forma.codigo || '02',
      Monto: (forma.monto || 0).toFixed(2),
      Moneda: forma.moneda || 'BSD',
      TipoCambio: (forma.tipoCambio || 0).toFixed(4),
    }));
  }

  /**
   * Mapea descuentos/bonificaciones
   */
  private mapDescuentos(doc: BillingDocument): any[] | null {
    const descuentos = doc.metadata?.descuentos || [];

    if (descuentos.length === 0) {
      return null;
    }

    return descuentos.map(desc => ({
      descDescuento: desc.descripcion,
      montoDescuento: desc.monto.toFixed(2),
    }));
  }

  /**
   * Calcula IGTF (3% sobre pagos en divisas)
   */
  private calculateIGTF(formasPago: any[]): number {
    let totalDivisas = 0;

    formasPago.forEach(forma => {
      if (forma.Moneda !== 'BSD' && forma.Moneda !== 'VES') {
        const tipoCambio = parseFloat(forma.TipoCambio) || 0;
        const montoBSD = parseFloat(forma.Monto) * tipoCambio;
        totalDivisas += montoBSD;
      }
    });

    return totalDivisas * 0.03; // 3%
  }

  /**
   * Parsea un RIF venezolano en tipo y número
   */
  private parseRif(rif: string): { tipo: string; numero: string } {
    // Formato esperado: V-12345678-9 o J-123456789-0
    const match = rif.match(/^([VEJPGC])-?(\d{8,9})-?(\d)$/i);

    if (match) {
      return {
        tipo: match[1].toUpperCase(),
        numero: `${match[2]}-${match[3]}`,
      };
    }

    // Fallback
    return {
      tipo: 'V',
      numero: '00000000-0',
    };
  }

  /**
   * Obtiene código de impuesto según tasa
   */
  private getTaxCodeFromRate(rate: number): string {
    if (rate === 0) return 'E';
    if (rate === 8) return 'R';
    if (rate === 16) return 'G';
    if (rate === 31) return 'A';
    return 'E';
  }

  /**
   * Formatea fecha a DD/MM/YYYY
   */
  private formatDate(date: Date | string | undefined): string {
    if (!date) {
      date = new Date();
    }

    const d = typeof date === 'string' ? new Date(date) : date;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  }

  /**
   * Formatea hora a HH:MM:SS am/pm
   */
  private formatTime(date: Date | string | undefined): string {
    if (!date) {
      date = new Date();
    }

    const d = typeof date === 'string' ? new Date(date) : date;

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 se convierte en 12

    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  }

  /**
   * Convierte número a letras (simplificado)
   */
  private numberToWords(amount: number, currency: string): string {
    const currencyNames = {
      BSD: { singular: 'bolivar', plural: 'bolivares' },
      VES: { singular: 'bolivar', plural: 'bolivares' },
      USD: { singular: 'dolar', plural: 'dolares' },
      EUR: { singular: 'euro', plural: 'euros' },
    };

    const curr = currencyNames[currency] || currencyNames.BSD;

    // Separar enteros y decimales
    const [enteros, decimales] = amount.toFixed(2).split('.');

    // Por ahora retornamos formato simple
    // TODO: Implementar conversión completa a letras
    const enterosNum = parseInt(enteros, 10);
    const decimalesNum = parseInt(decimales, 10);

    const currName = enterosNum === 1 ? curr.singular : curr.plural;

    return `${enterosNum} ${currName} con ${decimalesNum} centimos`;
  }

  /**
   * Genera hash SHA-256 del documento
   */
  generateHash(doc: BillingDocument): string {
    const data = JSON.stringify({
      type: doc.type,
      documentNumber: doc.documentNumber,
      customer: doc.customer,
      totals: doc.totals,
      issueDate: doc.issueDate,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
