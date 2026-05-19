import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { EduSchedulesService } from "./edu-schedules.service";
import { EduSchedule } from "../../schemas/edu-schedule.schema";
import { NotFoundException } from "@nestjs/common";

describe("EduSchedulesService", () => {
  let service: EduSchedulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EduSchedulesService,
        {
          provide: getModelToken(EduSchedule.name),
          useValue: function MockModel(dto: any) {
            return { ...dto, save: jest.fn().mockResolvedValue({ ...dto, _id: "mockId" }) };
          },
        },
      ],
    }).compile();

    service = module.get<EduSchedulesService>(EduSchedulesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should not return schedules from another tenant", async () => {
    const tenantB = "507f1f77bcf86cd799439012";

    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).scheduleModel = {
      find: mockFind,
      countDocuments: mockCount,
    } as any;

    const result = await service.findAll(tenantB, {});
    const callArg = mockFind.mock.calls[0][0];
    expect(callArg.tenantId.toString()).toBe(tenantB);
    expect(result.data).toEqual([]);
  });

  it("should not return soft-deleted schedules", async () => {
    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).scheduleModel = {
      find: mockFind,
      countDocuments: mockCount,
    } as any;

    await service.findAll("507f1f77bcf86cd799439011", {});
    const callArg = mockFind.mock.calls[0][0];
    expect(callArg.isDeleted).toEqual({ $ne: true });
  });

  it("should throw NotFoundException when schedule not found", async () => {
    (service as any).scheduleModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    } as any;

    await expect(service.findOne("nonexistent", "507f1f77bcf86cd799439011")).rejects.toThrow(
      NotFoundException,
    );
  });
});
