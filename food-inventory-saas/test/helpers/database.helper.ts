import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Configuración para base de datos de test
 * Usa MongoDB real si MONGO_URI_TEST está definida,
 * de lo contrario usa conexión por defecto (para CI/CD)
 */
export function getTestDatabaseModule(): any {
  const testUri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;

  if (!testUri) {
    throw new Error(
      'MONGO_URI_TEST or MONGO_URI environment variable must be defined for tests',
    );
  }

  const options: MongooseModuleOptions = {
    // Usar base de datos de test separada
    dbName: process.env.TEST_DB_NAME || 'food-inventory-test',
  };

  return MongooseModule.forRoot(testUri, options);
}

/**
 * Limpia todas las colecciones de la base de datos
 * Útil en afterEach o afterAll para limpiar estado entre tests
 */
export async function clearDatabase(connection: Connection): Promise<void> {
  if (!connection || !connection.db) {
    console.warn('No database connection available to clear');
    return;
  }

  const collections = connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    try {
      await collection.deleteMany({});
    } catch (error) {
      console.error(`Error clearing collection ${key}:`, error);
    }
  }
}

/**
 * Cierra la conexión a la base de datos
 * Llamar en afterAll de tests E2E
 */
export async function closeDatabase(connection: Connection): Promise<void> {
  if (connection) {
    await connection.close();
  }
}

/**
 * Seed básico para tests E2E
 * Crea tenant, usuario admin, rol y permisos básicos
 */
export async function seedTestData(connection: Connection) {
  const { Types } = require('mongoose');

  // IDs fijos para testing
  const tenantId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const adminRoleId = new Types.ObjectId('507f1f77bcf86cd799439013');
  const userId = new Types.ObjectId('507f1f77bcf86cd799439011');

  // Crear permisos
  const permissions = [
    { _id: new Types.ObjectId(), name: 'orders_read' },
    { _id: new Types.ObjectId(), name: 'orders_create' },
    { _id: new Types.ObjectId(), name: 'orders_update' },
    { _id: new Types.ObjectId(), name: 'orders_delete' },
    { _id: new Types.ObjectId(), name: 'inventory_read' },
    { _id: new Types.ObjectId(), name: 'inventory_update' },
  ];

  await connection.collection('permissions').insertMany(permissions);

  // Crear tenant
  const tenant = {
    _id: tenantId,
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await connection.collection('tenants').insertOne(tenant);

  // Crear rol admin
  const adminRole = {
    _id: adminRoleId,
    name: 'admin',
    permissions: permissions.map((p) => p._id),
    tenantId: tenantId,
    createdAt: new Date(),
  };

  await connection.collection('roles').insertOne(adminRole);

  // Crear usuario admin (password: "password123")
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = {
    _id: userId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: hashedPassword,
    tenantId: tenantId,
    role: adminRoleId,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await connection.collection('users').insertOne(adminUser);

  // Crear membership
  const membership = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439020'),
    userId: userId,
    tenantId: tenantId,
    roleId: adminRoleId,
    status: 'active',
    isDefault: true,
    permissionsCache: permissions.map((p) => p.name),
    createdAt: new Date(),
  };

  await connection.collection('usertenantmemberships').insertOne(membership);

  return {
    tenant,
    adminUser,
    adminRole,
    permissions,
    membership,
  };
}

/**
 * Helper para esperar que la BD esté lista
 * Útil en beforeAll de tests E2E
 */
export async function waitForDatabase(
  connection: Connection,
  timeoutMs: number = 10000,
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      if (connection.readyState === 1) {
        // 1 = connected
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      // Continue waiting
    }
  }

  throw new Error(`Database connection timeout after ${timeoutMs}ms`);
}

/**
 * Verifica que la base de datos esté vacía
 * Útil para validar que clearDatabase funcionó
 */
export async function isDatabaseEmpty(connection: Connection): Promise<boolean> {
  const collections = await connection.db.listCollections().toArray();

  for (const collectionInfo of collections) {
    const count = await connection.collection(collectionInfo.name).countDocuments();
    if (count > 0) {
      console.log(`Collection ${collectionInfo.name} has ${count} documents`);
      return false;
    }
  }

  return true;
}
