import { Injectable, Logger, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Supplier, SupplierDocument } from "../../schemas/supplier.schema";
import { Customer, CustomerDocument, CustomerContact } from "../../schemas/customer.schema";
import { CreateSupplierDto } from "../../dto/supplier.dto";

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto, user: any): Promise<SupplierDocument> {
    this.logger.log(`Initiating creation for supplier with RIF: ${createSupplierDto.rif}`);

    // Step 1: Find or Create the corresponding Customer entity
    let customer = await this.customerModel.findOne({ "taxInfo.taxId": createSupplierDto.rif, tenantId: user.tenantId });

    if (!customer) {
      this.logger.log(`Customer with RIF ${createSupplierDto.rif} not found. Creating new customer entry.`);
      
      const contacts: CustomerContact[] = [];
      if (createSupplierDto.contactEmail) {
        contacts.push({
          name: createSupplierDto.contactName,
          type: 'email',
          value: createSupplierDto.contactEmail,
          isPrimary: true,
        } as CustomerContact);
      }
      if (createSupplierDto.contactPhone) {
        contacts.push({
          name: createSupplierDto.contactName,
          type: 'phone',
          value: createSupplierDto.contactPhone,
          isPrimary: contacts.length === 0, // Make primary if email doesn't exist
        } as CustomerContact);
      }

      const newCustomerData = {
        name: createSupplierDto.contactName, // Use contact name for the person's name
        companyName: createSupplierDto.name, // Use DTO's name for the company name
        customerNumber: `CUST-${Date.now()}`,
        customerType: "supplier",
        taxInfo: {
          taxId: createSupplierDto.rif,
          taxName: createSupplierDto.name, // Tax name should be the company name
        },
        contacts,
        createdBy: user.id,
        tenantId: user.tenantId,
        metrics: { totalOrders: 0, totalSpent: 0, totalSpentUSD: 0, averageOrderValue: 0, orderFrequency: 0, lifetimeValue: 0, returnRate: 0, cancellationRate: 0, paymentDelayDays: 0 },
      };

      const newCustomer = new this.customerModel(newCustomerData);
      customer = await newCustomer.save();
      this.logger.log(`New customer entry created with ID: ${customer._id}`);
    } else {
      this.logger.log(`Found existing customer with ID: ${customer._id}.`);
      // Opcional: Aquí se podría añadir lógica para actualizar los contactos del cliente si han cambiado.
    }

    // Step 2: Check if a Supplier with this RIF already exists to prevent duplicates
    const existingSupplier = await this.supplierModel.findOne({ "taxInfo.rif": createSupplierDto.rif, tenantId: user.tenantId });
    if (existingSupplier) {
      throw new ConflictException(`Un proveedor con el RIF ${createSupplierDto.rif} ya existe.`);
    }

    // Step 3: Manually construct and create the new Supplier entity
    const supplierNumber = await this.generateSupplierNumber(user.tenantId);
    const supplierData = {
      supplierNumber,
      name: createSupplierDto.name,
      supplierType: 'distributor',
      taxInfo: {
        rif: createSupplierDto.rif,
        businessName: createSupplierDto.name,
        isRetentionAgent: false,
      },
      contacts: [{
        name: createSupplierDto.contactName,
        email: createSupplierDto.contactEmail,
        phone: createSupplierDto.contactPhone,
        position: "Principal",
        isPrimary: true,
      }],
      address: { street: "", city: "", state: "", country: "Venezuela" },
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const newSupplier = new this.supplierModel(supplierData);
    const savedSupplier = await newSupplier.save();
    this.logger.log(`New supplier created successfully with ID: ${savedSupplier._id}`);
    
    return savedSupplier;
  }

  async findAll(tenantId: string, search?: string): Promise<SupplierDocument[]> {
    const query: any = { tenantId };
    if (search) {
      query["$or"] = [
        { name: { $regex: search, $options: "i" } },
        { "taxInfo.rif": { $regex: search, $options: "i" } },
      ];
    }
    this.logger.log(`Finding all suppliers for tenant: ${tenantId}`);
    return this.supplierModel.find(query).exec();
  }

  async findOne(id: string, tenantId: string): Promise<SupplierDocument | null> {
    return this.supplierModel.findOne({ _id: id, tenantId }).exec();
  }

  private async generateSupplierNumber(tenantId: string): Promise<string> {
    const count = await this.supplierModel.countDocuments({ tenantId });
    return `PROV-${(count + 1).toString().padStart(6, "0")}`;
  }
}