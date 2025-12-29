import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Model, Types } from "mongoose";
import { Opportunity, OpportunityDocument } from "../../schemas/opportunity.schema";
import {
  ChangeStageDto,
  CreateOpportunityDto,
  OpportunityQueryDto,
  UpdateOpportunityDto,
  OPPORTUNITY_STAGE_PROBABILITIES,
  REQUIRED_FIELDS_BY_STAGE,
  defaultProbabilityForStage,
  MqlDecisionDto,
  SqlDecisionDto,
  BulkCaptureDto,
} from "../../dto/opportunity.dto";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Cron, CronExpression } from "@nestjs/schedule";
import { NotificationsService } from "../notifications/notifications.service";
import {
  OpportunityStageDefinition,
  OpportunityStageDefinitionDocument,
} from "../../schemas/opportunity-stage.schema";
import { OpportunityPipeline } from "../../schemas/opportunity.schema";
import {
  MessageActivity,
  MessageActivityDocument,
} from "../../schemas/message-activity.schema";
import { InjectModel } from "@nestjs/mongoose";
import { PlaybooksService } from "../playbooks/playbooks.service";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";
import { decrypt } from "../../utils/encryption.util";

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    @InjectModel(Opportunity.name)
    private readonly opportunityModel: Model<OpportunityDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(OpportunityStageDefinition.name)
    private readonly stageDefModel: Model<OpportunityStageDefinitionDocument>,
    @InjectModel(MessageActivity.name)
    private readonly messageActivityModel: Model<MessageActivityDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly playbooksService: PlaybooksService,
    private readonly configService: ConfigService,
  ) { }

  // Reglas simples de enrutamiento: round-robin por territorio
  private roundRobinIndex: Record<string, number> = {};

  // Reglas simples de enrutamiento: round-robin por territorio
  private async assignOwnerByTerritory(
    tenantId: string,
    territory?: string,
  ): Promise<Types.ObjectId | undefined> {
    if (!territory) return undefined;
    const users = await this.customerModel.db
      .collection("users")
      .find({ tenantId, territory, isActive: true }, { projection: { _id: 1 } })
      .sort({ createdAt: 1 })
      .toArray();
    if (!users.length) return undefined;
    const key = `${tenantId}-${territory}`;
    const idx = this.roundRobinIndex[key] || 0;
    const user = users[idx % users.length];
    this.roundRobinIndex[key] = (idx + 1) % users.length;
    return user?._id ? new Types.ObjectId(user._id) : undefined;
  }

  async create(dto: CreateOpportunityDto, user: any) {
    const stageDefs = await this.loadStageDefinitions(user.tenantId);
    const requiredFieldsMap = this.buildRequiredFieldsMap(stageDefs);

    await this.ensureCustomerInTenant(dto.customerId, user.tenantId);
    this.validateStageFields(dto.stage, dto, requiredFieldsMap);

    const probability =
      stageDefs.find((s) => s.name === dto.stage)?.probability ??
      defaultProbabilityForStage(dto.stage);

    const scoring = this.computeScoring(dto);

    const ownerId =
      dto.ownerId && Types.ObjectId.isValid(dto.ownerId)
        ? new Types.ObjectId(dto.ownerId)
        : await this.assignOwnerByTerritory(user.tenantId, dto.territory);

    const opportunity = new this.opportunityModel({
      ...dto,
      ...scoring,
      probability,
      expectedCloseDate: dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : undefined,
      nextStepDue: new Date(dto.nextStepDue),
      customerId: new Types.ObjectId(dto.customerId),
      ownerId,
      utm: {
        source: dto.utmSource,
        medium: dto.utmMedium,
        campaign: dto.utmCampaign,
        term: dto.utmTerm,
        content: dto.utmContent,
      },
      createdBy: user.id,
      tenantId: user.tenantId,
      stageHistory: [
        {
          fromStage: dto.stage,
          toStage: dto.stage,
          changedAt: new Date(),
          changedBy: user.id,
          probability,
          valueWeighted: dto.amount ? (dto.amount * probability) / 100 : 0,
        },
      ],
    });

    const saved = await opportunity.save();
    await this.notifyOwnerNewOpportunity(saved, user);

    // 🆕 TRIGGER PLAYBOOKS POR FUENTE
    if (saved.source) {
      try {
        await this.playbooksService.triggerBySource(
          saved.source,
          saved._id.toString(),
          user,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to trigger playbooks by source for opportunity ${saved._id}: ${error.message}`,
        );
      }
    }

    return saved;
  }

  async findAll(query: OpportunityQueryDto, tenantId: string) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

    const filter: any = { tenantId };
    if (query.stage) filter.stage = query.stage;
    if (query.pipeline) filter.pipeline = query.pipeline;
    if (query.ownerId) filter.ownerId = new Types.ObjectId(query.ownerId);
    if (query.territory) filter.territory = query.territory;
    if (query.search) {
      const regex = new RegExp(query.search.trim(), "i");
      filter.$or = [{ name: regex }, { competitor: regex }];
    }

    const [items, total] = await Promise.all([
      this.opportunityModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .populate("customerId", "name companyName")
        .populate("ownerId", "name email")
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.opportunityModel.countDocuments(filter),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string, tenantId: string) {
    const opp = await this.opportunityModel
      .findOne({ _id: id, tenantId })
      .lean();
    if (!opp) {
      throw new HttpException("Oportunidad no encontrada", HttpStatus.NOT_FOUND);
    }
    return opp;
  }

  async update(id: string, dto: UpdateOpportunityDto, user: any) {
    const opp = await this.opportunityModel.findOne({
      _id: id,
      tenantId: user.tenantId,
    });
    if (!opp) {
      throw new HttpException("Oportunidad no encontrada", HttpStatus.NOT_FOUND);
    }

    if (dto.nextStepDue) {
      opp.nextStepDue = new Date(dto.nextStepDue);
    }
    if (dto.expectedCloseDate) {
      opp.expectedCloseDate = new Date(dto.expectedCloseDate);
    }

    Object.assign(opp, {
      ...dto,
      ownerId: dto.ownerId ? new Types.ObjectId(dto.ownerId) : opp.ownerId,
    });

    await opp.save();
    return opp;
  }

  async summary(tenantId: string) {
    this.logger.log(`Getting summary for tenant: ${tenantId} (${typeof tenantId})`);

    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      this.logger.error(`Invalid tenantId for summary: ${tenantId}`);
      throw new HttpException('Invalid tenant ID', HttpStatus.BAD_REQUEST);
    }

    try {
      const byStage = await this.opportunityModel.aggregate([
        { $match: { tenantId: new Types.ObjectId(tenantId) } },
        {
          $group: {
            _id: "$stage",
            total: { $sum: 1 },
            amount: { $sum: { $ifNull: ["$amount", 0] } },
            avgProbability: { $avg: { $ifNull: ["$probability", 0] } },
          },
        },
      ]);
      return { byStage };
    } catch (err) {
      this.logger.error(`Aggregation failed: ${err.message}`, err.stack);
      throw err;
    }
  }

  async changeStage(id: string, dto: ChangeStageDto, user: any) {
    const opp = await this.opportunityModel.findOne({
      _id: id,
      tenantId: user.tenantId,
    });
    if (!opp) {
      throw new HttpException("Oportunidad no encontrada", HttpStatus.NOT_FOUND);
    }

    // Merge incoming data to validate required fields
    const merged: any = {
      ...opp.toObject(),
      ...dto,
      expectedCloseDate: dto.expectedCloseDate ?? opp.expectedCloseDate,
      amount: dto.amount ?? opp.amount,
      currency: dto.currency ?? opp.currency,
      reasonLost: dto.reasonLost ?? opp.reasonLost,
      nextStep: dto.nextStep ?? opp.nextStep,
      nextStepDue: dto.nextStepDue ?? opp.nextStepDue,
      competitor: dto.competitor ?? opp.competitor,
    };

    const stageDefs = await this.loadStageDefinitions(user.tenantId);
    const requiredFieldsMap = this.buildRequiredFieldsMap(stageDefs);
    this.validateStageFields(dto.stage, merged, requiredFieldsMap);
    const probability =
      dto.probability ??
      stageDefs.find((s) => s.name === dto.stage)?.probability ??
      OPPORTUNITY_STAGE_PROBABILITIES[dto.stage] ??
      0;

    const prevStage = opp.stage;
    opp.stage = dto.stage;
    opp.probability = probability;
    if (dto.amount !== undefined) opp.amount = dto.amount;
    if (dto.currency) opp.currency = dto.currency;
    if (dto.expectedCloseDate)
      opp.expectedCloseDate = new Date(dto.expectedCloseDate);
    if (dto.reasonLost) opp.reasonLost = dto.reasonLost;
    if (dto.competitor) opp.competitor = dto.competitor;
    if (dto.nextStep) opp.nextStep = dto.nextStep;
    if (dto.nextStepDue) opp.nextStepDue = new Date(dto.nextStepDue);

    opp.stageHistory.push({
      fromStage: prevStage,
      toStage: dto.stage,
      changedAt: new Date(),
      changedBy: user.id,
      probability,
      valueWeighted: opp.amount ? (opp.amount * probability) / 100 : 0,
    });

    await opp.save();

    // 🆕 TRIGGER PLAYBOOKS POR CAMBIO DE ETAPA
    if (prevStage !== dto.stage) {
      try {
        await this.playbooksService.triggerByStageEntry(
          dto.stage,
          opp._id.toString(),
          opp.pipeline,
          user,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to trigger playbooks by stage for opportunity ${opp._id}: ${error.message}`,
        );
      }
    }

    return opp;
  }

  async markMql(id: string, dto: MqlDecisionDto, user: any) {
    const opp = await this.opportunityModel.findOne({
      _id: id,
      tenantId: user.tenantId,
    });
    if (!opp) {
      throw new HttpException("Oportunidad no encontrada", HttpStatus.NOT_FOUND);
    }
    if (!["accepted", "rejected"].includes(dto.status)) {
      throw new HttpException("Estado MQL inválido", HttpStatus.BAD_REQUEST);
    }
    opp.mqlStatus = dto.status;
    opp.mqlReason = dto.reason;
    opp.mqlAt = new Date();
    await opp.save();
    return opp;
  }

  async markSql(id: string, dto: SqlDecisionDto, user: any) {
    const opp = await this.opportunityModel.findOne({
      _id: id,
      tenantId: user.tenantId,
    });
    if (!opp) {
      throw new HttpException("Oportunidad no encontrada", HttpStatus.NOT_FOUND);
    }
    if (!["accepted", "rejected"].includes(dto.status)) {
      throw new HttpException("Estado SQL inválido", HttpStatus.BAD_REQUEST);
    }
    opp.sqlStatus = dto.status;
    opp.sqlReason = dto.reason;
    await opp.save();
    return opp;
  }

  async captureFromForm(dto: CreateOpportunityDto, user: any) {
    const stageDefs = await this.loadStageDefinitions(user.tenantId);
    const requiredFieldsMap = this.buildRequiredFieldsMap(stageDefs);
    // Intento de dedupe/contacto existente por email/phone antes de crear
    const enrichedDto = await this.enrichWithExistingContact(dto, user.tenantId);
    const intent = this.classifyIntent((dto as any).text || (dto as any).body || "");
    const payloadWithIntent: any = {
      ...enrichedDto,
      stage: intent === "buy_now" ? "Calificado" : enrichedDto.stage,
      mqlStatus: intent === "buy_now" ? "accepted" : (enrichedDto as any).mqlStatus,
    };
    return this.createOpportunityWithDefs(payloadWithIntent, user, stageDefs, requiredFieldsMap, intent);
  }

  async captureBulk(dto: BulkCaptureDto, user: any) {
    const stageDefs = await this.loadStageDefinitions(user.tenantId);
    const requiredFieldsMap = this.buildRequiredFieldsMap(stageDefs);
    const results: Array<{ success: boolean; id?: string; name?: string; error?: string }> = [];

    for (const record of dto.records || []) {
      const payload: CreateOpportunityDto = {
        ...record,
        stage: record.stage || "Prospecto",
        pipeline: record.pipeline || OpportunityPipeline.NEW_BUSINESS,
        source: record.source || dto.sourceType,
        nextStepDue:
          record.nextStepDue ||
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      } as any;

      try {
        const enriched = await this.enrichWithExistingContact(payload, user.tenantId);
        const intent = this.classifyIntent((record as any).text || (record as any).body || "");
        const withIntent: any = {
          ...enriched,
          stage: intent === "buy_now" ? "Calificado" : enriched.stage,
          mqlStatus: intent === "buy_now" ? "accepted" : (enriched as any).mqlStatus,
        };
        const opp = await this.createOpportunityWithDefs(
          withIntent,
          user,
          stageDefs,
          requiredFieldsMap,
        );
        results.push({ success: true, id: opp._id.toString(), name: opp.name });
      } catch (error) {
        results.push({
          success: false,
          name: record?.name,
          error: error?.message || "Error importando registro",
        });
        this.logger.warn(`Falló import de oportunidad: ${error?.message}`);
      }
    }

    return {
      total: results.length,
      imported: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success),
      results,
    };
  }

  // Alertas básicas de SLA: aging por etapa y nextStepDue cercano/vencido.
  @Cron(CronExpression.EVERY_HOUR)
  async handleSlaAlerts() {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const agingThresholds = [7, 14, 21];

    // NextStepDue cerca/vencido
    const nextStepAlerts = await this.opportunityModel
      .find({
        nextStepDue: { $lte: in48h },
      })
      .select("_id name ownerId tenantId nextStepDue stage")
      .lean();

    for (const opp of nextStepAlerts as any[]) {
      await this.notificationsService.enqueueInAppNotification({
        tenantId: opp.tenantId?.toString?.() || "",
        userId: opp.ownerId?.toString?.(),
        title: "Next step próximo a vencer",
        message: `La oportunidad "${opp.name}" vence el ${opp.nextStepDue?.toISOString?.()?.slice(0, 10)}`,
        metadata: { opportunityId: opp._id?.toString?.(), stage: opp.stage },
      });
    }

    // Aging por etapa: 7/14/21 días sin cambio de etapa
    const oldestByStage = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const agingCandidates = await this.opportunityModel
      .find({
        updatedAt: { $lte: oldestByStage },
      })
      .select("_id name ownerId tenantId stage updatedAt")
      .lean();

    for (const opp of agingCandidates as any[]) {
      const days = Math.floor(
        (now.getTime() - new Date(opp.updatedAt).getTime()) /
        (1000 * 60 * 60 * 24),
      );
      const bucket = agingThresholds.find((t) => days >= t);
      if (!bucket) continue;
      await this.notificationsService.enqueueInAppNotification({
        tenantId: opp.tenantId?.toString?.() || "",
        userId: opp.ownerId?.toString?.(),
        title: `Alerta aging ${bucket}d`,
        message: `La oportunidad "${opp.name}" lleva ${days} días en ${opp.stage}`,
        metadata: {
          opportunityId: opp._id?.toString?.(),
          stage: opp.stage,
          days,
        },
      });
    }
  }

  private async loadStageDefinitions(tenantId: string) {
    return this.stageDefModel.find({ tenantId }).lean();
  }

  private async createOpportunityWithDefs(
    dto: CreateOpportunityDto,
    user: any,
    stageDefs: OpportunityStageDefinition[],
    requiredFieldsMap: Record<string, string[]>,
    intent?: string,
  ) {
    await this.ensureCustomerInTenant(dto.customerId, user.tenantId);
    const stage = dto.stage || "Prospecto";
    this.validateStageFields(stage, dto, requiredFieldsMap);

    const probability =
      stageDefs.find((s) => s.name === stage)?.probability ??
      defaultProbabilityForStage(stage);

    const scoring = this.computeScoring(dto);
    const ownerId =
      dto.ownerId && Types.ObjectId.isValid(dto.ownerId)
        ? new Types.ObjectId(dto.ownerId)
        : await this.assignOwnerByTerritory(user.tenantId, dto.territory);
    const fallbackOwnerId = ownerId || (await this.assignFallbackOwner(user.tenantId));

    const nextStepDue =
      dto.nextStepDue ??
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const mqlStatus = (dto as any).mqlStatus || "pending";

    const opportunity = new this.opportunityModel({
      ...dto,
      ...scoring,
      stage: stage || "Prospecto",
      pipeline: dto.pipeline || OpportunityPipeline.NEW_BUSINESS,
      probability,
      expectedCloseDate: dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : undefined,
      nextStepDue: new Date(nextStepDue),
      customerId: new Types.ObjectId(dto.customerId),
      ownerId: fallbackOwnerId,
      utm: {
        source: dto.utmSource,
        medium: dto.utmMedium,
        campaign: dto.utmCampaign,
        term: dto.utmTerm,
        content: dto.utmContent,
      },
      source: dto.source,
      channel: (dto as any).channel,
      language: (dto as any).language,
      messageId: (dto as any).messageId,
      threadId: (dto as any).threadId,
      mqlStatus,
      createdBy: user.id,
      tenantId: user.tenantId,
      stageHistory: [
        {
          fromStage: stage,
          toStage: stage,
          changedAt: new Date(),
          changedBy: user.id,
          probability,
          valueWeighted: dto.amount ? (dto.amount * probability) / 100 : 0,
        },
      ],
    });

    const saved = await opportunity.save();
    await this.notifyOwnerNewOpportunity(saved, user);
    if (fallbackOwnerId && !ownerId) {
      await this.notifyAutoAssignedOwner(saved, fallbackOwnerId);
    }
    await this.triggerPlaybooks(saved);
    await this.logMessageActivityFromDto(dto, saved);
    return saved;
  }

  async autoWinFromPayment(payload: {
    orderId: string;
    tenantId: string;
    customerId?: string;
    amount?: number;
    currency?: string;
  }) {
    const { tenantId, customerId, amount, currency } = payload;
    const opp = await this.opportunityModel.findOne({
      tenantId,
      customerId,
      stage: { $nin: ["Cierre ganado", "Cierre perdido"] },
    }).sort({ updatedAt: -1 });
    if (!opp) {
      this.logger.warn(`No se encontró oportunidad abierta para order ${payload.orderId}`);
      return null;
    }
    const previousStage = opp.stage;
    opp.stage = "Cierre ganado";
    opp.amount = amount ?? opp.amount;
    opp.currency = currency ?? opp.currency ?? "USD";
    opp.stageHistory.push({
      fromStage: previousStage,
      toStage: "Cierre ganado",
      changedAt: new Date(),
      changedBy:
        (payload as any).userId && Types.ObjectId.isValid((payload as any).userId)
          ? new Types.ObjectId((payload as any).userId)
          : (opp.ownerId as any) || (opp.createdBy as any),
      probability: 100,
      valueWeighted: opp.amount ?? 0,
    });
    await opp.save();
    return opp;
  }

  private async enrichWithExistingContact(
    dto: CreateOpportunityDto,
    tenantId: string,
  ): Promise<CreateOpportunityDto> {
    if (dto.customerId) return dto;

    const email =
      (dto as any).email ||
      (dto as any).contactEmail ||
      ((dto as any).utmContent?.includes("@") ? (dto as any).utmContent?.trim().toLowerCase() : undefined);
    const phoneRaw = (dto as any).phone || (dto as any).sender || undefined;
    const phone = this.normalizePhone(
      phoneRaw,
      (dto as any).territory || (dto as any).region || (dto as any).waCountryCode,
    );

    let customer: CustomerDocument | null = null;
    if (email) {
      customer = await this.customerModel.findOne({ tenantId, email }).lean();
    }
    if (!customer && phone) {
      customer = await this.customerModel.findOne({ tenantId, phone }).lean();
    }

    if (customer) {
      return { ...dto, customerId: customer._id.toString() };
    }

    const created = await this.customerModel.create({
      tenantId,
      name: (dto as any).decisionMaker || dto.name || "Nuevo contacto",
      email,
      phone,
      source: dto.source,
    });
    return { ...dto, customerId: created._id.toString() };
  }

  private async logMessageActivityFromDto(dto: any, opp: OpportunityDocument) {
    if (!dto.messageId && !dto.body && !dto.text) return;
    await this.messageActivityModel.create({
      opportunityId: opp._id,
      customerId: opp.customerId,
      channel: dto.channel || dto.source || "unknown",
      messageId: dto.messageId,
      threadId: dto.threadId || dto.messageId,
      direction: "inbound",
      body: dto.body || dto.text,
      metadata: { utm: dto.utm, language: dto.language },
      tenantId: opp.tenantId,
    });
  }

  private async assignFallbackOwner(tenantId: string): Promise<Types.ObjectId | undefined> {
    const user = await this.customerModel.db
      .collection("users")
      .find({ tenantId, isActive: true }, { projection: { _id: 1, createdAt: 1 } })
      .sort({ createdAt: 1 })
      .limit(1)
      .next();
    return user?._id ? new Types.ObjectId(user._id) : undefined;
  }

  private async notifyAutoAssignedOwner(
    opp: OpportunityDocument,
    ownerId: Types.ObjectId,
  ): Promise<void> {
    try {
      await this.notificationsService.enqueueInAppNotification({
        tenantId: opp.tenantId?.toString?.(),
        userId: ownerId.toString(),
        title: "Lead asignado automáticamente",
        message: `Se te asignó "${opp.name}" (canal ${opp.channel || opp.source || "inbound"})`,
        metadata: {
          opportunityId: opp._id?.toString?.(),
          stage: opp.stage,
          nextStepDue: opp.nextStepDue,
        },
      });
    } catch (error) {
      this.logger.warn(`No se pudo notificar owner auto-asignado: ${error?.message}`);
    }
  }

  async listMessageActivities(opportunityId: string, threadId?: string, tenantId?: string) {
    const filter: any = { opportunityId: new Types.ObjectId(opportunityId) };
    if (threadId) filter.threadId = threadId;
    if (tenantId) filter.tenantId = tenantId;
    return this.messageActivityModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async logEmailActivity(
    opportunityId: string,
    payload: {
      direction: "inbound" | "outbound";
      subject?: string;
      body?: string;
      from?: string;
      to?: string[];
      messageId?: string;
      threadId?: string;
      channel?: string;
      language?: string;
      eventId?: string;
    },
    user: any,
  ) {
    const opp = await this.opportunityModel.findOne({
      _id: opportunityId,
      tenantId: user.tenantId,
    });
    if (!opp) {
      throw new HttpException("Oportunidad no encontrada", HttpStatus.NOT_FOUND);
    }
    return this.messageActivityModel.create({
      opportunityId: opp._id,
      customerId: opp.customerId,
      channel: payload.channel || "email",
      messageId: payload.messageId,
      threadId: payload.threadId || payload.messageId,
      eventId: payload.eventId,
      direction: payload.direction,
      subject: payload.subject,
      body: payload.body,
      from: payload.from,
      to: payload.to,
      kind: "email",
      metadata: { language: payload.language },
      tenantId: user.tenantId,
    });
  }

  async logCalendarActivity(
    opportunityId: string,
    payload: { subject: string; startAt: string; endAt?: string; attendees?: string[]; threadId?: string },
    user: any,
  ) {
    const opp = await this.opportunityModel.findOne({
      _id: opportunityId,
      tenantId: user.tenantId,
    });
    if (!opp) {
      throw new HttpException("Oportunidad no encontrada", HttpStatus.NOT_FOUND);
    }
    const activity = await this.messageActivityModel.create({
      opportunityId: opp._id,
      customerId: opp.customerId,
      channel: "calendar",
      direction: "outbound",
      subject: payload.subject,
      startAt: payload.startAt ? new Date(payload.startAt) : undefined,
      endAt: payload.endAt ? new Date(payload.endAt) : undefined,
      to: payload.attendees,
      threadId: payload.threadId,
      kind: "meeting",
      metadata: {},
      tenantId: user.tenantId,
    });
    await this.notifyCalendarEvent(opp, activity);
    await this.syncGoogleEvent(opp, activity);
    return activity;
  }

  async findOpenOpportunityByContact(email: string, tenantId: string) {
    if (!email) return null;
    const customer = await this.customerModel
      .findOne({ tenantId, email: email.toLowerCase() })
      .select("_id")
      .lean();
    if (!customer?._id) return null;
    const opp = await this.opportunityModel
      .findOne({
        tenantId,
        customerId: customer._id,
        stage: { $nin: ["Cierre ganado", "Cierre perdido"] },
      })
      .sort({ updatedAt: -1 });
    return opp;
  }

  private async notifyCalendarEvent(
    opp: OpportunityDocument,
    activity: any,
  ): Promise<void> {
    try {
      // In-app notification al owner
      await this.notificationsService.enqueueInAppNotification({
        tenantId: opp.tenantId?.toString?.(),
        userId: opp.ownerId?.toString?.(),
        title: activity.subject || "Reunión agendada",
        message: `Oportunidad ${opp.name}: ${activity.startAt?.toISOString?.()?.slice(0, 16) || ""}`,
        metadata: {
          opportunityId: opp._id?.toString?.(),
          activityId: activity._id?.toString?.(),
          threadId: activity.threadId,
        },
      });
      // TODO: enviar email/whatsapp según preferencias del tenant.calendarConfig.reminders
    } catch (error) {
      this.logger.warn(`No se pudo notificar evento de calendario: ${error?.message}`);
    }
  }

  private async syncGoogleEvent(
    opp: OpportunityDocument,
    activity: any,
  ): Promise<void> {
    try {
      const tenant = await this.tenantModel.findById(opp.tenantId).lean();
      if (
        !tenant?.emailConfig?.gmailAccessToken ||
        !tenant?.emailConfig?.gmailRefreshToken
      ) {
        return;
      }
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get<string>("GOOGLE_CLIENT_ID"),
        this.configService.get<string>("GOOGLE_CLIENT_SECRET"),
        `${this.configService.get<string>("API_BASE_URL") || "http://localhost:3000"}/api/v1/email-config/gmail/callback`,
      );
      oauth2Client.setCredentials({
        access_token: decrypt(tenant.emailConfig.gmailAccessToken),
        refresh_token: decrypt(tenant.emailConfig.gmailRefreshToken),
      });
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const eventResource: any = {
        summary: activity.subject || opp.name,
        start: activity.startAt
          ? { dateTime: new Date(activity.startAt).toISOString() }
          : undefined,
        end: activity.endAt
          ? { dateTime: new Date(activity.endAt).toISOString() }
          : undefined,
        attendees: (activity.to || []).filter(Boolean).map((email: string) => ({ email })),
        description: `Oportunidad: ${opp.name}`,
        extendedProperties: {
          private: {
            opportunityId: opp._id.toString(),
            activityId: activity._id.toString(),
          },
        },
      };

      // Idempotencia: si ya existe externalEventId, actualizar; si no, crear
      const existingEventId = activity.metadata?.externalEventId;
      let res;

      if (existingEventId) {
        // Actualizar evento existente
        this.logger.log(`Actualizando evento existente en Google Calendar: ${existingEventId}`);
        try {
          res = await calendar.events.update({
            calendarId: "primary",
            eventId: existingEventId,
            requestBody: eventResource,
          });
        } catch (updateError) {
          // Si el evento no existe (fue borrado), crear uno nuevo
          if (updateError.code === 404 || updateError.message?.includes("not found")) {
            this.logger.warn(`Evento ${existingEventId} no encontrado, creando nuevo`);
            res = await calendar.events.insert({
              calendarId: "primary",
              requestBody: eventResource,
            });
            if (res.data.id) {
              await this.messageActivityModel.updateOne(
                { _id: activity._id },
                { $set: { "metadata.externalEventId": res.data.id } },
              );
            }
          } else {
            throw updateError;
          }
        }
      } else {
        // Crear nuevo evento
        this.logger.log(`Creando nuevo evento en Google Calendar para oportunidad ${opp.name}`);
        res = await calendar.events.insert({
          calendarId: "primary",
          requestBody: eventResource,
        });
        if (res.data.id) {
          await this.messageActivityModel.updateOne(
            { _id: activity._id },
            { $set: { "metadata.externalEventId": res.data.id } },
          );
        }
      }
    } catch (error) {
      this.logger.warn(`No se pudo sincronizar evento a Google: ${error?.message}`);
    }
  }

  private normalizePhone(phone?: string, regionCode?: string): string | undefined {
    if (!phone) return undefined;
    const digits = phone.replace(/[^0-9+]/g, "");
    const defaultCode = regionCode || process.env.DEFAULT_PHONE_COUNTRY_CODE;
    if (digits.startsWith("+") && digits.length >= 8) return digits;
    if (defaultCode && digits.length >= 6 && digits.length <= 12) {
      return `${defaultCode}${digits.replace(/^\\+/, "")}`;
    }
    return digits || undefined;
  }

  private classifyIntent(text: string): "buy_now" | "question" | "other" {
    if (!text) return "other";
    const normalized = text.toLowerCase();
    const lang = (text.match(/[áéíóúñ]/) || text.includes("¿") || text.includes("¡")) ? "es" : "en";
    const customBuy = (process.env[`INTENT_BUY_KEYWORDS_${lang.toUpperCase()}`] || "")
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const customQuestion = (process.env[`INTENT_QUESTION_KEYWORDS_${lang.toUpperCase()}`] || "")
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const defaultBuy = [
      "comprar",
      "ordenar",
      "order",
      "pagar",
      "precio",
      "cotizacion",
      "cotización",
      "listo para",
      "quiero el servicio",
      "ready to buy",
      "purchase now",
      "quiero comprar",
    ];
    const defaultQuestion = [
      "info",
      "información",
      "pregunta",
      "como funciona",
      "how does",
      "quote",
      "cotizar",
      "precio?",
    ];
    const buyKeywords = customBuy.length ? customBuy : defaultBuy;
    const questionKeywords = customQuestion.length ? customQuestion : defaultQuestion;
    if (buyKeywords.some((k) => normalized.includes(k))) return "buy_now";
    if (questionKeywords.some((k) => normalized.includes(k))) return "question";
    return "other";
  }

  private async triggerPlaybooks(opp: OpportunityDocument) {
    const playbooks = await this.playbooksService.findAll(opp.tenantId?.toString?.() || "");
    if (!playbooks?.length) return;
    const triggers = [`stage:${opp.stage}`, `source:${opp.source || "unknown"}`];
    for (const pb of playbooks) {
      if (!pb.triggers || pb.triggers.length === 0) continue;
      const matches = pb.triggers.every((t) => triggers.includes(t));
      if (!matches) continue;
      const delayMs = (pb.delayMinutes || 0) * 60 * 1000;
      setTimeout(async () => {
        try {
          if (pb.actionType === "task" && pb.taskTitle) {
            await this.notificationsService.enqueueInAppNotification({
              tenantId: opp.tenantId?.toString?.(),
              userId: opp.ownerId?.toString?.(),
              title: pb.taskTitle,
              message: `Playbook: ${pb.name} para ${opp.name}`,
              metadata: { opportunityId: opp._id?.toString?.(), playbookId: (pb as any)._id?.toString?.() },
            });
          }
          if (pb.actionType === "email") {
            await this.logEmailActivity(
              opp._id.toString(),
              {
                direction: "outbound",
                subject: pb.taskTitle || `Playbook ${pb.name}`,
                body: `Playbook ${pb.name} disparado para ${opp.name}`,
                from: "system",
                to: [],
                channel: "email",
                threadId: opp.threadId,
              },
              { tenantId: opp.tenantId },
            );
          }
        } catch (err) {
          this.logger.warn(`Playbook ${pb.name} falló: ${err?.message}`);
        }
      }, delayMs);
    }
  }

  private buildRequiredFieldsMap(
    defs: Array<Pick<OpportunityStageDefinition, "name" | "requiredFields">>,
  ): Record<string, string[]> {
    const map: Record<string, string[]> = { ...REQUIRED_FIELDS_BY_STAGE };
    defs.forEach((d) => {
      if (d.name && Array.isArray(d.requiredFields)) {
        map[d.name] = d.requiredFields;
      }
    });
    return map;
  }

  private async notifyOwnerNewOpportunity(
    opp: OpportunityDocument,
    user: any,
  ): Promise<void> {
    try {
      if (!opp.ownerId) return;
      await this.notificationsService.enqueueInAppNotification({
        tenantId: opp.tenantId?.toString?.() || user.tenantId,
        userId: opp.ownerId?.toString?.(),
        title: "Nueva oportunidad asignada",
        message: `Se te asignó "${opp.name}" en etapa ${opp.stage}`,
        metadata: {
          opportunityId: opp._id?.toString?.(),
          stage: opp.stage,
          nextStepDue: opp.nextStepDue,
        },
      });
    } catch (error) {
      this.logger.warn(`No se pudo notificar owner de oportunidad: ${error?.message}`);
    }
  }

  private computeScoring(payload: CreateOpportunityDto) {
    const fit: Array<{ rule: string; delta: number }> = [];
    const intent: Array<{ rule: string; delta: number }> = [];
    let fitScore = 0;
    let intentScore = 0;

    if (payload.budgetFit && payload.budgetFit.toLowerCase() === "sí") {
      fit.push({ rule: "budget_fit", delta: 30 });
      fitScore += 30;
    }
    if (payload.decisionMaker) {
      fit.push({ rule: "decision_maker_identified", delta: 20 });
      fitScore += 20;
    }
    if (payload.timeline) {
      fit.push({ rule: "timeline_defined", delta: 10 });
      fitScore += 10;
    }
    if (payload.useCases?.length) {
      fit.push({ rule: "usecases_provided", delta: 10 });
      fitScore += 10;
    }
    if (payload.utmSource) {
      intent.push({ rule: `utm_source:${payload.utmSource}`, delta: 10 });
      intentScore += 10;
    }
    if (payload.utmCampaign) {
      intent.push({ rule: `utm_campaign:${payload.utmCampaign}`, delta: 10 });
      intentScore += 10;
    }
    return {
      leadScore: fitScore,
      intentScore,
      scoringBreakdown: { fit, intent },
    };
  }

  private validateStageFields(
    stage: string,
    payload: any,
    requiredMap?: Record<string, string[]>,
  ) {
    const required = requiredMap?.[stage] || REQUIRED_FIELDS_BY_STAGE[stage] || [];
    const missing = required.filter((field) => {
      const value = payload[field];
      if (value === null || value === undefined) return true;
      if (typeof value === "string" && value.trim() === "") return true;
      if (Array.isArray(value) && value.length === 0) return true;
      return false;
    });
    if (missing.length > 0) {
      throw new HttpException(
        `Faltan campos obligatorios para la etapa ${stage}: ${missing.join(", ")}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async ensureCustomerInTenant(customerId: string, tenantId: string) {
    const exists = await this.customerModel.exists({
      _id: customerId,
      tenantId,
    });
    if (!exists) {
      throw new HttpException(
        "El cliente no pertenece al tenant",
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
