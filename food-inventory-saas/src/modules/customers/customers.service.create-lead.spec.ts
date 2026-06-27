import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { CustomersService } from "./customers.service";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";

/**
 * createLead: captura pública de leads desde el storefront. Verifica que el lead
 * se cree bajo el tenant correcto, con la marca de lead (tags/source), numeración
 * CLI-* secuencial por-tenant, y aislamiento entre tenants.
 */
describe("CustomersService.createLead — captura pública de leads", () => {
  let mongod: MongoMemoryServer;
  let service: CustomersService;

  const tenantA = new Types.ObjectId().toString();
  const tenantB = new Types.ObjectId().toString();

  const customers = () => mongoose.connection.db.collection("customers");

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    const customerModel =
      mongoose.models[Customer.name] ||
      mongoose.model(Customer.name, CustomerSchema);
    const orderModel =
      mongoose.models[Order.name] || mongoose.model(Order.name, OrderSchema);

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
  });

  it("crea un lead bajo el tenant con marca de lead y número CLI-000001", async () => {
    const res = await service.createLead({
      tenantId: tenantA,
      name: "Paciente Interesado",
      phone: "+584141234567",
      email: "paciente@example.com",
      serviceInterest: "Blanqueamiento Dental",
      message: "Quiero información de precios",
    });

    expect(res.customerNumber).toBe("CLI-000001");

    const doc = await customers().findOne({ _id: new Types.ObjectId(res.id) });
    expect(doc).toBeTruthy();
    expect(doc!.tenantId).toEqual(new Types.ObjectId(tenantA));
    expect(doc!.customerType).toBe("individual");
    expect(doc!.source).toBe("storefront-health-contact");
    // contactos: phone primario + email
    expect(doc!.contacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "phone",
          value: "+584141234567",
          isPrimary: true,
        }),
        expect.objectContaining({
          type: "email",
          value: "paciente@example.com",
        }),
      ]),
    );
    // mensaje + interés en notas
    expect(doc!.notes).toContain("Blanqueamiento Dental");
    expect(doc!.notes).toContain("Quiero información de precios");
  });

  it("numera secuencialmente por-tenant y aísla entre tenants", async () => {
    const a1 = await service.createLead({
      tenantId: tenantA,
      name: "A1",
      phone: "+58400000001",
    });
    const a2 = await service.createLead({
      tenantId: tenantA,
      name: "A2",
      phone: "+58400000002",
    });
    const b1 = await service.createLead({
      tenantId: tenantB,
      name: "B1",
      phone: "+58400000003",
    });

    expect(a1.customerNumber).toBe("CLI-000001");
    expect(a2.customerNumber).toBe("CLI-000002");
    // tenant B arranca su propia secuencia
    expect(b1.customerNumber).toBe("CLI-000001");

    const countA = await customers().countDocuments({
      tenantId: new Types.ObjectId(tenantA),
    });
    const countB = await customers().countDocuments({
      tenantId: new Types.ObjectId(tenantB),
    });
    expect(countA).toBe(2);
    expect(countB).toBe(1);
  });
});
