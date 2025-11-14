import { Types } from "mongoose";
import { ConsumablesListener } from "./consumables.listener";

describe("ConsumablesListener", () => {
  let listener: ConsumablesListener;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const productId = new Types.ObjectId().toString();
  const consumableId = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId().toString();

  // Mock models
  const relationModel = {
    find: jest.fn(),
  };

  const inventoryModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const inventoryMovementModel = {
    create: jest.fn(),
    find: jest.fn(),
  };

  const productModel = {
    findById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    listener = new ConsumablesListener(
      relationModel as any,
      inventoryMovementModel as any,
      inventoryModel as any,
    );
  });

  describe("handleOrderCreated", () => {
    const orderCreatedEvent = {
      orderId,
      tenantId,
      items: [
        {
          productId,
          quantity: 2,
        },
      ],
      orderType: "takeaway",
      userId,
    };

    it("should deduct consumables when order is created", async () => {
      const relations = [
        {
          consumableId: new Types.ObjectId(consumableId),
          quantityRequired: 1,
          isAutoDeducted: true,
          applicableContext: "always",
        },
      ];

      const inventory = {
        _id: new Types.ObjectId(),
        productSku: "CONS-001",
        tenantId,
        lots: [
          {
            lotNumber: "LOT-001",
            availableQuantity: 100,
            receivedDate: new Date("2025-01-01"),
            expirationDate: new Date("2025-12-31"),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const product = {
        sku: "CONS-001",
      };

      relationModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(relations),
      });
      productModel.findById.mockResolvedValue(product);
      inventoryModel.findOne.mockResolvedValue(inventory);
      inventoryMovementModel.create.mockResolvedValue({});

      await listener.handleOrderCreated(orderCreatedEvent);

      // Should query relations for the product
      expect(relationModel.find).toHaveBeenCalledWith({
        productId,
        tenantId,
        isAutoDeducted: true,
        isActive: true,
      });

      // Should find inventory for the consumable
      expect(inventoryModel.findOne).toHaveBeenCalledWith({
        productSku: product.sku,
        tenantId,
      });

      // Should deduct quantity (2 products * 1 consumable each = 2 total)
      expect(inventory.lots[0].availableQuantity).toBe(98);
      expect(inventory.save).toHaveBeenCalled();

      // Should create inventory movement
      expect(inventoryMovementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          inventoryId: inventory._id,
          productSku: product.sku,
          tenantId,
          quantity: 2,
          movementType: "consumable_deduction",
          orderId: new Types.ObjectId(orderId),
        }),
      );
    });

    it("should skip consumables with wrong context", async () => {
      const relations = [
        {
          consumableId: new Types.ObjectId(consumableId),
          quantityRequired: 1,
          isAutoDeducted: true,
          applicableContext: "dine_in", // Event is 'takeaway'
        },
      ];

      relationModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(relations),
      });

      await listener.handleOrderCreated(orderCreatedEvent);

      expect(productModel.findById).not.toHaveBeenCalled();
      expect(inventoryModel.findOne).not.toHaveBeenCalled();
    });

    it("should handle multiple consumables for one product", async () => {
      const consumable1 = new Types.ObjectId().toString();
      const consumable2 = new Types.ObjectId().toString();

      const relations = [
        {
          consumableId: new Types.ObjectId(consumable1),
          quantityRequired: 1,
          isAutoDeducted: true,
          applicableContext: "always",
        },
        {
          consumableId: new Types.ObjectId(consumable2),
          quantityRequired: 2,
          isAutoDeducted: true,
          applicableContext: "always",
        },
      ];

      const inventory = {
        _id: new Types.ObjectId(),
        productSku: "CONS-001",
        tenantId,
        lots: [
          {
            lotNumber: "LOT-001",
            availableQuantity: 100,
            receivedDate: new Date("2025-01-01"),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const product = { sku: "CONS-001" };

      relationModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(relations),
      });
      productModel.findById.mockResolvedValue(product);
      inventoryModel.findOne.mockResolvedValue(inventory);
      inventoryMovementModel.create.mockResolvedValue({});

      await listener.handleOrderCreated(orderCreatedEvent);

      // Should be called twice (once for each consumable)
      expect(productModel.findById).toHaveBeenCalledTimes(2);
      expect(inventoryModel.findOne).toHaveBeenCalledTimes(2);
    });

    it("should apply FEFO strategy (First Expired, First Out)", async () => {
      const relations = [
        {
          consumableId: new Types.ObjectId(consumableId),
          quantityRequired: 1,
          isAutoDeducted: true,
          applicableContext: "always",
        },
      ];

      const inventory = {
        _id: new Types.ObjectId(),
        productSku: "CONS-001",
        tenantId,
        lots: [
          {
            lotNumber: "LOT-003",
            availableQuantity: 50,
            receivedDate: new Date("2025-03-01"),
            expirationDate: new Date("2025-09-01"), // Expires later
          },
          {
            lotNumber: "LOT-001",
            availableQuantity: 50,
            receivedDate: new Date("2025-01-01"),
            expirationDate: new Date("2025-06-01"), // Expires first
          },
          {
            lotNumber: "LOT-002",
            availableQuantity: 50,
            receivedDate: new Date("2025-02-01"),
            expirationDate: new Date("2025-07-01"), // Expires second
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const product = { sku: "CONS-001" };

      relationModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(relations),
      });
      productModel.findById.mockResolvedValue(product);
      inventoryModel.findOne.mockResolvedValue(inventory);
      inventoryMovementModel.create.mockResolvedValue({});

      await listener.handleOrderCreated(orderCreatedEvent);

      // Should deduct from LOT-001 first (earliest expiration)
      expect(inventory.lots[1].availableQuantity).toBe(48); // LOT-001
      expect(inventory.lots[0].availableQuantity).toBe(50); // LOT-003 unchanged
      expect(inventory.lots[2].availableQuantity).toBe(50); // LOT-002 unchanged
    });

    it("should handle insufficient inventory gracefully", async () => {
      const relations = [
        {
          consumableId: new Types.ObjectId(consumableId),
          quantityRequired: 1,
          isAutoDeducted: true,
          applicableContext: "always",
        },
      ];

      const inventory = {
        _id: new Types.ObjectId(),
        productSku: "CONS-001",
        tenantId,
        lots: [
          {
            lotNumber: "LOT-001",
            availableQuantity: 1, // Not enough for 2 products
            receivedDate: new Date("2025-01-01"),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const product = { sku: "CONS-001" };

      relationModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(relations),
      });
      productModel.findById.mockResolvedValue(product);
      inventoryModel.findOne.mockResolvedValue(inventory);

      // Should not throw error, just log warning
      await expect(
        listener.handleOrderCreated(orderCreatedEvent),
      ).resolves.not.toThrow();
    });

    it("should handle multiple lots with FEFO", async () => {
      const relations = [
        {
          consumableId: new Types.ObjectId(consumableId),
          quantityRequired: 15, // Requires multiple lots
          isAutoDeducted: true,
          applicableContext: "always",
        },
      ];

      const inventory = {
        _id: new Types.ObjectId(),
        productSku: "CONS-001",
        tenantId,
        lots: [
          {
            lotNumber: "LOT-001",
            availableQuantity: 10,
            receivedDate: new Date("2025-01-01"),
            expirationDate: new Date("2025-06-01"),
          },
          {
            lotNumber: "LOT-002",
            availableQuantity: 30,
            receivedDate: new Date("2025-02-01"),
            expirationDate: new Date("2025-07-01"),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const product = { sku: "CONS-001" };

      relationModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(relations),
      });
      productModel.findById.mockResolvedValue(product);
      inventoryModel.findOne.mockResolvedValue(inventory);
      inventoryMovementModel.create.mockResolvedValue({});

      await listener.handleOrderCreated({
        ...orderCreatedEvent,
        items: [{ productId, quantity: 2 }],
      });

      // Total needed: 2 products * 15 consumables = 30
      // Should deduct 10 from LOT-001 (all of it) and 20 from LOT-002
      expect(inventory.lots[0].availableQuantity).toBe(0); // LOT-001 exhausted
      expect(inventory.lots[1].availableQuantity).toBe(10); // LOT-002: 30 - 20 = 10
    });
  });

  describe("handleOrderCancelled", () => {
    const orderCancelledEvent = {
      orderId,
      tenantId,
      items: [
        {
          productId,
          quantity: 2,
        },
      ],
      orderType: "takeaway",
      userId,
    };

    it("should restore consumables when order is cancelled", async () => {
      const movements = [
        {
          _id: new Types.ObjectId(),
          inventoryId: new Types.ObjectId(),
          productSku: "CONS-001",
          quantity: 2,
          lotNumber: "LOT-001",
        },
      ];

      const inventory = {
        _id: movements[0].inventoryId,
        productSku: "CONS-001",
        tenantId,
        lots: [
          {
            lotNumber: "LOT-001",
            availableQuantity: 98,
            receivedDate: new Date("2025-01-01"),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      inventoryMovementModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(movements),
      });
      inventoryModel.findById = jest.fn().mockResolvedValue(inventory);
      inventoryMovementModel.create.mockResolvedValue({});

      await listener.handleOrderCancelled(orderCancelledEvent);

      // Should restore the quantity
      expect(inventory.lots[0].availableQuantity).toBe(100);
      expect(inventory.save).toHaveBeenCalled();

      // Should create restoration movement
      expect(inventoryMovementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: "consumable_restoration",
          quantity: 2,
          orderId: new Types.ObjectId(orderId),
        }),
      );
    });

    it("should handle multiple movements for restoration", async () => {
      const movements = [
        {
          _id: new Types.ObjectId(),
          inventoryId: new Types.ObjectId(),
          productSku: "CONS-001",
          quantity: 10,
          lotNumber: "LOT-001",
        },
        {
          _id: new Types.ObjectId(),
          inventoryId: new Types.ObjectId(),
          productSku: "CONS-001",
          quantity: 20,
          lotNumber: "LOT-002",
        },
      ];

      const inventory = {
        _id: movements[0].inventoryId,
        productSku: "CONS-001",
        tenantId,
        lots: [
          {
            lotNumber: "LOT-001",
            availableQuantity: 0,
          },
          {
            lotNumber: "LOT-002",
            availableQuantity: 10,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      inventoryMovementModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(movements),
      });
      inventoryModel.findById = jest.fn().mockResolvedValue(inventory);
      inventoryMovementModel.create.mockResolvedValue({});

      await listener.handleOrderCancelled(orderCancelledEvent);

      expect(inventory.lots[0].availableQuantity).toBe(10);
      expect(inventory.lots[1].availableQuantity).toBe(30);
      expect(inventoryMovementModel.create).toHaveBeenCalledTimes(2);
    });

    it("should handle no movements gracefully", async () => {
      inventoryMovementModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await expect(
        listener.handleOrderCancelled(orderCancelledEvent),
      ).resolves.not.toThrow();

      expect(inventoryModel.findById).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing inventory gracefully", async () => {
      const relations = [
        {
          consumableId: new Types.ObjectId(consumableId),
          quantityRequired: 1,
          isAutoDeducted: true,
          applicableContext: "always",
        },
      ];

      const product = { sku: "CONS-001" };

      relationModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(relations),
      });
      productModel.findById.mockResolvedValue(product);
      inventoryModel.findOne.mockResolvedValue(null);

      const event = {
        orderId,
        tenantId,
        items: [{ productId, quantity: 1 }],
        orderType: "always",
        userId,
      };

      await expect(listener.handleOrderCreated(event)).resolves.not.toThrow();
    });

    it("should handle missing product gracefully", async () => {
      const relations = [
        {
          consumableId: new Types.ObjectId(consumableId),
          quantityRequired: 1,
          isAutoDeducted: true,
          applicableContext: "always",
        },
      ];

      relationModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(relations),
      });
      productModel.findById.mockResolvedValue(null);

      const event = {
        orderId,
        tenantId,
        items: [{ productId, quantity: 1 }],
        orderType: "always",
        userId,
      };

      await expect(listener.handleOrderCreated(event)).resolves.not.toThrow();
    });

    it("should handle lots without expiration dates", async () => {
      const relations = [
        {
          consumableId: new Types.ObjectId(consumableId),
          quantityRequired: 1,
          isAutoDeducted: true,
          applicableContext: "always",
        },
      ];

      const inventory = {
        _id: new Types.ObjectId(),
        productSku: "CONS-001",
        tenantId,
        lots: [
          {
            lotNumber: "LOT-001",
            availableQuantity: 50,
            receivedDate: new Date("2025-01-01"),
            // No expiration date
          },
          {
            lotNumber: "LOT-002",
            availableQuantity: 50,
            receivedDate: new Date("2025-02-01"),
            expirationDate: new Date("2025-12-31"),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const product = { sku: "CONS-001" };

      relationModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(relations),
      });
      productModel.findById.mockResolvedValue(product);
      inventoryModel.findOne.mockResolvedValue(inventory);
      inventoryMovementModel.create.mockResolvedValue({});

      const event = {
        orderId,
        tenantId,
        items: [{ productId, quantity: 2 }],
        orderType: "always",
        userId,
      };

      await listener.handleOrderCreated(event);

      // Should prioritize lot with expiration date
      expect(inventory.lots[1].availableQuantity).toBe(48);
      expect(inventory.lots[0].availableQuantity).toBe(50);
    });
  });
});
