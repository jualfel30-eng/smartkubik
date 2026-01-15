import { Injectable, Logger, ConflictException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Supplier, SupplierDocument } from "../../schemas/supplier.schema";
import {
  Customer,
  CustomerDocument,
  CustomerContact,
} from "../../schemas/customer.schema";
import { CreateSupplierDto } from "../../dto/supplier.dto";

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
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
          name: createSupplierDto.contactName,
          type: "email",
          value: createSupplierDto.contactEmail,
          isPrimary: true,
        } as CustomerContact);
      }
      if (createSupplierDto.contactPhone) {
        contacts.push({
          name: createSupplierDto.contactName,
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
      contacts: [
        {
          name: createSupplierDto.contactName,
          email: createSupplierDto.contactEmail,
          phone: createSupplierDto.contactPhone,
          position: "Principal",
          isPrimary: true,
        },
      ],

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
            position: c.role || 'Principal',
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
    if (updateSupplierDto.paymentSettings) supplier.paymentSettings = { ...supplier.paymentSettings, ...updateSupplierDto.paymentSettings };
    if (updateSupplierDto.status) supplier.status = updateSupplierDto.status;

    // Map flat contact fields to contacts array if provided
    if (updateSupplierDto.contactName) {
      if (!supplier.contacts) supplier.contacts = [];
      if (supplier.contacts.length > 0) {
        supplier.contacts[0].name = updateSupplierDto.contactName;
        supplier.contacts[0].email = updateSupplierDto.contactEmail;
        supplier.contacts[0].phone = updateSupplierDto.contactPhone;
      } else {
        supplier.contacts.push({
          name: updateSupplierDto.contactName,
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
      // Populate customerId to ensure mapSupplier has the full customer object
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
        position: c.role || 'Principal',
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
        customer: plainCustomer // Include full customer object for reference
      };
    }

    // Fallback for legacy data without linked customer
    return plainSupplier;
  }
}

