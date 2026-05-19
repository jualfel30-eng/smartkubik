import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { EduClassroomsService } from "./edu-classrooms.service";
import { EduClassroom } from "../../schemas/edu-classroom.schema";
import { NotFoundException } from "@nestjs/common";

describe("EduClassroomsService", () => {
  let service: EduClassroomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EduClassroomsService,
        {
          provide: getModelToken(EduClassroom.name),
          useValue: function MockModel(dto: any) {
            return { ...dto, save: jest.fn().mockResolvedValue({ ...dto, _id: "mockId" }) };
          },
        },
      ],
    }).compile();

    service = module.get<EduClassroomsService>(EduClassroomsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should not return classrooms from another tenant", async () => {
    const tenantB = "507f1f77bcf86cd799439012";

    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).classroomModel = {
      find: mockFind,
      countDocuments: mockCount,
    } as any;

    const result = await service.findAll(tenantB, {});
    const callArg = mockFind.mock.calls[0][0];
    expect(callArg.tenantId.toString()).toBe(tenantB);
    expect(result.data).toEqual([]);
  });

  it("should not return soft-deleted classrooms", async () => {
    const mockExec = jest.fn().mockResolvedValue([]);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockCount = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    (service as any).classroomModel = {
      find: mockFind,
      countDocuments: mockCount,
    } as any;

    await service.findAll("507f1f77bcf86cd799439011", {});
    const callArg = mockFind.mock.calls[0][0];
    expect(callArg.isDeleted).toEqual({ $ne: true });
  });

  it("should throw NotFoundException when classroom not found", async () => {
    (service as any).classroomModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    } as any;

    await expect(service.findOne("nonexistent", "507f1f77bcf86cd799439011")).rejects.toThrow(
      NotFoundException,
    );
  });
});
