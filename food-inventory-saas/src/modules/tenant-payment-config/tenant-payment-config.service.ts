import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  TenantPaymentConfig,
  TenantPaymentConfigDocument,
  PaymentMethodConfig,
} from "../../schemas/tenant-payment-config.schema";

@Injectable()
export class TenantPaymentConfigService {
  private readonly logger = new Logger(TenantPaymentConfigService.name);

  constructor(
    @InjectModel(TenantPaymentConfig.name)
    private tenantPaymentConfigModel: Model<TenantPaymentConfigDocument>,
  ) {}

  /**
   * Get payment configuration for a tenant
   */
  async getPaymentConfig(tenantId: string): Promise<TenantPaymentConfig> {
    const config = await this.tenantPaymentConfigModel.findOne({ tenantId });

    if (!config) {
      // Return default configuration if not found
      return this.createDefaultConfig(tenantId);
    }

    return config;
  }

  /**
   * Upsert (create or update) payment configuration for a tenant
   */
  async upsertPaymentConfig(
    tenantId: string,
    data: Partial<TenantPaymentConfig>,
    userId?: string,
  ): Promise<TenantPaymentConfig> {
    const config = await this.tenantPaymentConfigModel.findOneAndUpdate(
      { tenantId },
      {
        ...data,
        tenantId,
        updatedBy: userId ? new Types.ObjectId(userId) : undefined,
      },
      { new: true, upsert: true },
    );

    this.logger.log(`Payment config updated for tenant ${tenantId}`);
    return config;
  }

  /**
   * Add or update a payment method
   */
  async upsertPaymentMethod(
    tenantId: string,
    methodData: PaymentMethodConfig,
    userId?: string,
  ): Promise<TenantPaymentConfig> {
    const existingConfig = await this.tenantPaymentConfigModel.findOne({ tenantId });

    const config = existingConfig || await this.createDefaultConfig(tenantId);

    // Find existing method by methodId
    const existingIndex = config.paymentMethods.findIndex(
      (m) => m.methodId === methodData.methodId,
    );

    if (existingIndex >= 0) {
      // Update existing method
      config.paymentMethods[existingIndex] = {
        ...config.paymentMethods[existingIndex],
        ...methodData,
      };
    } else {
      // Add new method
      config.paymentMethods.push(methodData);
    }

    if (userId) {
      config.updatedBy = new Types.ObjectId(userId);
    }

    const savedConfig = await config.save();

    this.logger.log(
      `Payment method ${methodData.methodId} updated for tenant ${tenantId}`,
    );
    return savedConfig.toObject();
  }

  /**
   * Remove a payment method
   */
  async removePaymentMethod(
    tenantId: string,
    methodId: string,
    userId?: string,
  ): Promise<TenantPaymentConfig> {
    const config = await this.tenantPaymentConfigModel.findOne({ tenantId });

    if (!config) {
      throw new NotFoundException("Payment configuration not found");
    }

    config.paymentMethods = config.paymentMethods.filter(
      (m) => m.methodId !== methodId,
    );

    if (userId) {
      config.updatedBy = new Types.ObjectId(userId);
    }

    await config.save();

    this.logger.log(`Payment method ${methodId} removed for tenant ${tenantId}`);
    return config;
  }

  /**
   * Get active payment methods for public use (storefront)
   */
  async getActivePaymentMethods(
    tenantId: string,
  ): Promise<PaymentMethodConfig[]> {
    const config = await this.getPaymentConfig(tenantId);

    return config.paymentMethods
      .filter((m) => m.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Create default payment configuration
   */
  private async createDefaultConfig(
    tenantId: string,
  ): Promise<TenantPaymentConfigDocument> {
    const defaultMethods: PaymentMethodConfig[] = [
      {
        methodId: "efectivo_usd",
        name: "Efectivo (USD)",
        isActive: true,
        igtfApplicable: true,
        currency: "USD",
        displayOrder: 1,
      },
      {
        methodId: "transferencia_usd",
        name: "Transferencia (USD)",
        isActive: true,
        igtfApplicable: true,
        currency: "USD",
        displayOrder: 2,
      },
      {
        methodId: "zelle_usd",
        name: "Zelle (USD)",
        isActive: true,
        igtfApplicable: true,
        currency: "USD",
        displayOrder: 3,
      },
      {
        methodId: "efectivo_ves",
        name: "Efectivo (VES)",
        isActive: true,
        igtfApplicable: false,
        currency: "VES",
        displayOrder: 4,
      },
      {
        methodId: "transferencia_ves",
        name: "Transferencia (VES)",
        isActive: true,
        igtfApplicable: false,
        currency: "VES",
        displayOrder: 5,
      },
      {
        methodId: "pago_movil_ves",
        name: "Pago Móvil (VES)",
        isActive: true,
        igtfApplicable: false,
        currency: "VES",
        displayOrder: 6,
      },
    ];

    const config = new this.tenantPaymentConfigModel({
      tenantId,
      paymentMethods: defaultMethods,
      acceptCash: true,
      acceptCards: true,
      acceptTransfers: true,
      requirePaymentConfirmation: true,
    });

    return config.save();
  }
}
