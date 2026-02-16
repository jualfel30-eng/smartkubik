import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import {
  ChartOfAccounts,
  ChartOfAccountsDocument,
} from "../../schemas/chart-of-accounts.schema";
import { PAYROLL_SYSTEM_ACCOUNTS } from "../../config/payroll-system-accounts.config";
import { COMMISSION_SYSTEM_ACCOUNTS } from "../../config/commission-system-accounts.config";
import {
  PayrollStructure,
  PayrollStructureDocument,
} from "../../schemas/payroll-structure.schema";
import { DEFAULT_PAYROLL_STRUCTURES } from "../payroll-structures/config/default-structures.config";
import { buildSeedStructurePayload } from "../payroll-structures/utils/structure-seed.util";

// Combina cuentas de payroll y comisiones para bootstrap conjunto
const ALL_SYSTEM_ACCOUNTS = [
  ...PAYROLL_SYSTEM_ACCOUNTS,
  ...COMMISSION_SYSTEM_ACCOUNTS,
];

@Injectable()
export class PayrollBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(PayrollBootstrapService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(ChartOfAccounts.name)
    private chartModel: Model<ChartOfAccountsDocument>,
    @InjectModel(PayrollStructure.name)
    private structureModel: Model<PayrollStructureDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.DISABLE_PAYROLL_BOOTSTRAP === "true") {
      this.logger.warn("Payroll bootstrap skipped (env override)");
      return;
    }

    try {
      await this.ensurePayrollBootstrapForAllTenants();
    } catch (error) {
      this.logger.error(
        "Payroll bootstrap failed during module init",
        error.stack,
      );
    }
  }

  async ensurePayrollBootstrapForAllTenants(): Promise<void> {
    const tenants = await this.tenantModel
      .find()
      .select("_id code name enabledModules")
      .lean();

    for (const tenant of tenants) {
      await this.ensurePayrollBootstrapForTenant(tenant);
    }
  }

  private async ensurePayrollBootstrapForTenant(tenant: {
    _id: Types.ObjectId;
    code?: string;
    name?: string;
    enabledModules?: Tenant["enabledModules"];
  }): Promise<void> {
    const tenantId = tenant._id.toString();
    let created = 0;
    let updated = 0;

    // Procesa cuentas de payroll y comisiones
    for (const blueprint of ALL_SYSTEM_ACCOUNTS) {
      const existing = await this.chartModel
        .findOne({ tenantId, code: blueprint.code })
        .exec();

      if (!existing) {
        await this.chartModel.create({
          ...blueprint,
          tenantId,
          isEditable: !blueprint.isSystemAccount,
        });
        created += 1;
        continue;
      }

      const updates: Record<string, any> = {};
      if (existing.isSystemAccount !== blueprint.isSystemAccount) {
        updates.isSystemAccount = blueprint.isSystemAccount;
      }
      if (typeof existing.isEditable === "undefined") {
        updates.isEditable = !blueprint.isSystemAccount;
      }
      // Actualiza metadata de payroll o comisiones
      if (blueprint.metadata?.payrollCategory || blueprint.metadata?.commissionCategory) {
        const metadataKey = blueprint.metadata?.payrollCategory
          ? "payrollCategory"
          : "commissionCategory";
        const metadataValue = blueprint.metadata?.payrollCategory || blueprint.metadata?.commissionCategory;
        const currentValue = existing.metadata?.[metadataKey];
        if (currentValue !== metadataValue) {
          updates.metadata = {
            ...(existing.metadata || {}),
            ...blueprint.metadata,
          };
        }
      }

      if (Object.keys(updates).length > 0) {
        await this.chartModel.updateOne(
          { _id: existing._id },
          { $set: updates },
        );
        updated += 1;
      }
    }

    if (tenant.enabledModules?.payroll !== true) {
      await this.tenantModel.updateOne(
        { _id: tenantId },
        { $set: { "enabledModules.payroll": true } },
      );
      updated += 1;
    }

    const seededStructures = await this.ensureDefaultStructuresForTenant(
      tenant._id,
    );

    if (created > 0 || updated > 0) {
      this.logger.log(
        `Tenant ${tenant.code || tenant.name || tenantId}: ${created} payroll/commission accounts created, ${updated} updates applied.`,
      );
    }

    if (seededStructures > 0) {
      this.logger.log(
        `Tenant ${tenant.code || tenant.name || tenantId}: ${seededStructures} estructuras base creadas automáticamente.`,
      );
    }
  }

  private async ensureDefaultStructuresForTenant(
    tenantId: Types.ObjectId,
  ): Promise<number> {
    let created = 0;
    const tenantObjectId =
      tenantId instanceof Types.ObjectId
        ? tenantId
        : new Types.ObjectId(tenantId);
    for (const blueprint of DEFAULT_PAYROLL_STRUCTURES) {
      const now = new Date();
      const payload = buildSeedStructurePayload(tenantObjectId, blueprint, now);
      const exists = await this.structureModel.exists({
        tenantId: tenantObjectId,
        $or: [
          { scopeKey: payload.scopeKey },
          { name: payload.name },
          { "metadata.seedSlug": blueprint.slug },
        ],
      });
      if (exists) {
        continue;
      }
      await this.structureModel.create(payload);
      created += 1;
    }
    return created;
  }
}
