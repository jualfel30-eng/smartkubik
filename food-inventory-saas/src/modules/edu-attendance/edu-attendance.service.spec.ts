import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EduAttendanceService } from "./edu-attendance.service";
import { EduAttendance } from "../../schemas/edu-attendance.schema";

const TENANT = "507f1f77bcf86cd799439011";
const USER = "507f1f77bcf86cd799439099";
const CLASSROOM = "507f1f77bcf86cd799439002";
const STUDENT_A = "507f1f77bcf86cd799430001";
const STUDENT_B = "507f1f77bcf86cd799430002";

const baseDto = {
  classroomId: CLASSROOM,
  teacherId: "507f1f77bcf86cd799439003",
  date: "2025-09-15",
  entries: [
    { studentId: STUDENT_A, status: "present" },
    { studentId: STUDENT_B, status: "absent" },
  ],
};

describe("EduAttendanceService", () => {
  let service: EduAttendanceService;
  let attendanceModel: any;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    attendanceModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ _id: "mockId", ...baseDto }),
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) }),
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EduAttendanceService,
        { provide: getModelToken(EduAttendance.name), useValue: attendanceModel },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<EduAttendanceService>(EduAttendanceService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ── tenant isolation ────────────────────────────────────────────────────────

  it("should not return attendance from another tenant", async () => {
    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).attendanceModel = { find: mockFind, countDocuments: mockCount };

    const tenantB = "507f1f77bcf86cd799439012";
    const result = await service.findAll(tenantB, {});
    expect(mockFind.mock.calls[0][0].tenantId.toString()).toBe(tenantB);
    expect(result.data).toEqual([]);
  });

  it("should not return soft-deleted attendance records", async () => {
    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).attendanceModel = { find: mockFind, countDocuments: mockCount };

    await service.findAll(TENANT, {});
    expect(mockFind.mock.calls[0][0].isDeleted).toEqual({ $ne: true });
  });

  it("should throw NotFoundException when attendance not found", async () => {
    (service as any).attendanceModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };
    await expect(service.findOne("nonexistent", TENANT)).rejects.toThrow(NotFoundException);
  });

  // ── recordAttendance ────────────────────────────────────────────────────────

  it("should emit edu.attendance.absence for each absent student", async () => {
    await service.recordAttendance(baseDto, TENANT, USER);

    // Solo STUDENT_B tiene status 'absent'
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "edu.attendance.absence",
      expect.objectContaining({ studentId: STUDENT_B, tenantId: TENANT }),
    );
  });

  it("should not emit absence events for present students", async () => {
    const allPresentDto = {
      ...baseDto,
      entries: [
        { studentId: STUDENT_A, status: "present" },
        { studentId: STUDENT_B, status: "present" },
      ],
    };

    await service.recordAttendance(allPresentDto, TENANT, USER);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it("should emit one event per absent student (multiple absences)", async () => {
    const multiAbsenceDto = {
      ...baseDto,
      entries: [
        { studentId: STUDENT_A, status: "absent" },
        { studentId: STUDENT_B, status: "absent" },
      ],
    };

    await service.recordAttendance(multiAbsenceDto, TENANT, USER);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
  });

  it("should use upsert (findOneAndUpdate) not insert", async () => {
    await service.recordAttendance(baseDto, TENANT, USER);

    expect(attendanceModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ classroomId: expect.any(Object) }),
      expect.objectContaining({ $set: expect.any(Object) }),
      { upsert: true, new: true },
    );
  });

  it("should normalize date to noon UTC", async () => {
    await service.recordAttendance(baseDto, TENANT, USER);

    const callFilter = attendanceModel.findOneAndUpdate.mock.calls[0][0];
    expect(callFilter.date.toISOString()).toMatch(/T12:00:00\.000Z$/);
  });

  it("should throw BadRequestException for future dates", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    await expect(
      service.recordAttendance(
        { ...baseDto, date: futureDate.toISOString().split("T")[0] },
        TENANT,
        USER,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(attendanceModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
