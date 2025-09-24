import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Order, OrderDocument } from "../../schemas/order.schema";
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
} from "../../dto/customer.dto";

interface CustomerScore {
  customerId: string;
  rScore?: number;
  fScore?: number;
  mScore?: number;
  loyaltyScore?: number;
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async create(
    createCustomerDto: CreateCustomerDto,
    user: any,
  ): Promise<CustomerDocument> {
    this.logger.log(`Creating customer: ${createCustomerDto.name}`);

    const customerNumber = await this.generateCustomerNumber(user.tenantId);

    const customerData = {
      ...createCustomerDto,
      customerNumber,
      tier: 'bronce', // Default tier for new customers
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
        creditRating: "C",
        isBlocked: false,
      },
      status: "active",
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const customer = new this.customerModel(customerData);
    const savedCustomer = await customer.save();

    this.logger.log(
      `Customer created successfully with number: ${customerNumber}`,
    );
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
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filter: any = { tenantId };

    if (customerType) filter.customerType = customerType;
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = new Types.ObjectId(assignedTo);

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { customerNumber: { $regex: search, $options: "i" } },
        { "taxInfo.taxId": { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.customerModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean() // Use .lean() for performance boost
        .populate("assignedTo", "firstName lastName")
        .exec(),
      this.customerModel.countDocuments(filter),
    ]);

    const customersWithTiers = await this.calculateAndAssignTiers(customers, tenantId);

    return {
      customers: customersWithTiers,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async calculateAndAssignTiers(customers: any[], tenantId: string): Promise<any[]> {
    if (customers.length === 0) {
      return [];
    }
  
    const allOrders = await this.orderModel.find({ 
      tenantId, 
      status: { $in: ['delivered', 'paid', 'confirmed', 'processing'] } 
    }).lean();
  
    const ordersByCustomer = new Map<string, any[]>();
    allOrders.forEach(order => {
      const customerId = order.customerId.toString();
      if (!ordersByCustomer.has(customerId)) {
        ordersByCustomer.set(customerId, []);
      }
      ordersByCustomer.get(customerId)!.push(order);
    });
  
    const customerScores: CustomerScore[] = [];
    const today = new Date();
  
    for (const customer of customers) {
      const customerId = customer._id.toString();
      const customerOrders = ordersByCustomer.get(customerId) || [];
  
      if (customerOrders.length === 0) {
        customerScores.push({ customerId, loyaltyScore: 0 });
        continue;
      }
  
      // Recency
      const lastOrderDate = customerOrders.reduce((max, order) => order.createdAt > max ? order.createdAt : max, customerOrders[0].createdAt);
      const daysSinceLastPurchase = Math.floor((today.getTime() - new Date(lastOrderDate).getTime()) / (1000 * 3600 * 24));
      const rScore = 100 / (daysSinceLastPurchase + 1);
  
      // Frequency
      const fScore = customerOrders.length;
  
      // Monetary
      const mScore = customerOrders.reduce((sum, order) => {
        const daysAgo = Math.floor((today.getTime() - new Date(order.createdAt).getTime()) / (1000 * 3600 * 24));
        const weight = Math.pow(0.99, daysAgo); // 1% decay per day
        return sum + (order.totalAmount * weight);
      }, 0);
  
      customerScores.push({ customerId, rScore, fScore, mScore });
    }
  
    // Normalize scores
    const maxR = Math.max(...customerScores.map(s => s.rScore || 0));
    const maxF = Math.max(...customerScores.map(s => s.fScore || 0));
    const maxM = Math.max(...customerScores.map(s => s.mScore || 0));
  
    customerScores.forEach(score => {
      const normR = maxR > 0 ? ((score.rScore || 0) / maxR) * 100 : 0;
      const normF = maxF > 0 ? ((score.fScore || 0) / maxF) * 100 : 0;
      const normM = maxM > 0 ? ((score.mScore || 0) / maxM) * 100 : 0;
      score.loyaltyScore = (0.5 * normR) + (0.3 * normF) + (0.2 * normM);
    });
  
    // Sort by loyalty score
    customerScores.sort((a, b) => (b.loyaltyScore || 0) - (a.loyaltyScore || 0));
  
    // Assign tiers
    const tierMap = new Map<string, string>();
    const scoredCustomers = customerScores.filter(s => (s.loyaltyScore || 0) > 0);
    const totalScoredCustomers = scoredCustomers.length;

    const diamanteCutoff = Math.ceil(totalScoredCustomers * 0.05);
    const oroCutoff = Math.ceil(totalScoredCustomers * 0.20);
    const plataCutoff = Math.ceil(totalScoredCustomers * 0.50);

    scoredCustomers.forEach((score, index) => {
      const rank = index + 1;
      if (rank <= diamanteCutoff) {
        tierMap.set(score.customerId, 'diamante');
      } else if (rank <= oroCutoff) {
        tierMap.set(score.customerId, 'oro');
      } else if (rank <= plataCutoff) {
        tierMap.set(score.customerId, 'plata');
      } else {
        tierMap.set(score.customerId, 'bronce');
      }
    });
  
    // Map tiers back to customers
    return customers.map(customer => ({
      ...customer,
      tier: tierMap.get(customer._id.toString()) || 'bronce',
    }));
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<CustomerDocument | null> {
    return this.customerModel
      .findOne({ _id: id, tenantId })
      .populate("assignedTo", "firstName lastName")
      .populate("createdBy", "firstName lastName")
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
      { status: "inactive", inactiveReason: "Eliminado por usuario" },
    );

    return result.modifiedCount > 0;
  }

  private async generateCustomerNumber(tenantId: string): Promise<string> {
    const count = await this.customerModel.countDocuments({ tenantId });
    return `CLI-${(count + 1).toString().padStart(6, "0")}`;
  }
}
