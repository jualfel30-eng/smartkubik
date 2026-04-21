import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { WhapiService } from "../whapi/whapi.service";
import { IntelligenceService } from "./intelligence.service";

@Injectable()
export class ProactiveNotifierService {
  private readonly logger = new Logger(ProactiveNotifierService.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly whapiService: WhapiService,
    private readonly intelligenceService: IntelligenceService,
  ) {}

  /**
   * Send daily morning insights to the business owner via WhatsApp.
   */
  async sendDailyInsights(tenantId: string): Promise<void> {
    try {
      const tenant = await this.tenantModel.findById(tenantId).lean();
      if (!tenant) {
        this.logger.warn(`Tenant ${tenantId} not found for proactive insights`);
        return;
      }

      const ownerPhone = (tenant as any).aiAssistant?.ownerPhone;
      if (!ownerPhone) {
        this.logger.debug(
          `No ownerPhone configured for tenant ${tenantId}, skipping proactive insights`,
        );
        return;
      }

      const insights =
        await this.intelligenceService.generateDailyInsights(tenantId);

      const message = this.formatDailyMessage(insights);

      await this.whapiService.sendWhatsAppMessage(
        tenantId,
        ownerPhone,
        message,
      );

      this.logger.log(
        `Proactive daily insights sent to ${ownerPhone} for tenant ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send proactive insights for tenant ${tenantId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Send urgent alerts (stock critical, etc.) immediately.
   */
  async sendUrgentAlert(
    tenantId: string,
    alertMessage: string,
  ): Promise<void> {
    try {
      const tenant = await this.tenantModel.findById(tenantId).lean();
      const ownerPhone = (tenant as any)?.aiAssistant?.ownerPhone;
      if (!ownerPhone) return;

      await this.whapiService.sendWhatsAppMessage(
        tenantId,
        ownerPhone,
        `⚠️ *Alerta urgente*\n\n${alertMessage}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send urgent alert for tenant ${tenantId}: ${(error as Error).message}`,
      );
    }
  }

  private formatDailyMessage(insights: {
    salesInsights: any;
    inventoryAlerts: any;
    supplierAlerts: any;
    suggestions: string[];
  }): string {
    const lines: string[] = [];

    lines.push("Buenos dias! 🌅\n");

    // Sales
    lines.push("📊 *Resumen de ayer*:");
    lines.push(
      `- ${insights.salesInsights.ordenesAyer} ordenes / ${insights.salesInsights.ventasAyer} en ventas`,
    );

    // Inventory alerts
    if (insights.inventoryAlerts.productosStockBajo?.length > 0) {
      lines.push("\n⚠️ *Alertas de inventario*:");
      for (const item of insights.inventoryAlerts.productosStockBajo.slice(
        0,
        5,
      )) {
        lines.push(`- ${item.producto}: ${item.stock} unidades`);
      }
    }

    // Supplier alerts
    if (insights.supplierAlerts.proveedoresConRetrasos?.length > 0) {
      lines.push("\n📦 *Proveedores con retrasos*:");
      for (const s of insights.supplierAlerts.proveedoresConRetrasos.slice(
        0,
        3,
      )) {
        lines.push(`- ${s.nombre}: ${s.tasaATiempo} a tiempo`);
      }
    }

    // Suggestions
    if (insights.suggestions.length > 0) {
      lines.push("\n💡 *Sugerencias*:");
      for (const suggestion of insights.suggestions) {
        lines.push(`- ${suggestion}`);
      }
    }

    lines.push(
      "\n¿Necesitas algo? Escribe aqui y te ayudo. 🤖",
    );

    return lines.join("\n");
  }
}
