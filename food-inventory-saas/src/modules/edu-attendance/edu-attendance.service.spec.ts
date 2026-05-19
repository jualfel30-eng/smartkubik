import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { EduAttendanceService } from "./edu-attendance.service";
import { EduAttendance } from "../../schemas/edu-attendance.schema";
import { NotFoundException } from "@nestjs/common";

describe("EduAttendanceService", () => {
  let service: EduAttendanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EduAttendanceService,
        {
          provide: getModelToken(EduAttendance.name),
          useValue: function MockModel(dto: any) {
            return { ...dto, save: jest.fn().mockResolvedValue({ ...dto, _id: "mockId" }) };
          },
        },
      ],
    }).compile();

    service = module.get<EduAttendanceService>(EduAttendanceService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should not return attendance from another tenant", async () => {
    const tenantB = "507f1f77bcf86cd799439012";

    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).attendanceModel = {
      find: mockFind,
      countDocuments: mockCount,
    } as any;

    const result = await service.findAll(tenantB, {});
    const callArg = mockFind.mock.calls[0][0];
    expect(callArg.tenantId.toString()).toBe(tenantB);
    expect(result.data).toEqual([]);
  });

  it("should not return soft-deleted attendance records", async () => {
    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).attendanceModel = {
      find: mockFind,
      countDocuments: mockCount,
    } as any;

    await service.findAll("507f1f77bcf86cd799439011", {});
    const callArg = mockFind.mock.calls[0][0];
    expect(callArg.isDeleted).toEqual({ $ne: true });
  });

  it("should throw NotFoundException when attendance not found", async () => {
    (service as any).attendanceModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    } as any;

    await expect(service.findOne("nonexistent", "507f1f77bcf86cd799439011")).rejects.toThrow(
      NotFoundException,
    );
  });
});
