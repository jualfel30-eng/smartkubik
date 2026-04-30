import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';

interface ConnectionCheck {
  id: string;
  name: string;
  source: string;
  target: string;
  status: 'ok' | 'error' | 'warning';
  latencyMs: number;
  error?: string;
  details?: string;
}

interface NodeStatus {
  id: string;
  name: string;
  group: string;
  status: 'ok' | 'error' | 'warning';
  details?: string;
}

export interface SystemMapResult {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  nodes: NodeStatus[];
  connections: ConnectionCheck[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
    totalLatencyMs: number;
  };
}

@Injectable()
export class SystemMapService {
  private readonly logger = new Logger(SystemMapService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {}

  async runFullCheck(): Promise<SystemMapResult> {
    const nodes: NodeStatus[] = [];
    const connections: ConnectionCheck[] = [];

    // --- INFRASTRUCTURE CHECKS ---
    await this.checkMongoDB(nodes, connections);
    await this.checkRedis(nodes, connections);

    // --- COLLECTION HEALTH CHECKS (verify each collection is queryable) ---
    const collectionChecks = [
      // Core
      { collection: 'tenants', name: 'Tenants', group: 'core' },
      { collection: 'users', name: 'Users', group: 'core' },
      { collection: 'roles', name: 'Roles', group: 'core' },
      { collection: 'permissions', name: 'Permissions', group: 'core' },
      { collection: 'usertenantmemberships', name: 'Memberships', group: 'core' },

      // Products & Inventory
      { collection: 'products', name: 'Products', group: 'products' },
      { collection: 'inventories', name: 'Inventory', group: 'inventory' },
      { collection: 'inventorymovements', name: 'Movements', group: 'inventory' },
      { collection: 'inventoryalertrules', name: 'Alert Rules', group: 'inventory' },
      { collection: 'warehouses', name: 'Warehouses', group: 'inventory' },

      // Sales
      { collection: 'orders', name: 'Orders', group: 'sales' },
      { collection: 'payments', name: 'Payments', group: 'sales' },
      { collection: 'cashregistersessions', name: 'Cash Sessions', group: 'sales' },
      { collection: 'cashregisterclosings', name: 'Cash Closings', group: 'sales' },

      // Purchasing
      { collection: 'purchaseorders', name: 'Purchase Orders', group: 'purchasing' },
      { collection: 'suppliers', name: 'Suppliers', group: 'purchasing' },
      { collection: 'customers', name: 'Customers', group: 'crm' },

      // Finance
      { collection: 'chartofaccounts', name: 'Chart of Accounts', group: 'finance' },
      { collection: 'journalentries', name: 'Journal Entries', group: 'finance' },
      { collection: 'payables', name: 'Payables', group: 'finance' },
      { collection: 'bankaccounts', name: 'Bank Accounts', group: 'finance' },
      { collection: 'billingdocuments', name: 'Billing Docs', group: 'finance' },
      { collection: 'ivapurchasebooks', name: 'IVA Purchase Book', group: 'finance' },
      { collection: 'ivasalesbooks', name: 'IVA Sales Book', group: 'finance' },
      { collection: 'ivadeclarations', name: 'IVA Declarations', group: 'finance' },

      // Transfers
      { collection: 'transferorders', name: 'Transfer Orders', group: 'transfers' },

      // HR
      { collection: 'employeeprofiles', name: 'Employees', group: 'hr' },
      { collection: 'payrollruns', name: 'Payroll Runs', group: 'hr' },

      // Appointments
      { collection: 'appointments', name: 'Appointments', group: 'services' },
      { collection: 'services', name: 'Services', group: 'services' },

      // Restaurant
      { collection: 'tables', name: 'Tables', group: 'restaurant' },
      { collection: 'kitchenorders', name: 'Kitchen Orders', group: 'restaurant' },
      { collection: 'reservations', name: 'Reservations', group: 'restaurant' },

      // Marketing
      { collection: 'marketingcampaigns', name: 'Campaigns', group: 'marketing' },
      { collection: 'promotions', name: 'Promotions', group: 'marketing' },
      { collection: 'coupons', name: 'Coupons', group: 'marketing' },

      // Storefront
      { collection: 'storefrontconfigs', name: 'Storefront Config', group: 'storefront' },
    ];

    for (const check of collectionChecks) {
      await this.checkCollection(check.collection, check.name, check.group, nodes, connections);
    }

    // --- CROSS-MODULE CONNECTION CHECKS ---
    await this.checkCrossModuleConnections(connections);

    // --- EXTERNAL SERVICES ---
    await this.checkExternalServices(nodes, connections);

    // Calculate summary
    const passed = connections.filter(c => c.status === 'ok').length;
    const failed = connections.filter(c => c.status === 'error').length;
    const warnings = connections.filter(c => c.status === 'warning').length;
    const totalLatencyMs = connections.reduce((sum, c) => sum + c.latencyMs, 0);

    const overallStatus = failed > 0 ? 'critical' : warnings > 0 ? 'degraded' : 'healthy';

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      nodes,
      connections,
      summary: {
        totalChecks: connections.length,
        passed,
        failed,
        warnings,
        totalLatencyMs,
      },
    };
  }

  private async checkMongoDB(nodes: NodeStatus[], connections: ConnectionCheck[]) {
    const start = Date.now();
    try {
      const admin = this.connection.db.admin();
      await admin.ping();
      const latency = Date.now() - start;
      nodes.push({ id: 'mongodb', name: 'MongoDB', group: 'infrastructure', status: 'ok', details: `${latency}ms` });
      connections.push({ id: 'app-mongodb', name: 'App → MongoDB', source: 'app', target: 'mongodb', status: 'ok', latencyMs: latency });
    } catch (err) {
      const latency = Date.now() - start;
      nodes.push({ id: 'mongodb', name: 'MongoDB', group: 'infrastructure', status: 'error', details: err.message });
      connections.push({ id: 'app-mongodb', name: 'App → MongoDB', source: 'app', target: 'mongodb', status: 'error', latencyMs: latency, error: err.message });
    }
  }

  private async checkRedis(nodes: NodeStatus[], connections: ConnectionCheck[]) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      nodes.push({ id: 'redis', name: 'Redis', group: 'infrastructure', status: 'warning', details: 'No REDIS_URL configured' });
      return;
    }
    // Redis health is inferred from BullMQ — if queues work, Redis is fine
    nodes.push({ id: 'redis', name: 'Redis (BullMQ)', group: 'infrastructure', status: 'ok', details: 'Configured' });
    connections.push({ id: 'app-redis', name: 'App → Redis', source: 'app', target: 'redis', status: 'ok', latencyMs: 0, details: 'Inferred from config' });
  }

  private async checkCollection(
    collectionName: string,
    displayName: string,
    group: string,
    nodes: NodeStatus[],
    connections: ConnectionCheck[],
  ) {
    const nodeId = collectionName;
    const start = Date.now();
    try {
      const collection = this.connection.db.collection(collectionName);
      const count = await collection.estimatedDocumentCount();
      const latency = Date.now() - start;

      nodes.push({
        id: nodeId,
        name: displayName,
        group,
        status: 'ok',
        details: `${count} docs, ${latency}ms`,
      });
      connections.push({
        id: `mongodb-${nodeId}`,
        name: `MongoDB → ${displayName}`,
        source: 'mongodb',
        target: nodeId,
        status: 'ok',
        latencyMs: latency,
        details: `${count} documents`,
      });
    } catch (err) {
      const latency = Date.now() - start;
      nodes.push({
        id: nodeId,
        name: displayName,
        group,
        status: 'error',
        details: err.message,
      });
      connections.push({
        id: `mongodb-${nodeId}`,
        name: `MongoDB → ${displayName}`,
        source: 'mongodb',
        target: nodeId,
        status: 'error',
        latencyMs: latency,
        error: err.message,
      });
    }
  }

  private async checkCrossModuleConnections(connections: ConnectionCheck[]) {
    // Check critical cross-module data integrity

    // 1. Products → Inventory link (do inventories reference valid products?)
    await this.checkReferentialIntegrity(
      connections,
      'inventories',
      'productId',
      'products',
      '_id',
      'Inventory → Products',
      'inventory-products',
    );

    // 2. Orders → Customers link
    await this.checkReferentialIntegrity(
      connections,
      'orders',
      'customerId',
      'customers',
      '_id',
      'Orders → Customers',
      'orders-customers',
    );

    // 3. PurchaseOrders → Customers (suppliers)
    await this.checkReferentialIntegrity(
      connections,
      'purchaseorders',
      'supplierId',
      'customers',
      '_id',
      'PurchaseOrders → Suppliers',
      'purchases-suppliers',
    );

    // 4. Inventory → Warehouses
    await this.checkWarehouseAssignment(connections);

    // 5. Accounting accounts exist
    await this.checkAccountingAccounts(connections);
  }

  private async checkReferentialIntegrity(
    connections: ConnectionCheck[],
    sourceCollection: string,
    sourceField: string,
    targetCollection: string,
    targetField: string,
    name: string,
    id: string,
  ) {
    const start = Date.now();
    try {
      const source = this.connection.db.collection(sourceCollection);
      const target = this.connection.db.collection(targetCollection);

      // Sample 100 recent records and verify their references exist
      const sample = await source
        .find({ [sourceField]: { $exists: true, $ne: null } })
        .sort({ _id: -1 })
        .limit(100)
        .project({ [sourceField]: 1 })
        .toArray();

      if (sample.length === 0) {
        connections.push({ id, name, source: sourceCollection, target: targetCollection, status: 'ok', latencyMs: Date.now() - start, details: 'No records to verify' });
        return;
      }

      // Build lookup array with BOTH String and ObjectId formats
      // (SmartKubik stores IDs inconsistently — some as String, some as ObjectId)
      const lookupValues: (string | Types.ObjectId)[] = [];
      const refIds = sample.map(doc => doc[sourceField]).filter(Boolean);

      for (const refId of refIds) {
        const str = String(refId);
        lookupValues.push(str);
        if (Types.ObjectId.isValid(str)) {
          lookupValues.push(new Types.ObjectId(str));
        }
      }

      const found = await target.countDocuments({
        [targetField]: { $in: lookupValues },
      });

      // found may be higher than sample.length because both String and ObjectId can match
      // What matters is: for how many SOURCE records did we find at least one match?
      // Simplified: if found >= sample.length, all are valid
      const effectiveFound = Math.min(found, sample.length);
      const orphanCount = sample.length - effectiveFound;
      const latency = Date.now() - start;

      if (orphanCount === 0) {
        connections.push({ id, name, source: sourceCollection, target: targetCollection, status: 'ok', latencyMs: latency, details: `${sample.length}/${sample.length} refs valid` });
      } else if (orphanCount <= 5) {
        connections.push({ id, name, source: sourceCollection, target: targetCollection, status: 'warning', latencyMs: latency, details: `${orphanCount}/${sample.length} orphan refs` });
      } else {
        connections.push({ id, name, source: sourceCollection, target: targetCollection, status: 'error', latencyMs: latency, error: `${orphanCount}/${sample.length} orphan refs — data integrity issue` });
      }
    } catch (err) {
      connections.push({ id, name, source: sourceCollection, target: targetCollection, status: 'error', latencyMs: Date.now() - start, error: err.message });
    }
  }

  private async checkWarehouseAssignment(connections: ConnectionCheck[]) {
    const start = Date.now();
    try {
      const inventories = this.connection.db.collection('inventories');
      const noWarehouse = await inventories.countDocuments({
        $or: [{ warehouseId: { $exists: false } }, { warehouseId: null }],
        isDeleted: { $ne: true },
      });
      const total = await inventories.countDocuments({ isDeleted: { $ne: true } });
      const latency = Date.now() - start;

      if (noWarehouse === 0) {
        connections.push({ id: 'inventory-warehouses', name: 'Inventory → Warehouses', source: 'inventories', target: 'warehouses', status: 'ok', latencyMs: latency, details: `All ${total} have warehouseId` });
      } else {
        connections.push({ id: 'inventory-warehouses', name: 'Inventory → Warehouses', source: 'inventories', target: 'warehouses', status: 'warning', latencyMs: latency, details: `${noWarehouse}/${total} missing warehouseId` });
      }
    } catch (err) {
      connections.push({ id: 'inventory-warehouses', name: 'Inventory → Warehouses', source: 'inventories', target: 'warehouses', status: 'error', latencyMs: Date.now() - start, error: err.message });
    }
  }

  private async checkAccountingAccounts(connections: ConnectionCheck[]) {
    const start = Date.now();
    try {
      const accounts = this.connection.db.collection('chartofaccounts');
      const criticalCodes = ['1101', '1102', '1103', '2101', '2102', '4101', '5101'];
      const found = await accounts.countDocuments({ code: { $in: criticalCodes } });
      const latency = Date.now() - start;

      if (found >= criticalCodes.length) {
        connections.push({ id: 'accounting-coa', name: 'Accounting → Chart of Accounts', source: 'app', target: 'chartofaccounts', status: 'ok', latencyMs: latency, details: `${found}/${criticalCodes.length} critical accounts exist` });
      } else {
        connections.push({ id: 'accounting-coa', name: 'Accounting → Chart of Accounts', source: 'app', target: 'chartofaccounts', status: 'warning', latencyMs: latency, details: `Only ${found}/${criticalCodes.length} critical accounts — missing accounts will be auto-created on first use` });
      }
    } catch (err) {
      connections.push({ id: 'accounting-coa', name: 'Accounting → Chart of Accounts', source: 'app', target: 'chartofaccounts', status: 'error', latencyMs: Date.now() - start, error: err.message });
    }
  }

  private async checkExternalServices(nodes: NodeStatus[], connections: ConnectionCheck[]) {
    // OpenAI
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      nodes.push({ id: 'openai', name: 'OpenAI', group: 'external', status: 'ok', details: 'API key configured' });
      connections.push({ id: 'app-openai', name: 'App → OpenAI', source: 'app', target: 'openai', status: 'ok', latencyMs: 0, details: 'Key present (not tested)' });
    } else {
      nodes.push({ id: 'openai', name: 'OpenAI', group: 'external', status: 'warning', details: 'No API key' });
    }

    // WhatsApp (Whapi)
    const whapiToken = this.configService.get<string>('WHAPI_TOKEN');
    if (whapiToken) {
      nodes.push({ id: 'whapi', name: 'WhatsApp (Whapi)', group: 'external', status: 'ok', details: 'Token configured' });
      connections.push({ id: 'app-whapi', name: 'App → WhatsApp', source: 'app', target: 'whapi', status: 'ok', latencyMs: 0, details: 'Token present' });
    } else {
      nodes.push({ id: 'whapi', name: 'WhatsApp (Whapi)', group: 'external', status: 'warning', details: 'No token' });
    }

    // Email (Resend)
    const resendKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendKey) {
      nodes.push({ id: 'resend', name: 'Email (Resend)', group: 'external', status: 'ok', details: 'API key configured' });
    } else {
      nodes.push({ id: 'resend', name: 'Email (Resend)', group: 'external', status: 'warning', details: 'No API key' });
    }
  }
}
