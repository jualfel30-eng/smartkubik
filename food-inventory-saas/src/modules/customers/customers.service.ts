import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from '../../dto/customer.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto, user: any): Promise<CustomerDocument> {
    this.logger.log(`Creating customer: ${createCustomerDto.name}`);

    // Generar número único de cliente
    const customerNumber = await this.generateCustomerNumber(user.tenantId);

    const customerData = {
      ...createCustomerDto,
      customerNumber,
      segments: [],
      interactions: [],
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
      creditInfo: createCustomerDto.creditInfo || {
        creditLimit: 0,
        availableCredit: 0,
        paymentTerms: 0,
        creditRating: 'C',
        isBlocked: false,
      },
      status: 'active',
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const customer = new this.customerModel(customerData);
    const savedCustomer = await customer.save();

    this.logger.log(`Customer created successfully with number: ${customerNumber}`);
    return savedCustomer;
  }

  async findAll(query: CustomerQueryDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      customerType,
      status,
      assignedTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = { tenantId: new Types.ObjectId(tenantId) };

    if (customerType) filter.customerType = customerType;
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = new Types.ObjectId(assignedTo);

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { customerNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.customerModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'firstName lastName')
        .exec(),
      this.customerModel.countDocuments(filter),
    ]);

    return {
      customers,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string): Promise<CustomerDocument | null> {
    return this.customerModel
      .findOne({ _id: id, tenantId })
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .exec();
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    user: any,
  ): Promise<CustomerDocument | null> {
    this.logger.log(`Updating customer with ID: ${id}`);

    const updateData = {
      ...updateCustomerDto,
      updatedBy: user.id,
    };

    return this.customerModel
      .findOneAndUpdate({ _id: id, tenantId: user.tenantId }, updateData, {
        new: true,
        runValidators: true,
      })
      .exec();
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    this.logger.log(`Soft deleting customer with ID: ${id}`);

    const result = await this.customerModel.updateOne(
      { _id: id, tenantId },
      { status: 'inactive', inactiveReason: 'Eliminado por usuario' },
    );

    return result.modifiedCount > 0;
  }

  private async generateCustomerNumber(tenantId: string): Promise<string> {
    const count = await this.customerModel.countDocuments({ tenantId });
    return `CLI-${(count + 1).toString().padStart(6, '0')}`;
  }
}

