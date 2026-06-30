import { ConsumablesListener } from "./consumables.listener";
import { Types } from "mongoose";

/**
 * Cobertura del empaque por línea: el listener deduce el empaque elegido y
 * excluye las opciones de empaque del auto-deduct por contexto (sin doble descuento).
 */
describe("ConsumablesListener — empaque por línea", () => {
  let listener: ConsumablesListener;
  let relModel: any;
  let movModel: any;
  let invModel: any;

  const tenantId = new Types.ObjectId().toString();
  const productId = new Types.ObjectId().toString();
  const boxId = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId().toString();

  const chain = (resolved: any) => ({
    populate: () => chain(resolved),
    lean: () => ({ exec: () => Promise.resolve(resolved) }),
    exec: () => Promise.resolve(resolved),
  });

  beforeEach(() => {
    relModel = { find: jest.fn(() => chain([])), findOne: jest.fn() };
    movModel = { create: jest.fn().mockResolvedValue({}) };
    invModel = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    listener = new ConsumablesListener(relModel, movModel, invModel);
  });

  it("deduce 1 empaque por línea (decrementa totalQuantity)", async () => {
    // Relación de empaque válida (1 por línea)
    relModel.findOne.mockReturnValue(
      chain({ quantityRequired: 1, isPackagingOption: true }),
    );
    invModel.findOne.mockReturnValue(
      chain({
        _id: new Types.ObjectId(),
        productSku: "CAJA-001",
        averageCostPrice: 0.5,
        totalQuantity: 100,
      }),
    );

    await listener.handleOrderCreated({
      orderId,
      tenantId,
      items: [{ productId, quantity: 0.25, packagingConsumableId: boxId }],
      userId: new Types.ObjectId().toString(),
    });

    // Movimiento de salida + decremento de stock del empaque (1, no 0.25).
    expect(movModel.create).toHaveBeenCalledTimes(1);
    expect(invModel.updateOne).toHaveBeenCalledWith(expect.any(Object), {
      $inc: { totalQuantity: -1 },
    });
  });

  it("excluye las opciones de empaque del auto-deduct por contexto", async () => {
    await listener.handleOrderCreated({
      orderId,
      tenantId,
      items: [{ productId, quantity: 1 }], // sin packaging
      userId: new Types.ObjectId().toString(),
    });

    // El find de consumibles auto-deducidos excluye isPackagingOption.
    expect(relModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ isPackagingOption: { $ne: true } }),
    );
  });

  it("no deduce empaque si la línea no lo trae", async () => {
    await listener.handleOrderCreated({
      orderId,
      tenantId,
      items: [{ productId, quantity: 1 }],
      userId: new Types.ObjectId().toString(),
    });
    expect(relModel.findOne).not.toHaveBeenCalled();
    expect(invModel.updateOne).not.toHaveBeenCalled();
  });
});
