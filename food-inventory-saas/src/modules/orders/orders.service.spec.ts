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

  const exchangeRateService = {
    getBCVRate: jest.fn(),
    getRateForCurrency: jest.fn(),
  };

  const couponsService = {
    apply: jest.fn(),
    validate: jest.fn(),
  };

  const promotionsService = {
    apply: jest.fn(),
    findApplicable: jest.fn(),
    calculateDiscount: jest.fn(),
  };

  // Colaboradores añadidos al refactorizar OrdersService en sub-servicios.
  const priceListsService = {
    getProductPrice: jest.fn(),
  };
  const whatsappOrderNotificationsService = {
    sendOrderConfirmation: jest.fn(),
  };
  const orderAnalyticsService = {} as any;
  const orderFulfillmentService = {} as any;
  const orderInventoryService = {} as any;
  const transactionHistoryService = {} as any;
  const tableModel = {
    findByIdAndUpdate: jest.fn(),
  };
  const orderPaymentsService = {
    registerPayments: jest.fn(),
    confirmPayment: jest.fn(),
    redeemStoreCredit: jest.fn(),
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
    exchangeRateService.getBCVRate.mockResolvedValue({ rate: 1 });
    exchangeRateService.getRateForCurrency.mockResolvedValue({ rate: 1 });
    priceListsService.getProductPrice.mockResolvedValue(null);
    whatsappOrderNotificationsService.sendOrderConfirmation.mockResolvedValue(
      null,
    );
    couponsService.validate.mockResolvedValue({ isValid: false });
    promotionsService.findApplicable.mockResolvedValue([]);
    promotionsService.calculateDiscount.mockResolvedValue({ discount: 0 });
    tableModel.findByIdAndUpdate.mockResolvedValue(null);

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
    orderModelMock.findById = jest.fn();
    orderModelMock.findByIdAndUpdate = jest.fn();
    orderModelMock.findOne = jest.fn();

    const discountServiceMock = {
      calculateBestDiscount: jest.fn().mockResolvedValue({
        discountApplied: 0,
        discountedPrice: productDoc.price,
        appliedDiscount: null,
      }),
    };

    // El orden posicional debe coincidir EXACTAMENTE con el constructor real
    // de OrdersService (24 args) — ver orders.service.ts.
    service = new OrdersService(
      orderModelMock as any, // 1 orderModel
      customerModel as any, // 2 customerModel
      productModel as any, // 3 productModel
      tenantModel as any, // 4 tenantModel
      {} as any, // 5 bomModel
      tableModel as any, // 6 tableModel
      inventoryService as any, // 7 inventoryService
      accountingService as any, // 8 accountingService
      paymentsService as any, // 9 paymentsService
      deliveryService as any, // 10 deliveryService
      exchangeRateService as any, // 11 exchangeRateService
      shiftsService as any, // 12 shiftsService
      discountServiceMock as any, // 13 discountService
      transactionHistoryService as any, // 14 transactionHistoryService
      couponsService as any, // 15 couponsService
      promotionsService as any, // 16 promotionsService
      whatsappOrderNotificationsService as any, // 17 whatsappOrderNotificationsService
      priceListsService as any, // 18 priceListsService
      orderAnalyticsService as any, // 19 orderAnalyticsService
      orderFulfillmentService as any, // 20 orderFulfillmentService
      orderInventoryService as any, // 21 orderInventoryService
      orderPaymentsService as any, // 22 orderPaymentsService
      { emit: jest.fn() } as any, // 23 eventEmitter
      {} as any, // 24 connection
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

  it("findOne valida ownership por tenant", async () => {
    const exec = jest.fn().mockResolvedValue({ _id: "o1" });
    orderModelMock.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec,
    });

    await service.findOne("o1", tenantId);

    expect(orderModelMock.findOne).toHaveBeenCalledWith({
      _id: "o1",
      tenantId,
    });
    expect(exec).toHaveBeenCalled();
  });

  it("create con pagos USD aplica IGTF 3% y registra payment", async () => {
    const dto = {
      ...baseOrderDto,
      payments: [
        {
          method: "efectivo_usd",
          amount: 100,
          reference: "ref-igtf",
          date: new Date(),
        },
      ],
    } as any;
    await service.create(dto, baseUser);

    expect(savedOrderPayload.igtfTotal).toBeCloseTo(3);
    expect(savedOrderPayload.totalAmount).toBeCloseTo(23); // subtotal 20 + IGTF 3
    expect(paymentsService.create).toHaveBeenCalledTimes(1);
    expect(savedOrderPayload.paymentStatus).toBe("pending");
  });

  // NOTA: la lógica de registro de pagos (recompute de paymentStatus, IGTF,
  // movimientos de banco) se refactorizó a OrderPaymentsService. Aquí sólo se
  // verifica que OrdersService DELEGUE correctamente; el recompute se prueba en
  // los specs de OrderPaymentsService.
  it("registerPayments delega en OrderPaymentsService y devuelve su resultado", async () => {
    const orderId = new Types.ObjectId().toString();
    const delegated = {
      _id: orderId,
      paymentStatus: "partial",
      payments: [new Types.ObjectId()],
    };
    orderPaymentsService.registerPayments.mockResolvedValue(delegated as any);

    const dto = {
      payments: [
        {
          method: "efectivo_usd",
          amount: 100,
          reference: "ref-1",
          isConfirmed: true,
          date: new Date().toISOString(),
        },
      ],
    };

    const result = await service.registerPayments(
      orderId,
      dto as any,
      baseUser,
    );

    // Delega con (orderId, dto, user, findOneCallback)
    expect(orderPaymentsService.registerPayments).toHaveBeenCalledTimes(1);
    const call = orderPaymentsService.registerPayments.mock.calls[0];
    expect(call[0]).toBe(orderId);
    expect(call[1]).toBe(dto);
    expect(call[2]).toBe(baseUser);
    expect(typeof call[3]).toBe("function"); // findOne bound callback
    expect(result).toBe(delegated);
  });

  it("redeemStoreCredit delega en OrderPaymentsService", async () => {
    const orderId = new Types.ObjectId().toString();
    const delegated = { _id: orderId, paymentStatus: "paid" };
    orderPaymentsService.redeemStoreCredit.mockResolvedValue(delegated as any);

    const result = await service.redeemStoreCredit(orderId, 50, baseUser);

    expect(orderPaymentsService.redeemStoreCredit).toHaveBeenCalledTimes(1);
    const call = orderPaymentsService.redeemStoreCredit.mock.calls[0];
    expect(call[0]).toBe(orderId);
    expect(call[1]).toBe(50);
    expect(call[2]).toBe(baseUser);
    expect(typeof call[3]).toBe("function");
    expect(result).toBe(delegated);
  });
});
