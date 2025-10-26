import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { WhapiWebhookDto } from '../../dto/whapi.dto';

@Injectable()
export class WhapiService {
  private readonly logger = new Logger(WhapiService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  /**
   * Process incoming WhatsApp webhook from Whapi
   * @param webhookData - Webhook payload from Whapi
   * @param tenantId - Tenant ID for multi-tenancy
   */
  async processWebhook(webhookData: WhapiWebhookDto, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Processing Whapi webhook: ${JSON.stringify(webhookData)}`);

      // Ignore messages sent by the bot itself
      if (webhookData.from_me) {
        this.logger.log('Ignoring message from bot');
        return { success: true, message: 'Message from bot ignored' };
      }

      // Extract customer info from webhook
      const { from, from_name, chat_id, type, location } = webhookData;

      if (!from || !chat_id) {
        this.logger.warn('Missing required fields (from or chat_id) in webhook');
        return { success: false, message: 'Missing required fields' };
      }

      // Find or create customer
      const customer = await this.findOrCreateWhatsAppCustomer(
        from,
        from_name,
        chat_id,
        tenantId,
      );

      // Process location if shared
      if (type === 'location' && location) {
        await this.processLocationShare(customer._id.toString(), location, tenantId);
      }

      // Update last interaction timestamp
      await this.customerModel.findByIdAndUpdate(customer._id, {
        lastWhatsappInteraction: new Date(),
      });

      return {
        success: true,
        customer,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error('Error processing Whapi webhook:', error);
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
    let name = 'Cliente WhatsApp';
    let lastName: string | undefined;

    if (whatsappName) {
      const nameParts = whatsappName.trim().split(' ');
      name = nameParts[0];
      if (nameParts.length > 1) {
        lastName = nameParts.slice(1).join(' ');
      }
    }

    // Create customer with minimal required fields
    const newCustomer = new this.customerModel({
      customerNumber,
      name,
      lastName,
      customerType: 'individual',
      source: 'whatsapp',
      status: 'active',
      tenantId: tenantObjectId,
      whatsappNumber,
      whatsappChatId: chatId,
      whatsappName,
      isWhatsappCustomer: true,
      lastWhatsappInteraction: new Date(),

      // Add WhatsApp contact
      contacts: [
        {
          type: 'whatsapp',
          value: whatsappNumber,
          isPrimary: true,
          isActive: true,
          name: whatsappName || 'WhatsApp',
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
        preferredCurrency: 'VES',
        preferredPaymentMethod: 'pending',
        preferredDeliveryMethod: 'delivery',
        communicationChannel: 'whatsapp',
        marketingOptIn: false,
        invoiceRequired: false,
      },

      // Initialize credit info
      creditInfo: {
        creditLimit: 0,
        availableCredit: 0,
        paymentTerms: 0,
        creditRating: 'new',
        isBlocked: false,
      },

      taxInfo: {},
      tier: 'standard',

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
    location: { latitude: number; longitude: number; name?: string; address?: string },
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
        address: location.address || location.name || 'Ubicación compartida desde WhatsApp',
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
          type: 'delivery',
          street: location.address || location.name || 'Ubicación compartida',
          city: 'Pendiente',
          state: 'Pendiente',
          country: 'Venezuela',
          coordinates: {
            lat: location.latitude,
            lng: location.longitude,
          },
          isDefault: customer.addresses?.length === 0, // First address is default
          notes: 'Compartido desde WhatsApp',
        };

        updates.$push = { addresses: newAddress };
      }

      await this.customerModel.updateOne(
        { _id: customer._id },
        updates,
      );

      this.logger.log(`Location updated for customer ${customerId}`);
    } catch (error) {
      this.logger.error('Error processing location share:', error);
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
    const customerNumber = `WA-${String(count + 1).padStart(5, '0')}`;

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
}
