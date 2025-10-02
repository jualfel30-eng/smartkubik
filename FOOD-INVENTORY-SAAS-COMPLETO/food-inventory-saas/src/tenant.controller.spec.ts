import { Test, TestingModule } from "@nestjs/testing";
import { TenantController } from "./tenant.controller";
import { TenantService } from "./tenant.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { TenantGuard } from "./guards/tenant.guard";
import { PermissionsGuard } from "./guards/permissions.guard";
import { CanActivate } from "@nestjs/common";

// Mock the TenantService
const mockTenantService = {
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
  getUsers: jest.fn(),
};

// Mock guard that always allows access
const mockGuard: CanActivate = {
  canActivate: jest.fn(() => true),
};

describe("TenantController", () => {
  let controller: TenantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(TenantGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<TenantController>(TenantController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
