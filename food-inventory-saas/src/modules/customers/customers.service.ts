import { Injectable, Logger } from "@nestjs/common";
import { LoyaltyService } from "../loyalty/loyalty.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, SortOrder } from "mongoose";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Order, OrderDocument } from "../../schemas/order.schema";
import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from "../../schemas/employee-profile.schema";
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

interface RecordCommunicationEventOptions {
  tenantId: string;
  customerId: string;
  event: {
    templateId: string;
    channels: string[];
    deliveredAt: Date;
    appointmentId?: string;
    contextSnapshot?: Record<string, any>;
    engagementDelta?: number;
  };
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(EmployeeProfile.name)
    private employeeProfileModel: Model<EmployeeProfileDocument>,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) {
      return id;
    }
    return new Types.ObjectId(id);
  }

  async generateEmployeeNumber(tenantId: string): Promise<string> {
    const tenantObjectId = this.toObjectId(tenantId);
    const lastEmployee = await this.employeeProfileModel
      .findOne({
        tenantId: tenantObjectId,
        employeeNumber: /^EMP-/  // Filtrar solo empleados con formato EMP-*
      })
      .sort({ employeeNumber: -1 })
      .exec();

    if (!lastEmployee?.employeeNumber) {
      return "EMP-000001";
    }

    const match = lastEmployee.employeeNumber.match(/EMP-(\d+)/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `EMP-${String(nextNumber).padStart(6, "0")}`;
    }

    return "EMP-000001";
  }

  private async createEmployeeProfileForCustomer(
    customerId: Types.ObjectId,
    tenantId: string,
  ): Promise<void> {
    try {
      const tenantObjectId = this.toObjectId(tenantId);
      const employeeNumber = await this.generateEmployeeNumber(tenantId);

      await this.employeeProfileModel.create({
        tenantId: tenantObjectId,
        customerId: customerId,
        employeeNumber: employeeNumber,
        status: "active",
        hireDate: new Date(),
      });

      this.logger.log(
        `EmployeeProfile created automatically for customer ${customerId} with number ${employeeNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create EmployeeProfile for customer ${customerId}: ${error.message}`,
      );
      // No lanzamos el error para no fallar la creación del customer
    }
  }

  async create(
    createCustomerDto: CreateCustomerDto,
    user: any,
  ): Promise<CustomerDocument> {
    this.logger.log(`Creating customer: ${createCustomerDto.name}`);

    const customerNumber = await this.generateCustomerNumber(user.tenantId);

    const customerData = {
      ...createCustomerDto,
      customerNumber,
      tier: "bronce", // Default tier for new customers
      loyaltyScore: 0,
      loyalty: {
        tier: "bronce",
        lastUpgradeAt: new Date(),
        benefits: [],
        pendingRewards: [],
      },
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
      createdBy: this.toObjectId(user.id),
      tenantId: this.toObjectId(user.tenantId),
    };

    const customer = new this.customerModel(customerData);
    const savedCustomer = await customer.save();

    // Si es un empleado, crear automáticamente el EmployeeProfile
    if (createCustomerDto.customerType === "employee") {
      await this.createEmployeeProfileForCustomer(
        savedCustomer._id,
        user.tenantId,
      );
    }

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
      sortBy = "metrics.totalSpent",
      sortOrder = "desc",
    } = query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 20, 1);
    const sortDirection: SortOrder = sortOrder === "asc" ? "asc" : "desc";
    const sortKey = sortBy || "metrics.totalSpent";
    const searchTerm = typeof search === "string" ? search.trim() : "";
    const isSearching = searchTerm.length > 0;

    const tenantIdVariants: (string | Types.ObjectId)[] = [tenantId];
    if (Types.ObjectId.isValid(tenantId)) {
      tenantIdVariants.push(new Types.ObjectId(tenantId));
    }

    const filter: any = {
      tenantId:
        tenantIdVariants.length > 1 ? { $in: tenantIdVariants } : tenantId,
    };

    if (customerType && customerType !== "all") {
      filter.customerType = customerType;
    }
    if (status && status !== "all") {
      filter.status = status;
    } else {
      filter.status = { $ne: "inactive" };
    }
    if (assignedTo) {
      filter.assignedTo = new Types.ObjectId(assignedTo);
    }

    if (isSearching) {
      const regex = new RegExp(this.escapeRegExp(searchTerm), "i");
      filter.$or = [
        { name: regex },
        { lastName: regex },
        { companyName: regex },
        { customerNumber: regex },
        { "taxInfo.taxId": regex },
        { contacts: { $elemMatch: { value: regex } } },
      ];
    }

    try {
      const aggregationPipeline: any[] = [
        { $match: filter },

        // Lookup órdenes - with robust type checking, paymentStatus, AND tenantId
        {
          $lookup: {
            from: "orders",
            let: {
              customerId: "$_id",
              currentTenantId: "$tenantId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // 1. Match tenantId (handle mixed ObjectId/String types)
                      {
                        $or: [
                          // Both are same type and equal
                          { $eq: ["$tenantId", "$$currentTenantId"] },
                          // Order is string, customer is ObjectId
                          {
                            $and: [
                              { $eq: [{ $type: "$tenantId" }, "string"] },
                              {
                                $eq: [
                                  { $type: "$$currentTenantId" },
                                  "objectId",
                                ],
                              },
                              { $eq: [{ $strLenCP: "$tenantId" }, 24] },
                              {
                                $eq: [
                                  { $toObjectId: "$tenantId" },
                                  "$$currentTenantId",
                                ],
                              },
                            ],
                          },
                          // Order is ObjectId, customer is string
                          {
                            $and: [
                              { $eq: [{ $type: "$tenantId" }, "objectId"] },
                              {
                                $eq: [{ $type: "$$currentTenantId" }, "string"],
                              },
                              {
                                $eq: [
                                  "$tenantId",
                                  { $toObjectId: "$$currentTenantId" },
                                ],
                              },
                            ],
                          },
                        ],
                      },

                      // 2. Match customerId (robust type handling)
                      {
                        $or: [
                          {
                            $and: [
                              { $eq: [{ $type: "$customerId" }, "objectId"] },
                              { $eq: ["$customerId", "$$customerId"] },
                            ],
                          },
                          {
                            $and: [
                              { $eq: [{ $type: "$customerId" }, "string"] },
                              { $eq: [{ $strLenCP: "$customerId" }, 24] },
                              {
                                $eq: [
                                  { $toObjectId: "$customerId" },
                                  "$$customerId",
                                ],
                              },
                            ],
                          },
                        ],
                      },

                      // 3. Match paymentStatus
                      { $in: ["$paymentStatus", ["paid", "partial"]] },
                    ],
                  },
                },
              },
              {
                $project: {
                  totalAmount: 1,
                  createdAt: 1,
                  paymentStatus: 1,
                },
              },
            ],
            as: "customerOrders",
          },
        },

        // Lookup purchase orders
        {
          $lookup: {
            from: "purchaseorders",
            let: { supplierId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$supplierId", "$supplierId"] },
                },
              },
            ],
            as: "purchaseOrders",
          },
        },

        // Lookup assignedTo
        {
          $lookup: {
            from: "users",
            localField: "assignedTo",
            foreignField: "_id",
            as: "assignedToUser",
          },
        },

        // Lookup hospitality deposits (confirmed)
        {
          $lookup: {
            from: "appointments",
            let: {
              customerId: "$_id",
              currentTenantId: "$tenantId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // Tenant match (string/ObjectId tolerant)
                      {
                        $or: [
                          {
                            $and: [
                              { $eq: [{ $type: "$tenantId" }, "objectId"] },
                              { $eq: ["$tenantId", "$$currentTenantId"] },
                            ],
                          },
                          {
                            $and: [
                              { $eq: [{ $type: "$tenantId" }, "string"] },
                              { $eq: [{ $strLenCP: "$tenantId" }, 24] },
                              {
                                $eq: [
                                  { $toObjectId: "$tenantId" },
                                  "$$currentTenantId",
                                ],
                              },
                            ],
                          },
                          {
                            $and: [
                              { $eq: [{ $type: "$tenantId" }, "objectId"] },
                              {
                                $eq: [{ $type: "$$currentTenantId" }, "string"],
                              },
                              {
                                $eq: [
                                  "$tenantId",
                                  { $toObjectId: "$$currentTenantId" },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      // Customer match
                      {
                        $or: [
                          {
                            $and: [
                              { $eq: [{ $type: "$customerId" }, "objectId"] },
                              { $eq: ["$customerId", "$$customerId"] },
                            ],
                          },
                          {
                            $and: [
                              { $eq: [{ $type: "$customerId" }, "string"] },
                              { $eq: [{ $strLenCP: "$customerId" }, 24] },
                              {
                                $eq: [
                                  { $toObjectId: "$customerId" },
                                  "$$customerId",
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              { $project: { depositRecords: 1 } },
              { $unwind: "$depositRecords" },
              { $match: { "depositRecords.status": "confirmed" } },
              {
                $addFields: {
                  depositAmount: {
                    $ifNull: [
                      "$depositRecords.confirmedAmount",
                      "$depositRecords.amount",
                    ],
                  },
                  depositAmountUsd: {
                    $let: {
                      vars: {
                        amount: {
                          $ifNull: [
                            "$depositRecords.confirmedAmount",
                            "$depositRecords.amount",
                          ],
                        },
                        amountUsd: {
                          $ifNull: ["$depositRecords.amountUsd", 0],
                        },
                        currency: {
                          $toUpper: {
                            $ifNull: ["$depositRecords.currency", "USD"],
                          },
                        },
                        exchangeRate: {
                          $ifNull: ["$depositRecords.exchangeRate", 0],
                        },
                      },
                      in: {
                        $cond: [
                          { $gt: ["$$amountUsd", 0] },
                          "$$amountUsd",
                          {
                            $cond: [
                              {
                                $and: [
                                  { $eq: ["$$currency", "VES"] },
                                  { $gt: ["$$exchangeRate", 0] },
                                ],
                              },
                              {
                                $divide: [
                                  { $ifNull: ["$$amount", 0] },
                                  "$$exchangeRate",
                                ],
                              },
                              { $ifNull: ["$$amount", 0] },
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  totalAmount: { $sum: { $ifNull: ["$depositAmount", 0] } },
                  totalAmountUsd: {
                    $sum: { $ifNull: ["$depositAmountUsd", 0] },
                  },
                  lastDepositAt: { $max: "$depositRecords.confirmedAt" },
                  depositCount: { $sum: 1 },
                },
              },
            ],
            as: "appointmentDeposits",
          },
        },

        // Calcular métricas
        {
          $addFields: {
            depositSummary: {
              $arrayElemAt: ["$appointmentDeposits", 0],
            },
            totalDepositsAmount: {
              $ifNull: [
                { $arrayElemAt: ["$appointmentDeposits.totalAmount", 0] },
                0,
              ],
            },
            totalDepositsAmountUsd: {
              $ifNull: [
                { $arrayElemAt: ["$appointmentDeposits.totalAmountUsd", 0] },
                0,
              ],
            },
            lastDepositAt: {
              $ifNull: [
                { $arrayElemAt: ["$appointmentDeposits.lastDepositAt", 0] },
                null,
              ],
            },
            depositCount: {
              $ifNull: [
                { $arrayElemAt: ["$appointmentDeposits.depositCount", 0] },
                0,
              ],
            },
            "metrics.totalSpent": {
              $cond: {
                if: { $ne: ["$customerType", "supplier"] },
                then: {
                  $add: [
                    { $sum: "$customerOrders.totalAmount" },
                    {
                      $ifNull: [
                        {
                          $arrayElemAt: [
                            "$appointmentDeposits.totalAmountUsd",
                            0,
                          ],
                        },
                        0,
                      ],
                    },
                  ],
                },
                else: { $ifNull: ["$metrics.totalSpent", 0] },
              },
            },
            "metrics.totalSpentUSD": {
              $cond: {
                if: { $ne: ["$customerType", "supplier"] },
                then: {
                  $add: [
                    { $sum: "$customerOrders.totalAmount" },
                    {
                      $ifNull: [
                        {
                          $arrayElemAt: [
                            "$appointmentDeposits.totalAmountUsd",
                            0,
                          ],
                        },
                        0,
                      ],
                    },
                  ],
                },
                else: { $ifNull: ["$metrics.totalSpentUSD", 0] },
              },
            },

            "metrics.totalOrders": {
              $cond: {
                if: { $ne: ["$customerType", "supplier"] },
                then: { $size: "$customerOrders" },
                else: { $ifNull: ["$metrics.totalOrders", 0] },
              },
            },

            "metrics.lastOrderDate": {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$customerType", "supplier"] },
                    { $gt: [{ $size: "$customerOrders" }, 0] },
                  ],
                },
                then: {
                  $let: {
                    vars: {
                      lastOrderDate: { $max: "$customerOrders.createdAt" },
                      lastDepositDate: {
                        $arrayElemAt: ["$appointmentDeposits.lastDepositAt", 0],
                      },
                    },
                    in: {
                      $cond: [
                        {
                          $gt: [
                            "$$lastOrderDate",
                            {
                              $ifNull: ["$$lastDepositDate", "$$lastOrderDate"],
                            },
                          ],
                        },
                        "$$lastOrderDate",
                        { $ifNull: ["$$lastDepositDate", "$$lastOrderDate"] },
                      ],
                    },
                  },
                },
                else: {
                  $ifNull: [
                    {
                      $arrayElemAt: ["$appointmentDeposits.lastDepositAt", 0],
                    },
                    "$metrics.lastOrderDate",
                  ],
                },
              },
            },

            "metrics.totalPurchaseOrders": {
              $cond: {
                if: { $eq: ["$customerType", "supplier"] },
                then: { $size: "$purchaseOrders" },
                else: { $ifNull: ["$metrics.totalPurchaseOrders", 0] },
              },
            },
            "metrics.totalDeposits": {
              $ifNull: [
                { $arrayElemAt: ["$appointmentDeposits.totalAmountUsd", 0] },
                0,
              ],
            },
            "metrics.depositCount": {
              $ifNull: [
                { $arrayElemAt: ["$appointmentDeposits.depositCount", 0] },
                0,
              ],
            },
            "metrics.lastDepositDate": {
              $ifNull: [
                { $arrayElemAt: ["$appointmentDeposits.lastDepositAt", 0] },
                "$metrics.lastDepositDate",
              ],
            },

            assignedTo: {
              $cond: {
                if: { $gt: [{ $size: "$assignedToUser" }, 0] },
                then: {
                  $let: {
                    vars: { user: { $arrayElemAt: ["$assignedToUser", 0] } },
                    in: {
                      _id: "$user._id",
                      firstName: "$user.firstName",
                      lastName: "$user.lastName",
                    },
                  },
                },
                else: null,
              },
            },
          },
        },

        {
          $project: {
            customerOrders: 0,
            purchaseOrders: 0,
            assignedToUser: 0,
            appointmentDeposits: 0,
            depositSummary: 0,
            totalDepositsAmount: 0,
            totalDepositsAmountUsd: 0,
            lastDepositAt: 0,
            depositCount: 0,
          },
        },
      ];

      const totalPipeline = [...aggregationPipeline, { $count: "total" }];
      const totalResult = await this.customerModel.aggregate(totalPipeline);
      const total = totalResult[0]?.total || 0;

      const aggregationSort: Record<string, 1 | -1> = {
        [sortKey]: sortOrder === "asc" ? 1 : -1,
      };

      aggregationPipeline.push({ $sort: aggregationSort });
      aggregationPipeline.push({ $skip: (pageNumber - 1) * limitNumber });
      aggregationPipeline.push({ $limit: limitNumber });

      const customers = await this.customerModel.aggregate(aggregationPipeline);

      const customersWithTiers = await this.calculateAndAssignTiers(
        customers,
        tenantId,
      );

      return {
        customers: customersWithTiers,
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      };
    } catch (error) {
      this.logger.error(`Error in findAll aggregation: ${error.message}`);
      this.logger.error(`Full error:`, error);

      const fallbackSortKey =
        sortKey === "metrics.totalSpent" ? "createdAt" : sortKey;
      const sortOptions: Record<string, SortOrder> = {
        [fallbackSortKey]: sortDirection,
      };
      const skip = (pageNumber - 1) * limitNumber;

      const [customers, total] = await Promise.all([
        this.customerModel
          .find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNumber)
          .lean()
          .populate("assignedTo", "firstName lastName")
          .exec(),
        this.customerModel.countDocuments(filter),
      ]);

      const customersWithTiers = await this.calculateAndAssignTiers(
        customers,
        tenantId,
      );

      return {
        customers: customersWithTiers,
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      };
    }
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private async calculateAndAssignTiers(
    customers: any[],
    tenantId: string,
  ): Promise<any[]> {
    if (customers.length === 0) {
      return customers;
    }

    const customersToProcess = customers.filter(
      (c) => c.customerType === "business" || c.customerType === "individual",
    );

    if (customersToProcess.length === 0) {
      return customers;
    }

    const processedCustomers = await this.calculateCustomerTiers(
      customersToProcess,
      tenantId,
    );

    const processedMap = new Map(
      processedCustomers.map((p) => [p._id.toString(), p]),
    );

    return customers.map((c) => processedMap.get(c._id.toString()) || c);
  }

  private async calculateCustomerTiers(
    customers: any[],
    tenantId: string,
  ): Promise<any[]> {
    if (customers.length === 0) {
      return [];
    }

    const tenantObjectId = new Types.ObjectId(tenantId);
    const allOrders = await this.orderModel
      .find({
        tenantId: tenantObjectId,
        status: { $in: ["delivered", "paid", "confirmed", "processing"] },
      })
      .lean();

    const ordersByCustomer = new Map<string, any[]>();
    allOrders.forEach((order) => {
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

      const lastOrderDate = customerOrders.reduce(
        (max, order) => (order.createdAt > max ? order.createdAt : max),
        customerOrders[0].createdAt,
      );
      const daysSinceLastPurchase = Math.floor(
        (today.getTime() - new Date(lastOrderDate).getTime()) /
          (1000 * 3600 * 24),
      );
      const rScore = 100 / (daysSinceLastPurchase + 1);
      const fScore = customerOrders.length;
      const mScore = customerOrders.reduce((sum, order) => {
        const daysAgo = Math.floor(
          (today.getTime() - new Date(order.createdAt).getTime()) /
            (1000 * 3600 * 24),
        );
        const weight = Math.pow(0.99, daysAgo);
        return sum + order.totalAmount * weight;
      }, 0);

      customerScores.push({ customerId, rScore, fScore, mScore });
    }

    const maxR = Math.max(...customerScores.map((s) => s.rScore || 0));
    const maxF = Math.max(...customerScores.map((s) => s.fScore || 0));
    const maxM = Math.max(...customerScores.map((s) => s.mScore || 0));

    const scoreMap = new Map<string, number>();
    customerScores.forEach((score) => {
      const normR = maxR > 0 ? ((score.rScore || 0) / maxR) * 100 : 0;
      const normF = maxF > 0 ? ((score.fScore || 0) / maxF) * 100 : 0;
      const normM = maxM > 0 ? ((score.mScore || 0) / maxM) * 100 : 0;
      score.loyaltyScore = 0.5 * normR + 0.3 * normF + 0.2 * normM;
      scoreMap.set(score.customerId, score.loyaltyScore);
    });

    customerScores.sort(
      (a, b) => (b.loyaltyScore || 0) - (a.loyaltyScore || 0),
    );

    const tierMap = new Map<string, string>();
    const scoredCustomers = customerScores.filter(
      (s) => (s.loyaltyScore || 0) > 0,
    );
    const totalScoredCustomers = scoredCustomers.length;

    // Use RANGES instead of cumulative cutoffs to avoid overlap
    // Top 5% = diamante, next 15% (5-20%) = oro, next 30% (20-50%) = plata, rest = bronce
    const diamanteEnd = Math.max(1, Math.floor(totalScoredCustomers * 0.05));
    const oroEnd = Math.max(
      diamanteEnd + 1,
      Math.floor(totalScoredCustomers * 0.2),
    );
    const plataEnd = Math.max(
      oroEnd + 1,
      Math.floor(totalScoredCustomers * 0.5),
    );

    scoredCustomers.forEach((score, index) => {
      const rank = index + 1;
      if (rank <= diamanteEnd) {
        tierMap.set(score.customerId, "diamante");
      } else if (rank <= oroEnd) {
        tierMap.set(score.customerId, "oro");
      } else if (rank <= plataEnd) {
        tierMap.set(score.customerId, "plata");
      } else {
        tierMap.set(score.customerId, "bronce");
      }
    });

    await Promise.all(
      customerScores.map((score) =>
        this.loyaltyService.syncTierFromScore({
          tenantId,
          customerId: score.customerId,
          loyaltyScore: score.loyaltyScore || 0,
        }),
      ),
    );

    return customers.map((customer) => {
      const tier = tierMap.get(customer._id.toString()) || "bronce";
      const loyaltyScore = scoreMap.get(customer._id.toString()) || 0;

      // Preserve the metrics calculated by aggregation
      return {
        ...customer,
        tier,
        loyaltyScore,
        metrics: {
          ...(customer.metrics || {}),
          // Ensure aggregation-calculated values are preserved
          totalSpent: customer.metrics?.totalSpent ?? 0,
          totalOrders: customer.metrics?.totalOrders ?? 0,
        },
      };
    });
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<CustomerDocument | null> {
    const tenantCandidates = Types.ObjectId.isValid(tenantId)
      ? [tenantId, new Types.ObjectId(tenantId)]
      : [tenantId];
    const idFilter = Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;

    return this.customerModel
      .findOne({
        _id: idFilter,
        tenantId: { $in: tenantCandidates },
      })
      .populate("assignedTo", "firstName lastName")
      .populate("createdBy", "firstName lastName")
      .exec();
  }

  async findByEmail(email: string, tenantId: string) {
    if (!email) {
      return null;
    }

    const emailCandidates = [email, email.toLowerCase()];
    const tenantCandidates = Types.ObjectId.isValid(tenantId)
      ? [tenantId, new Types.ObjectId(tenantId)]
      : [tenantId];

    return this.customerModel
      .findOne({
        tenantId: { $in: tenantCandidates },
        "contacts.value": { $in: emailCandidates },
      })
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

    const tenantFilter = Types.ObjectId.isValid(user.tenantId)
      ? { $in: [user.tenantId, new Types.ObjectId(user.tenantId)] }
      : user.tenantId;

    return this.customerModel
      .findOneAndUpdate({ _id: id, tenantId: tenantFilter }, updateData, {
        new: true,
        runValidators: true,
      })
      .exec();
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    this.logger.log(`Soft deleting customer with ID: ${id}`);

    const tenantFilter = Types.ObjectId.isValid(tenantId)
      ? { $in: [tenantId, new Types.ObjectId(tenantId)] }
      : tenantId;

    const result = await this.customerModel.updateOne(
      { _id: id, tenantId: tenantFilter },
      { status: "inactive", inactiveReason: "Eliminado por usuario" },
    );

    return result.modifiedCount > 0;
  }

  async recordCommunicationEvent(
    options: RecordCommunicationEventOptions,
  ): Promise<void> {
    const tenantCandidates = Types.ObjectId.isValid(options.tenantId)
      ? [options.tenantId, new Types.ObjectId(options.tenantId)]
      : [options.tenantId];

    const customer = await this.customerModel
      .findOne({
        _id: options.customerId,
        tenantId: { $in: tenantCandidates },
      })
      .exec();

    if (!customer) {
      this.logger.warn(
        `Customer ${options.customerId} not found to record communication event`,
      );
      return;
    }

    customer.communicationEvents = customer.communicationEvents || [];
    customer.communicationEvents.push({
      templateId: options.event.templateId,
      channels: options.event.channels,
      deliveredAt: options.event.deliveredAt,
      appointmentId: options.event.appointmentId,
      contextSnapshot: options.event.contextSnapshot,
      engagementDelta: options.event.engagementDelta,
    });

    const latestChannel = options.event.channels?.[0];
    const preferences = customer.preferences || {
      preferredCurrency: "VES",
      preferredPaymentMethod: "pending",
      preferredDeliveryMethod: "delivery",
      communicationChannel: latestChannel || "email",
      marketingOptIn: true,
      invoiceRequired: false,
    };

    preferences.communicationChannel =
      latestChannel || preferences.communicationChannel;
    customer.preferences = preferences;

    customer.lastContactDate = options.event.deliveredAt;

    customer.metrics = customer.metrics || ({} as any);
    customer.metrics.communicationTouchpoints =
      (customer.metrics.communicationTouchpoints || 0) + 1;

    const delta =
      typeof options.event.engagementDelta === "number"
        ? options.event.engagementDelta
        : this.calculateEngagementDelta(options.event.channels);
    const previousScore = customer.metrics.engagementScore || 0;
    customer.metrics.engagementScore = Math.max(
      0,
      Math.min(100, previousScore + delta),
    );

    customer.nextFollowUpDate = this.calculateNextFollowUpDate(
      customer.metrics.engagementScore,
      options.event.channels,
    );

    this.applyHospitalityTags(customer);

    customer.markModified("communicationEvents");
    customer.markModified("metrics");
    customer.markModified("preferences");
    customer.markModified("segments");

    await customer.save();
  }

  private calculateEngagementDelta(channels: string[]): number {
    if (!channels || channels.length === 0) {
      return 1;
    }
    const normalized = channels.map((channel) => channel.toLowerCase());
    if (normalized.includes("whatsapp")) {
      return 8;
    }
    if (normalized.includes("sms")) {
      return 6;
    }
    return 4;
  }

  private calculateNextFollowUpDate(
    engagementScore: number,
    channels: string[],
  ): Date | undefined {
    const baseDays = engagementScore >= 80 ? 3 : engagementScore >= 50 ? 7 : 14;
    const hasAsyncChannel = channels.some((channel) =>
      ["whatsapp", "sms"].includes(channel.toLowerCase()),
    );
    const days = hasAsyncChannel ? Math.max(2, baseDays - 2) : baseDays;
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + days);
    return followUp;
  }

  private applyHospitalityTags(customer: CustomerDocument): void {
    const segments = Array.isArray(customer.segments)
      ? [...customer.segments]
      : [];

    const ensureSegment = (name: string, description: string) => {
      const exists = segments.some((segment) => segment.name === name);
      if (!exists) {
        segments.push({
          name,
          description,
          assignedAt: new Date(),
          assignedBy:
            (customer.createdBy as Types.ObjectId) ||
            (customer.tenantId as unknown as Types.ObjectId),
        });
      }
    };

    if ((customer.metrics?.engagementScore || 0) >= 80) {
      ensureSegment("VIP", "Alto engagement en comunicaciones automatizadas");
    }

    if (
      customer.communicationEvents?.some((event) =>
        event.channels.includes("whatsapp"),
      )
    ) {
      ensureSegment("WhatsApp", "Cliente con interacción por WhatsApp");
    }

    if (
      customer.communicationEvents?.filter((event) =>
        event.channels.includes("email"),
      ).length >= 5
    ) {
      ensureSegment("Email Engaged", "Cliente que responde correos frecuentes");
    }

    customer.segments = segments;
  }

  async getProductHistory(
    customerId: string,
    tenantId: string,
  ): Promise<any[]> {
    this.logger.log(
      `Getting product history for customer: ${customerId}, tenant: ${tenantId}`,
    );

    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;
    const customerObjectId = Types.ObjectId.isValid(customerId)
      ? new Types.ObjectId(customerId)
      : customerId;

    // Aggregate orders to get product purchase history
    const productHistory = await this.orderModel.aggregate([
      {
        $match: {
          customerId: customerObjectId,
          tenantId: tenantObjectId,
          status: { $in: ["delivered", "paid", "confirmed", "processing"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.name" },
          category: { $first: "$items.category" },
          purchaseCount: { $sum: "$items.quantity" },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$items.total" },
          lastPurchaseDate: { $max: "$createdAt" },
          firstPurchaseDate: { $min: "$createdAt" },
        },
      },
      { $sort: { purchaseCount: -1 } },
    ]);

    return productHistory.map((item) => ({
      productId: item._id,
      productName: item.productName,
      category: item.category,
      purchaseCount: item.purchaseCount,
      orderCount: item.orderCount,
      totalSpent: item.totalSpent,
      lastPurchaseDate: item.lastPurchaseDate,
      firstPurchaseDate: item.firstPurchaseDate,
      daysSinceLastPurchase: item.lastPurchaseDate
        ? Math.floor(
            (Date.now() - new Date(item.lastPurchaseDate).getTime()) /
              (1000 * 3600 * 24),
          )
        : null,
    }));
  }

  private async generateCustomerNumber(tenantId: string): Promise<string> {
    const tenantObjectId = this.toObjectId(tenantId);

    // Buscar el último customerNumber CON FORMATO CLI-* para este tenant
    const lastCustomer = await this.customerModel
      .findOne({
        tenantId: tenantObjectId,
        customerNumber: /^CLI-/  // Filtrar solo clientes con formato CLI-*
      })
      .sort({ customerNumber: -1 })
      .select('customerNumber')
      .exec();

    if (!lastCustomer?.customerNumber) {
      return 'CLI-000001';
    }

    // Extraer el número del formato CLI-XXXXXX
    const match = lastCustomer.customerNumber.match(/CLI-(\d+)/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `CLI-${String(nextNumber).padStart(6, '0')}`;
    }

    // Fallback si el formato no coincide
    return 'CLI-000001';
  }
}
