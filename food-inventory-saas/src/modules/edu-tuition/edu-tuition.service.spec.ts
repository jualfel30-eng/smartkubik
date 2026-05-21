import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EduTuitionService } from "./edu-tuition.service";
import { TuitionPaymentListener } from "./listeners/tuition-payment.listener";
import { EduTuitionFee } from "../../schemas/edu-tuition-fee.schema";
import { EduStudent } from "../../schemas/edu-student.schema";

const TENANT_A = "507f1f77bcf86cd799439011";

function mockFindChain(resolvedValue: any) {
  return {
    skip: () => ({
      limit: () => ({ sort: () => ({ exec: jest.fn().mockResolvedValue(resolvedValue) }) }),
    }),
  };
}

describe("EduTuitionService", () => {
  let service: EduTuitionService;
  let tuitionModel: any;
  let studentModel: any;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    tuitionModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      aggregate: jest.fn().mockResolvedValue([]),
      insertMany: jest.fn().mockResolvedValue([]),
    };
    studentModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EduTuitionService,
        { provide: getModelToken(EduTuitionFee.name), useValue: tuitionModel },
        { provide: getModelToken(EduStudent.name), useValue: studentModel },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<EduTuitionService>(EduTuitionService);
  });

  it("should be defined", () => expect(service).toBeDefined());

  // ─── Tenant isolation ─────────────────────────────────────────────────────

  it("findAll — solo consulta cuotas del tenant solicitante", async () => {
    tuitionModel.find.mockReturnValue(mockFindChain([]));
    await service.findAll(TENANT_A, {});
    expect(tuitionModel.find.mock.calls[0][0].tenantId.toString()).toBe(TENANT_A);
  });

  it("findAll — siempre aplica filtro soft-delete", async () => {
    tuitionModel.find.mockReturnValue(mockFindChain([]));
    await service.findAll(TENANT_A, {});
    expect(tuitionModel.find.mock.calls[0][0].isDeleted).toEqual({ $ne: true });
  });

  it("findOne — lanza NotFoundException cuando la cuota no existe", async () => {
    tuitionModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.findOne("nonexistent", TENANT_A)).rejects.toThrow(NotFoundException);
  });

  // ─── Fase 5: generateTuitionBatch — idempotencia ──────────────────────────

  describe("generateTuitionBatch", () => {
    const dto = { academicYear: "2025-2026", months: [1, 2], amount: 500, currency: "USD" };
    const twoStudents = [
      { _id: { toString: () => "stu1" }, classroomId: "cls1" },
      { _id: { toString: () => "stu2" }, classroomId: "cls1" },
    ];

    it("primera ejecución: inserta N alumnos × M meses", async () => {
      studentModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(twoStudents) });
      tuitionModel.insertMany.mockResolvedValue([]);

      const result = await service.generateTuitionBatch(dto, TENANT_A, "user1");

      expect(result.attempted).toBe(4); // 2 alumnos × 2 meses
      expect(result.inserted).toBe(4);
    });

    it("segunda ejecución con E11000: no lanza y reporta 0 insertados (idempotente)", async () => {
      studentModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(twoStudents) });
      const bulkError = Object.assign(new Error("E11000 bulk"), {
        name: "MongoBulkWriteError",
        code: 11000,
        result: { nInserted: 0 },
        writeErrors: Array(4).fill({ code: 11000 }),
      });
      tuitionModel.insertMany.mockRejectedValue(bulkError);

      const result = await service.generateTuitionBatch(dto, TENANT_A, "user1");

      expect(result.inserted).toBe(0);
      expect(result.skipped).toBe(4);
    });

    it("error distinto de E11000 propaga la excepción", async () => {
      studentModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(twoStudents) });
      tuitionModel.insertMany.mockRejectedValue(new Error("connection lost"));

      await expect(service.generateTuitionBatch(dto, TENANT_A, "user1")).rejects.toThrow(
        "connection lost",
      );
    });
  });

  // ─── Fase 5: payManual ────────────────────────────────────────────────────

  describe("payManual", () => {
    const payDto = { amount: 500, method: "cash" };

    it("marca la cuota como paid y retorna paymentId", async () => {
      tuitionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: "feeId", status: "overdue" }),
      });
      tuitionModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.payManual("feeId", TENANT_A, payDto, "user1");

      expect(result.success).toBe(true);
      expect(result.paymentId).toBeDefined();
      expect(tuitionModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "feeId" }),
        expect.objectContaining({ $set: expect.objectContaining({ status: "paid" }) }),
      );
    });

    it("lanza ConflictException si la cuota ya fue pagada", async () => {
      tuitionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: "feeId", status: "paid" }),
      });
      await expect(service.payManual("feeId", TENANT_A, payDto, "user1")).rejects.toThrow(
        ConflictException,
      );
    });

    it("lanza ConflictException si la cuota fue exonerada", async () => {
      tuitionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: "feeId", status: "waived" }),
      });
      await expect(service.payManual("feeId", TENANT_A, payDto, "user1")).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── Fase 5: waive ────────────────────────────────────────────────────────

  describe("waive", () => {
    it("exonera una cuota pending", async () => {
      tuitionModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
      expect((await service.waive("feeId", TENANT_A)).success).toBe(true);
    });

    it("lanza NotFoundException si la cuota no existe o ya está pagada/exonerada", async () => {
      tuitionModel.updateOne.mockResolvedValue({ modifiedCount: 0 });
      await expect(service.waive("feeId", TENANT_A)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Fase 5: notifyManual — emite evento, no llama WhapiService directamente ──

  describe("notifyManual", () => {
    it("emite edu.tuition.notify con datos del representante", async () => {
      const fee = {
        _id: "feeId", studentId: "stuId",
        description: "Mensualidad Enero 2025", amount: 500, currency: "USD",
        dueDate: new Date("2025-01-05"),
      };
      const student = {
        firstName: "Juan", lastName: "Pérez",
        guardian: { name: "María Pérez", whatsapp: "+58 412-1234567" },
      };
      tuitionModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(fee) });
      studentModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(student) });
      tuitionModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await service.notifyManual("feeId", TENANT_A);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "edu.tuition.notify",
        expect.objectContaining({ tenantId: TENANT_A, feeId: "feeId", guardianName: "María Pérez" }),
      );
    });

    it("lanza BadRequestException si el tutor no tiene WhatsApp", async () => {
      tuitionModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: "feeId", studentId: "stuId", dueDate: new Date() }),
      });
      studentModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ guardian: { name: "María" } }),
      });

      await expect(service.notifyManual("feeId", TENANT_A)).rejects.toThrow();
    });
  });
});

// ─── TuitionPaymentListener ───────────────────────────────────────────────────

describe("TuitionPaymentListener — payment.confirmed actualiza EduTuitionFee", () => {
  let listener: TuitionPaymentListener;
  let tuitionModel: any;

  beforeEach(async () => {
    tuitionModel = { updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TuitionPaymentListener,
        { provide: getModelToken(EduTuitionFee.name), useValue: tuitionModel },
      ],
    }).compile();

    listener = module.get<TuitionPaymentListener>(TuitionPaymentListener);
  });

  it("actualiza la cuota a paid cuando paymentType=tuition y hay tuitionFeeId", async () => {
    await listener.handlePaymentConfirmed({
      paymentId: "507f1f77bcf86cd799439099",
      tenantId: TENANT_A,
      paymentType: "tuition",
      metadata: { tuitionFeeId: "507f1f77bcf86cd799439088" },
    });

    expect(tuitionModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ isDeleted: { $ne: true } }),
      expect.objectContaining({ $set: expect.objectContaining({ status: "paid" }) }),
    );
  });

  it("ignora eventos con paymentType distinto de tuition", async () => {
    await listener.handlePaymentConfirmed({
      paymentId: "abc", tenantId: TENANT_A, paymentType: "invoice", metadata: {},
    });
    expect(tuitionModel.updateOne).not.toHaveBeenCalled();
  });

  it("ignora eventos sin metadata.tuitionFeeId", async () => {
    await listener.handlePaymentConfirmed({
      paymentId: "abc", tenantId: TENANT_A, paymentType: "tuition", metadata: {},
    });
    expect(tuitionModel.updateOne).not.toHaveBeenCalled();
  });
});
