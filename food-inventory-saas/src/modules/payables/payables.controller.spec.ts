import { Test, TestingModule } from "@nestjs/testing";
import { PayablesController } from "./payables.controller";
import { PayablesService } from "./payables.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";

const mockPayablesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe("PayablesController", () => {
  let controller: PayablesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayablesController],
      providers: [
        {
          provide: PayablesService,
          useValue: mockPayablesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PayablesController>(PayablesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
