import { Types } from 'mongoose';

/**
 * Crea un mock de Mongoose Model con métodos comunes
 * Útil para mockear modelos en tests unitarios
 */
export function createMockModel<T>(data?: Partial<T>[], options?: {
  populateData?: any;
}) {
  const mockData = data || [];

  const model = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    findByIdAndDelete: jest.fn().mockReturnThis(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
    create: jest.fn(),
    insertMany: jest.fn().mockResolvedValue([]),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: mockData.length }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: mockData.length }),
    countDocuments: jest.fn().mockResolvedValue(mockData.length),
    aggregate: jest.fn().mockResolvedValue([]),

    // Métodos encadenables
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),

    // Método exec para terminar cadena
    exec: jest.fn().mockImplementation(async function() {
      // Si se llamó populate, retornar datos populados
      if (this.populate.mock.calls.length > 0 && options?.populateData) {
        return options.populateData;
      }

      // Comportamiento por defecto según método llamado
      if (this.find.mock.calls.length > 0) {
        return mockData;
      }
      if (this.findOne.mock.calls.length > 0 || this.findById.mock.calls.length > 0) {
        return mockData[0] || null;
      }
      return null;
    }),

    // Para constructor de documentos
    constructor: jest.fn().mockImplementation((doc) => ({
      ...doc,
      save: jest.fn().mockResolvedValue({ ...doc, _id: new Types.ObjectId() }),
    })),
  };

  // Configurar create para retornar documento con save()
  model.create.mockImplementation((doc) => {
    const document = {
      ...doc,
      _id: doc._id || new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({ ...doc, _id: doc._id || new Types.ObjectId() }),
    };
    return Promise.resolve(document);
  });

  return model;
}

/**
 * Crea un user mock para testing
 */
export function createMockUser(overrides?: any) {
  return {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: '$2b$10$hashedpassword',
    tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
    role: new Types.ObjectId('507f1f77bcf86cd799439013'),
    status: 'active',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

/**
 * Crea un tenant mock para testing
 */
export function createMockTenant(overrides?: any) {
  return {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    name: 'Test Tenant',
    status: 'active',
    vertical: 'food-service',
    subscriptionPlan: 'premium',
    isConfirmed: true,
    enabledModules: {
      inventory: true,
      orders: true,
      restaurant: true,
      payroll: true,
    },
    usage: {
      currentUsers: 5,
      currentOrders: 100,
    },
    limits: {
      maxUsers: 50,
      maxOrders: 10000,
    },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

/**
 * Crea un role mock para testing
 */
export function createMockRole(overrides?: any) {
  return {
    _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
    name: 'admin',
    permissions: [
      { _id: new Types.ObjectId(), name: 'orders_read' },
      { _id: new Types.ObjectId(), name: 'orders_create' },
      { _id: new Types.ObjectId(), name: 'orders_update' },
      { _id: new Types.ObjectId(), name: 'inventory_read' },
    ],
    tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

/**
 * Crea un membership mock para testing
 */
export function createMockMembership(overrides?: any) {
  return {
    _id: new Types.ObjectId('507f1f77bcf86cd799439020'),
    userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
    tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
    roleId: new Types.ObjectId('507f1f77bcf86cd799439013'),
    status: 'active',
    isDefault: true,
    permissionsCache: ['orders_read', 'orders_create'],
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

/**
 * Crea un payment mock para testing
 */
export function createMockPayment(overrides?: any) {
  return {
    _id: new Types.ObjectId('507f1f77bcf86cd799439030'),
    tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
    orderId: new Types.ObjectId('507f1f77bcf86cd799439031'),
    amount: 100,
    currency: 'USD',
    method: 'cash',
    status: 'confirmed',
    paymentType: 'sale',
    date: new Date('2025-01-01'),
    confirmedAt: new Date('2025-01-01'),
    reconciliationStatus: 'pending',
    ...overrides,
  };
}

/**
 * Crea un order mock para testing
 */
export function createMockOrder(overrides?: any) {
  return {
    _id: new Types.ObjectId('507f1f77bcf86cd799439031'),
    tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
    orderNumber: 'ORD-001',
    customerName: 'Test Customer',
    status: 'confirmed',
    paymentStatus: 'pending',
    totalAmount: 100,
    paidAmount: 0,
    items: [
      {
        _id: new Types.ObjectId(),
        productId: new Types.ObjectId(),
        productName: 'Test Product',
        quantity: 2,
        price: 50,
        modifiers: [],
      },
    ],
    payments: [],
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

/**
 * Crea un JWT payload mock para testing
 */
export function createMockJwtPayload(overrides?: any) {
  return {
    sub: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    role: {
      name: 'admin',
      permissions: ['orders_read', 'orders_create', 'orders_update'],
    },
    tenantId: '507f1f77bcf86cd799439012',
    tenantConfirmed: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900, // 15 min
    ...overrides,
  };
}

/**
 * Helper para esperar un tiempo (útil en tests async)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper para generar ObjectId válido
 */
export function generateObjectId(): Types.ObjectId {
  return new Types.ObjectId();
}

/**
 * Helper para verificar si un valor es un ObjectId válido
 */
export function isValidObjectId(id: any): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Helper para crear mock de JwtService
 */
export function createMockJwtService() {
  return {
    sign: jest.fn().mockReturnValue('mock-access-token'),
    signAsync: jest.fn().mockResolvedValue('mock-access-token'),
    verify: jest.fn().mockReturnValue(createMockJwtPayload()),
    verifyAsync: jest.fn().mockResolvedValue(createMockJwtPayload()),
    decode: jest.fn().mockReturnValue(createMockJwtPayload()),
  };
}

/**
 * Helper para crear mock de MailService
 */
export function createMockMailService() {
  return {
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendInvitationEmail: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Helper para crear mock de PermissionsService
 */
export function createMockPermissionsService() {
  return {
    findAll: jest.fn().mockReturnValue([
      'orders_read',
      'orders_create',
      'orders_update',
      'orders_delete',
      'inventory_read',
      'inventory_update',
    ]),
    findByName: jest.fn().mockImplementation((name: string) => ({
      _id: new Types.ObjectId(),
      name,
    })),
    findByModules: jest.fn().mockReturnValue([
      'orders_read',
      'orders_create',
      'orders_update',
      'orders_delete',
      'inventory_read',
      'inventory_update',
    ]),
  };
}

/**
 * Helper para crear mock de RolesService
 */
export function createMockRolesService() {
  return {
    findOne: jest.fn().mockResolvedValue(createMockRole()),
    findByName: jest.fn().mockResolvedValue(createMockRole()),
    findOneByName: jest.fn().mockResolvedValue(createMockRole()),
    create: jest.fn().mockResolvedValue(createMockRole()),
    createDefaultRoles: jest.fn().mockResolvedValue([createMockRole()]),
  };
}

/**
 * Helper para crear mock de MembershipsService
 */
export function createMockMembershipsService() {
  return {
    findActiveMembershipsForUser: jest.fn().mockResolvedValue([
      {
        id: '507f1f77bcf86cd799439020',
        status: 'active',
        isDefault: true,
        tenant: {
          id: '507f1f77bcf86cd799439012',
          name: 'Test Tenant',
          status: 'active',
        },
        role: {
          id: '507f1f77bcf86cd799439013',
          name: 'admin',
        },
        permissions: ['orders_read', 'orders_create'],
      },
    ]),
    getMembershipForUserOrFail: jest.fn().mockResolvedValue(createMockMembership()),
    setDefaultMembership: jest.fn().mockResolvedValue(undefined),
    buildMembershipSummary: jest.fn().mockResolvedValue({
      id: '507f1f77bcf86cd799439020',
      status: 'active',
      isDefault: true,
      tenant: { id: '507f1f77bcf86cd799439012', name: 'Test Tenant', status: 'active' },
      role: { id: '507f1f77bcf86cd799439013', name: 'admin' },
      permissions: ['orders_read'],
    }),
    createDefaultMembershipIfMissing: jest.fn().mockResolvedValue({
      id: '507f1f77bcf86cd799439020',
      status: 'active',
      isDefault: true,
    }),
    resolveTenantById: jest.fn().mockResolvedValue(null),
    resolveRoleById: jest.fn().mockResolvedValue(null),
  };
}

/**
 * Helper para crear mock de AccountingService
 */
export function createMockAccountingService() {
  return {
    createJournalEntryForPayment: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      lines: [],
      isAutomatic: true,
    }),
    createJournalEntryForPayablePayment: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      lines: [],
      isAutomatic: true,
    }),
  };
}

/**
 * Helper para crear mock de BankAccountsService
 */
export function createMockBankAccountsService() {
  return {
    updateBalance: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      currentBalance: 1000,
    }),
    findOne: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      currency: 'USD',
      currentBalance: 1000,
    }),
  };
}

/**
 * Helper para crear mock de BankTransactionsService
 */
export function createMockBankTransactionsService() {
  return {
    recordPaymentMovement: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      paymentId: new Types.ObjectId(),
      amount: 100,
    }),
  };
}
