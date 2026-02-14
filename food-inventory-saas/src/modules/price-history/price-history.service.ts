import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PriceHistory, PriceHistoryDocument } from '../../schemas/price-history.schema';

@Injectable()
export class PriceHistoryService {
  private readonly logger = new Logger(PriceHistoryService.name);

  constructor(
    @InjectModel(PriceHistory.name)
    private priceHistoryModel: Model<PriceHistoryDocument>,
  ) {}

  /**
   * Registra un cambio de precio en el historial
   */
  async recordPriceChange(data: {
    productId: string;
    productSku: string;
    productName: string;
    variantSku: string;
    variantName: string;
    tenantId: string;
    field: 'basePrice' | 'costPrice' | 'wholesalePrice';
    oldValue: number;
    newValue: number;
    costPrice: number; // Para calcular márgenes
    pricingStrategy?: any;
    changedBy: string;
    changedByName: string;
    reason?: string;
    changeSource: 'manual' | 'auto_strategy' | 'bulk_import' | 'api';
  }): Promise<PriceHistoryDocument> {
    try {
      const changePercentage =
        data.oldValue > 0 ? ((data.newValue - data.oldValue) / data.oldValue) * 100 : 0;

      // Calcular márgenes antes y después (solo si es cambio de basePrice)
      let marginMetrics: { oldMargin: number; newMargin: number; marginDelta: number } | undefined = undefined;
      if (data.field === 'basePrice') {
        const oldMargin =
          data.oldValue > 0 ? ((data.oldValue - data.costPrice) / data.oldValue) * 100 : 0;
        const newMargin =
          data.newValue > 0 ? ((data.newValue - data.costPrice) / data.newValue) * 100 : 0;
        marginMetrics = {
          oldMargin: Math.round(oldMargin * 10) / 10,
          newMargin: Math.round(newMargin * 10) / 10,
          marginDelta: Math.round((newMargin - oldMargin) * 10) / 10,
        };
      }

      const historyEntry = new this.priceHistoryModel({
        productId: new Types.ObjectId(data.productId),
        productSku: data.productSku,
        productName: data.productName,
        variantSku: data.variantSku,
        variantName: data.variantName,
        tenantId: new Types.ObjectId(data.tenantId),
        field: data.field,
        oldValue: data.oldValue,
        newValue: data.newValue,
        changePercentage: Math.round(changePercentage * 10) / 10,
        pricingStrategy: data.pricingStrategy,
        marginMetrics,
        changedBy: new Types.ObjectId(data.changedBy),
        changedByName: data.changedByName,
        reason: data.reason,
        changeSource: data.changeSource,
      });

      const saved = await historyEntry.save();
      this.logger.log(
        `Price change recorded: ${data.productSku} - ${data.field}: ${data.oldValue} → ${data.newValue}`,
      );

      return saved;
    } catch (error) {
      this.logger.error(`Error recording price change: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene historial de precios de un producto
   */
  async getProductPriceHistory(
    productId: string,
    tenantId: string,
    limit: number = 50,
  ): Promise<PriceHistoryDocument[]> {
    return this.priceHistoryModel
      .find({
        productId: new Types.ObjectId(productId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Obtiene cambios recientes de precio en el tenant
   */
  async getRecentPriceChanges(
    tenantId: string,
    days: number = 30,
    limit: number = 100,
  ): Promise<PriceHistoryDocument[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.priceHistoryModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        createdAt: { $gte: startDate },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Obtiene historial de un campo específico de precio
   */
  async getPriceHistoryByField(
    tenantId: string,
    field: 'basePrice' | 'costPrice' | 'wholesalePrice',
    days: number = 30,
  ): Promise<PriceHistoryDocument[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.priceHistoryModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        field,
        createdAt: { $gte: startDate },
      })
      .sort({ createdAt: -1 })
      .lean();
  }
}
