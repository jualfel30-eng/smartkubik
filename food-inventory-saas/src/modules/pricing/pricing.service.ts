import { Injectable, Logger } from '@nestjs/common';
import { OrderCalculationDto } from '../../dto/order.dto';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  async calculateOrder(calculationDto: OrderCalculationDto, tenant: any) {
    this.logger.log('Calculating order prices with Venezuelan taxes');

    const { items, paymentMethod, discountAmount = 0, shippingCost = 0 } = calculationDto;

    // Configuración de impuestos desde el tenant
    const ivaRate = tenant.settings?.taxes?.ivaRate || 0.16;
    const igtfRate = tenant.settings?.taxes?.igtfRate || 0.03;

    let subtotal = 0;
    const itemsWithTaxes: any[] = [];

    // Calcular cada item
    for (const item of items) {
      const itemTotal = item.quantity * item.unitPrice;
      const itemIva = itemTotal * ivaRate;
      
      // IGTF solo aplica para pagos en divisas o tarjetas (simplificado)
      const applyIgtf = paymentMethod && ['card', 'usd_cash', 'usd_transfer'].includes(paymentMethod);
      const itemIgtf = applyIgtf ? itemTotal * igtfRate : 0;

      // Ajustes por método de pago (descuentos/recargos)
      let adjustmentRate = 0;
      if (paymentMethod === 'cash') {
        adjustmentRate = -0.05; // 5% descuento por efectivo
      } else if (paymentMethod === 'card') {
        adjustmentRate = 0.03; // 3% recargo por tarjeta
      }

      const adjustment = itemTotal * adjustmentRate;
      const finalItemPrice = itemTotal + itemIva + itemIgtf + adjustment;

      itemsWithTaxes.push({
        ...item,
        subtotal: itemTotal,
        ivaAmount: itemIva,
        igtfAmount: itemIgtf,
        adjustment,
        finalPrice: finalItemPrice,
      });

      subtotal += itemTotal;
    }

    // Totales generales
    const totalIva = itemsWithTaxes.reduce((sum, item) => sum + item.ivaAmount, 0);
    const totalIgtf = itemsWithTaxes.reduce((sum, item) => sum + item.igtfAmount, 0);
    const totalAdjustments = itemsWithTaxes.reduce((sum, item) => sum + item.adjustment, 0);

    const totalBeforeDiscount = subtotal + totalIva + totalIgtf + totalAdjustments + shippingCost;
    const finalTotal = totalBeforeDiscount - discountAmount;

    // Conversión a USD (tasa fija para demo)
    const usdRate = 36.50; // VES por USD
    const totalUSD = finalTotal / usdRate;

    return {
      items: itemsWithTaxes,
      summary: {
        subtotal,
        totalIva,
        totalIgtf,
        totalAdjustments,
        shippingCost,
        discountAmount,
        totalVES: finalTotal,
        totalUSD,
        exchangeRate: usdRate,
      },
      taxes: {
        ivaRate: ivaRate * 100, // Convertir a porcentaje
        igtfRate: igtfRate * 100,
        igtfApplied: itemsWithTaxes.some(item => item.igtfAmount > 0),
      },
      paymentMethod: {
        method: paymentMethod,
        adjustmentRate: paymentMethod === 'cash' ? -5 : paymentMethod === 'card' ? 3 : 0,
      },
    };
  }

  async getExchangeRate(): Promise<number> {
    // En producción, esto consultaría una API externa
    // Por ahora retornamos una tasa fija
    return 36.50;
  }

  calculateMargin(costPrice: number, sellingPrice: number): number {
    if (costPrice === 0) return 0;
    return ((sellingPrice - costPrice) / sellingPrice) * 100;
  }

  applyPricingRules(basePrice: number, rules: any): number {
    let finalPrice = basePrice;

    // Aplicar margen mínimo
    if (rules.minimumMargin) {
      const minPrice = basePrice / (1 - rules.minimumMargin);
      finalPrice = Math.max(finalPrice, minPrice);
    }

    // Aplicar descuento máximo
    if (rules.maximumDiscount) {
      const maxDiscountPrice = basePrice * (1 - rules.maximumDiscount);
      finalPrice = Math.max(finalPrice, maxDiscountPrice);
    }

    return finalPrice;
  }
}

