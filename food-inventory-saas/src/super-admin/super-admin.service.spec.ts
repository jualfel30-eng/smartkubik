import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminService } from './super-admin.service';
import { getModelToken } from '@nestjs/mongoose';
import { Tenant } from '../schemas/tenant.schema';
import { User } from '../schemas/user.schema';
import { Event } from '../schemas/event.schema';
import { Role } from '../schemas/role.schema';
import { Permission } from '../schemas/permission.schema';
import { UserTenantMembership } from '../schemas/user-tenant-membership.schema';
import { AuthService } from '../auth/auth.service';
import { AuditLogService } from '../modules/audit-log/audit-log.service';

const createMockModel = () => ({
  find: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  findByIdAndUpdate: jest.fn().mockReturnThis(),
  countDocuments: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  exec: jest.fn(),
  lean: jest.fn().mockReturnThis(),
  toObject: jest.fn(),
});

const mockAuthService = {
  login: jest.fn(),
};

const mockAuditLogService = {
  createLog: jest.fn(),
  findLogs: jest.fn(),
};

describe('SuperAdminService', () => {
  let service: SuperAdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        {
          provide: getModelToken(Tenant.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(User.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Event.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Role.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Permission.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(UserTenantMembership.name),
          useValue: createMockModel(),
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<SuperAdminService>(SuperAdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
