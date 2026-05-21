import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { EduSchedulesService } from "./edu-schedules.service";
import { EduSchedule } from "../../schemas/edu-schedule.schema";

const TENANT = "507f1f77bcf86cd799439011";
const USER = "507f1f77bcf86cd799439099";

const baseDto = {
  teacherId: "507f1f77bcf86cd799439001",
  classroomId: "507f1f77bcf86cd799439002",
  subjectId: "507f1f77bcf86cd799439003",
  dayOfWeek: 1,
  startTime: "08:00",
  endTime: "09:00",
  academicYear: "2025-2026",
  effectiveFrom: "2025-09-01",
};

function makeMockModel() {
  const MockModel: any = function (dto: any) {
    return { ...dto, save: jest.fn().mockResolvedValue({ ...dto, _id: "mockId" }) };
  };
  MockModel.findOne = jest.fn().mockResolvedValue(null);
  MockModel.find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) });
  MockModel.countDocuments = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
  MockModel.updateOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) });
  return MockModel;
}

describe("EduSchedulesService", () => {
  let service: EduSchedulesService;
  let scheduleModel: any;

  beforeEach(async () => {
    scheduleModel = makeMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EduSchedulesService,
        { provide: getModelToken(EduSchedule.name), useValue: scheduleModel },
      ],
    }).compile();

    service = module.get<EduSchedulesService>(EduSchedulesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ── tenant isolation ────────────────────────────────────────────────────────

  it("should not return schedules from another tenant", async () => {
    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).scheduleModel = { find: mockFind, countDocuments: mockCount };

    const tenantB = "507f1f77bcf86cd799439012";
    const result = await service.findAll(tenantB, {});
    expect(mockFind.mock.calls[0][0].tenantId.toString()).toBe(tenantB);
    expect(result.data).toEqual([]);
  });

  it("should not return soft-deleted schedules", async () => {
    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).scheduleModel = { find: mockFind, countDocuments: mockCount };

    await service.findAll(TENANT, {});
    expect(mockFind.mock.calls[0][0].isDeleted).toEqual({ $ne: true });
  });

  it("should throw NotFoundException when schedule not found", async () => {
    (service as any).scheduleModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    await expect(service.findOne("nonexistent", TENANT)).rejects.toThrow(NotFoundException);
  });

  // ── conflict detection ──────────────────────────────────────────────────────

  it("should throw ConflictException when teacher already has an overlapping slot", async () => {
    // findOne devuelve un bloque existente del docente → conflicto de docente
    scheduleModel.findOne = jest.fn().mockResolvedValue({
      startTime: "08:30",
      endTime: "09:30",
    });

    await expect(service.create(baseDto, TENANT, USER)).rejects.toThrow(ConflictException);
  });

  it("should throw ConflictException when classroom already has an overlapping slot", async () => {
    // primera llamada (teacher) → sin conflicto; segunda (classroom) → conflicto
    scheduleModel.findOne = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ startTime: "08:30", endTime: "09:30" });

    await expect(service.create(baseDto, TENANT, USER)).rejects.toThrow(ConflictException);
  });

  it("should create schedule when no conflicts exist", async () => {
    scheduleModel.findOne = jest.fn().mockResolvedValue(null);

    const saved = { ...baseDto, _id: "newId" };
    scheduleModel.prototype = { save: jest.fn().mockResolvedValue(saved) };

    // No debe lanzar excepción
    await expect(service.create(baseDto, TENANT, USER)).resolves.toBeDefined();
  });

  it("should detect adjacent slots as non-conflicting (end == start del nuevo)", async () => {
    // bloque existente 07:00-08:00; nuevo 08:00-09:00 → NO hay solapamiento
    scheduleModel.findOne = jest.fn().mockResolvedValue(null);

    await expect(service.create(baseDto, TENANT, USER)).resolves.toBeDefined();
  });

  // ── update re-validates and excludes self ────────────────────────────────────

  it("should not flag self-conflict when updating an existing schedule", async () => {
    const existingId = "507f1f77bcf86cd799439080";
    const existing = {
      _id: existingId,
      ...baseDto,
      teacherId: { toString: () => baseDto.teacherId },
      classroomId: { toString: () => baseDto.classroomId },
      dayOfWeek: baseDto.dayOfWeek,
      startTime: baseDto.startTime,
      endTime: baseDto.endTime,
      academicYear: baseDto.academicYear,
      set: jest.fn().mockReturnThis(),
      save: jest.fn().mockResolvedValue({ _id: existingId, ...baseDto }),
    };

    // Primera llamada: findOne para cargar el documento existente
    // Segunda y tercera: validaciones de conflicto (no deben encontrar nada gracias al excludeId)
    scheduleModel.findOne = jest
      .fn()
      .mockResolvedValueOnce(existing)
      .mockResolvedValue(null);

    const updated = await service.update(existingId, TENANT, { startTime: "08:00", endTime: "09:30" });
    expect(updated).toBeDefined();
    expect(existing.save).toHaveBeenCalled();
  });

  it("should throw ConflictException on update when new time overlaps another schedule", async () => {
    const existingId = "507f1f77bcf86cd799439080";
    const existing = {
      _id: existingId,
      ...baseDto,
      teacherId: { toString: () => baseDto.teacherId },
      classroomId: { toString: () => baseDto.classroomId },
      dayOfWeek: baseDto.dayOfWeek,
      startTime: "07:00",
      endTime: "08:00",
      academicYear: baseDto.academicYear,
      set: jest.fn().mockReturnThis(),
      save: jest.fn(),
    };

    // Primera llamada: carga el documento existente
    // Segunda (teacher conflict check): encuentra conflicto
    scheduleModel.findOne = jest
      .fn()
      .mockResolvedValueOnce(existing)
      .mockResolvedValue({ startTime: "08:00", endTime: "09:00" });

    await expect(
      service.update(existingId, TENANT, { startTime: "08:00", endTime: "09:00" }),
    ).rejects.toThrow(ConflictException);
  });
});
