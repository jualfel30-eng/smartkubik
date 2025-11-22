import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  PayrollStructure,
  PayrollStructureDocument,
} from "../../schemas/payroll-structure.schema";
import { CreatePayrollStructureDto } from "./dto/create-payroll-structure.dto";
import { UpdatePayrollStructureDto } from "./dto/update-payroll-structure.dto";
import {
  PayrollRule,
  PayrollRuleDocument,
} from "../../schemas/payroll-rule.schema";
import { CreatePayrollRuleDto } from "./dto/create-payroll-rule.dto";
import { UpdatePayrollRuleDto } from "./dto/update-payroll-rule.dto";
import {
  PayrollConcept,
  PayrollConceptDocument,
} from "../../schemas/payroll-concept.schema";
import { PayrollEngineService } from "./payroll.engine.service";
import { PreviewPayrollStructureDto } from "./dto/preview-payroll-structure.dto";
import { CreateStructureVersionDto } from "./dto/create-structure-version.dto";
import { computeScopeMetadata } from "./utils/scope-key.util";
import { StructureSuggestionQueryDto } from "./dto/structure-suggestion.dto";
import {
  PayrollAuditLog,
  PayrollAuditLogDocument,
} from "../../schemas/payroll-audit-log.schema";
import {
  evaluateStructureMatch,
  hasOpenScope,
} from "./utils/structure-matcher.util";

interface PreviewUserContext {
  userId?: string;
  email?: string;
  name?: string;
}

@Injectable()
export class PayrollStructuresService {
  private readonly logger = new Logger(PayrollStructuresService.name);

  constructor(
    @InjectModel(PayrollStructure.name)
    private readonly structureModel: Model<PayrollStructureDocument>,
    @InjectModel(PayrollRule.name)
    private readonly ruleModel: Model<PayrollRuleDocument>,
    @InjectModel(PayrollConcept.name)
    private readonly conceptModel: Model<PayrollConceptDocument>,
    @InjectModel(PayrollAuditLog.name)
    private readonly auditLogModel: Model<PayrollAuditLogDocument>,
    private readonly eventEmitter: EventEmitter2,
    private readonly engine: PayrollEngineService,
  ) {}

  private toObjectId(id: string | Types.ObjectId) {
    if (id instanceof Types.ObjectId) return id;
    if (!id || typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Identificador inválido");
    }
    return new Types.ObjectId(id);
  }

  async createStructure(
    tenantId: string,
    dto: CreatePayrollStructureDto,
  ): Promise<PayrollStructure> {
    const scope = computeScopeMetadata({
      appliesToRoles: dto.appliesToRoles,
      appliesToDepartments: dto.appliesToDepartments,
      appliesToContractTypes: dto.appliesToContractTypes,
    });
    const isActive = dto.isActive !== undefined ? dto.isActive : true;
    const now = new Date();
    const payload = {
      ...dto,
      appliesToRoles: scope.appliesToRoles,
      appliesToDepartments: scope.appliesToDepartments,
      appliesToContractTypes: scope.appliesToContractTypes,
      roleKey: scope.roleKey,
      departmentKey: scope.departmentKey,
      contractTypeKey: scope.contractTypeKey,
      scopeKey: scope.scopeKey,
      tenantId: this.toObjectId(tenantId),
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : now,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      activatedAt: isActive ? now : undefined,
      deactivatedAt: isActive ? undefined : now,
      version: 1,
      isActive,
    };
    this.validateEffectiveRange(payload.effectiveFrom, payload.effectiveTo);
    if (payload.isActive) {
      await this.ensureUniqueActiveScope(tenantId, payload.scopeKey);
    }
    const structure = await this.structureModel.create(payload);
    if (structure.isActive) {
      await this.ensureStructureBalance(structure);
    }
    return structure;
  }

  async listStructures(tenantId: string) {
    return this.structureModel
      .find({ tenantId: this.toObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async getStructure(tenantId: string, structureId: string) {
    const structure = await this.structureModel
      .findOne({
        _id: this.toObjectId(structureId),
        tenantId: this.toObjectId(tenantId),
      })
      .lean();
    if (!structure) {
      throw new NotFoundException("Payroll structure not found");
    }
    return structure;
  }

  async updateStructure(
    tenantId: string,
    structureId: string,
    dto: UpdatePayrollStructureDto,
  ) {
    const structure = await this.structureModel.findOne({
      _id: this.toObjectId(structureId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!structure) {
      throw new NotFoundException("Payroll structure not found");
    }

    if (dto.name !== undefined) structure.name = dto.name;
    if (dto.description !== undefined) structure.description = dto.description;
    if (dto.periodType !== undefined) structure.periodType = dto.periodType;
    if (dto.appliesToRoles !== undefined)
      structure.appliesToRoles = dto.appliesToRoles || [];
    if (dto.appliesToDepartments !== undefined)
      structure.appliesToDepartments = dto.appliesToDepartments || [];
    if (dto.appliesToContractTypes !== undefined)
      structure.appliesToContractTypes = dto.appliesToContractTypes || [];
    if (dto.effectiveFrom)
      structure.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined) {
      structure.effectiveTo = dto.effectiveTo
        ? new Date(dto.effectiveTo)
        : undefined;
    }
    if (dto.isActive !== undefined) {
      structure.isActive = dto.isActive;
      if (dto.isActive) {
        structure.activatedAt = new Date();
        structure.deactivatedAt = undefined;
      } else {
        structure.deactivatedAt = new Date();
      }
    }

    this.applyScopeMetadata(structure);
    this.validateEffectiveRange(structure.effectiveFrom, structure.effectiveTo);
    if (structure.isActive) {
      await this.ensureUniqueActiveScope(
        structure.tenantId,
        structure.scopeKey,
        structure._id,
      );
      await this.ensureStructureBalance(structure);
    }
    await structure.save();
    return structure.toObject();
  }

  async deleteStructure(tenantId: string, structureId: string) {
    await this.ruleModel.deleteMany({
      tenantId: this.toObjectId(tenantId),
      structureId: this.toObjectId(structureId),
    });
    const res = await this.structureModel.deleteOne({
      _id: this.toObjectId(structureId),
      tenantId: this.toObjectId(tenantId),
    });
    if (res.deletedCount === 0) {
      throw new NotFoundException("Payroll structure not found");
    }
    return true;
  }

  async createVersion(
    tenantId: string,
    structureId: string,
    dto: CreateStructureVersionDto,
  ) {
    const structure = await this.structureModel.findOne({
      _id: this.toObjectId(structureId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!structure) {
      throw new NotFoundException("Payroll structure not found");
    }
    const base = structure.toObject();
    const nextVersion = (structure.version || 1) + 1;
    const clone: Record<string, any> = {
      ...base,
      ...dto,
      tenantId: base.tenantId,
      supersedesId: structure._id,
      version: nextVersion,
      isActive: false,
      activatedAt: undefined,
      deactivatedAt: undefined,
      effectiveFrom: dto.effectiveFrom
        ? new Date(dto.effectiveFrom)
        : new Date(),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
    };
    delete clone._id;
    delete clone.createdAt;
    delete clone.updatedAt;

    const scope = computeScopeMetadata({
      appliesToRoles: clone.appliesToRoles,
      appliesToDepartments: clone.appliesToDepartments,
      appliesToContractTypes: clone.appliesToContractTypes,
    });
    clone.appliesToRoles = scope.appliesToRoles;
    clone.appliesToDepartments = scope.appliesToDepartments;
    clone.appliesToContractTypes = scope.appliesToContractTypes;
    clone.roleKey = scope.roleKey;
    clone.departmentKey = scope.departmentKey;
    clone.contractTypeKey = scope.contractTypeKey;
    clone.scopeKey = scope.scopeKey;

    this.validateEffectiveRange(clone.effectiveFrom, clone.effectiveTo);
    return this.structureModel.create(clone);
  }

  async activateStructure(tenantId: string, structureId: string) {
    const structure = await this.structureModel.findOne({
      _id: this.toObjectId(structureId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!structure) {
      throw new NotFoundException("Payroll structure not found");
    }
    await this.ensureUniqueActiveScope(
      structure.tenantId,
      structure.scopeKey,
      structure._id,
    );
    structure.isActive = true;
    structure.activatedAt = new Date();
    structure.deactivatedAt = undefined;
    await this.ensureStructureBalance(structure);
    await structure.save();

    if (structure.supersedesId) {
      await this.structureModel.updateOne(
        { _id: structure.supersedesId, tenantId: structure.tenantId },
        { $set: { isActive: false, deactivatedAt: new Date() } },
      );
    }
    this.emitStructureActivated(structure);
    return structure.toObject();
  }

  async createRule(
    tenantId: string,
    structureId: string,
    dto: CreatePayrollRuleDto,
  ) {
    const structure = await this.structureModel
      .findOne({
        _id: this.toObjectId(structureId),
        tenantId: this.toObjectId(tenantId),
      })
      .lean();
    if (!structure) {
      throw new NotFoundException("Payroll structure not found");
    }
    const concept = await this.conceptModel
      .findOne({
        _id: this.toObjectId(dto.conceptId),
        tenantId: this.toObjectId(tenantId),
      })
      .lean();
    if (!concept) {
      throw new BadRequestException("Concept does not exist for tenant");
    }
    const payload = {
      ...dto,
      tenantId: this.toObjectId(tenantId),
      structureId: structure._id,
      conceptId: this.toObjectId(dto.conceptId),
    };
    const created = await this.ruleModel.create(payload);
    return created;
  }

  async listRules(tenantId: string, structureId: string) {
    return this.ruleModel
      .find({
        tenantId: this.toObjectId(tenantId),
        structureId: this.toObjectId(structureId),
      })
      .sort({ priority: 1, createdAt: 1 })
      .lean();
  }

  async updateRule(
    tenantId: string,
    structureId: string,
    ruleId: string,
    dto: UpdatePayrollRuleDto,
  ) {
    const update: Record<string, any> = { ...dto };
    if (dto.conceptId) {
      const concept = await this.conceptModel
        .findOne({
          _id: this.toObjectId(dto.conceptId),
          tenantId: this.toObjectId(tenantId),
        })
        .lean();
      if (!concept) {
        throw new BadRequestException("Concept does not exist for tenant");
      }
      update.conceptId = this.toObjectId(dto.conceptId);
    }

    const result = await this.ruleModel
      .findOneAndUpdate(
        {
          _id: this.toObjectId(ruleId),
          structureId: this.toObjectId(structureId),
          tenantId: this.toObjectId(tenantId),
        },
        { $set: update },
        { new: true },
      )
      .lean();
    if (!result) {
      throw new NotFoundException("Payroll rule not found");
    }
    return result;
  }

  async deleteRule(tenantId: string, structureId: string, ruleId: string) {
    const res = await this.ruleModel.deleteOne({
      _id: this.toObjectId(ruleId),
      structureId: this.toObjectId(structureId),
      tenantId: this.toObjectId(tenantId),
    });
    if (res.deletedCount === 0) {
      throw new NotFoundException("Payroll rule not found");
    }
    return true;
  }

  async suggestStructures(
    tenantId: string,
    filters: StructureSuggestionQueryDto,
  ) {
    const query: Record<string, any> = {
      tenantId: this.toObjectId(tenantId),
    };
    if (!filters.includeInactive) {
      query.isActive = true;
    }
    const structures = await this.structureModel
      .find(query)
      .sort({ updatedAt: -1 })
      .lean<PayrollStructure[]>();

    const normalizedFilters = {
      role: filters.role?.trim(),
      department: filters.department?.trim(),
      contractType: filters.contractType?.trim(),
    };
    const includeFallback = filters.includeFallback !== false;

    const ranked = structures
      .map((structure) => {
        const match = evaluateStructureMatch(structure, normalizedFilters);
        if (match) {
          return {
            structure,
            score: match.score,
            matchedDimensions: match.matchedDimensions,
            isFallback: false,
          };
        }
        if (
          includeFallback &&
          hasOpenScope(structure) &&
          structure.isActive !== false
        ) {
          return {
            structure,
            score: -1,
            matchedDimensions: [],
            isFallback: true,
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{
      structure: PayrollStructure;
      score: number;
      matchedDimensions: string[];
      isFallback: boolean;
    }>;

    ranked.sort((a, b) => {
      if (a.isFallback !== b.isFallback) {
        return a.isFallback ? 1 : -1;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const aDate =
        new Date(
          (a.structure as any).updatedAt || (a.structure as any).createdAt || 0,
        ).getTime() || 0;
      const bDate =
        new Date(
          (b.structure as any).updatedAt || (b.structure as any).createdAt || 0,
        ).getTime() || 0;
      return bDate - aDate;
    });

    const limit = filters.limit ?? 5;
    const suggestions = ranked.slice(0, limit);

    return {
      filters: normalizedFilters,
      total: ranked.length,
      suggestions: suggestions.map((item) => ({
        structure: item.structure,
        score: item.score,
        matchedDimensions: item.matchedDimensions,
        isFallback: item.isFallback,
      })),
    };
  }

  async previewStructure(
    tenantId: string,
    structureId: string,
    payload: PreviewPayrollStructureDto,
    user?: PreviewUserContext,
  ): Promise<any> {
    const structure = await this.getStructure(tenantId, structureId);
    const rules = await this.listRules(tenantId, structureId);
    const conceptIds = rules
      .map((rule) => rule.conceptId?.toString?.())
      .filter(Boolean) as string[];
    const conceptDocs = conceptIds.length
      ? await this.conceptModel
          .find({
            _id: { $in: conceptIds.map((id) => this.toObjectId(id)) },
            tenantId: this.toObjectId(tenantId),
          })
          .select(["code", "name", "conceptType"])
          .lean()
      : [];
    const conceptMap = new Map(
      conceptDocs.map((concept) => [concept._id.toString(), concept]),
    );

    const preview = this.engine.previewStructure(
      structure as PayrollStructure,
      rules as PayrollRule[],
      payload,
      {
        conceptMap,
        captureLogs: true,
      },
    );

    this.recordPreviewAudit({
      tenantId,
      structureId,
      payload,
      preview,
      user,
    }).catch((error) =>
      this.logger.warn(
        `No se pudo registrar auditoría de preview: ${error?.message}`,
      ),
    );

    return preview;
  }

  private validateEffectiveRange(from?: Date, to?: Date) {
    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException(
        "La fecha fin debe ser posterior o igual a la fecha de inicio",
      );
    }
  }

  private applyScopeMetadata(structure: PayrollStructureDocument) {
    const scope = computeScopeMetadata({
      appliesToRoles: structure.appliesToRoles,
      appliesToDepartments: structure.appliesToDepartments,
      appliesToContractTypes: structure.appliesToContractTypes,
    });
    structure.appliesToRoles = scope.appliesToRoles;
    structure.appliesToDepartments = scope.appliesToDepartments;
    structure.appliesToContractTypes = scope.appliesToContractTypes;
    structure.roleKey = scope.roleKey;
    structure.departmentKey = scope.departmentKey;
    structure.contractTypeKey = scope.contractTypeKey;
    structure.scopeKey = scope.scopeKey;
  }

  private async ensureStructureBalance(
    structure: PayrollStructureDocument | PayrollStructure,
  ) {
    if (!structure?.isActive) {
      return;
    }
    const structureId = (structure as any)._id?.toString?.();
    if (!structureId) {
      return;
    }
    const tenantId = (structure as any).tenantId?.toString?.();
    const rules = await this.ruleModel
      .find({
        tenantId: this.toObjectId(tenantId),
        structureId: this.toObjectId(structureId),
        isActive: true,
      })
      .sort({ priority: 1 })
      .lean();
    if (!rules.length) {
      return;
    }
    const conceptIds = rules
      .map((rule) => rule.conceptId?.toString())
      .filter(Boolean);
    const conceptDocs = conceptIds.length
      ? await this.conceptModel
          .find({
            tenantId: this.toObjectId(tenantId),
            _id: { $in: conceptIds.map((id) => this.toObjectId(id!)) },
          })
          .lean()
      : [];
    const conceptMap = new Map<string, PayrollConcept>();
    conceptDocs.forEach((concept) => {
      conceptMap.set(concept._id.toString(), concept as any);
    });
    const preview = this.engine.previewStructure(
      (structure as any).toObject
        ? (structure as any).toObject()
        : (structure as any),
      rules as any,
      {
        baseSalary: 1000,
        context: {},
      },
      {
        conceptMap,
        captureLogs: false,
      },
    );
    const totals = preview?.totals || {
      earnings: 0,
      deductions: 0,
      netPay: 0,
    };
    const imbalance = Math.abs(
      totals.netPay - (totals.earnings - totals.deductions),
    );
    if (imbalance > 0.01) {
      throw new BadRequestException(
        "La estructura no está balanceada: el neto debe ser igual a devengos menos deducciones.",
      );
    }
    if (totals.netPay < 0) {
      throw new BadRequestException(
        "La estructura genera un neto negativo. Ajusta las reglas antes de activarla.",
      );
    }
  }

  private async ensureUniqueActiveScope(
    tenantId: string | Types.ObjectId,
    scopeKey: string,
    excludeId?: Types.ObjectId,
  ) {
    const tenantObjectId =
      tenantId instanceof Types.ObjectId ? tenantId : this.toObjectId(tenantId);
    const query: Record<string, any> = {
      tenantId: tenantObjectId,
      scopeKey,
      isActive: true,
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const conflict = await this.structureModel.exists(query);
    if (conflict) {
      throw new BadRequestException(
        "Ya existe una estructura activa para este alcance. Duplica la versión o programa la vigencia en otra fecha.",
      );
    }
  }

  private async recordPreviewAudit(params: {
    tenantId: string;
    structureId: string;
    payload: PreviewPayrollStructureDto;
    preview: ReturnType<PayrollEngineService["previewStructure"]>;
    user?: PreviewUserContext;
  }) {
    const tenantObjectId = this.toObjectId(params.tenantId);
    const userObjectId =
      params.user?.userId && Types.ObjectId.isValid(params.user.userId)
        ? new Types.ObjectId(params.user.userId)
        : undefined;

    const structureObjectId = Types.ObjectId.isValid(params.structureId)
      ? new Types.ObjectId(params.structureId)
      : undefined;

    const entrySamples = params.preview.entries.slice(0, 10).map((entry) => ({
      conceptId: entry.conceptId,
      conceptType: entry.conceptType,
      amount: entry.amount,
      baseAmount: entry.baseAmount,
      calculationType: entry.calculationType,
    }));

    const logSamples = (params.preview.logs || []).slice(0, 20);

    await this.auditLogModel.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      entity: "payrollStructurePreview",
      entityId: structureObjectId,
      action: "preview",
      metadata: {
        label: params.payload.label,
        auditMetadata: params.payload.auditMetadata,
        totals: params.preview.totals,
        entries: entrySamples,
        logs: logSamples,
        contextKeys: Object.keys(params.payload.context || {}),
        baseSalary: params.payload.baseSalary ?? params.payload.baseAmount ?? 0,
        userEmail: params.user?.email,
        userName: params.user?.name,
      },
    });
  }

  private emitStructureActivated(structure: PayrollStructureDocument) {
    try {
      this.eventEmitter.emit("payroll.structure.activated", {
        tenantId: structure.tenantId.toString(),
        structureId: structure._id.toString(),
        supersedesId: structure.supersedesId?.toString(),
        version: structure.version,
        scope: {
          roles: structure.appliesToRoles || [],
          departments: structure.appliesToDepartments || [],
          contractTypes: structure.appliesToContractTypes || [],
        },
        effectiveFrom: structure.effectiveFrom,
        effectiveTo: structure.effectiveTo,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo emitir evento de activación para estructura ${structure._id}: ${error?.message}`,
      );
    }
  }
}
