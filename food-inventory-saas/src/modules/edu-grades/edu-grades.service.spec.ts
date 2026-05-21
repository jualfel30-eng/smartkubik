import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ForbiddenException, BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EduGradesService } from "./edu-grades.service";
import { EduGrade } from "../../schemas/edu-grade.schema";
import { EduSubject } from "../../schemas/edu-subject.schema";
import { EmployeeProfile } from "../../schemas/employee-profile.schema";

const TENANT = "507f1f77bcf86cd799439011";
const USER_ID = "507f1f77bcf86cd799439099";
const SUBJECT_ID = "507f1f77bcf86cd799439003";
const EMPLOYEE_A = "507f1f77bcf86cd799430001";
const EMPLOYEE_B = "507f1f77bcf86cd799430002";

const baseCreateDto = {
  studentId: "507f1f77bcf86cd799439010",
  subjectId: SUBJECT_ID,
  classroomId: "507f1f77bcf86cd799439002",
  teacherId: EMPLOYEE_A,
  period: "1er lapso",
  academicYear: "2025-2026",
  score: 15,
  maxScore: 20,
  isPassing: true,
};

const mockSubjectWithTeacher = (teacherId: string) => ({
  _id: SUBJECT_ID,
  teacherId: { toString: () => teacherId },
  gradeScale: { passing: 10 },
});

function makeMockModel(statics: Record<string, jest.Mock> = {}) {
  const MockModel: any = function (dto: any) {
    return { ...dto, save: jest.fn().mockResolvedValue({ ...dto, _id: "mockGradeId" }) };
  };
  MockModel.findOne = statics.findOne ?? jest.fn().mockResolvedValue(null);
  MockModel.find = statics.find ?? jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
  MockModel.countDocuments = statics.countDocuments ?? jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
  MockModel.updateMany = statics.updateMany ?? jest.fn().mockResolvedValue({ modifiedCount: 0 });
  MockModel.updateOne = statics.updateOne ?? jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) });
  return MockModel;
}

describe("EduGradesService", () => {
  let service: EduGradesService;
  let gradeModel: any;
  let subjectModel: any;
  let employeeModel: any;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    gradeModel = makeMockModel();
    subjectModel = makeMockModel();
    employeeModel = makeMockModel();
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EduGradesService,
        { provide: getModelToken(EduGrade.name), useValue: gradeModel },
        { provide: getModelToken(EduSubject.name), useValue: subjectModel },
        { provide: getModelToken(EmployeeProfile.name), useValue: employeeModel },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<EduGradesService>(EduGradesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ── tenant isolation ────────────────────────────────────────────────────────

  it("should not return grades from another tenant", async () => {
    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).gradeModel = { find: mockFind, countDocuments: mockCount };

    const tenantB = "507f1f77bcf86cd799439012";
    const result = await service.findAll(tenantB, {});
    expect(mockFind.mock.calls[0][0].tenantId.toString()).toBe(tenantB);
    expect(result.data).toEqual([]);
  });

  it("should not return soft-deleted grades", async () => {
    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).gradeModel = { find: mockFind, countDocuments: mockCount };

    await service.findAll(TENANT, {});
    expect(mockFind.mock.calls[0][0].isDeleted).toEqual({ $ne: true });
  });

  it("should throw NotFoundException when grade not found", async () => {
    (service as any).gradeModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    await expect(service.findOne("nonexistent", TENANT)).rejects.toThrow(NotFoundException);
  });

  // ── autorización por materia ────────────────────────────────────────────────

  it("should throw ForbiddenException when TEACHER tries to grade a subject assigned to another teacher", async () => {
    // La materia tiene teacherId = EMPLOYEE_A
    subjectModel.findOne = jest.fn().mockResolvedValue(mockSubjectWithTeacher(EMPLOYEE_A));
    // El docente autenticado es EMPLOYEE_B
    employeeModel.findOne = jest.fn().mockResolvedValue({ _id: { toString: () => EMPLOYEE_B } });

    await expect(
      service.create(baseCreateDto, TENANT, USER_ID, "TEACHER"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("should allow TEACHER to create grade for their own subject", async () => {
    // La materia tiene teacherId = EMPLOYEE_A
    subjectModel.findOne = jest.fn().mockResolvedValue(mockSubjectWithTeacher(EMPLOYEE_A));
    // El docente autenticado ES EMPLOYEE_A
    employeeModel.findOne = jest.fn().mockResolvedValue({ _id: { toString: () => EMPLOYEE_A } });

    const saved = { ...baseCreateDto, _id: "newGrade", isPublished: false };
    gradeModel.prototype = { save: jest.fn().mockResolvedValue(saved) };

    await expect(
      service.create(baseCreateDto, TENANT, USER_ID, "TEACHER"),
    ).resolves.toBeDefined();
  });

  it("should skip subject-ownership check for non-TEACHER roles", async () => {
    subjectModel.findOne = jest.fn().mockResolvedValue(mockSubjectWithTeacher(EMPLOYEE_B));
    // No se debe llamar a employeeModel en este caso
    employeeModel.findOne = jest.fn();

    await expect(
      service.create(baseCreateDto, TENANT, USER_ID, "ADMIN"),
    ).resolves.toBeDefined();

    expect(employeeModel.findOne).not.toHaveBeenCalled();
  });

  // ── flujo draft ─────────────────────────────────────────────────────────────

  it("should always create grade with isPublished: false regardless of dto", async () => {
    subjectModel.findOne = jest.fn().mockResolvedValue(mockSubjectWithTeacher(EMPLOYEE_A));

    let capturedArgs: any;
    gradeModel.prototype = {
      save: jest.fn().mockImplementation(function () {
        capturedArgs = this;
        return Promise.resolve({ ...this, _id: "newId" });
      }),
    };

    const MockGradeModel: any = function (dto: any) {
      capturedArgs = dto;
      return { ...dto, save: jest.fn().mockResolvedValue({ ...dto, _id: "newId" }) };
    };
    Object.assign(MockGradeModel, gradeModel);
    (service as any).gradeModel = MockGradeModel;

    await service.create(baseCreateDto, TENANT, USER_ID);
    expect(capturedArgs.isPublished).toBe(false);
  });

  it("should compute isPassing from subject gradeScale, ignoring client value", async () => {
    // gradeScale.passing = 10, score = 8 → isPassing debe ser false aunque el cliente envíe true
    subjectModel.findOne = jest.fn().mockResolvedValue({
      _id: SUBJECT_ID,
      teacherId: { toString: () => EMPLOYEE_A },
      gradeScale: { passing: 10 },
    });

    let capturedArgs: any;
    const MockGradeModel: any = function (dto: any) {
      capturedArgs = dto;
      return { ...dto, save: jest.fn().mockResolvedValue({ ...dto, _id: "newId" }) };
    };
    Object.assign(MockGradeModel, gradeModel);
    (service as any).gradeModel = MockGradeModel;

    const dtoWithWrongPassing = { ...baseCreateDto, score: 8, isPassing: true };
    await service.create(dtoWithWrongPassing, TENANT, USER_ID);
    expect(capturedArgs.isPassing).toBe(false);
  });

  // ── guard de estado published ────────────────────────────────────────────────

  it("should allow editing a draft grade", async () => {
    const draftGrade = {
      isPublished: false,
      subjectId: { toString: () => SUBJECT_ID },
      isPassing: true,
      set: jest.fn().mockReturnThis(),
      save: jest.fn().mockResolvedValue({ score: 16, isPublished: false }),
    };

    (service as any).gradeModel = {
      findOne: jest.fn().mockResolvedValue(draftGrade),
    };
    subjectModel.findOne = jest.fn().mockResolvedValue(mockSubjectWithTeacher(EMPLOYEE_A));

    const result = await service.update("gradeId", TENANT, { score: 16 }, USER_ID, ["edu_grades_write"]);
    expect(result).toBeDefined();
    expect(draftGrade.save).toHaveBeenCalled();
  });

  it("should throw ForbiddenException when editing a published grade without edu_grades_publish", async () => {
    const publishedGrade = {
      isPublished: true,
      set: jest.fn().mockReturnThis(),
      save: jest.fn(),
    };

    (service as any).gradeModel = {
      findOne: jest.fn().mockResolvedValue(publishedGrade),
    };

    await expect(
      service.update("gradeId", TENANT, { score: 16 }, USER_ID, ["edu_grades_write"]),
    ).rejects.toThrow(ForbiddenException);

    expect(publishedGrade.save).not.toHaveBeenCalled();
  });

  it("should allow editing a published grade when requester has edu_grades_publish", async () => {
    const publishedGrade = {
      isPublished: true,
      subjectId: { toString: () => SUBJECT_ID },
      isPassing: true,
      set: jest.fn().mockReturnThis(),
      save: jest.fn().mockResolvedValue({ score: 18, isPublished: true }),
    };

    (service as any).gradeModel = {
      findOne: jest.fn().mockResolvedValue(publishedGrade),
    };
    subjectModel.findOne = jest.fn().mockResolvedValue(mockSubjectWithTeacher(EMPLOYEE_A));

    const result = await service.update(
      "gradeId",
      TENANT,
      { score: 18 },
      USER_ID,
      ["edu_grades_write", "edu_grades_publish"],
    );
    expect(result).toBeDefined();
    expect(publishedGrade.save).toHaveBeenCalled();
  });

  // ── publishGrades + evento ───────────────────────────────────────────────────

  it("should mark grades as published and emit edu.grades.published", async () => {
    const gradeIds = ["507f1f77bcf86cd799430010", "507f1f77bcf86cd799430011"];
    const fakeGrades = gradeIds.map((id) => ({ _id: id }));

    (service as any).gradeModel = {
      find: jest.fn().mockResolvedValue(fakeGrades),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
    };

    const result = await service.publishGrades(
      { gradeIds, subjectId: SUBJECT_ID, period: "1er lapso" },
      TENANT,
      USER_ID,
    );

    expect(result).toEqual({ published: 2 });
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "edu.grades.published",
      expect.objectContaining({
        tenantId: TENANT,
        subjectId: SUBJECT_ID,
        period: "1er lapso",
        gradeIds,
        publishedBy: USER_ID,
      }),
    );
  });

  it("should throw BadRequestException when gradeIds contain IDs from another tenant", async () => {
    // El find devuelve menos documentos que los IDs solicitados → alguno no pertenece al tenant
    (service as any).gradeModel = {
      find: jest.fn().mockResolvedValue([{ _id: "507f1f77bcf86cd799430010" }]),
      updateMany: jest.fn(),
    };

    await expect(
      service.publishGrades(
        { gradeIds: ["507f1f77bcf86cd799430010", "507f1f77bcf86cd799430011"], subjectId: SUBJECT_ID, period: "1er lapso" },
        TENANT,
        USER_ID,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
