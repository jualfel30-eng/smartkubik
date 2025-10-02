import { Test, TestingModule } from "@nestjs/testing";
import { TenantService } from "./tenant.service";
import { getModelToken } from "@nestjs/mongoose";
import { Tenant } from "./schemas/tenant.schema";
import { User } from "./schemas/user.schema";

// Mock the Mongoose model methods used in the service
const mockTenantModel = {
  findById: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn(),
  findByIdAndUpdate: jest.fn().mockReturnThis(),
};

const mockUserModel = {
  find: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

describe("TenantService", () => {
  let service: TenantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: getModelToken(Tenant.name),
          useValue: mockTenantModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
