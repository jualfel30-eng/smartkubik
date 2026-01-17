import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { WhapiWebhookDto } from "../../dto/whapi.dto";
import { SuperAdminService } from "../super-admin/super-admin.service";
import {
  Configuration,
  MessagesApi,
  SendMessageTextRequest,
  SendMessageInteractiveRequest,
  SendMessageImageRequest,
  SendMessageDocumentRequest,
} from "../../lib/whapi-sdk/whapi-sdk-typescript-fetch";

@Injectable()
export class WhapiService {
  private readonly logger = new Logger(WhapiService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private readonly configService: ConfigService,
    private readonly superAdminService: SuperAdminService,
  ) { }

  /**
   * Process incoming WhatsApp webhook from Whapi
   * @param webhookData - Webhook payload from Whapi
   * @param tenantId - Tenant ID for multi-tenancy
   */
  async processWebhook(
    webhookData: WhapiWebhookDto,
    tenantId: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Processing Whapi webhook: ${JSON.stringify(webhookData)}`,
      );

      // Ignore messages sent by the bot itself
      if (webhookData.from_me) {
        this.logger.log("Ignoring message from bot");
        return { success: true, message: "Message from bot ignored" };
      }

      // Extract customer info from webhook
      const { from, from_name, chat_id, type, location } = webhookData;

      if (!from || !chat_id) {
        this.logger.warn(
          "Missing required fields (from or chat_id) in webhook",
        );
        return { success: false, message: "Missing required fields" };
      }

      // Find or create customer
      const customer = await this.findOrCreateWhatsAppCustomer(
        from,
        from_name,
        chat_id,
        tenantId,
      );

      // Process location if shared
      if (type === "location" && location) {
        await this.processLocationShare(
          customer._id.toString(),
          location,
          tenantId,
        );
      }

      // Update last interaction timestamp
      await this.customerModel.findByIdAndUpdate(customer._id, {
        lastWhatsappInteraction: new Date(),
      });

      return {
        success: true,
        customer,
        message: "Webhook processed successfully",
      };
    } catch (error) {
      this.logger.error("Error processing Whapi webhook:", error);
      throw error;
    }
  }

  /**
   * Find existing WhatsApp customer or create a new one
   * @param whatsappNumber - Phone number from WhatsApp
   * @param whatsappName - Public name from WhatsApp
   * @param chatId - WhatsApp chat ID
   * @param tenantId - Tenant ID
   */
  async findOrCreateWhatsAppCustomer(
    whatsappNumber: string,
    whatsappName: string | undefined,
    chatId: string,
    tenantId: string,
  ): Promise<CustomerDocument> {
    const tenantObjectId = new Types.ObjectId(tenantId);

    // Try to find existing customer by WhatsApp number or chat ID
    let customer = await this.customerModel.findOne({
      $or: [
        { whatsappNumber, tenantId: tenantObjectId },
        { whatsappChatId: chatId, tenantId: tenantObjectId },
      ],
    });

    if (customer) {
      // Update existing customer
      this.logger.log(`Found existing WhatsApp customer: ${customer._id}`);

      // Update WhatsApp fields if they've changed
      const updates: any = {};
      if (customer.whatsappNumber !== whatsappNumber) {
        updates.whatsappNumber = whatsappNumber;
      }
      if (customer.whatsappChatId !== chatId) {
        updates.whatsappChatId = chatId;
      }
      if (whatsappName && customer.whatsappName !== whatsappName) {
        updates.whatsappName = whatsappName;
      }

      if (Object.keys(updates).length > 0) {
        const updatedCustomer = await this.customerModel.findByIdAndUpdate(
          customer._id,
          updates,
          { new: true },
        );
        if (updatedCustomer) {
          customer = updatedCustomer;
        }
      }

      return customer!;
    }

    // Create new customer
    this.logger.log(`Creating new WhatsApp customer for: ${whatsappNumber}`);

    // Generate unique customer number
    const customerNumber = await this.generateCustomerNumber(tenantId);

    // Extract name parts from WhatsApp name if available
    let name = "Cliente WhatsApp";
    let lastName: string | undefined;

    if (whatsappName) {
      const nameParts = whatsappName.trim().split(" ");
      name = nameParts[0];
      if (nameParts.length > 1) {
        lastName = nameParts.slice(1).join(" ");
      }
    }

    // Create customer with minimal required fields
    const newCustomer = new this.customerModel({
      customerNumber,
      name,
      lastName,
      customerType: "individual",
      source: "whatsapp",
      status: "active",
      tenantId: tenantObjectId,
      whatsappNumber,
      whatsappChatId: chatId,
      whatsappName,
      isWhatsappCustomer: true,
      lastWhatsappInteraction: new Date(),

      // Add WhatsApp contact
      contacts: [
        {
          type: "whatsapp",
          value: whatsappNumber,
          isPrimary: true,
          isActive: true,
          name: whatsappName || "WhatsApp",
        },
      ],

      // Initialize metrics
      metrics: {
        totalOrders: 0,
        totalSpent: 0,
        totalSpentUSD: 0,
        averageOrderValue: 0,
        orderFrequency: 0,
        lifetimeValue: 0,
        returnRate: 0,
        cancellationRate: 0,
        paymentDelayDays: 0,
      },

      // Initialize preferences
      preferences: {
        preferredCurrency: "VES",
        preferredPaymentMethod: "pending",
        preferredDeliveryMethod: "delivery",
        communicationChannel: "whatsapp",
        marketingOptIn: false,
        invoiceRequired: false,
      },

      // Initialize credit info
      creditInfo: {
        creditLimit: 0,
        availableCredit: 0,
        paymentTerms: 0,
        creditRating: "new",
        isBlocked: false,
      },

      taxInfo: {},
      tier: "standard",

      // This will be set by a pre-save hook or manually if needed
      createdBy: tenantObjectId, // Using tenantId as placeholder for now
    });

    await newCustomer.save();
    this.logger.log(`Created new WhatsApp customer: ${newCustomer._id}`);

    return newCustomer;
  }

  /**
   * Process shared location from WhatsApp
   * @param customerId - Customer ID
   * @param location - Location data from WhatsApp
   * @param tenantId - Tenant ID
   */
  async processLocationShare(
    customerId: string,
    location: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    },
    tenantId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Processing location share for customer ${customerId}`);

      const customer = await this.customerModel.findOne({
        _id: new Types.ObjectId(customerId),
        tenantId: new Types.ObjectId(tenantId),
      });

      if (!customer) {
        this.logger.warn(`Customer ${customerId} not found`);
        return;
      }

      // Update primary location
      const primaryLocation = {
        address:
          location.address ||
          location.name ||
          "Ubicación compartida desde WhatsApp",
        coordinates: {
          lat: location.latitude,
          lng: location.longitude,
        },
        formattedAddress: location.address || location.name,
      };

      // Also add to addresses array if not already present
      const addressExists = customer.addresses?.some(
        (addr) =>
          addr.coordinates?.lat === location.latitude &&
          addr.coordinates?.lng === location.longitude,
      );

      const updates: any = {
        primaryLocation,
      };

      if (!addressExists) {
        const newAddress = {
          type: "delivery",
          street: location.address || location.name || "Ubicación compartida",
          city: "Pendiente",
          state: "Pendiente",
          country: "Venezuela",
          coordinates: {
            lat: location.latitude,
            lng: location.longitude,
          },
          isDefault: customer.addresses?.length === 0, // First address is default
          notes: "Compartido desde WhatsApp",
        };

        updates.$push = { addresses: newAddress };
      }

      await this.customerModel.updateOne({ _id: customer._id }, updates);

      this.logger.log(`Location updated for customer ${customerId}`);
    } catch (error) {
      this.logger.error("Error processing location share:", error);
      throw error;
    }
  }

  /**
   * Generate unique customer number
   * @param tenantId - Tenant ID
   */
  private async generateCustomerNumber(tenantId: string): Promise<string> {
    const tenantObjectId = new Types.ObjectId(tenantId);

    // Count existing customers for this tenant
    const count = await this.customerModel.countDocuments({
      tenantId: tenantObjectId,
    });

    // Generate customer number: WA-XXXXX (WhatsApp prefix)
    const customerNumber = `WA-${String(count + 1).padStart(5, "0")}`;

    // Check if number already exists (unlikely but possible)
    const exists = await this.customerModel.findOne({
      customerNumber,
      tenantId: tenantObjectId,
    });

    if (exists) {
      // If exists, use timestamp to ensure uniqueness
      return `WA-${Date.now()}`;
    }

    return customerNumber;
  }

  /**
   * Get customer by WhatsApp number
   * @param whatsappNumber - WhatsApp phone number
   * @param tenantId - Tenant ID
   */
  async getCustomerByWhatsAppNumber(
    whatsappNumber: string,
    tenantId: string,
  ): Promise<CustomerDocument | null> {
    return this.customerModel.findOne({
      whatsappNumber,
      tenantId: new Types.ObjectId(tenantId),
    });
  }

  /**
   * Get customer by WhatsApp chat ID
   * @param chatId - WhatsApp chat ID
   * @param tenantId - Tenant ID
   */
  async getCustomerByChatId(
    chatId: string,
    tenantId: string,
  ): Promise<CustomerDocument | null> {
    return this.customerModel.findOne({
      whatsappChatId: chatId,
      tenantId: new Types.ObjectId(tenantId),
    });
  }

  /**
   * Send order confirmation via WhatsApp
   * @param tenantId - Tenant ID
   * @param customerPhone - Customer WhatsApp phone number
   * @param orderData - Order information
   */
  async sendOrderConfirmation(
    tenantId: string,
    customerPhone: string,
    orderData: {
      orderNumber: string;
      customerName: string;
      totalAmount: number;
      items: Array<{
        productName: string;
        quantity: number;
        unitPrice: number;
      }>;
      shippingMethod?: string;
      shippingAddress?: string;
      notes?: string;
    },
  ): Promise<void> {
    try {
      // Normalize phone number (remove spaces, dashes, etc.)
      const normalizedPhone = this.normalizePhoneNumber(customerPhone);

      // Build confirmation message
      const itemsList = orderData.items
        .map(
          (item) =>
            `• ${item.productName} x${item.quantity} - $${item.unitPrice.toFixed(2)}`,
        )
        .join("\n");

      let message = `¡Hola ${orderData.customerName}! 👋\n\n`;
      message += `✅ Tu orden ha sido recibida exitosamente\n\n`;
      message += `📋 *Orden #${orderData.orderNumber}*\n\n`;
      message += `🛒 *Productos:*\n${itemsList}\n\n`;
      message += `💰 *Total: $${orderData.totalAmount.toFixed(2)}*\n\n`;

      if (orderData.shippingMethod) {
        if (orderData.shippingMethod === "pickup") {
          message += `📍 *Método:* Retiro en tienda\n\n`;
        } else if (orderData.shippingMethod === "delivery") {
          message += `🚚 *Método:* Envío a domicilio\n`;
          if (orderData.shippingAddress) {
            message += `📍 *Dirección:* ${orderData.shippingAddress}\n\n`;
          }
        }
      }

      if (orderData.notes) {
        message += `📝 *Notas:* ${orderData.notes}\n\n`;
      }

      message += `Nos pondremos en contacto contigo pronto para coordinar la entrega. 📦\n\n`;
      message += `¡Gracias por tu preferencia! 🙏`;

      // Send message
      await this.sendWhatsAppMessage(tenantId, normalizedPhone, message);

      this.logger.log(
        `Order confirmation sent to ${normalizedPhone} for order ${orderData.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send order confirmation: ${error.message}`,
        error.stack,
      );
      // Don't throw error to avoid blocking order creation
    }
  }

  /**
   * Send appointment/reservation confirmation via WhatsApp
   * @param tenantId - Tenant ID
   * @param customerPhone - Customer WhatsApp phone number
   * @param appointmentData - Appointment information
   */
  async sendAppointmentConfirmation(
    tenantId: string,
    customerPhone: string,
    appointmentData: {
      confirmationCode?: string;
      customerName: string;
      serviceName?: string;
      startTime: Date;
      endTime: Date;
      resourceName?: string;
      location?: string;
      notes?: string;
      totalAmount?: number;
      depositAmount?: number;
    },
  ): Promise<void> {
    try {
      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(customerPhone);

      // Format dates
      const startDate = new Date(appointmentData.startTime);
      const endDate = new Date(appointmentData.endTime);
      const dateStr = startDate.toLocaleDateString("es-VE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const startTimeStr = startDate.toLocaleTimeString("es-VE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTimeStr = endDate.toLocaleTimeString("es-VE", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Build confirmation message
      let message = `¡Hola ${appointmentData.customerName}! 👋\n\n`;
      message += `✅ Tu reserva ha sido confirmada\n\n`;

      if (appointmentData.confirmationCode) {
        message += `🎫 *Código: ${appointmentData.confirmationCode}*\n\n`;
      }

      if (appointmentData.serviceName) {
        message += `📋 *Servicio:* ${appointmentData.serviceName}\n`;
      }

      message += `📅 *Fecha:* ${dateStr}\n`;
      message += `🕐 *Hora:* ${startTimeStr} - ${endTimeStr}\n`;

      if (appointmentData.resourceName) {
        message += `🏢 *Recurso:* ${appointmentData.resourceName}\n`;
      }

      if (appointmentData.location) {
        message += `📍 *Ubicación:* ${appointmentData.location}\n`;
      }

      if (appointmentData.depositAmount && appointmentData.depositAmount > 0) {
        message += `\n💰 *Depósito:* $${appointmentData.depositAmount.toFixed(2)}\n`;
      }

      if (appointmentData.totalAmount && appointmentData.totalAmount > 0) {
        message += `💵 *Total:* $${appointmentData.totalAmount.toFixed(2)}\n`;
      }

      if (appointmentData.notes) {
        message += `\n📝 *Notas:* ${appointmentData.notes}\n`;
      }

      message += `\n¡Te esperamos! 😊\n\n`;
      message += `Si necesitas cancelar o reprogramar, por favor contáctanos con anticipación.`;

      // Send message
      await this.sendWhatsAppMessage(tenantId, normalizedPhone, message);

      this.logger.log(
        `Appointment confirmation sent to ${normalizedPhone} for appointment ${appointmentData.confirmationCode || "N/A"}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send appointment confirmation: ${error.message}`,
        error.stack,
      );
      // Don't throw error to avoid blocking appointment creation
    }
  }

  /**
   * Send an interactive WhatsApp message (buttons, lists)
   * @param tenantId - Tenant ID
   * @param recipientPhone - Recipient phone number
   * @param data - Interactive message payload
   */
  async sendInteractiveMessage(
    tenantId: string,
    recipientPhone: string,
    data: {
      body: string;
      action: any;
      header?: string;
      footer?: string;
    },
  ): Promise<void> {
    try {
      const tenant = await this.tenantModel.findById(tenantId);
      if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

      const accessToken = await this.resolveWhapiToken(tenant);
      const normalizedPhone = this.normalizePhoneNumber(recipientPhone);

      await this.dispatchWhatsAppInteractiveMessage(
        accessToken,
        normalizedPhone,
        data,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send interactive message to ${recipientPhone}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send a media WhatsApp message (image, document)
   * @param tenantId - Tenant ID
   * @param recipientPhone - Recipient phone number
   * @param data - Media message payload
   */
  async sendMediaMessage(
    tenantId: string,
    recipientPhone: string,
    data: {
      mediaUrl: string;
      mediaType: "image" | "document" | "video" | "audio";
      caption?: string;
      filename?: string;
    },
  ): Promise<void> {
    try {
      const tenant = await this.tenantModel.findById(tenantId);
      if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

      const accessToken = await this.resolveWhapiToken(tenant);
      const normalizedPhone = this.normalizePhoneNumber(recipientPhone);

      await this.dispatchWhatsAppMediaMessage(
        accessToken,
        normalizedPhone,
        data,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send media message to ${recipientPhone}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send a generic WhatsApp text message
   * @param tenantId - Tenant ID
   * @param recipientPhone - Recipient phone number (format: +58XXXXXXXXXX)
   * @param message - Message text
   */
  async sendWhatsAppMessage(
    tenantId: string,
    recipientPhone: string,
    message: string,
  ): Promise<void> {
    try {
      // Get tenant to retrieve WhatsApp token
      const tenant = await this.tenantModel.findById(tenantId);
      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      // Resolve WhatsApp API token
      const accessToken = await this.resolveWhapiToken(tenant);

      // Send message via Whapi SDK
      await this.dispatchWhatsAppTextMessage(
        accessToken,
        recipientPhone,
        message,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message to ${recipientPhone}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Resolve WhatsApp API token for a tenant
   * @param tenant - Tenant document
   * @returns WhatsApp API token
   */
  async resolveWhapiToken(tenant: TenantDocument): Promise<string> {
    // Try tenant-specific token first
    if (tenant?.whapiToken?.trim()) {
      this.logger.debug(`Using tenant-specific token for tenant ${tenant.id}`);
      return tenant.whapiToken.trim();
    }

    // Fallback to master token from environment variables
    let masterToken = this.configService.get<string>("WHAPI_MASTER_TOKEN");
    let source = "ENV";

    // If not in env, try database settings (SuperAdmin)
    if (!masterToken?.trim()) {
      const dbSetting =
        await this.superAdminService.getSetting("WHAPI_MASTER_TOKEN");
      masterToken = dbSetting?.value;
      source = "DB (SuperAdmin)";
    }

    if (masterToken?.trim()) {
      const masked =
        masterToken.length > 8
          ? `${masterToken.slice(0, 4)}...${masterToken.slice(-4)}`
          : "***";
      this.logger.log(
        `Resolving WhatsApp token for tenant ${tenant.id}. Source: ${source}. Token: ${masked}`,
      );
      return masterToken.trim();
    }

    throw new InternalServerErrorException(
      "WhatsApp is not configured for this tenant.",
    );
  }

  /**
   * Dispatch WhatsApp text message via Whapi SDK with retry logic
   * @param accessToken - Whapi API token
   * @param recipientPhone - Recipient phone number
   * @param body - Message text
   */
  private async dispatchWhatsAppTextMessage(
    accessToken: string,
    recipientPhone: string,
    body: string,
  ): Promise<void> {
    const config = new Configuration({ accessToken });
    const messagesApi = new MessagesApi(config);
    const sendMessageTextRequest: SendMessageTextRequest = {
      senderText: {
        to: recipientPhone,
        body,
      },
    };

    const maxAttempts = 3;
    const retryableErrors = new Set(["ETIMEDOUT", "ECONNRESET", "EPIPE"]);

    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        await messagesApi.sendMessageText(sendMessageTextRequest);
        this.logger.log(
          `Successfully sent message to ${recipientPhone} via Whapi SDK (attempt ${attempt})`,
        );
        return;
      } catch (error) {
        const code = (error as any)?.code;
        const isRetryable = code && retryableErrors.has(code);

        this.logger.warn(
          `Attempt ${attempt} failed to send message to ${recipientPhone}: ${error.message} (code: ${code || "unknown"})`,
        );

        if (!isRetryable || attempt >= maxAttempts) {
          if ((error as any)?.response) {
            try {
              const body = await (error as any).response.json();
              this.logger.error(
                `Whapi API Error: Status ${(error as any).response.status} - ${JSON.stringify(body)}`,
              );
            } catch (e) {
              this.logger.error(
                `Whapi API Error: Status ${(error as any).response.status} (Body parsing failed)`,
              );
            }
          }
          this.logger.error(
            `Failed to send message via Whapi SDK after ${attempt} attempt(s): ${error.message}`,
            error.stack,
          );
          throw error;
        }

        const backoffMs = 2000 * attempt;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  private async dispatchWhatsAppInteractiveMessage(
    accessToken: string,
    recipientPhone: string,
    data: {
      body: string;
      action: any;
      header?: string;
      footer?: string;
    },
  ): Promise<void> {
    const config = new Configuration({ accessToken });
    const messagesApi = new MessagesApi(config);

    const request: SendMessageInteractiveRequest = {
      senderInteractive: {
        to: recipientPhone,
        body: { text: data.body },
        action: data.action,
        header: data.header ? { text: data.header } : undefined,
        footer: data.footer ? { text: data.footer } : undefined,
      },
    };

    // Retry logic could be abstracted, but keeping it inline for now to match dispatchWhatsAppTextMessage pattern
    const maxAttempts = 3;
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        await messagesApi.sendMessageInteractive(request);
        return;
      } catch (error) {
        if (attempt >= maxAttempts) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  private async dispatchWhatsAppMediaMessage(
    accessToken: string,
    recipientPhone: string,
    data: {
      mediaUrl: string;
      mediaType: "image" | "document" | "video" | "audio";
      caption?: string;
      filename?: string;
    },
  ): Promise<void> {
    const config = new Configuration({ accessToken });
    const messagesApi = new MessagesApi(config);

    if (data.mediaType === "image") {
      const request: SendMessageImageRequest = {
        senderImage: {
          to: recipientPhone,
          media: data.mediaUrl,
          caption: data.caption,
        },
      };
      await messagesApi.sendMessageImage(request);
    } else if (data.mediaType === "document") {
      const request: SendMessageDocumentRequest = {
        senderDocument: {
          to: recipientPhone,
          media: data.mediaUrl,
          caption: data.caption,
          filename: data.filename,
        },
      };
      await messagesApi.sendMessageDocument(request);
    } else {
      // Fallback or todo for video/audio if needed
      this.logger.warn(
        `Media type ${data.mediaType} not yet fully implemented in dispatch`,
      );
    }
  }

  /**
   * Normalize phone number to international format
   * Removes spaces, dashes, parentheses, and ensures it starts with +
   * @param phone - Phone number to normalize
   * @returns Normalized phone number
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, "");

    // If it doesn't start with +, add it
    if (!normalized.startsWith("+")) {
      // If it starts with 58 (Venezuela), add +
      if (normalized.startsWith("58")) {
        normalized = "+" + normalized;
      } else {
        // Otherwise, assume Venezuela (+58)
        normalized = "+58" + normalized;
      }
    }

    return normalized;
  }
}
