
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { ChartOfAccounts, ChartOfAccountsDocument } from '../../schemas/chart-of-accounts.schema';

@Injectable()
export class SeedingService {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    @InjectModel(ChartOfAccounts.name) private chartOfAccountsModel: Model<ChartOfAccountsDocument>,
  ) {}

  async seedChartOfAccounts(tenantId: string, session?: ClientSession) {
    this.logger.log(`Iniciando seeding del plan de cuentas para el tenant: ${tenantId}`);

    const accountsToCreate = [
        { code: '1101', name: 'Efectivo y Equivalentes', type: 'Activo', isSystemAccount: true },
        { code: '1102', name: 'Cuentas por Cobrar', type: 'Activo', isSystemAccount: true },
        { code: '1103', name: 'Inventario', type: 'Activo', isSystemAccount: true },
        { code: '2101', name: 'Cuentas por Pagar', type: 'Pasivo', isSystemAccount: true },
        { code: '2102', name: 'Impuestos por Pagar', type: 'Pasivo', isSystemAccount: true },
        { code: '3101', name: 'Capital Social', type: 'Patrimonio', isSystemAccount: true },
        { code: '3102', name: 'Resultados Acumulados', type: 'Patrimonio', isSystemAccount: true },
        { code: '4101', name: 'Ingresos por Ventas', type: 'Ingreso', isSystemAccount: true },
        { code: '4102', name: 'Devoluciones en Ventas', type: 'Ingreso', isSystemAccount: true },
        { code: '5101', name: 'Costo de Mercancía Vendida', type: 'Gasto', isSystemAccount: true },
        { code: '5201', name: 'Gastos de Sueldos y Salarios', type: 'Gasto', isSystemAccount: false },
        { code: '5202', name: 'Gasto de Alquiler', type: 'Gasto', isSystemAccount: false },
        { code: '5203', name: 'Imprevistos', type: 'Gasto', isSystemAccount: false },
        { code: '5204', name: 'Inversión', type: 'Gasto', isSystemAccount: false },
    ];

    try {
      for (const acc of accountsToCreate) {
        const account = new this.chartOfAccountsModel({
          ...acc,
          tenantId: tenantId,
          isEditable: !acc.isSystemAccount,
        });
        if (session) {
          await account.save({ session });
        } else {
          await account.save();
        }
      }
      this.logger.log(`Plan de cuentas creado exitosamente para el tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Error durante el seeding del plan de cuentas para el tenant: ${tenantId}`, error.stack);
      throw error;
    }
  }

  async seedCustomChartOfAccounts(tenantId: string, accountsToCreate: any[]) {
    this.logger.log(`Iniciando seeding de plan de cuentas personalizado para el tenant: ${tenantId}`);

    try {
      for (const acc of accountsToCreate) {
        await this.chartOfAccountsModel.create({
          ...acc,
          tenantId: tenantId,
          isEditable: !acc.isSystemAccount,
        });
      }
      this.logger.log(`Plan de cuentas personalizado creado exitosamente para el tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Error durante el seeding del plan de cuentas personalizado para el tenant: ${tenantId}`, error.stack);
    }
  }
}
