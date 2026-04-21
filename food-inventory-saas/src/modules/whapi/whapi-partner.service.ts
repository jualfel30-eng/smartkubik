import {
  Injectable,
  Logger,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";
import {
  WhapiChannel,
  WhapiChannelDocument,
} from "../../schemas/whapi-channel.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { SuperAdminService } from "../super-admin/super-admin.service";
import { safeDecrypt } from "../../utils/encryption.util";
import {
  Configuration,
  UsersApi,
  ChannelApi,
  EventTypeEnum,
} from "../../lib/whapi-sdk/whapi-sdk-typescript-fetch";

const PARTNER_API_BASE = "https://manager.whapi.cloud";
const CHANNEL_API_BASE = "https://gate.whapi.cloud";

@Injectable()
export class WhapiPartnerService {
  private readonly logger = new Logger(WhapiPartnerService.name);

  constructor(
    @InjectModel(WhapiChannel.name)
    private whapiChannelModel: Model<WhapiChannelDocument>,
    @InjectModel(Tenant.name)
    private tenantModel: Model<TenantDocument>,
    private readonly configService: ConfigService,
    private readonly superAdminService: SuperAdminService,
  ) {}

  /**
   * Resolve the Partner API token (manager.whapi.cloud)
   * This is the immutable partner token, NOT a channel token.
   */
  private async resolvePartnerToken(): Promise<string> {
    // 1. Try environment variable
    let token = this.configService.get<string>("WHAPI_PARTNER_TOKEN");
    if (token?.trim()) return token.trim();

    // 2. Try SuperAdmin DB setting
    const dbSetting =
      await this.superAdminService.getSetting("WHAPI_PARTNER_TOKEN");
    if (dbSetting?.value?.trim()) return dbSetting.value.trim();

    throw new InternalServerErrorException(
      "WHAPI_PARTNER_TOKEN is not configured. Set it in .env or SuperAdmin settings.",
    );
  }

  /**
   * Get the Whapi project ID (channels are grouped under projects)
   */
  private async resolveProjectId(): Promise<string> {
    // Try env first
    let projectId = this.configService.get<string>("WHAPI_PROJECT_ID");
    if (projectId?.trim()) return projectId.trim();

    // Try SuperAdmin DB
    const dbSetting =
      await this.superAdminService.getSetting("WHAPI_PROJECT_ID");
    if (dbSetting?.value?.trim()) return dbSetting.value.trim();

    // Fetch from Whapi API and cache
    const partnerToken = await this.resolvePartnerToken();
    const response = await fetch(`${PARTNER_API_BASE}/projects`, {
      headers: {
        Authorization: `Bearer ${partnerToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Failed to fetch Whapi projects: ${response.status}`,
      );
    }

    const projects = await response.json();
    if (!projects?.length) {
      throw new InternalServerErrorException(
        "No Whapi projects found. Create one in your partner panel.",
      );
    }

    // Use the first project
    const id = projects[0].id;
    this.logger.log(`Using Whapi project: ${id} (${projects[0].name || "default"})`);
    return id;
  }

  // ─────────────────────────────────────────────
  // CHANNEL LIFECYCLE
  // ─────────────────────────────────────────────

  /**
   * Step 1: Create a new Whapi channel for a tenant.
   * Returns the channel record with QR code for linking.
   */
  async createChannelForTenant(
    tenantId: string,
  ): Promise<{ channel: WhapiChannelDocument; qrCode: string }> {
    const tenantOid = new Types.ObjectId(tenantId);

    // Check if tenant already has an active channel
    const existing = await this.whapiChannelModel.findOne({
      tenantId: tenantOid,
      isDeleted: false,
      status: { $nin: ["expired"] },
    });

    if (existing && existing.status === "connected") {
      throw new ConflictException(
        "Este tenant ya tiene un canal de WhatsApp activo. Desconéctalo primero.",
      );
    }

    // If there's an existing non-connected channel, reuse it (generate new QR)
    if (existing && ["pending", "awaiting_scan", "disconnected"].includes(existing.status)) {
      this.logger.log(
        `Reusing existing channel ${existing.channelId} for tenant ${tenantId}`,
      );
      const qrCode = await this.generateQrForChannel(existing);
      existing.status = "awaiting_scan";
      await existing.save();
      return { channel: existing, qrCode };
    }

    // Get tenant info for channel name
    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant) throw new NotFoundException("Tenant not found");

    const partnerToken = await this.resolvePartnerToken();
    const projectId = await this.resolveProjectId();

    // Create channel via Partner API
    const channelName = `SmartKubik - ${tenant.name || tenantId}`;

    this.logger.log(
      `Creating Whapi channel for tenant ${tenantId}: "${channelName}"`,
    );

    const response = await fetch(`${PARTNER_API_BASE}/channels`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${partnerToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: channelName,
        projectId,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Failed to create Whapi channel: ${response.status} - ${errorBody}`,
      );
      throw new InternalServerErrorException(
        `Error al crear canal de WhatsApp: ${response.status}`,
      );
    }

    const channelData = await response.json();

    this.logger.log(
      `Whapi channel created: ${channelData.id} (mode: ${channelData.mode})`,
    );

    // Save channel to DB
    const channel = new this.whapiChannelModel({
      tenantId: tenantOid,
      channelId: channelData.id,
      token: channelData.token, // Will be encrypted by pre-save hook
      name: channelName,
      status: "pending",
      mode: channelData.mode || "trial",
      activeTill: channelData.activeTill
        ? new Date(channelData.activeTill)
        : undefined,
      projectId,
    });
    await channel.save();

    // Also update the tenant's whapiToken for backward compatibility
    await this.tenantModel.findByIdAndUpdate(tenantId, {
      whapiToken: channelData.token,
    });

    // Wait for channel to initialize (Whapi needs up to 1.5 minutes,
    // but QR generation usually works within seconds)
    await this.sleep(3000);

    // Generate QR code using the new channel's token
    const qrCode = await this.generateQrForChannel(channel);

    channel.status = "awaiting_scan";
    await channel.save();

    return { channel, qrCode };
  }

  /**
   * Generate QR code for an existing channel.
   * Uses the channel's own token to call gate.whapi.cloud/users/login
   */
  async generateQrForChannel(channel: WhapiChannelDocument): Promise<string> {
    const channelToken = safeDecrypt(channel.token);

    const config = new Configuration({
      accessToken: channelToken,
      basePath: CHANNEL_API_BASE,
    });
    const usersApi = new UsersApi(config);

    try {
      const response = await usersApi.loginUser();

      if (!response.base64) {
        throw new InternalServerErrorException(
          "Whapi no devolvió un código QR. Intenta de nuevo en unos segundos.",
        );
      }

      return response.base64;
    } catch (error) {
      this.logger.error(
        `Failed to generate QR for channel ${channel.channelId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Error al generar el código QR. El canal puede estar inicializándose, intenta de nuevo en 30 segundos.",
      );
    }
  }

  /**
   * Refresh QR code for a tenant's channel (if expired or needs re-scan)
   */
  async refreshQrCode(tenantId: string): Promise<{ qrCode: string; channelId: string }> {
    const channel = await this.getActiveChannel(tenantId);
    if (!channel) {
      throw new NotFoundException(
        "No hay un canal de WhatsApp. Crea uno primero.",
      );
    }

    if (channel.status === "connected") {
      throw new BadRequestException(
        "El WhatsApp ya está conectado. No necesitas escanear de nuevo.",
      );
    }

    const qrCode = await this.generateQrForChannel(channel);
    channel.status = "awaiting_scan";
    await channel.save();

    return { qrCode, channelId: channel.channelId };
  }

  // ─────────────────────────────────────────────
  // WEBHOOK CONFIGURATION
  // ─────────────────────────────────────────────

  /**
   * Configure webhook on the Whapi channel to point to our backend.
   * Called after successful QR scan (channel is connected).
   */
  async configureChannelWebhook(
    tenantId: string,
  ): Promise<{ success: boolean; webhookUrl: string }> {
    const channel = await this.getActiveChannel(tenantId);
    if (!channel) {
      throw new NotFoundException("No active WhatsApp channel found");
    }

    const baseUrl = this.configService.get<string>("API_BASE_URL");
    if (!baseUrl) {
      throw new InternalServerErrorException("API_BASE_URL not configured");
    }

    const webhookUrl = `${baseUrl}/chat/whapi-webhook?tenantId=${tenantId}`;
    const channelToken = safeDecrypt(channel.token);

    const config = new Configuration({
      accessToken: channelToken,
      basePath: CHANNEL_API_BASE,
    });
    const channelApi = new ChannelApi(config);

    try {
      await channelApi.updateChannelSettings({
        settings: {
          webhooks: [
            {
              url: webhookUrl,
              events: [
                { type: EventTypeEnum.Messages },
                { type: EventTypeEnum.Statuses },
              ],
            },
          ],
        },
      });

      channel.webhookUrl = webhookUrl;
      channel.webhookConfigured = true;
      await channel.save();

      this.logger.log(
        `Webhook configured for channel ${channel.channelId}: ${webhookUrl}`,
      );

      return { success: true, webhookUrl };
    } catch (error) {
      this.logger.error(
        `Failed to configure webhook for channel ${channel.channelId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Error al configurar el webhook de WhatsApp.",
      );
    }
  }

  // ─────────────────────────────────────────────
  // CHANNEL STATUS & MANAGEMENT
  // ─────────────────────────────────────────────

  /**
   * Check channel health and update status
   */
  async checkChannelStatus(
    tenantId: string,
  ): Promise<{
    status: string;
    mode: string;
    phoneNumber?: string;
    activeTill?: Date;
    channelId?: string;
  }> {
    const channel = await this.getActiveChannel(tenantId);
    if (!channel) {
      return { status: "not_created", mode: "none" };
    }

    const channelToken = safeDecrypt(channel.token);

    try {
      const config = new Configuration({
        accessToken: channelToken,
        basePath: CHANNEL_API_BASE,
      });
      const channelApi = new ChannelApi(config);
      const health = await channelApi.checkHealth();

      // Update channel status based on health check
      const statusMap: Record<string, string> = {
        connected: "connected",
        loading: "awaiting_scan",
        got_qr_code: "awaiting_scan",
        disconnected: "disconnected",
      };

      const newStatus =
        statusMap[health?.status?.text || ""] || channel.status;

      if (newStatus !== channel.status) {
        channel.status = newStatus;
      }

      // Capture phone number if now connected
      if (
        newStatus === "connected" &&
        (health?.status as any)?.phoneNumber &&
        !channel.phoneNumber
      ) {
        channel.phoneNumber = (health.status as any).phoneNumber;
        channel.connectedAt = new Date();

        // Auto-configure webhook on first connection
        if (!channel.webhookConfigured) {
          try {
            await this.configureChannelWebhook(tenantId);
          } catch (err) {
            this.logger.warn(
              `Auto webhook config failed for ${channel.channelId}: ${err.message}`,
            );
          }
        }
      }

      channel.lastHealthCheck = new Date();
      await channel.save();

      return {
        status: channel.status,
        mode: channel.mode,
        phoneNumber: channel.phoneNumber,
        activeTill: channel.activeTill,
        channelId: channel.channelId,
      };
    } catch (error) {
      this.logger.warn(
        `Health check failed for channel ${channel.channelId}: ${error.message}`,
      );
      return {
        status: channel.status,
        mode: channel.mode,
        phoneNumber: channel.phoneNumber,
        activeTill: channel.activeTill,
        channelId: channel.channelId,
      };
    }
  }

  /**
   * Mark channel as connected (called from webhook notification)
   */
  async markChannelConnected(
    channelId: string,
    phoneNumber?: string,
  ): Promise<void> {
    const channel = await this.whapiChannelModel.findOne({
      channelId,
      isDeleted: false,
    });

    if (!channel) {
      this.logger.warn(`Channel ${channelId} not found for connection event`);
      return;
    }

    channel.status = "connected";
    if (phoneNumber) channel.phoneNumber = phoneNumber;
    channel.connectedAt = new Date();
    await channel.save();

    this.logger.log(`Channel ${channelId} marked as connected (${phoneNumber || "unknown phone"})`);
  }

  /**
   * Extend channel subscription (add days)
   */
  async extendChannel(
    tenantId: string,
    days: number = 30,
  ): Promise<{ success: boolean; activeTill?: Date }> {
    const channel = await this.getActiveChannel(tenantId);
    if (!channel) {
      throw new NotFoundException("No active channel found for this tenant");
    }

    const partnerToken = await this.resolvePartnerToken();

    const response = await fetch(
      `${PARTNER_API_BASE}/channels/${channel.channelId}/extend`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${partnerToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          days,
          comment: `SmartKubik renewal - ${channel.name} (${tenantId})`,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Failed to extend channel ${channel.channelId}: ${response.status} - ${errorBody}`,
      );
      throw new InternalServerErrorException(
        `Error al extender el canal: ${response.status}`,
      );
    }

    const result = await response.json();
    if (result.activeTill) {
      channel.activeTill = new Date(result.activeTill);
      await channel.save();
    }

    this.logger.log(
      `Channel ${channel.channelId} extended by ${days} days`,
    );

    return { success: true, activeTill: channel.activeTill };
  }

  /**
   * Change channel mode (trial -> live)
   */
  async changeChannelMode(
    tenantId: string,
    mode: "trial" | "sandbox" | "live",
  ): Promise<{ success: boolean }> {
    const channel = await this.getActiveChannel(tenantId);
    if (!channel) {
      throw new NotFoundException("No active channel found");
    }

    const partnerToken = await this.resolvePartnerToken();

    const response = await fetch(
      `${PARTNER_API_BASE}/channels/${channel.channelId}/mode`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${partnerToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ mode }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Failed to change mode for ${channel.channelId}: ${response.status} - ${errorBody}`,
      );
      throw new InternalServerErrorException(
        `Error al cambiar el modo del canal: ${response.status}`,
      );
    }

    channel.mode = mode;
    await channel.save();

    this.logger.log(`Channel ${channel.channelId} mode changed to ${mode}`);
    return { success: true };
  }

  /**
   * Disconnect and delete a channel
   */
  async deleteChannel(
    tenantId: string,
  ): Promise<{ success: boolean; daysRefunded?: number }> {
    const channel = await this.getActiveChannel(tenantId);
    if (!channel) {
      throw new NotFoundException("No active channel found");
    }

    const partnerToken = await this.resolvePartnerToken();

    const response = await fetch(
      `${PARTNER_API_BASE}/channels/${channel.channelId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${partnerToken}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Failed to delete channel ${channel.channelId}: ${response.status} - ${errorBody}`,
      );
      throw new InternalServerErrorException(
        `Error al eliminar el canal: ${response.status}`,
      );
    }

    // Mark as deleted (soft delete)
    channel.isDeleted = true;
    channel.status = "disconnected";
    await channel.save();

    // Clear tenant's whapiToken
    await this.tenantModel.findByIdAndUpdate(tenantId, {
      $unset: { whapiToken: 1 },
    });

    this.logger.log(`Channel ${channel.channelId} deleted for tenant ${tenantId}`);

    const result = await response.json().catch(() => ({}));
    return { success: true, daysRefunded: result.days_refunded };
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  /**
   * Get the active (non-deleted) channel for a tenant
   */
  async getActiveChannel(
    tenantId: string,
  ): Promise<WhapiChannelDocument | null> {
    return this.whapiChannelModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
