import { Injectable, Logger, ConflictException, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Supplier, SupplierDocument } from "../../schemas/supplier.schema";
import {
  Customer,
  CustomerDocument,
  CustomerContact,
} from "../../schemas/customer.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { CreateSupplierDto } from "../../dto/supplier.dto";

// Payment currency types for supplier configuration
export type SupplierPaymentCurrency = 'USD' | 'USD_PARALELO' | 'VES' | 'EUR' | 'USD_BCV' | 'CUSTOM';

// Interface for syncing payment config to products
export interface SupplierPaymentConfig {
  paymentCurrency: SupplierPaymentCurrency;
  preferredPaymentMethod?: string;
  acceptedPaymentMethods: string[];
  usesParallelRate: boolean;
}

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) { }

  async create(
    createSupplierDto: CreateSupplierDto,
    user: any,
  ): Promise<any> {
    this.logger.log(
      `Initiating creation for supplier with RIF: ${createSupplierDto.rif}`,
    );

    // Step 1: Find or Create the corresponding Customer entity
    let customer = await this.customerModel.findOne({
      "taxInfo.taxId": createSupplierDto.rif,
      tenantId: user.tenantId,
    });

    if (!customer) {
      this.logger.log(
        `Customer with RIF ${createSupplierDto.rif} not found. Creating new customer entry.`,
      );

      const contacts: CustomerContact[] = [];
      if (createSupplierDto.contactEmail) {
        contacts.push({
          name: createSupplierDto.contactName || createSupplierDto.name || 'Contacto Principal',
          type: "email",
          value: createSupplierDto.contactEmail,
          isPrimary: true,
        } as CustomerContact);
      }
      if (createSupplierDto.contactPhone) {
        contacts.push({
          name: createSupplierDto.contactName || createSupplierDto.name || 'Contacto Principal',
          type: "phone",
          value: createSupplierDto.contactPhone,
          isPrimary: contacts.length === 0,
        } as CustomerContact);
      }

      const newCustomerData = {
        name: createSupplierDto.contactName || createSupplierDto.name,
        companyName: createSupplierDto.name,
        customerNumber: `CUST-${Date.now()}`,
        customerType: "supplier",
        taxInfo: {
          taxId: createSupplierDto.rif,
          taxName: createSupplierDto.name,
        },
        contacts,
        createdBy: user.id,
        tenantId: user.tenantId,
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
      };

      const newCustomer = new this.customerModel(newCustomerData);
      customer = await newCustomer.save();
      this.logger.log(`New customer entry created with ID: ${customer._id}`);
    } else {
      this.logger.log(`Found existing customer with ID: ${customer._id}.`);
      if (customer.customerType !== 'supplier') {
        // Optional: Update Type or handle hybrid roles
        // customer.customerType = 'supplier'; 
        // await customer.save();
      }
    }

    // Step 2: Check if a Supplier with this RIF (or linked customer) already exists
    // We check both by RIF (legacy) and by customerId (new)
    const existingSupplier = await this.supplierModel.findOne({
      $or: [
        { "taxInfo.rif": createSupplierDto.rif },
        { customerId: customer._id }
      ],
      tenantId: String(user.tenantId),
    });

    if (existingSupplier) {
      // If exists, we return it mapped
      const populatedSupplier = await this.supplierModel
        .findById(existingSupplier._id)
        .populate('customerId')
        .exec();

      return this.mapSupplier(populatedSupplier, customer);
    }

    // Ensure customer matches the type if created/linked for a supplier
    if (customer.customerType !== 'supplier') {
      customer.customerType = 'supplier';
      await customer.save();
    }

    // Step 3: Create the new Supplier entity linked to Customer
    const supplierNumber = await this.generateSupplierNumber(user.tenantId);

    // We only save fields that are NOT in Customer or are specific to Supplier logic
    const supplierData = {
      supplierNumber,
      supplierType: "distributor",
      customerId: customer._id, // LINKED PROFILE PATTERN

      // We keep these for now as 'cache' or legacy support, but they are marked deprecated in schema
      name: createSupplierDto.name,
      taxInfo: {
        rif: createSupplierDto.rif,
        businessName: createSupplierDto.name,
        isRetentionAgent: false,
      },
      contacts: (createSupplierDto.contactName || createSupplierDto.contactEmail || createSupplierDto.contactPhone) ? [
        {
          name: createSupplierDto.contactName || createSupplierDto.name || 'Contacto Principal',
          email: createSupplierDto.contactEmail,
          phone: createSupplierDto.contactPhone,
          position: "Principal",
          isPrimary: true,
        },
      ] : [],

      createdBy: user.id,
      tenantId: user.tenantId,
      paymentSettings: createSupplierDto.paymentSettings || {},
    };

    const newSupplier = new this.supplierModel(supplierData);
    const savedSupplier = await newSupplier.save();
    this.logger.log(
      `New supplier created successfully with ID: ${savedSupplier._id}`,
    );

    return this.mapSupplier(savedSupplier, customer);
  }

  async update(id: string, updateSupplierDto: any, user: any): Promise<any> {
    // 1. Try to find existing Supplier
    let supplier = await this.supplierModel
      .findOne({ _id: id, tenantId: String(user.tenantId) })
      .exec();

    // 2. If not found, check if it's a Virtual Supplier (Customer ID)
    if (!supplier) {
      const customer = await this.customerModel
        .findOne({ _id: id, tenantId: new Types.ObjectId(user.tenantId), customerType: 'supplier' })
        .exec();

      if (customer) {
        // Create the Supplier profile on the fly
        const supplierNumber = await this.generateSupplierNumber(user.tenantId);
        const supplierData = {
          supplierNumber,
          supplierType: "distributor",
          customerId: customer._id,
          name: customer.companyName || customer.name,
          paymentSettings: updateSupplierDto.paymentSettings || {}, // Use incoming settings
          createdBy: user.id,
          tenantId: user.tenantId,
          taxInfo: { // Defaults from Customer
            rif: customer.taxInfo?.taxId,
            businessName: customer.taxInfo?.taxName,
          },
          contacts: customer.contacts?.map(c => ({
            name: c.name || customer.name || 'Contacto',
            email: c.type === 'email' ? c.value : undefined,
            phone: c.type === 'phone' ? c.value : undefined,
            position: 'Principal',
            isPrimary: c.isPrimary
          })) || []
        };
        const newSupplier = new this.supplierModel(supplierData);
        supplier = await newSupplier.save();

        // Now 'supplier' is the real document. 
        // We continue to update it with the incoming DTO below.
      } else {
        throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
      }
    }

    // 3. Update fields
    if (updateSupplierDto.name) supplier.name = updateSupplierDto.name;
    if (updateSupplierDto.taxInfo) supplier.taxInfo = { ...supplier.taxInfo, ...updateSupplierDto.taxInfo };
    if (updateSupplierDto.address) supplier.address = { ...supplier.address, ...updateSupplierDto.address };
    if (updateSupplierDto.paymentSettings) {
      // Robust update for Mongoose Subdocument
      // We avoid spreading the subdocument directly to prevent issues with Mongoose internal state
      if (!supplier.paymentSettings) supplier.paymentSettings = {} as any;

      const ps = updateSupplierDto.paymentSettings;
      if (ps.acceptsCredit !== undefined) supplier.paymentSettings.acceptsCredit = ps.acceptsCredit;
      if (ps.defaultCreditDays !== undefined) supplier.paymentSettings.defaultCreditDays = ps.defaultCreditDays;
      if (ps.creditLimit !== undefined) supplier.paymentSettings.creditLimit = ps.creditLimit;
      if (ps.acceptedPaymentMethods !== undefined) supplier.paymentSettings.acceptedPaymentMethods = ps.acceptedPaymentMethods;
      if (ps.preferredPaymentMethod !== undefined) supplier.paymentSettings.preferredPaymentMethod = ps.preferredPaymentMethod;
      if (ps.requiresAdvancePayment !== undefined) supplier.paymentSettings.requiresAdvancePayment = ps.requiresAdvancePayment;
      if (ps.advancePaymentPercentage !== undefined) supplier.paymentSettings.advancePaymentPercentage = ps.advancePaymentPercentage;
      if (ps.paymentNotes !== undefined) supplier.paymentSettings.paymentNotes = ps.paymentNotes;
    }
    if (updateSupplierDto.status) supplier.status = updateSupplierDto.status;

    // Map flat contact fields to contacts array if provided
    const hasContactUpdate = updateSupplierDto.contactName !== undefined ||
      updateSupplierDto.contactEmail !== undefined ||
      updateSupplierDto.contactPhone !== undefined;

    if (hasContactUpdate) {
      if (!supplier.contacts) supplier.contacts = [];
      if (supplier.contacts.length > 0) {
        if (updateSupplierDto.contactName !== undefined) supplier.contacts[0].name = updateSupplierDto.contactName || supplier.name || 'Contacto Principal';
        if (updateSupplierDto.contactEmail !== undefined) supplier.contacts[0].email = updateSupplierDto.contactEmail;
        if (updateSupplierDto.contactPhone !== undefined) supplier.contacts[0].phone = updateSupplierDto.contactPhone;
      } else {
        supplier.contacts.push({
          name: updateSupplierDto.contactName || supplier.name || 'Contacto Principal',
          email: updateSupplierDto.contactEmail,
          phone: updateSupplierDto.contactPhone,
          position: 'Principal', // Required by schema
          isPrimary: true
        } as any);
      }
    } else if (updateSupplierDto.contacts) {
      supplier.contacts = updateSupplierDto.contacts;
    }

    // Ensure tenantId is preserved/correct (String)
    if (!supplier.tenantId) supplier.tenantId = String(user.tenantId);

    try {
      const updatedSupplier = await supplier.save();

      // === AUTO-SYNC: Sync payment config to all linked products ===
      if (updateSupplierDto.paymentSettings) {
        const paymentCurrency = this.inferPaymentCurrency(
          updateSupplierDto.paymentSettings.preferredPaymentMethod || supplier.paymentSettings?.preferredPaymentMethod
        );
        const usesParallelRate = this.inferUsesParallelRate(
          updateSupplierDto.paymentSettings.preferredPaymentMethod || supplier.paymentSettings?.preferredPaymentMethod
        );

        // Sync to products in background (don't await to not slow down the update)
        this.syncPaymentConfigToProducts(
          id,
          String(user.tenantId),
          {
            paymentCurrency,
            preferredPaymentMethod: updateSupplierDto.paymentSettings.preferredPaymentMethod || supplier.paymentSettings?.preferredPaymentMethod,
            acceptedPaymentMethods: updateSupplierDto.paymentSettings.acceptedPaymentMethods || supplier.paymentSettings?.acceptedPaymentMethods || [],
            usesParallelRate
          }
        ).then(result => {
          this.logger.log(`Auto-synced payment config to ${result.updatedCount} products for supplier ${id}`);
        }).catch(err => {
          this.logger.error(`Failed to auto-sync payment config for supplier ${id}: ${err.message}`);
        });
      }

      // --- DUAL UPDATE STRATEGY ---
      // Sync changes to the linked Customer profile to prevent data masking on read.
      if (updatedSupplier.customerId) {
        const customerUpdates: any = {};

        // 1. Sync Name
        if (updateSupplierDto.name) {
          customerUpdates.name = updateSupplierDto.name;
          customerUpdates.companyName = updateSupplierDto.name;
        }

        // 2. Sync Tax Info
        if (updateSupplierDto.taxInfo) {
          if (updateSupplierDto.taxInfo.rif) customerUpdates['taxInfo.taxId'] = updateSupplierDto.taxInfo.rif;
          if (updateSupplierDto.taxInfo.businessName) customerUpdates['taxInfo.taxName'] = updateSupplierDto.taxInfo.businessName;
        }

        // 3. Sync Address
        if (updateSupplierDto.address) {
          // We can't easily map a single address object to the addresses array without potentially overwriting
          // user-managed addresses. We will only update if the address list is empty or we assume the first logical one.
          // For safety, we skip deep syncing address for now to avoid data loss, or we could add a new address.
          // customerUpdates['primaryLocation.address'] = `${updateSupplierDto.address.street}, ${updateSupplierDto.address.city}`;
        }

        // 4. Sync Payment Settings -> Credit Info
        if (updateSupplierDto.paymentSettings) {
          const ps = updateSupplierDto.paymentSettings;
          if (ps.defaultCreditDays !== undefined) customerUpdates['creditInfo.paymentTerms'] = ps.defaultCreditDays;
          if (ps.creditLimit !== undefined) customerUpdates['creditInfo.creditLimit'] = ps.creditLimit;
          // Also sync the new 'acceptsCredit' field if it exists in the DTO or was saved
          if (ps.acceptsCredit !== undefined) customerUpdates['creditInfo.acceptsCredit'] = ps.acceptsCredit;

          // Sync Preferred Payment Method
          if (ps.preferredPaymentMethod) {
            customerUpdates['preferences.preferredPaymentMethod'] = ps.preferredPaymentMethod;
          }
        }

        // 5. Sync Contacts (Basic Name/Email/Phone updates for primary contact)
        if (hasContactUpdate) {
          // This is harder to sync via atomic updates without finding the specific array element.
          // We will rely on the fact that if the user edits the "Contact Name" in the Supplier Form, 
          // they expect the linked Customer's primary contact to update.
          // Strategy: Pull the customer, find the matching contact (or primary), update, and save.
          const linkedCustomer = await this.customerModel.findById(updatedSupplier.customerId);
          if (linkedCustomer) {
            let primaryContact = linkedCustomer.contacts.find(c => c.isPrimary);
            if (!primaryContact && linkedCustomer.contacts.length > 0) primaryContact = linkedCustomer.contacts[0];

            if (primaryContact) {
              if (updateSupplierDto.contactName !== undefined) primaryContact.name = updateSupplierDto.contactName || updatedSupplier.name || 'Contacto Principal';
              if (updateSupplierDto.contactEmail !== undefined) primaryContact.value = updateSupplierDto.contactEmail; // Assuming type matches
              // Note: Robust sync would require checking contact type (email vs phone). 
              // For now, we update the name which is the most visible "masking" culprit.
            } else {
              // Add new contact if none exists
              linkedCustomer.contacts.push({
                name: updateSupplierDto.contactName || updatedSupplier.name || 'Contacto Principal',
                type: 'email', // Default assumption
                value: updateSupplierDto.contactEmail || 'N/A',
                isPrimary: true,
                isActive: true
              });
            }

            // Apply other updates from customerUpdates object
            Object.assign(linkedCustomer, customerUpdates);

            await linkedCustomer.save();
          }
        } else if (Object.keys(customerUpdates).length > 0) {
          // If we didn't do the full load-save cycle above, we do partial update here
          await this.customerModel.updateOne({ _id: updatedSupplier.customerId }, { $set: customerUpdates });
        }
      }

      // Populate customerId to ensure mapSupplier has the full customer object (which is now updated)
      await updatedSupplier.populate('customerId');
      return this.mapSupplier(updatedSupplier, updatedSupplier.customerId);
    } catch (error) {
      this.logger.error(`Error updating supplier ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Error al actualizar proveedor: ${error.message}`);
    }
  }

  /**
   * Ensures a Supplier profile exists.
   * If the ID belongs to a Customer (Virtual Supplier), it creates the Supplier profile.
   * If it belongs to an existing Supplier, it returns it.
   */
  async ensureSupplierProfile(id: string, user: any): Promise<any> {
    // 1. Try to find existing Supplier
    let supplier = await this.supplierModel
      .findOne({ _id: id, tenantId: String(user.tenantId) })
      .exec();

    if (supplier) return supplier;

    // 2. If not found, check for Virtual Supplier (Customer)
    const customer = await this.customerModel
      .findOne({ _id: id, tenantId: new Types.ObjectId(user.tenantId), customerType: 'supplier' })
      .exec();

    if (!customer) {
      throw new NotFoundException(`Proveedor (o Cliente CRM) con ID ${id} no encontrado`);
    }

    // 3. Create Profile
    const supplierNumber = await this.generateSupplierNumber(String(user.tenantId));
    const supplierData = {
      supplierNumber,
      supplierType: "distributor",
      customerId: customer._id,
      name: customer.companyName || customer.name,
      createdBy: user.id || user.userId,
      tenantId: String(user.tenantId),
      taxInfo: {
        rif: customer.taxInfo?.taxId,
        businessName: customer.taxInfo?.taxName,
      },
      contacts: customer.contacts?.map(c => ({
        name: c.name || customer.name || 'Contacto',
        email: c.type === 'email' ? c.value : undefined,
        phone: c.type === 'phone' ? c.value : undefined,
        position: 'Principal',
        isPrimary: c.isPrimary
      })) || []
    };

    const newSupplier = new this.supplierModel(supplierData);
    return newSupplier.save();
  }

  async findAll(
    tenantId: string,
    search?: string,
  ): Promise<any[]> {
    const query: any = { tenantId: String(tenantId) };

    // If searching, we preferably search on the Customer model first effectively, 
    // but since we have legacy data, we search on Supplier fields too.
    if (search) {
      query["$or"] = [
        { name: { $regex: search, $options: "i" } },
        { "taxInfo.rif": { $regex: search, $options: "i" } },
        { supplierNumber: { $regex: search, $options: "i" } },
      ];
    }

    // 1. Get explicit Suppliers
    const suppliers = await this.supplierModel
      .find(query)
      .populate('customerId')
      .sort({ createdAt: -1 })
      .exec();

    // 2. Get CRM Customers who are suppliers but NOT in the suppliers query results
    // We only want customers with type 'supplier' who are NOT already linked to the fetched suppliers
    const linkedCustomerIds = suppliers
      .filter(s => s.customerId)
      .map(s => (s.customerId as any)._id ? (s.customerId as any)._id : s.customerId);

    const customerQuery: any = {
      tenantId: new Types.ObjectId(tenantId),
      customerType: 'supplier',
      _id: { $nin: linkedCustomerIds }
    };

    if (search) {
      customerQuery["$or"] = [
        { name: { $regex: search, $options: "i" } },
        { "taxInfo.taxId": { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } }
      ];
    }

    const crmSuppliers = await this.customerModel.find(customerQuery).limit(50).exec(); // Limit to avoid massive payloads

    const mappedHelpers = suppliers.map(supplier => this.mapSupplier(supplier, supplier.customerId));

    // Map CRM-only suppliers as "Virtual" suppliers
    // We treat them as if they were suppliers, using their Customer ID as their "ID" for now.
    // NOTE: When editing these, the backend must handle that the ID is a Customer ID, not a Supplier ID.
    const mappedCrm = crmSuppliers.map(customer => ({
      _id: customer._id, // Use Customer ID temporarily
      isVirtual: true,   // Flag to identify on frontend/backend
      customerId: customer._id,
      name: customer.companyName || customer.name,
      supplierNumber: 'CRM-' + customer.customerNumber,
      status: customer.status,
      taxInfo: {
        rif: customer.taxInfo?.taxId || '',
        businessName: customer.taxInfo?.taxName || ''
      },
      contacts: customer.contacts?.map(c => ({
        name: c.name,
        email: c.type === 'email' ? c.value : '',
        phone: c.type === 'phone' ? c.value : '',
        isPrimary: c.isPrimary
      })),
      address: customer.addresses?.find(a => a.isDefault) || customer.addresses?.[0],
      metrics: customer.metrics, // Fix: Include metrics for virtual suppliers
      paymentSettings: { // Defaults
        defaultCreditDays: 0,
        acceptsCredit: false
      }
    }));

    // Combine and sort by name
    return [...mappedHelpers, ...mappedCrm].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<any | null> {
    // 1. Try finding in Supplier collection
    let supplier = await this.supplierModel
      .findOne({ _id: id, tenantId: String(tenantId) })
      .populate('customerId')
      .exec();

    if (supplier) {
      return this.mapSupplier(supplier, supplier.customerId);
    }

    // 2. If not found, try finding in Customer collection (Virtual Supplier)
    const customer = await this.customerModel.findOne({ _id: id, tenantId: new Types.ObjectId(tenantId), customerType: 'supplier' }).exec();

    if (customer) {
      // Return mapped virtual supplier
      return {
        _id: customer._id,
        isVirtual: true,
        customerId: customer._id,
        name: customer.companyName || customer.name,
        supplierNumber: 'CRM-' + customer.customerNumber,
        status: customer.status,
        taxInfo: {
          rif: customer.taxInfo?.taxId || '',
          businessName: customer.taxInfo?.taxName || ''
        },
        contacts: customer.contacts?.map(c => ({
          name: c.name,
          email: c.type === 'email' ? c.value : '',
          phone: c.type === 'phone' ? c.value : '',
          isPrimary: c.isPrimary
        })),
        address: customer.addresses?.find(a => a.isDefault) || customer.addresses?.[0],
        metrics: customer.metrics,
        paymentSettings: {}
      };
    }

    return null;
  }

  private async generateSupplierNumber(tenantId: string): Promise<string> {
    const count = await this.supplierModel.countDocuments({ tenantId: String(tenantId) });
    return `PROV-${(count + 1).toString().padStart(6, "0")}`;
  }

  private mapSupplier(supplier: any, customer: any) {
    if (!supplier) return null;

    const plainSupplier = supplier.toObject ? supplier.toObject() : supplier;
    const plainCustomer = customer?.toObject ? customer.toObject() : customer;

    // Merge logic: Priority to Customer data if linked
    // Ensure plainCustomer is actually a populated object (has data properties), not just an ID
    const isPopulatedCustomer = plainCustomer && (plainCustomer.companyName || plainCustomer.name || plainCustomer.taxInfo);

    if (isPopulatedCustomer) {
      return {
        ...plainSupplier,
        name: plainCustomer.companyName || plainCustomer.name,
        tradeName: plainCustomer.name, // Usually 'name' in Customer is contact/trade name
        taxInfo: {
          ...plainSupplier.taxInfo,
          rif: plainCustomer.taxInfo?.taxId,
          businessName: plainCustomer.taxInfo?.taxName,
        },
        address: plainCustomer.addresses?.find((a: any) => a.isDefault) || plainCustomer.addresses?.[0] || plainSupplier.address,
        contacts: plainCustomer.contacts?.map((c: any) => ({
          name: c.name,
          email: c.type === 'email' ? c.value : undefined,
          phone: c.type === 'phone' ? c.value : undefined,
          isPrimary: c.isPrimary
        })) || plainSupplier.contacts,
        customer: plainCustomer, // Include full customer object for reference
        metrics: plainCustomer.metrics || plainSupplier.metrics // fallback
      };
    }

    // Fallback for legacy data without linked customer
    return plainSupplier;
  }

  // ============================================================
  // === PRICING ENGINE INTEGRATION: Supplier Payment Methods ===
  // ============================================================

  /**
   * Get suppliers grouped by their preferred payment currency
   * Used by the pricing engine to show available filters
   */
  async getSuppliersByPaymentCurrency(tenantId: string): Promise<{
    currency: string;
    suppliers: { _id: string; name: string; productCount: number }[];
  }[]> {
    const suppliers = await this.supplierModel.find({
      tenantId: String(tenantId),
      status: 'active'
    }).select('_id name paymentSettings').lean();

    // Group by payment method (infer currency from preferred method)
    const currencyGroups: Record<string, any[]> = {
      'USD_PARALELO': [],
      'USD': [],
      'VES': [],
      'EUR': [],
    };

    for (const supplier of suppliers) {
      const preferredMethod = (supplier.paymentSettings as any)?.preferredPaymentMethod || '';

      // Get product count for this supplier
      const productCount = await this.productModel.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        'suppliers.supplierId': supplier._id
      });

      const supplierInfo = {
        _id: supplier._id.toString(),
        name: supplier.name,
        productCount
      };

      // Infer currency from payment method
      if (['zelle', 'efectivo_usd', 'binance_usdt'].includes(preferredMethod)) {
        currencyGroups['USD_PARALELO'].push(supplierInfo);
      } else if (['transferencia_int', 'paypal'].includes(preferredMethod)) {
        currencyGroups['USD'].push(supplierInfo);
      } else if (['pago_movil', 'transferencia_ves', 'bolivares_bcv'].includes(preferredMethod)) {
        currencyGroups['VES'].push(supplierInfo);
      } else {
        // Default to USD_PARALELO for unknown methods (most common in Venezuela)
        currencyGroups['USD_PARALELO'].push(supplierInfo);
      }
    }

    return Object.entries(currencyGroups)
      .filter(([_, suppliers]) => suppliers.length > 0)
      .map(([currency, suppliers]) => ({
        currency,
        suppliers
      }));
  }

  /**
   * Get all suppliers that accept a specific payment method
   */
  async getSuppliersByPaymentMethod(
    tenantId: string,
    paymentMethod: string
  ): Promise<{ _id: string; name: string; productCount: number }[]> {
    const suppliers = await this.supplierModel.find({
      tenantId: String(tenantId),
      status: 'active',
      $or: [
        { 'paymentSettings.preferredPaymentMethod': paymentMethod },
        { 'paymentSettings.acceptedPaymentMethods': paymentMethod }
      ]
    }).select('_id name').lean();

    const result: { _id: string; name: string; productCount: number }[] = [];
    for (const supplier of suppliers) {
      const productCount = await this.productModel.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        'suppliers.supplierId': supplier._id
      });

      result.push({
        _id: supplier._id.toString(),
        name: supplier.name,
        productCount
      });
    }

    return result;
  }

  /**
   * Sync supplier payment configuration to all linked products
   * This ensures product.suppliers[].paymentCurrency reflects the supplier's actual config
   */
  async syncPaymentConfigToProducts(
    supplierId: string,
    tenantId: string,
    paymentConfig: SupplierPaymentConfig
  ): Promise<{ updatedCount: number }> {
    this.logger.log(`Syncing payment config for supplier ${supplierId} to products`);

    // Find all products that have this supplier in their suppliers array
    const result = await this.productModel.updateMany(
      {
        tenantId: new Types.ObjectId(tenantId),
        'suppliers.supplierId': new Types.ObjectId(supplierId)
      },
      {
        $set: {
          'suppliers.$[elem].paymentCurrency': paymentConfig.paymentCurrency,
          'suppliers.$[elem].preferredPaymentMethod': paymentConfig.preferredPaymentMethod,
          'suppliers.$[elem].acceptedPaymentMethods': paymentConfig.acceptedPaymentMethods,
          'suppliers.$[elem].usesParallelRate': paymentConfig.usesParallelRate,
          'suppliers.$[elem].paymentConfigSyncedAt': new Date()
        }
      },
      {
        arrayFilters: [{ 'elem.supplierId': new Types.ObjectId(supplierId) }]
      }
    );

    this.logger.log(`Synced payment config to ${result.modifiedCount} products`);
    return { updatedCount: result.modifiedCount };
  }

  /**
   * Update supplier payment settings and sync to all linked products
   */
  async updatePaymentSettingsAndSync(
    supplierId: string,
    tenantId: string,
    userId: string,
    paymentSettings: {
      preferredPaymentMethod?: string;
      acceptedPaymentMethods?: string[];
      paymentCurrency?: SupplierPaymentCurrency;
      usesParallelRate?: boolean;
    }
  ): Promise<{ supplier: any; syncedProducts: number }> {
    // 1. Update the supplier
    const supplier = await this.supplierModel.findOne({
      _id: supplierId,
      tenantId: String(tenantId)
    });

    if (!supplier) {
      throw new NotFoundException(`Proveedor con ID ${supplierId} no encontrado`);
    }

    // Update payment settings
    if (!supplier.paymentSettings) {
      supplier.paymentSettings = {} as any;
    }

    if (paymentSettings.preferredPaymentMethod !== undefined) {
      supplier.paymentSettings.preferredPaymentMethod = paymentSettings.preferredPaymentMethod;
    }
    if (paymentSettings.acceptedPaymentMethods !== undefined) {
      supplier.paymentSettings.acceptedPaymentMethods = paymentSettings.acceptedPaymentMethods;
    }

    await supplier.save();

    // 2. Determine payment currency based on preferred method
    const paymentCurrency = paymentSettings.paymentCurrency ||
      this.inferPaymentCurrency(paymentSettings.preferredPaymentMethod || supplier.paymentSettings.preferredPaymentMethod);

    // 3. Determine if uses parallel rate
    const usesParallelRate = paymentSettings.usesParallelRate !== undefined
      ? paymentSettings.usesParallelRate
      : this.inferUsesParallelRate(paymentSettings.preferredPaymentMethod || supplier.paymentSettings.preferredPaymentMethod);

    // 4. Sync to products
    const syncResult = await this.syncPaymentConfigToProducts(
      supplierId,
      tenantId,
      {
        paymentCurrency,
        preferredPaymentMethod: paymentSettings.preferredPaymentMethod || supplier.paymentSettings.preferredPaymentMethod,
        acceptedPaymentMethods: paymentSettings.acceptedPaymentMethods || supplier.paymentSettings.acceptedPaymentMethods || [],
        usesParallelRate
      }
    );

    return {
      supplier: this.mapSupplier(supplier, null),
      syncedProducts: syncResult.updatedCount
    };
  }

  /**
   * Infer payment currency from payment method
   */
  private inferPaymentCurrency(paymentMethod?: string): SupplierPaymentCurrency {
    if (!paymentMethod) return 'USD_PARALELO';

    const parallelMethods = ['zelle', 'efectivo_usd', 'binance_usdt', 'binance', 'payoneer'];
    const vesMethods = ['pago_movil', 'transferencia_ves', 'bolivares_bcv', 'efectivo_ves'];
    const usdBcvMethods = ['transferencia_bcv', 'dolares_bcv'];

    if (parallelMethods.includes(paymentMethod)) return 'USD_PARALELO';
    if (vesMethods.includes(paymentMethod)) return 'VES';
    if (usdBcvMethods.includes(paymentMethod)) return 'USD_BCV';

    return 'USD_PARALELO'; // Default for Venezuela
  }

  /**
   * Infer if supplier uses parallel rate based on payment method
   */
  private inferUsesParallelRate(paymentMethod?: string): boolean {
    if (!paymentMethod) return true;

    const parallelMethods = ['zelle', 'efectivo_usd', 'binance_usdt', 'binance', 'payoneer', 'paypal'];
    return parallelMethods.includes(paymentMethod);
  }

  /**
   * Get products by supplier payment currency
   * Used directly by the pricing engine
   */
  async getProductIdsBySupplierPaymentCurrency(
    tenantId: string,
    paymentCurrency: SupplierPaymentCurrency
  ): Promise<string[]> {
    const products = await this.productModel.find({
      tenantId: new Types.ObjectId(tenantId),
      'suppliers.paymentCurrency': paymentCurrency
    }).select('_id').lean();

    return products.map(p => p._id.toString());
  }

  /**
   * Get products by supplier payment method
   * Used directly by the pricing engine
   */
  async getProductIdsBySupplierPaymentMethod(
    tenantId: string,
    paymentMethod: string
  ): Promise<string[]> {
    const products = await this.productModel.find({
      tenantId: new Types.ObjectId(tenantId),
      $or: [
        { 'suppliers.preferredPaymentMethod': paymentMethod },
        { 'suppliers.acceptedPaymentMethods': paymentMethod }
      ]
    }).select('_id').lean();

    return products.map(p => p._id.toString());
  }

  /**
   * Bulk sync all suppliers' payment config to their products
   * Useful for initial migration or data cleanup
   */
  async bulkSyncAllSuppliersPaymentConfig(tenantId: string): Promise<{
    suppliersProcessed: number;
    totalProductsUpdated: number;
  }> {
    this.logger.log(`Starting bulk sync of supplier payment configs for tenant ${tenantId}`);

    const suppliers = await this.supplierModel.find({
      tenantId: String(tenantId)
    }).select('_id paymentSettings').lean();

    let totalProductsUpdated = 0;

    for (const supplier of suppliers) {
      const paymentCurrency = this.inferPaymentCurrency(
        (supplier.paymentSettings as any)?.preferredPaymentMethod
      );
      const usesParallelRate = this.inferUsesParallelRate(
        (supplier.paymentSettings as any)?.preferredPaymentMethod
      );

      const result = await this.syncPaymentConfigToProducts(
        supplier._id.toString(),
        tenantId,
        {
          paymentCurrency,
          preferredPaymentMethod: (supplier.paymentSettings as any)?.preferredPaymentMethod,
          acceptedPaymentMethods: (supplier.paymentSettings as any)?.acceptedPaymentMethods || [],
          usesParallelRate
        }
      );

      totalProductsUpdated += result.updatedCount;
    }

    this.logger.log(`Bulk sync completed: ${suppliers.length} suppliers, ${totalProductsUpdated} products updated`);

    return {
      suppliersProcessed: suppliers.length,
      totalProductsUpdated
    };
  }

  // ============================================================
  // === PURCHASE ORDER INTEGRATION: Auto-sync from purchases ===
  // ============================================================

  /**
   * Ensures a Supplier profile exists and syncs data from a Purchase Order.
   * Called from PurchasesService when creating or receiving a PO.
   *
   * Handles:
   * - GAP 1: Creates Supplier entity if only Customer exists
   * - GAP 3: Updates supplier metrics (totalOrders, totalPurchased, lastOrderDate, etc.)
   * - GAP 4: Syncs payment terms from PO to supplier paymentSettings
   * - GAP 5: Ensures contact data is complete on the Customer entity
   */
  async syncFromPurchaseOrder(
    supplierId: string,
    purchaseData: {
      totalAmount: number;
      paymentTerms?: {
        isCredit?: boolean;
        creditDays?: number;
        paymentMethods?: string[];
        expectedCurrency?: string;
        requiresAdvancePayment?: boolean;
        advancePaymentPercentage?: number;
      };
      newSupplierContactName?: string;
      newSupplierContactPhone?: string;
      newSupplierContactEmail?: string;
      isReceiving?: boolean; // true when PO is being received (vs just created)
    },
    user: any,
  ): Promise<void> {
    try {
      // --- Step 1: Ensure Supplier profile exists (GAP 1) ---
      let supplier = await this.supplierModel
        .findOne({
          $or: [
            { _id: Types.ObjectId.isValid(supplierId) ? new Types.ObjectId(supplierId) : supplierId },
            { customerId: Types.ObjectId.isValid(supplierId) ? new Types.ObjectId(supplierId) : supplierId }
          ],
          tenantId: String(user.tenantId),
        })
        .exec();

      if (!supplier) {
        // The supplierId is actually a Customer ID — create the Supplier profile
        const customer = await this.customerModel
          .findOne({
            _id: new Types.ObjectId(supplierId),
            tenantId: new Types.ObjectId(user.tenantId),
          })
          .exec();

        if (!customer) {
          this.logger.warn(`syncFromPurchaseOrder: No customer/supplier found for ID ${supplierId}`);
          return;
        }

        // Ensure customer is marked as supplier
        if (customer.customerType !== 'supplier') {
          customer.customerType = 'supplier';
          await customer.save();
        }

        const supplierNumber = await this.generateSupplierNumber(String(user.tenantId));
        const supplierData = {
          supplierNumber,
          supplierType: 'distributor',
          customerId: customer._id,
          name: customer.companyName || customer.name,
          createdBy: user.id,
          tenantId: String(user.tenantId),
          taxInfo: {
            rif: customer.taxInfo?.taxId,
            businessName: customer.taxInfo?.taxName || customer.companyName,
            isRetentionAgent: false,
          },
          contacts: customer.contacts?.map(c => ({
            name: c.name || customer.name || 'Contacto',
            email: c.type === 'email' ? c.value : undefined,
            phone: c.type === 'phone' ? c.value : undefined,
            position: 'Principal',
            isPrimary: c.isPrimary,
          })) || [],
          metrics: {
            totalOrders: 0,
            totalPurchased: 0,
            averageOrderValue: 0,
            onTimeDeliveryRate: 0,
            qualityIssueRate: 0,
            returnRate: 0,
            paymentDelayDays: 0,
          },
          paymentSettings: {},
        };

        const newSupplier = new this.supplierModel(supplierData);
        supplier = await newSupplier.save();
        this.logger.log(`syncFromPurchaseOrder: Created Supplier profile ${supplier.supplierNumber} for Customer ${supplierId}`);

        // --- GAP 5: Sync contact data back to Customer if provided ---
        if (purchaseData.newSupplierContactName) {
          const primaryContact = customer.contacts?.find(c => c.isPrimary);
          if (primaryContact) {
            primaryContact.name = purchaseData.newSupplierContactName;
          }
          if (purchaseData.newSupplierContactEmail) {
            const emailContact = customer.contacts?.find(c => c.type === 'email');
            if (emailContact) {
              emailContact.value = purchaseData.newSupplierContactEmail;
              emailContact.name = purchaseData.newSupplierContactName;
              emailContact.isPrimary = true;
            } else {
              customer.contacts.push({
                name: purchaseData.newSupplierContactName,
                type: 'email',
                value: purchaseData.newSupplierContactEmail,
                isPrimary: !customer.contacts?.some(c => c.isPrimary),
                isActive: true,
              } as any);
            }
          }
          await customer.save();
        }
      }

      // --- Step 2: Update supplier metrics (GAP 3) ---
      if (!supplier.metrics) {
        supplier.metrics = {
          totalOrders: 0,
          totalPurchased: 0,
          averageOrderValue: 0,
          onTimeDeliveryRate: 0,
          qualityIssueRate: 0,
          returnRate: 0,
          paymentDelayDays: 0,
        } as any;
      }

      supplier.metrics.totalOrders = (supplier.metrics.totalOrders || 0) + 1;
      supplier.metrics.totalPurchased = (supplier.metrics.totalPurchased || 0) + purchaseData.totalAmount;
      supplier.metrics.averageOrderValue =
        supplier.metrics.totalOrders > 0
          ? supplier.metrics.totalPurchased / supplier.metrics.totalOrders
          : purchaseData.totalAmount;
      supplier.metrics.lastOrderDate = new Date();

      // --- Step 3: Sync payment terms from PO (GAP 4) ---
      if (purchaseData.paymentTerms) {
        if (!supplier.paymentSettings) {
          supplier.paymentSettings = {} as any;
        }

        const pt = purchaseData.paymentTerms;

        // Sync credit settings
        if (pt.isCredit !== undefined) {
          supplier.paymentSettings.acceptsCredit = pt.isCredit;
        }
        if (pt.creditDays && pt.creditDays > 0) {
          supplier.paymentSettings.defaultCreditDays = pt.creditDays;
        }

        // Sync payment methods (merge, don't replace)
        if (pt.paymentMethods && pt.paymentMethods.length > 0) {
          const existingMethods = supplier.paymentSettings.acceptedPaymentMethods || [];
          const mergedMethods = [...new Set([...existingMethods, ...pt.paymentMethods])];
          supplier.paymentSettings.acceptedPaymentMethods = mergedMethods;

          // Set preferred method if not yet set
          if (!supplier.paymentSettings.preferredPaymentMethod) {
            supplier.paymentSettings.preferredPaymentMethod = pt.paymentMethods[0];
          }
        }

        // Sync advance payment settings
        if (pt.requiresAdvancePayment !== undefined) {
          supplier.paymentSettings.requiresAdvancePayment = pt.requiresAdvancePayment;
        }
        if (pt.advancePaymentPercentage && pt.advancePaymentPercentage > 0) {
          supplier.paymentSettings.advancePaymentPercentage = pt.advancePaymentPercentage;
        }
      }

      await supplier.save();
      this.logger.log(`syncFromPurchaseOrder: Supplier ${supplier.supplierNumber} metrics and payment settings updated`);

      // --- Step 4: Sync payment config to linked products (if payment terms changed) ---
      if (purchaseData.paymentTerms?.paymentMethods?.length) {
        const paymentCurrency = this.inferPaymentCurrency(
          supplier.paymentSettings?.preferredPaymentMethod
        );
        const usesParallelRate = this.inferUsesParallelRate(
          supplier.paymentSettings?.preferredPaymentMethod
        );

        this.syncPaymentConfigToProducts(
          supplier._id.toString(),
          String(user.tenantId),
          {
            paymentCurrency,
            preferredPaymentMethod: supplier.paymentSettings?.preferredPaymentMethod,
            acceptedPaymentMethods: supplier.paymentSettings?.acceptedPaymentMethods || [],
            usesParallelRate,
          }
        ).catch(err => {
          this.logger.error(`syncFromPurchaseOrder: Failed to sync payment config to products: ${err.message}`);
        });
      }
    } catch (error) {
      this.logger.error(
        `syncFromPurchaseOrder: Error syncing supplier ${supplierId}: ${error.message}`,
        error.stack,
      );
      // Don't re-throw — sync failures shouldn't block the purchase flow
    }
  }

  /**
   * Links a product to a supplier in the Product.suppliers[] array.
   * Called from PurchasesService when receiving a PO.
   *
   * Handles GAP 2: Ensures purchased products are linked to their supplier.
   */
  async linkProductToSupplier(
    productId: string,
    supplierId: string,
    tenantId: string,
    supplierData: {
      supplierName: string;
      costPrice: number;
      productSku: string;
    },
  ): Promise<void> {
    try {
      // Resolve the actual Supplier document ID (supplierId might be a Customer ID)
      let actualSupplierId = supplierId;
      const supplier = await this.supplierModel.findOne({
        $or: [
          { _id: Types.ObjectId.isValid(supplierId) ? new Types.ObjectId(supplierId) : supplierId },
          { customerId: Types.ObjectId.isValid(supplierId) ? new Types.ObjectId(supplierId) : supplierId },
        ],
        tenantId: String(tenantId),
      }).exec();

      if (supplier) {
        actualSupplierId = supplier._id.toString();
      }

      const supplierObjId = new Types.ObjectId(actualSupplierId);
      const productObjId = new Types.ObjectId(productId);
      const tenantObjId = new Types.ObjectId(tenantId);

      // Check if the product already has this supplier linked
      const product = await this.productModel.findOne({
        _id: productObjId,
        tenantId: tenantObjId,
      });

      if (!product) {
        this.logger.warn(`linkProductToSupplier: Product ${productId} not found`);
        return;
      }

      const existingLink = product.suppliers?.find(
        (s: any) => s.supplierId?.toString() === actualSupplierId || s.supplierId?.toString() === supplierId
      );

      if (existingLink) {
        // Update cost price and last updated date
        existingLink.costPrice = supplierData.costPrice;
        existingLink.lastUpdated = new Date();

        // Sync payment config from supplier if available
        if (supplier?.paymentSettings) {
          existingLink.paymentCurrency = this.inferPaymentCurrency(supplier.paymentSettings?.preferredPaymentMethod);
          existingLink.preferredPaymentMethod = supplier.paymentSettings?.preferredPaymentMethod;
          existingLink.acceptedPaymentMethods = supplier.paymentSettings?.acceptedPaymentMethods || [];
          existingLink.usesParallelRate = this.inferUsesParallelRate(supplier.paymentSettings?.preferredPaymentMethod);
          existingLink.paymentConfigSyncedAt = new Date();
        }

        await product.save();
        this.logger.log(`linkProductToSupplier: Updated existing link for product ${productId} → supplier ${actualSupplierId}`);
      } else {
        // Add new supplier link
        const hasExistingSuppliers = product.suppliers && product.suppliers.length > 0;

        const newSupplierEntry: any = {
          supplierId: supplierObjId,
          supplierName: supplierData.supplierName,
          supplierSku: supplierData.productSku,
          costPrice: supplierData.costPrice,
          leadTimeDays: 1,
          minimumOrderQuantity: 1,
          isPreferred: !hasExistingSuppliers, // First supplier is preferred by default
          lastUpdated: new Date(),
        };

        // Sync payment config from supplier if available
        if (supplier?.paymentSettings) {
          newSupplierEntry.paymentCurrency = this.inferPaymentCurrency(supplier.paymentSettings?.preferredPaymentMethod);
          newSupplierEntry.preferredPaymentMethod = supplier.paymentSettings?.preferredPaymentMethod;
          newSupplierEntry.acceptedPaymentMethods = supplier.paymentSettings?.acceptedPaymentMethods || [];
          newSupplierEntry.usesParallelRate = this.inferUsesParallelRate(supplier.paymentSettings?.preferredPaymentMethod);
          newSupplierEntry.paymentConfigSyncedAt = new Date();
        }

        if (!product.suppliers) {
          product.suppliers = [];
        }
        product.suppliers.push(newSupplierEntry);
        await product.save();
        this.logger.log(`linkProductToSupplier: Created new link for product ${productId} → supplier ${actualSupplierId}`);
      }
    } catch (error) {
      this.logger.error(
        `linkProductToSupplier: Error linking product ${productId} to supplier ${supplierId}: ${error.message}`,
        error.stack,
      );
      // Don't re-throw — linking failures shouldn't block the purchase flow
    }
  }
}

