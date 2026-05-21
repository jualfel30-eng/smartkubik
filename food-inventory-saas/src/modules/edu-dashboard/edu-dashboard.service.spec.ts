import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { EduDashboardService } from "./edu-dashboard.service";
import { EduStudent } from "../../schemas/edu-student.schema";
import { EduClassroom } from "../../schemas/edu-classroom.schema";
import { EduTuitionFee } from "../../schemas/edu-tuition-fee.schema";
import { EduGrade } from "../../schemas/edu-grade.schema";
import { EduAttendance } from "../../schemas/edu-attendance.schema";
import { Types } from "mongoose";

const TENANT_A = "507f1f77bcf86cd799439011";

const CLASSROOM_ID = new Types.ObjectId("507f1f77bcf86cd799439020");

const mockClassrooms = [
  { _id: CLASSROOM_ID, name: "3er Grado A", grade: "3er Grado", section: "A", academicYear: "2025-2026" },
];

function makeModel(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    aggregate: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve([]) }) }),
    countDocuments: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe("EduDashboardService", () => {
  let service: EduDashboardService;
  let studentModel: ReturnType<typeof makeModel>;
  let classroomModel: ReturnType<typeof makeModel>;
  let tuitionModel: ReturnType<typeof makeModel>;
  let gradeModel: ReturnType<typeof makeModel>;
  let attendanceModel: ReturnType<typeof makeModel>;

  beforeEach(async () => {
    studentModel = makeModel();
    classroomModel = makeModel({
      find: jest.fn().mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mockClassrooms) }),
      }),
    });
    tuitionModel = makeModel();
    gradeModel = makeModel({ countDocuments: jest.fn().mockResolvedValue(0) });
    attendanceModel = makeModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EduDashboardService,
        { provide: getModelToken(EduStudent.name), useValue: studentModel },
        { provide: getModelToken(EduClassroom.name), useValue: classroomModel },
        { provide: getModelToken(EduTuitionFee.name), useValue: tuitionModel },
        { provide: getModelToken(EduGrade.name), useValue: gradeModel },
        { provide: getModelToken(EduAttendance.name), useValue: attendanceModel },
      ],
    }).compile();

    service = module.get<EduDashboardService>(EduDashboardService);
  });

  it("should be defined", () => expect(service).toBeDefined());

  // ─── Fase 5 — getSummary con datos reales ────────────────────────────────

  describe("getSummary", () => {
    it("retorna estructura completa con todos los campos requeridos", async () => {
      // studentModel.$facet devuelve 10 alumnos, 8 en el salón
      studentModel.aggregate.mockResolvedValue([
        {
          total: [{ count: 10 }],
          byClassroom: [{ _id: CLASSROOM_ID, count: 8 }],
        },
      ]);

      // tuitionModel: 3 alumnos morosos, 500 de deuda; 2 alumnos morosos en el salón
      tuitionModel.aggregate
        .mockResolvedValueOnce([
          { overdueStudents: 3, totalWithFees: 10, overdueAmount: 500 },
        ])
        .mockResolvedValueOnce([
          { _id: CLASSROOM_ID, count: 2 },
        ]);

      // asistencia: 7 presentes en el salón
      attendanceModel.aggregate.mockResolvedValue([
        { _id: CLASSROOM_ID, present: 7 },
      ]);

      // notas en draft
      gradeModel.countDocuments.mockResolvedValue(5);

      const summary = await service.getSummary(TENANT_A, "2025-2026");

      expect(summary).toMatchObject({
        totalStudents: 10,
        activeStudents: 10,
        overdueCount: 3,
        overdueAmount: 500,
        solventCount: 7,         // 10 con fees - 3 morosos
        unpublishedGrades: 5,
        classroomCount: 1,
      });

      expect(summary.byClassroom).toHaveLength(1);
      expect(summary.byClassroom[0]).toMatchObject({
        totalStudents: 8,
        overdueStudents: 2,
        solventStudents: 6,
        presentToday: 7,
      });
    });

    it("retorna attendanceTodayPct = 0 cuando no hay alumnos", async () => {
      studentModel.aggregate.mockResolvedValue([{ total: [], byClassroom: [] }]);
      tuitionModel.aggregate.mockResolvedValue([]).mockResolvedValue([]);
      attendanceModel.aggregate.mockResolvedValue([]);
      gradeModel.countDocuments.mockResolvedValue(0);
      classroomModel.find.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve([]) }),
      });

      const summary = await service.getSummary(TENANT_A, "2025-2026");

      expect(summary.totalStudents).toBe(0);
      expect(summary.attendanceTodayPct).toBe(0);
      expect(summary.classroomCount).toBe(0);
    });

    it("las queries de studentModel y tuitionModel incluyen tenantId y academicYear", async () => {
      studentModel.aggregate.mockResolvedValue([{ total: [], byClassroom: [] }]);
      tuitionModel.aggregate.mockResolvedValue([]);
      attendanceModel.aggregate.mockResolvedValue([]);
      gradeModel.countDocuments.mockResolvedValue(0);
      classroomModel.find.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve([]) }),
      });

      await service.getSummary(TENANT_A, "2025-2026");

      // studentModel.aggregate debe haber recibido un $match con tenantId y academicYear
      const studentAggCall = studentModel.aggregate.mock.calls[0][0];
      const matchStage = studentAggCall.find((s: any) => s.$match);
      expect(matchStage.$match.academicYear).toBe("2025-2026");
      expect(matchStage.$match.tenantId.toString()).toBe(TENANT_A);
    });

    it("aplica isDeleted: {$ne: true} en la query de alumnos", async () => {
      studentModel.aggregate.mockResolvedValue([{ total: [], byClassroom: [] }]);
      tuitionModel.aggregate.mockResolvedValue([]);
      attendanceModel.aggregate.mockResolvedValue([]);
      gradeModel.countDocuments.mockResolvedValue(0);
      classroomModel.find.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve([]) }),
      });

      await service.getSummary(TENANT_A, "2025-2026");

      const studentAggCall = studentModel.aggregate.mock.calls[0][0];
      const matchStage = studentAggCall.find((s: any) => s.$match);
      expect(matchStage.$match.isDeleted).toEqual({ $ne: true });
    });
  });
});
