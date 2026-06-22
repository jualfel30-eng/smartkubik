import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { CustomersService } from "./customers.service";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";

/**
 * Test de integración (mongodb-memory-server) del cálculo de métricas en
 * findAll — específicamente la Fase 3: el "gasto total" debe reflejar el valor
 * de los servicios de las citas COMPLETADAS, sin doble-contar el depósito (que
 * ya está incluido en el valor del servicio), y seguir contando los depósitos
 * de las citas NO completadas como anticipo.
 */
describe("CustomersService.findAll — métricas de citas (Fase 3)", () => {
  let mongod: MongoMemoryServer;
  let service: CustomersService;

  const tenantId = new Types.ObjectId().toString();
  const tId = new Types.ObjectId(tenantId);

  const customers = () => mongoose.connection.db.collection("customers");
  const appointments = () => mongoose.connection.db.collection("appointments");

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    const customerModel =
      mongoose.models[Customer.name] ||
      mongoose.model(Customer.name, CustomerSchema);
    const orderModel =
      mongoose.models[Order.name] || mongoose.model(Order.name, OrderSchema);

    // employeeProfileModel / supplierModel / loyaltyService no intervienen en la
    // ruta de findAll → stubs vacíos.
    const stub: any = {};
    const loyaltyStub: any = {
      syncTierFromScore: jest.fn().mockResolvedValue(undefined),
    };
    service = new CustomersService(
      customerModel as any,
      orderModel as any,
      stub,
      stub,
      loyaltyStub,
    );
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await customers().deleteMany({});
    await appointments().deleteMany({});
  });

  it("suma servicios completados sin doble-contar su depósito, y cuenta depósitos de citas no completadas", async () => {
    const customerId = new Types.ObjectId();
    await customers().insertOne({
      _id: customerId,
      tenantId: tId,
      name: "BETA-Cliente-Metrics",
      customerType: "individual",
      status: "active",
      metrics: {},
    });

    const lastCompleted = new Date("2026-06-20T15:00:00.000Z");
    await appointments().insertMany([
      // A: completada — servicePrice 100 + addons (10×2=20) = 120.
      //    Tiene depósito confirmado de 30 que NO debe sumarse aparte
      //    (ya está dentro de los 120).
      {
        tenantId: tId,
        customerId,
        status: "completed",
        servicePrice: 100,
        addons: [{ name: "Tinte", price: 10, quantity: 2 }],
        completedAt: new Date("2026-06-19T10:00:00.000Z"),
        depositRecords: [
          {
            status: "confirmed",
            amount: 30,
            amountUsd: 30,
            currency: "USD",
            confirmedAt: new Date("2026-06-10T10:00:00.000Z"),
          },
        ],
      },
      // B: completada — servicePrice 50, sin depósito (cobro en mostrador) = 50.
      {
        tenantId: tId,
        customerId,
        status: "completed",
        servicePrice: 50,
        addons: [],
        completedAt: lastCompleted,
        depositRecords: [],
      },
      // C: NO completada — depósito confirmado de 40 (anticipo) → aporta 40.
      {
        tenantId: tId,
        customerId,
        status: "confirmed",
        servicePrice: 200,
        addons: [],
        depositRecords: [
          {
            status: "confirmed",
            amount: 40,
            amountUsd: 40,
            currency: "USD",
            confirmedAt: new Date("2026-06-12T10:00:00.000Z"),
          },
        ],
      },
      // D: cancelada sin depósito → no aporta nada (su servicePrice no cuenta).
      {
        tenantId: tId,
        customerId,
        status: "cancelled",
        servicePrice: 999,
        addons: [],
        depositRecords: [],
      },
    ]);

    const res = await service.findAll(
      { customerType: "individual" } as any,
      tenantId,
    );

    expect(res.customers).toHaveLength(1);
    const m = res.customers[0].metrics;

    // 120 (servicio A) + 50 (servicio B) + 40 (depósito C) = 210.
    // NO 240: los 30 del depósito de A NO se suman aparte (anti doble-conteo).
    expect(m.totalSpent).toBe(210);
    expect(m.totalSpentUSD).toBe(210);

    // Dos citas completadas = base de "frecuencia/visitas".
    expect(m.completedAppointments).toBe(2);

    // Dinero-entrante (cobranza) = todos los depósitos confirmados: 30 + 40 = 70.
    expect(m.totalDeposits).toBe(70);

    // Actividad más reciente = completedAt de la cita B (la más nueva).
    expect(new Date(m.lastOrderDate).toISOString()).toBe(
      lastCompleted.toISOString(),
    );
  });

  it("cliente sin citas ni órdenes queda en gasto 0 y sin actividad", async () => {
    const customerId = new Types.ObjectId();
    await customers().insertOne({
      _id: customerId,
      tenantId: tId,
      name: "BETA-Cliente-Vacio",
      customerType: "individual",
      status: "active",
      metrics: {},
    });

    const res = await service.findAll(
      { customerType: "individual" } as any,
      tenantId,
    );

    expect(res.customers).toHaveLength(1);
    const m = res.customers[0].metrics;
    expect(m.totalSpent).toBe(0);
    expect(m.completedAppointments).toBe(0);
    expect(m.totalDeposits).toBe(0);
    expect(m.lastOrderDate ?? null).toBeNull();
  });
});
