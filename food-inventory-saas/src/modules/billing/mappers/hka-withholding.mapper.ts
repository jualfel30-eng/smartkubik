import { Injectable, Logger } from '@nestjs/common';
import { WithholdingDocument } from '../../../schemas/withholding-document.schema';

/**
 * Mapper para convertir WithholdingDocument al formato JSON de HKA Factory
 *
 * Soporta:
 * - Tipo 05: Comprobante de Retención IVA
 * - Tipo 06: Comprobante de Retención ISLR
 * - Tipo 07: Comprobante de Retenciones Varias (ARCV)
 */
@Injectable()
export class HkaWithholdingMapper {
  private readonly logger = new Logger(HkaWithholdingMapper.name);

  /**
   * Convierte una retención al formato HKA Factory
   */
  toHkaJson(retention: WithholdingDocument): any {
    if (retention.type === 'iva') {
      return this.toRetencionIvaJson(retention);
    } else if (retention.type === 'islr') {
      return this.toRetencionIslrJson(retention);
    } else if (retention.type === 'arcv') {
      return this.toRetencionArcvJson(retention);
    } else {
      throw new Error(`Tipo de retención no soportado: ${retention.type}`);
    }
  }

  /**
   * Convierte a formato de Retención IVA (tipo 05)
   *
   * Estructura según HKA Factory API para tipo 05
   */
  private toRetencionIvaJson(retention: WithholdingDocument): any {
    const now = new Date(retention.issueDate || new Date());

    return {
      documentoElectronico: {
        Encabezado: {
          IdentificacionDocumento: {
            TipoDocumento: '05', // Retención IVA
            NumeroDocumento: retention.documentNumber,
            FechaEmision: this.formatDate(now),
            HoraEmision: this.formatTime(now),
            Serie: retention.metadata?.series || '',
            Sucursal: '',
            PeriodoImpositivoDesde: retention.taxInfo?.period
              ? `01/${retention.taxInfo.period.split('-').reverse().join('/')}`
              : this.formatDate(retention.operationDate),
            PeriodoImpositivoHasta: retention.taxInfo?.period
              ? this.getLastDayOfMonth(retention.taxInfo.period)
              : this.formatDate(retention.operationDate),
          },

          // Proveedor = Quien emite la retención (el comprador)
          Proveedor: {
            TipoIdentificacion: this.getTaxIdType(retention.issuer.taxId),
            NumeroIdentificacion: this.cleanTaxId(retention.issuer.taxId),
            RazonSocial: retention.issuer.name,
            Direccion: retention.issuer.address || 'Sin dirección',
            Pais: 'VE',
            Telefono: retention.issuer.phone ? [retention.issuer.phone] : [],
            Correo: retention.issuer.email ? [retention.issuer.email] : [],
          },

          // Beneficiario = A quien se le retiene (el vendedor)
          Beneficiario: {
            TipoIdentificacion: this.getTaxIdType(retention.beneficiary.taxId),
            NumeroIdentificacion: this.cleanTaxId(retention.beneficiary.taxId),
            RazonSocial: retention.beneficiary.name,
            Direccion: retention.beneficiary.address || 'Sin dirección',
            Pais: 'VE',
            Telefono: retention.beneficiary.phone ? [retention.beneficiary.phone] : [],
            Correo: retention.beneficiary.email ? [retention.beneficiary.email] : [],
          },

          // Datos de la factura afectada
          DocumentoAfectado: {
            TipoDocumento: '01', // Siempre factura
            NumeroDocumento: retention.affectedDocument.documentNumber,
            NumeroControl: retention.affectedDocument.controlNumber || '',
            FechaEmision: this.formatDate(retention.affectedDocument.issueDate),
            MontoTotal: retention.affectedDocument.totalAmount.toFixed(2),
          },

          // Totales de la retención
          Totales: {
            MontoBaseImponible: retention.ivaRetention!.baseAmount.toFixed(2),
            MontoImpuesto: retention.ivaRetention!.taxAmount.toFixed(2),
            PorcentajeRetencion: retention.ivaRetention!.retentionPercentage.toString(),
            MontoRetenido: retention.ivaRetention!.retentionAmount.toFixed(2),
            Moneda: retention.totals.currency || 'BSD',
          },
        },

        // Detalles de la retención
        DetallesRetencion: [
          {
            NumeroLinea: '1',
            CodigoImpuesto: retention.ivaRetention!.taxCode || 'G',
            BaseImponible: retention.ivaRetention!.baseAmount.toFixed(2),
            AlicuotaIVA: retention.ivaRetention!.taxRate.toString(),
            MontoIVA: retention.ivaRetention!.taxAmount.toFixed(2),
            PorcentajeRetencion: retention.ivaRetention!.retentionPercentage.toString(),
            MontoRetenido: retention.ivaRetention!.retentionAmount.toFixed(2),
          },
        ],

        // Información adicional
        InfoAdicional: this.mapInfoAdicional(retention),
      },
    };
  }

  /**
   * Convierte a formato de Retención ISLR (tipo 06)
   */
  private toRetencionIslrJson(retention: WithholdingDocument): any {
    const now = new Date(retention.issueDate || new Date());

    return {
      documentoElectronico: {
        Encabezado: {
          IdentificacionDocumento: {
            TipoDocumento: '06', // Retención ISLR
            NumeroDocumento: retention.documentNumber,
            FechaEmision: this.formatDate(now),
            HoraEmision: this.formatTime(now),
            Serie: retention.metadata?.series || '',
            Sucursal: '',
            PeriodoImpositivoDesde: this.formatDate(retention.operationDate),
            PeriodoImpositivoHasta: this.formatDate(retention.operationDate),
          },

          Proveedor: {
            TipoIdentificacion: this.getTaxIdType(retention.issuer.taxId),
            NumeroIdentificacion: this.cleanTaxId(retention.issuer.taxId),
            RazonSocial: retention.issuer.name,
            Direccion: retention.issuer.address || 'Sin dirección',
            Pais: 'VE',
            Telefono: retention.issuer.phone ? [retention.issuer.phone] : [],
            Correo: retention.issuer.email ? [retention.issuer.email] : [],
          },

          Beneficiario: {
            TipoIdentificacion: this.getTaxIdType(retention.beneficiary.taxId),
            NumeroIdentificacion: this.cleanTaxId(retention.beneficiary.taxId),
            RazonSocial: retention.beneficiary.name,
            Direccion: retention.beneficiary.address || 'Sin dirección',
            Pais: 'VE',
            Telefono: retention.beneficiary.phone ? [retention.beneficiary.phone] : [],
            Correo: retention.beneficiary.email ? [retention.beneficiary.email] : [],
          },

          DocumentoAfectado: {
            TipoDocumento: '01',
            NumeroDocumento: retention.affectedDocument.documentNumber,
            NumeroControl: retention.affectedDocument.controlNumber || '',
            FechaEmision: this.formatDate(retention.affectedDocument.issueDate),
            MontoTotal: retention.affectedDocument.totalAmount.toFixed(2),
          },

          Totales: {
            MontoBaseImponible: retention.islrRetention!.baseAmount.toFixed(2),
            PorcentajeRetencion: retention.islrRetention!.retentionPercentage.toString(),
            MontoRetenido: retention.islrRetention!.retentionAmount.toFixed(2),
            Sustraendo: retention.islrRetention!.sustraendo?.toFixed(2) || '0.00',
            Moneda: retention.totals.currency || 'BSD',
          },
        },

        DetallesRetencion: [
          {
            NumeroLinea: '1',
            CodigoConcepto: retention.islrRetention!.conceptCode,
            DescripcionConcepto: retention.islrRetention!.conceptDescription,
            BaseImponible: retention.islrRetention!.baseAmount.toFixed(2),
            PorcentajeRetencion: retention.islrRetention!.retentionPercentage.toString(),
            Sustraendo: retention.islrRetention!.sustraendo?.toFixed(2) || '0.00',
            MontoRetenido: retention.islrRetention!.retentionAmount.toFixed(2),
          },
        ],

        InfoAdicional: this.mapInfoAdicional(retention),
      },
    };
  }

  /**
   * Convierte a formato de Retención Varia (tipo 07 - ARCV)
   *
   * Incluye nodos adicionales requeridos por HKA:
   * - fechaCierreEjercicio: Fecha de cierre del ejercicio fiscal
   * - periodoRetencion: Período de la retención (YYYY-MM)
   */
  private toRetencionArcvJson(retention: WithholdingDocument): any {
    const now = new Date(retention.issueDate || new Date());

    return {
      documentoElectronico: {
        Encabezado: {
          IdentificacionDocumento: {
            TipoDocumento: '07', // Retención Varia (ARCV)
            NumeroDocumento: retention.documentNumber,
            FechaEmision: this.formatDate(now),
            HoraEmision: this.formatTime(now),
            Serie: retention.metadata?.series || '',
            Sucursal: '',
            PeriodoImpositivoDesde: retention.arcvRetention?.period
              ? `01/${retention.arcvRetention.period.split('-').reverse().join('/')}`
              : this.formatDate(retention.operationDate),
            PeriodoImpositivoHasta: retention.arcvRetention?.period
              ? this.getLastDayOfMonth(retention.arcvRetention.period)
              : this.formatDate(retention.operationDate),
            FechaCierreEjercicio: retention.arcvRetention?.fiscalYearEnd
              ? this.formatDate(retention.arcvRetention.fiscalYearEnd)
              : null,
            PeriodoRetencion: retention.arcvRetention?.period || null,
          },

          Proveedor: {
            TipoIdentificacion: this.getTaxIdType(retention.issuer.taxId),
            NumeroIdentificacion: this.cleanTaxId(retention.issuer.taxId),
            RazonSocial: retention.issuer.name,
            Direccion: retention.issuer.address || 'Sin dirección',
            Pais: 'VE',
            Telefono: retention.issuer.phone ? [retention.issuer.phone] : [],
            Correo: retention.issuer.email ? [retention.issuer.email] : [],
          },

          Beneficiario: {
            TipoIdentificacion: this.getTaxIdType(retention.beneficiary.taxId),
            NumeroIdentificacion: this.cleanTaxId(retention.beneficiary.taxId),
            RazonSocial: retention.beneficiary.name,
            Direccion: retention.beneficiary.address || 'Sin dirección',
            Pais: 'VE',
            Telefono: retention.beneficiary.phone ? [retention.beneficiary.phone] : [],
            Correo: retention.beneficiary.email ? [retention.beneficiary.email] : [],
          },

          DocumentoAfectado: {
            TipoDocumento: '01',
            NumeroDocumento: retention.affectedDocument.documentNumber,
            NumeroControl: retention.affectedDocument.controlNumber || '',
            FechaEmision: this.formatDate(retention.affectedDocument.issueDate),
            MontoTotal: retention.affectedDocument.totalAmount.toFixed(2),
          },

          Totales: {
            MontoBaseImponible: retention.arcvRetention!.baseAmount.toFixed(2),
            PorcentajeRetencion: retention.arcvRetention!.retentionPercentage.toString(),
            MontoRetenido: retention.arcvRetention!.retentionAmount.toFixed(2),
            Moneda: retention.totals.currency || 'BSD',
          },
        },

        DetallesRetencion: [
          {
            NumeroLinea: '1',
            TipoRetencion: retention.arcvRetention!.retentionType,
            CodigoConcepto: retention.arcvRetention!.conceptCode || '',
            CodigoImpuesto: retention.arcvRetention!.taxCode || '',
            DescripcionConcepto: retention.arcvRetention!.conceptDescription,
            BaseImponible: retention.arcvRetention!.baseAmount.toFixed(2),
            PorcentajeRetencion: retention.arcvRetention!.retentionPercentage.toString(),
            MontoRetenido: retention.arcvRetention!.retentionAmount.toFixed(2),
          },
        ],

        InfoAdicional: this.mapInfoAdicional(retention),
      },
    };
  }

  /**
   * Mapea información adicional
   */
  private mapInfoAdicional(retention: WithholdingDocument): any[] {
    const infoAdicional: Array<{ Campo: string; Valor: string }> = [];

    if (retention.metadata?.notes) {
      infoAdicional.push({
        Campo: 'Observaciones',
        Valor: retention.metadata.notes,
      });
    }

    if (retention.taxInfo?.declarationNumber) {
      infoAdicional.push({
        Campo: 'Numero Declaracion',
        Valor: retention.taxInfo.declarationNumber,
      });
    }

    return infoAdicional;
  }

  /**
   * Formatea una fecha al formato DD/MM/YYYY
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formatea una hora al formato HH:MM:SS am/pm
   */
  private formatTime(date: Date): string {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hoursStr = String(hours).padStart(2, '0');

    return `${hoursStr}:${minutes}:${seconds} ${ampm}`;
  }

  /**
   * Extrae el tipo de identificación del RIF
   */
  private getTaxIdType(taxId: string): string {
    const match = taxId.match(/^([VEJPGC])-/);
    return match ? match[1] : 'J';
  }

  /**
   * Limpia el RIF removiendo guiones
   */
  private cleanTaxId(taxId: string): string {
    return taxId.replace(/-/g, '').replace(/^[VEJPGC]/, '');
  }

  /**
   * Obtiene el último día del mes para un período YYYY-MM
   */
  private getLastDayOfMonth(period: string): string {
    const [year, month] = period.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${String(lastDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
}
