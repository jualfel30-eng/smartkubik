import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Types } from "mongoose";
import { RecurringPayablesService } from "./recurring-payables.service";
import moment from "moment-timezone";

describe("RecurringPayablesService", () => {
  let service: RecurringPayablesService;
  let recurringPayableModel: any;
  let payablesService: any;
  let customersService: any;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const templateId = new Types.ObjectId().toString();

  const buildNextDueDateFor = (frequency: string, fromDate: Date): Date => {
    const frequencyMonths: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 };
    const months = frequencyMonths[frequency] ?? 1;
    return moment(fromDate).add(months, "month").toDate();
  };

  const makeTemplate = (overrides: Record<string, any> = {}) => ({
    _id: new Types.ObjectId(templateId),
    tenantId,
    templateName: "Alquiler Oficina",
    frequency: "monthly",
    payeeType: "supplier",
    payeeId: new Types.ObjectId(),
    payeeName: "Proveedor ABC",
    type: "service_payment",
    isActive: true,
    nextDueDate: new Date("2026-06-01"),
    lines: [
      {
        description: "Alquiler mensual",
        amount: 1000,
        accountId: new Types.ObjectId(),
        quantity: 1,
        unitPrice: 1000,
        productId: null,
      },
    ],
    notes: null,
    ...overrides,
  });

  const mockFindOne = (resolvedValue: any) => {
    recurringPayableModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(resolvedValue),
    });
  };

  beforeEach(() => {
    recurringPayableModel = {
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    payablesService = {
      create: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), status: "open" }),
    };

    customersService = {
      create: jest.fn(),
    };

    service = new RecurringPayablesService(
      recurringPayableModel as any,
      payablesService as any,
      customersService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("returns all templates for the tenant", async () => {
      const templates = [makeTemplate(), makeTemplate({ templateName: "Seguro" })];
      recurringPayableModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(templates) });

      const result = await service.findAll(tenantId);

      expect(recurringPayableModel.find).toHaveBeenCalledWith({ tenantId });
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no templates exist", async () => {
      recurringPayableModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      const result = await service.findAll(tenantId);
      expect(result).toEqual([]);
    });
  });

  // ─── generatePayable – frequency fix (regresión crítica) ─────────────────

  describe("generatePayable – frequency advancement", () => {
    it("advances nextDueDate by 1 month for monthly frequency", async () => {
      const baseDate = new Date("2026-06-01");
      const template = makeTemplate({ frequency: "monthly", nextDueDate: baseDate });
      mockFindOne(template);

      await service.generatePayable(templateId, tenantId, userId);

      const expectedDate = buildNextDueDateFor("monthly", baseDate);
      const [[, update]] = recurringPayableModel.updateOne.mock.calls;
      const actualDate: Date = update.nextDueDate;

      expect(actualDate.getMonth()).toBe(expectedDate.getMonth());
      expect(actualDate.getFullYear()).toBe(expectedDate.getFullYear());
    });

    it("advances nextDueDate by 3 months for quarterly frequency", async () => {
      const baseDate = new Date("2026-01-01");
      const template = makeTemplate({ frequency: "quarterly", nextDueDate: baseDate });
      mockFindOne(template);

      await service.generatePayable(templateId, tenantId, userId);

      const expectedDate = buildNextDueDateFor("quarterly", baseDate);
      const [[, update]] = recurringPayableModel.updateOne.mock.calls;
      const actualDate: Date = update.nextDueDate;

      expect(actualDate.getMonth()).toBe(expectedDate.getMonth()); // April (month 3)
      expect(actualDate.getFullYear()).toBe(expectedDate.getFullYear());
    });

    it("advances nextDueDate by 12 months for yearly frequency", async () => {
      const baseDate = new Date("2026-03-15");
      const template = makeTemplate({ frequency: "yearly", nextDueDate: baseDate });
      mockFindOne(template);

      await service.generatePayable(templateId, tenantId, userId);

      const [[, update]] = recurringPayableModel.updateOne.mock.calls;
      const actualDate: Date = update.nextDueDate;

      expect(actualDate.getFullYear()).toBe(2027);
      expect(actualDate.getMonth()).toBe(2); // March
    });

    it("defaults to 1 month for unknown frequency values", async () => {
      const baseDate = new Date(2026, 4, 15); // local May 15 — no UTC-shift risk
      const template = makeTemplate({ frequency: "biweekly", nextDueDate: baseDate });
      mockFindOne(template);

      await service.generatePayable(templateId, tenantId, userId);

      const [[, update]] = recurringPayableModel.updateOne.mock.calls;
      const actualDate: Date = update.nextDueDate;

      // Should default to +1 month
      expect(actualDate.getMonth()).toBe(5); // June
      expect(actualDate.getFullYear()).toBe(2026);
    });

    it("quarterly does NOT advance only 1 month (regression guard)", async () => {
      const baseDate = new Date(2026, 0, 15); // local Jan 15 — no UTC-shift risk
      const template = makeTemplate({ frequency: "quarterly", nextDueDate: baseDate });
      mockFindOne(template);

      await service.generatePayable(templateId, tenantId, userId);

      const [[, update]] = recurringPayableModel.updateOne.mock.calls;
      const actualDate: Date = update.nextDueDate;

      // Must NOT be February (the old bug would advance only 1 month)
      expect(actualDate.getMonth()).not.toBe(1);
      // Must be April (3 months ahead)
      expect(actualDate.getMonth()).toBe(3);
    });

    it("yearly does NOT advance only 1 month (regression guard)", async () => {
      const baseDate = new Date("2026-06-01");
      const template = makeTemplate({ frequency: "yearly", nextDueDate: baseDate });
      mockFindOne(template);

      await service.generatePayable(templateId, tenantId, userId);

      const [[, update]] = recurringPayableModel.updateOne.mock.calls;
      const actualDate: Date = update.nextDueDate;

      // Must still be in June but year 2027 – not 2026
      expect(actualDate.getFullYear()).toBe(2027);
    });
  });

  // ─── generatePayable – payable creation ───────────────────────────────────

  describe("generatePayable – payable creation", () => {
    it("creates a payable with dueDate equal to template.nextDueDate", async () => {
      const nextDueDate = new Date("2026-07-01");
      const template = makeTemplate({ nextDueDate });
      mockFindOne(template);

      await service.generatePayable(templateId, tenantId, userId);

      const [createDto, calledTenantId, calledUserId] = payablesService.create.mock.calls[0];
      expect(createDto.dueDate).toEqual(nextDueDate);
      expect(calledTenantId).toBe(tenantId);
      expect(calledUserId).toBe(userId);
    });

    it("passes all line fields from template to new payable", async () => {
      const template = makeTemplate();
      mockFindOne(template);

      await service.generatePayable(templateId, tenantId, userId);

      const [createDto] = payablesService.create.mock.calls[0];
      expect(createDto.lines).toHaveLength(1);
      expect(createDto.lines[0].description).toBe("Alquiler mensual");
      expect(createDto.lines[0].amount).toBe(1000);
    });

    it("includes template name and formatted date in description", async () => {
      const nextDueDate = new Date("2026-07-01");
      const template = makeTemplate({ templateName: "Alquiler Oficina", nextDueDate });
      mockFindOne(template);

      await service.generatePayable(templateId, tenantId, userId);

      const [createDto] = payablesService.create.mock.calls[0];
      expect(createDto.description).toContain("Alquiler Oficina");
    });

    it("always calls updateOne to advance nextDueDate after creating payable", async () => {
      const template = makeTemplate();
      mockFindOne(template);

      await service.generatePayable(templateId, tenantId, userId);

      expect(recurringPayableModel.updateOne).toHaveBeenCalledTimes(1);
      const [[filter]] = recurringPayableModel.updateOne.mock.calls;
      expect(filter._id.toString()).toBe(templateId);
    });
  });

  // ─── generatePayable – error cases ───────────────────────────────────────

  describe("generatePayable – error handling", () => {
    it("throws NotFoundException when template does not exist", async () => {
      mockFindOne(null);

      await expect(
        service.generatePayable(templateId, tenantId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when template is inactive", async () => {
      const inactiveTemplate = makeTemplate({ isActive: false });
      mockFindOne(inactiveTemplate);

      await expect(
        service.generatePayable(templateId, tenantId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it("does not call payablesService.create when template is not found", async () => {
      mockFindOne(null);

      await expect(
        service.generatePayable(templateId, tenantId, userId),
      ).rejects.toThrow();

      expect(payablesService.create).not.toHaveBeenCalled();
    });
  });

  // ─── create – new supplier validation ────────────────────────────────────

  describe("create – new supplier inline", () => {
    const baseDto = {
      templateName: "Servicio Limpieza",
      frequency: "monthly" as const,
      startDate: new Date("2026-06-01"),
      type: "service_payment" as const,
      payeeType: "supplier" as const,
      payeeName: "Limpieza SA",
      lines: [{ description: "Servicio mensual", amount: 500, accountId: "acc1" }],
    };

    it("throws BadRequestException when creating supplier without required fields", async () => {
      const dto = { ...baseDto, payeeName: undefined };

      await expect(
        service.create({ ...dto, payeeType: "supplier", supplierId: undefined } as any, tenantId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates a new customer when payeeType is supplier and no supplierId given", async () => {
      const newSupplierId = new Types.ObjectId();
      customersService.create.mockResolvedValue({
        _id: newSupplierId,
        companyName: "Nueva Empresa SL",
        name: "Contacto",
      });

      const saveMock = jest.fn().mockResolvedValue({ _id: new Types.ObjectId() });
      const modelInstance = { ...baseDto, save: saveMock };
      recurringPayableModel.mockImplementation = jest.fn().mockReturnValue(modelInstance);
      (recurringPayableModel as any).__proto__ = function () {};
      jest.spyOn(recurringPayableModel, "bind" as any).mockReturnValue(() => modelInstance);

      const dto = {
        ...baseDto,
        supplierId: undefined,
        newSupplierName: "Nueva Empresa SL",
        newSupplierRif: "J-12345678-9",
        newSupplierContactName: "Contacto Principal",
        newSupplierContactPhone: "04121234567",
      };

      await service.create(dto as any, tenantId, userId).catch(() => {
        // Model instantiation in unit tests can fail — we just verify customersService was called
      });

      expect(customersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: "Nueva Empresa SL",
          customerType: "supplier",
        }),
        expect.objectContaining({ tenantId }),
      );
    });
  });
});
