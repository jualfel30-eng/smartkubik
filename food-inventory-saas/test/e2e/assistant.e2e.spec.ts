import { AssistantToolsService } from "../../src/modules/assistant/assistant-tools.service";
import { Types } from "mongoose";

describe("AssistantToolsService hospitality flows", () => {
  const serviceDocument = {
    _id: new Types.ObjectId(),
    name: "Masaje Relajante",
    duration: 60,
    price: 120,
    locationId: new Types.ObjectId(),
  } as any;

  const buildLean = <T,>(value: T) => ({
    lean: jest.fn().mockResolvedValue(value),
  });

  let assistantToolsService: AssistantToolsService;
  let appointmentsService: any;
  let serviceModel: any;
  let resourceModel: any;

  beforeEach(() => {
    appointmentsService = {
      createFromPublic: jest.fn().mockResolvedValue({
        appointmentId: "appt-001",
        status: "confirmed",
        cancellationCode: "ZXCV",
        startTime: new Date("2025-01-02T10:00:00Z"),
        endTime: new Date("2025-01-02T11:00:00Z"),
      }),
      rescheduleFromPublic: jest.fn().mockResolvedValue({
        appointmentId: "appt-001",
        status: "confirmed",
        startTime: new Date("2025-01-03T14:00:00Z"),
        endTime: new Date("2025-01-03T15:00:00Z"),
      }),
      cancelFromPublic: jest.fn().mockResolvedValue({
        appointmentId: "appt-001",
        previousStatus: "confirmed",
        newStatus: "cancelled",
        cancelledAt: new Date("2025-01-01T18:00:00Z"),
      }),
    };

    serviceModel = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([serviceDocument]),
      }),
      findOne: jest.fn().mockReturnValue(buildLean(serviceDocument)),
    };

    resourceModel = {
      findOne: jest.fn().mockReturnValue(buildLean(null)),
    };

    assistantToolsService = new AssistantToolsService(
      { findOne: jest.fn(), find: jest.fn() } as any,
      { findOne: jest.fn(), aggregate: jest.fn() } as any,
      serviceModel,
      resourceModel,
      { findOne: jest.fn() } as any,
      appointmentsService,
      { getLatestRatesForTenant: jest.fn().mockResolvedValue(null) } as any,
    );
  });

  it("creates a hospitality booking with normalized payload", async () => {
    const response = await assistantToolsService.executeTool(
      "tenant-01",
      "create_service_booking",
      {
        serviceQuery: "masaje",
        date: "2025-01-02",
        time: "10:00",
        notes: "Huésped solicita aromaterapia",
        customer: {
          name: "Ana López",
          email: "ana@example.com",
          phone: "+58 412-555-0000",
        },
        addons: [{ name: "Champagne", price: 45 }],
      },
    );

    expect(appointmentsService.createFromPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-01",
        serviceId: serviceDocument._id.toString(),
        acceptPolicies: true,
      }),
    );
    expect(response.ok).toBe(true);
    expect(response.appointmentId).toBe("appt-001");
  });

  it("rejects bookings without basic guest contact info", async () => {
    const response = await assistantToolsService.executeTool(
      "tenant-01",
      "create_service_booking",
      {
        serviceQuery: "masaje",
        date: "2025-01-02",
        time: "10:00",
        customer: { name: "Ana" },
      },
    );

    expect(response.ok).toBe(false);
    expect(response.message).toMatch(/nombre, correo electrónico y teléfono/i);
    expect(appointmentsService.createFromPublic).not.toHaveBeenCalled();
  });

  it("reschedules an existing booking when a valid cancellation code is provided", async () => {
    const response = await assistantToolsService.executeTool(
      "tenant-01",
      "modify_service_booking",
      {
        appointmentId: "appt-001",
        cancellationCode: "ZXCV",
        newStartTime: "2025-01-03T14:00:00Z",
      },
    );

    expect(appointmentsService.rescheduleFromPublic).toHaveBeenCalledWith(
      "appt-001",
      expect.objectContaining({ tenantId: "tenant-01" }),
    );
    expect(response.ok).toBe(true);
    expect(response.startTime).toContain("2025-01-03");
  });

  it("surfaces assistant friendly errors when cancellation fails", async () => {
    appointmentsService.cancelFromPublic.mockRejectedValue(
      new Error("Código de cancelación inválido"),
    );

    const response = await assistantToolsService.executeTool(
      "tenant-01",
      "cancel_service_booking",
      {
        appointmentId: "appt-001",
        cancellationCode: "BAD",
        reason: "Huésded canceló",
      },
    );

    expect(appointmentsService.cancelFromPublic).toHaveBeenCalledWith(
      "appt-001",
      expect.objectContaining({ tenantId: "tenant-01" }),
    );
    expect(response.ok).toBe(false);
    expect(response.message).toMatch(/código de cancelación inválido/i);
  });
});
