import { Test, TestingModule } from "@nestjs/testing";
import { TenantService } from "./tenant.service";
import { getModelToken } from "@nestjs/mongoose";
import { Tenant } from "./schemas/tenant.schema";
import { User } from "./schemas/user.schema";
import { Customer } from "./schemas/customer.schema";
import { MailService } from "./modules/mail/mail.service";

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

const mockCustomerModel = {
  find: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

const mockMailService = {
  sendTenantInviteEmail: jest.fn(),
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
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
