import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Supplier, SupplierDocument } from '../../schemas/supplier.schema';
import { CreateSupplierDto } from '../../dto/supplier.dto';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto, user: any, session?: ClientSession): Promise<SupplierDocument> {
    const supplierNumber = await this.generateSupplierNumber(user.tenantId);
    
    const supplierData = {
      ...createSupplierDto,
      supplierNumber,
      contacts: [{
        name: createSupplierDto.contactName,
        email: createSupplierDto.contactEmail,
        phone: createSupplierDto.contactPhone,
        position: 'Principal',
        isPrimary: true,
      }],
      supplierType: 'distributor',
      taxInfo: { 
        rif: createSupplierDto.rif,
        businessName: createSupplierDto.name,
        isRetentionAgent: false,
      },
      address: { street: '', city: '', state: '', country: 'Venezuela' },
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const newSupplier = new this.supplierModel(supplierData);

    this.logger.log(`Attempting to save new supplier: ${newSupplier.name}`);
    try {
      const savedSupplier = await newSupplier.save({ session });
      if (!savedSupplier) {
        throw new Error('Save operation returned null or undefined.');
      }
      this.logger.log(`Successfully saved new supplier: ${savedSupplier.name}`);

      // Read-after-write verification
      const verification = await this.supplierModel.findById(savedSupplier._id).session(session ?? null).lean();
      if (verification) {
        this.logger.log(`READ-AFTER-WRITE CHECK SUCCEEDED for supplier ID: ${savedSupplier._id}`);
      } else {
        this.logger.error(`READ-AFTER-WRITE CHECK FAILED for supplier ID: ${savedSupplier._id}`);
      }

      return savedSupplier;
    } catch (error) {
      this.logger.error(`Failed to save supplier: ${newSupplier.name}`, error.stack);
      throw error; // Re-throw the error to be caught by the calling service
    }
  }

  async findAll(tenantId: string, search?: string): Promise<SupplierDocument[]> {
    const query: any = { tenantId };
    if (search) {
      query['$text'] = { $search: search };
    }
    return this.supplierModel.find(query).exec();
  }

  async findOne(id: string, tenantId: string): Promise<SupplierDocument | null> {
    return this.supplierModel.findOne({ _id: id, tenantId }).exec();
  }

  private async generateSupplierNumber(tenantId: string): Promise<string> {
    const count = await this.supplierModel.countDocuments({ tenantId });
    return `PROV-${(count + 1).toString().padStart(6, '0')}`;
  }
}
