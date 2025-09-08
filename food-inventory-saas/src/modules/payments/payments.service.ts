import { Injectable, Logger } from '@nestjs/common';
import { AddOrderPaymentDto, ConfirmOrderPaymentDto } from '../../dto/order.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  async addPayment(addPaymentDto: AddOrderPaymentDto, user: any) {
    this.logger.log(`Adding payment to order: ${addPaymentDto.orderId}`);

    // En una implementación real, aquí se actualizaría la orden en la base de datos
    // Por ahora retornamos una respuesta simulada

    return {
      orderId: addPaymentDto.orderId,
      payment: {
        ...addPaymentDto.payment,
        status: 'pending',
        addedAt: new Date(),
        addedBy: user.id,
      },
    };
  }

  async confirmPayment(confirmPaymentDto: ConfirmOrderPaymentDto, user: any) {
    this.logger.log(`Confirming payment for order: ${confirmPaymentDto.orderId}`);

    // En una implementación real, aquí se actualizaría el estado del pago
    return {
      orderId: confirmPaymentDto.orderId,
      paymentIndex: confirmPaymentDto.paymentIndex,
      status: 'confirmed',
      confirmedAt: confirmPaymentDto.confirmedAt || new Date(),
      confirmedBy: user.id,
    };
  }

  async getPaymentMethods(tenant: any) {
    // Métodos de pago específicos para Venezuela
    const methods = [
      {
        id: 'cash',
        name: 'Efectivo VES',
        currency: 'VES',
        description: 'Pago en efectivo en bolívares',
        discount: 5, // 5% descuento
        available: true,
      },
      {
        id: 'card',
        name: 'Tarjeta de Débito/Crédito',
        currency: 'VES',
        description: 'Pago con tarjeta bancaria venezolana',
        surcharge: 3, // 3% recargo
        igtfApplicable: true,
        available: true,
      },
      {
        id: 'transfer',
        name: 'Transferencia Bancaria',
        currency: 'VES',
        description: 'Transferencia en bolívares',
        available: true,
      },
      {
        id: 'usd_cash',
        name: 'Efectivo USD',
        currency: 'USD',
        description: 'Pago en efectivo en dólares',
        igtfApplicable: true,
        available: true,
      },
      {
        id: 'usd_transfer',
        name: 'Transferencia USD',
        currency: 'USD',
        description: 'Transferencia en dólares',
        igtfApplicable: true,
        available: true,
      },
      {
        id: 'mixed',
        name: 'Pago Mixto',
        currency: 'MIXED',
        description: 'Combinación de métodos de pago',
        available: true,
      },
    ];

    return {
      methods,
      exchangeRate: 36.50, // Tasa de cambio actual
      taxes: {
        iva: tenant.settings?.taxes?.ivaRate || 0.16,
        igtf: tenant.settings?.taxes?.igtfRate || 0.03,
      },
    };
  }

  calculatePaymentTotals(amount: number, method: string, tenant: any) {
    const ivaRate = tenant.settings?.taxes?.ivaRate || 0.16;
    const igtfRate = tenant.settings?.taxes?.igtfRate || 0.03;

    let finalAmount = amount;
    let igtfAmount = 0;
    let adjustment = 0;

    // Aplicar IGTF si corresponde
    if (['card', 'usd_cash', 'usd_transfer'].includes(method)) {
      igtfAmount = amount * igtfRate;
      finalAmount += igtfAmount;
    }

    // Aplicar ajustes por método de pago
    if (method === 'cash') {
      adjustment = amount * -0.05; // 5% descuento
    } else if (method === 'card') {
      adjustment = amount * 0.03; // 3% recargo
    }

    finalAmount += adjustment;

    return {
      baseAmount: amount,
      igtfAmount,
      adjustment,
      finalAmount,
      method,
    };
  }
}

