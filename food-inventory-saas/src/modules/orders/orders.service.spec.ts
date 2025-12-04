import { Types } from "mongoose";
import { OrdersService } from "./orders.service";
import { FEATURES } from "../../config/features.config";

describe("OrdersService - Employee Assignment", () => {
  let service: OrdersService;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  const tenantModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const customerDoc = {
    _id: new Types.ObjectId(),
    name: "Test Customer",
    primaryLocation: null,
  } as any;

  const customerFindByIdExec = jest.fn().mockResolvedValue(customerDoc);
  const customerFindOneExec = jest.fn().mockResolvedValue(null);

  const customerModel = {
    findById: jest.fn().mockReturnValue({ exec: customerFindByIdExec }),
    findOne: jest.fn().mockReturnValue({ exec: customerFindOneExec }),
    findByIdAndUpdate: jest.fn(),
  };

  const productDoc = {
    _id: new Types.ObjectId(),
    sku: "SKU-1",
    name: "Test Product",
    price: 10,
    variants: [{ basePrice: 10, costPrice: 5 }],
    hasMultipleSellingUnits: false,
    ivaApplicable: false,
    unitOfMeasure: "unidad",
  } as any;

  const productModel = {
    find: jest.fn(),
  };

  const paymentsService = {
    create: jest.fn(),
  };

  const accountingService = {
    createJournalEntryForSale: jest.fn(),
    createJournalEntryForCOGS: jest.fn(),
  };

  const inventoryService = {
    reserveInventory: jest.fn(),
  };

  const deliveryService = {
    calculateDeliveryCost: jest.fn(),
  };

  const shiftsService = {
    findActiveShift: jest.fn(),
  };

  let orderModelMock: jest.Mock;
  let orderSaveMock: jest.Mock;
  let savedOrderPayload: any;

  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });

    tenantModel.findById.mockResolvedValue({
      usage: { currentOrders: 0 },
      limits: { maxOrders: 100 },
    });
    tenantModel.findByIdAndUpdate.mockResolvedValue(null);

    customerFindByIdExec.mockResolvedValue(customerDoc);
    customerFindOneExec.mockResolvedValue(null);
    customerModel.findByIdAndUpdate.mockResolvedValue(null);

    productModel.find.mockResolvedValue([productDoc]);

    paymentsService.create.mockResolvedValue(null);
    accountingService.createJournalEntryForSale.mockResolvedValue(null);
    accountingService.createJournalEntryForCOGS.mockResolvedValue(null);
    inventoryService.reserveInventory.mockResolvedValue(null);
    deliveryService.calculateDeliveryCost.mockResolvedValue({ cost: 0 });

    orderSaveMock = jest.fn().mockImplementation(async () => {
      return {
        ...savedOrderPayload,
        _id: new Types.ObjectId(),
        items: savedOrderPayload.items ?? [],
        inventoryReservation: savedOrderPayload.inventoryReservation ?? {
          isReserved: false,
        },
        toObject() {
          return { ...this };
        },
      };
    });

    orderModelMock = jest.fn().mockImplementation((payload) => {
      savedOrderPayload = payload;
      return { save: orderSaveMock };
    });

    const discountServiceMock = {
      calculateBestDiscount: jest.fn().mockResolvedValue({
        discountApplied: 0,
        discountedPrice: productDoc.price,
        appliedDiscount: null,
      }),
    };

    service = new OrdersService(
      orderModelMock as any,
      customerModel as any,
      productModel as any,
      tenantModel as any,
      {} as any, // bankAccountModel
      {} as any, // bomModel
      {} as any, // modifierModel
      inventoryService as any,
      accountingService as any,
      paymentsService as any,
      deliveryService as any,
      {} as any, // exchangeRateService
      shiftsService as any,
      discountServiceMock as any,
      {} as any, // transactionHistoryService
      {} as any, // couponsService
      {} as any, // promotionsService
      { emit: jest.fn() } as any, // eventEmitter
      {} as any, // connection
    );

    FEATURES.EMPLOYEE_PERFORMANCE_TRACKING = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    FEATURES.EMPLOYEE_PERFORMANCE_TRACKING = false;
  });

  const baseOrderDto = {
    customerId: customerDoc._id.toString(),
    items: [
      {
        productId: productDoc._id.toString(),
        quantity: 2,
      },
    ],
    payments: [],
    discountAmount: 0,
    deliveryMethod: "pickup",
  } as any;

  const baseUser = {
    id: userId,
    tenantId,
  };

  it("assigns the order to the authenticated user when an active shift exists", async () => {
    shiftsService.findActiveShift.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await service.create(baseOrderDto, baseUser);
    jest.runAllTimers();

    expect(shiftsService.findActiveShift).toHaveBeenCalledWith(
      userId,
      tenantId,
    );
    expect(orderModelMock).toHaveBeenCalledTimes(1);
    const assignedPayload = orderModelMock.mock.calls[0][0];
    expect(assignedPayload.assignedTo).toBeInstanceOf(Types.ObjectId);
    expect((assignedPayload.assignedTo as Types.ObjectId).toHexString()).toBe(
      userId,
    );
  });

  it("leaves the order unassigned when no active shift is found", async () => {
    shiftsService.findActiveShift.mockResolvedValue(null);

    await service.create(baseOrderDto, baseUser);
    jest.runAllTimers();

    const assignedPayload = orderModelMock.mock.calls[0][0];
    expect(assignedPayload.assignedTo).toBeUndefined();
  });
});
