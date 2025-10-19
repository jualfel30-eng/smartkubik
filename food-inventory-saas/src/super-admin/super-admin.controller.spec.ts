import { Test, TestingModule } from "@nestjs/testing";
import { SuperAdminController } from "./super-admin.controller";
import { SuperAdminService } from "./super-admin.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { SuperAdminGuard } from "../guards/super-admin.guard";

const mockSuperAdminService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  findUsersByTenant: jest.fn(),
  impersonateUser: jest.fn(),
  findAuditLogs: jest.fn(),
  getGlobalMetrics: jest.fn(),
  findAllEvents: jest.fn(),
  getTenantConfiguration: jest.fn(),
  updateTenantModules: jest.fn(),
  updateRolePermissions: jest.fn(),
  syncTenantMemberships: jest.fn(),
};

const mockGuard = {
  canActivate: jest.fn(() => true),
};

describe("SuperAdminController", () => {
  let controller: SuperAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminController],
      providers: [
        {
          provide: SuperAdminService,
          useValue: mockSuperAdminService,
        },
        {
          provide: JwtAuthGuard,
          useValue: mockGuard,
        },
        {
          provide: SuperAdminGuard,
          useValue: mockGuard,
        },
      ],
    }).compile();

    controller = module.get<SuperAdminController>(SuperAdminController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
