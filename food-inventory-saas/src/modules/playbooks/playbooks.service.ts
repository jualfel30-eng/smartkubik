import { Injectable, NotFoundException, Logger, forwardRef, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Playbook,
  PlaybookDocument,
  PlaybookExecution,
  PlaybookExecutionDocument,
  PlaybookStepType,
} from "../../schemas/playbook.schema";
import {
  CreatePlaybookDto,
  UpdatePlaybookDto,
} from "../../dto/playbook.dto";
import { ActivitiesService } from "../activities/activities.service";
import { NotificationsService } from "../notifications/notifications.service";
import { Opportunity, OpportunityDocument } from "../../schemas/opportunity.schema";

@Injectable()
export class PlaybooksService {
  private readonly logger = new Logger(PlaybooksService.name);

  constructor(
    @InjectModel(Playbook.name)
    private readonly playbookModel: Model<PlaybookDocument>,
    @InjectModel(PlaybookExecution.name)
    private readonly playbookExecutionModel: Model<PlaybookExecutionDocument>,
    @InjectModel(Opportunity.name)
    private readonly opportunityModel: Model<OpportunityDocument>,
    @Inject(forwardRef(() => ActivitiesService))
    private readonly activitiesService: ActivitiesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    createPlaybookDto: CreatePlaybookDto,
    user: any,
  ): Promise<PlaybookDocument> {
    const playbook = new this.playbookModel({
      ...createPlaybookDto,
      tenantId: user.tenantId,
      createdBy: user.id,
    });

    await playbook.save();
    this.logger.log(
      `Playbook created: ${playbook._id} (${playbook.name}, tenant: ${user.tenantId})`,
    );

    return playbook;
  }

  async findAll(user: any): Promise<PlaybookDocument[]> {
    return this.playbookModel
      .find({ tenantId: user.tenantId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, user: any): Promise<PlaybookDocument> {
    const playbook = await this.playbookModel
      .findOne({
        _id: id,
        tenantId: user.tenantId,
      })
      .exec();

    if (!playbook) {
      throw new NotFoundException(`Playbook with ID ${id} not found`);
    }

    return playbook;
  }

  async update(
    id: string,
    updatePlaybookDto: UpdatePlaybookDto,
    user: any,
  ): Promise<PlaybookDocument> {
    const playbook = await this.playbookModel
      .findOneAndUpdate(
        {
          _id: id,
          tenantId: user.tenantId,
        },
        { $set: updatePlaybookDto },
        { new: true },
      )
      .exec();

    if (!playbook) {
      throw new NotFoundException(`Playbook with ID ${id} not found`);
    }

    this.logger.log(`Playbook updated: ${playbook._id} (tenant: ${user.tenantId})`);
    return playbook;
  }

  async remove(id: string, user: any): Promise<void> {
    const result = await this.playbookModel
      .deleteOne({
        _id: id,
        tenantId: user.tenantId,
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Playbook with ID ${id} not found`);
    }

    this.logger.log(`Playbook deleted: ${id} (tenant: ${user.tenantId})`);
  }

  /**
   * Ejecutar playbook para una oportunidad
   */
  async executePlaybook(
    playbookId: string,
    opportunityId: string,
    user: any,
  ): Promise<void> {
    const playbook = await this.findOne(playbookId, user);

    if (!playbook.active) {
      this.logger.warn(`Playbook ${playbookId} is not active. Skipping execution.`);
      return;
    }

    const opportunity = await this.opportunityModel
      .findOne({
        _id: opportunityId,
        tenantId: user.tenantId,
      })
      .exec();

    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${opportunityId} not found`);
    }

    this.logger.log(
      `Executing playbook ${playbook.name} (${playbookId}) for opportunity ${opportunityId}`,
    );

    // Programar ejecución de cada paso
    for (const step of playbook.steps) {
      if (!step.active) {
        continue;
      }

      // Verificar si ya se ejecutó este paso (idempotencia)
      const existingExecution = await this.playbookExecutionModel
        .findOne({
          tenantId: user.tenantId,
          opportunityId: new Types.ObjectId(opportunityId),
          playbookId: playbook._id,
          stepOrder: step.order,
        })
        .exec();

      if (existingExecution) {
        this.logger.log(
          `Step ${step.order} of playbook ${playbookId} already executed for opportunity ${opportunityId}. Skipping.`,
        );
        continue;
      }

      // Calcular cuándo ejecutar el paso
      const scheduledFor = new Date(Date.now() + step.delayMinutes * 60 * 1000);

      // Crear registro de ejecución
      const execution = new this.playbookExecutionModel({
        playbookId: playbook._id,
        opportunityId: new Types.ObjectId(opportunityId),
        stepOrder: step.order,
        scheduledFor,
        status: "pending",
        tenantId: user.tenantId,
      });

      await execution.save();
      this.logger.log(
        `Scheduled step ${step.order} (${step.type}) for ${scheduledFor.toISOString()}`,
      );
    }
  }

  /**
   * Procesar pasos pendientes (llamado por cron job)
   */
  async processPendingSteps(): Promise<void> {
    const now = new Date();

    const pendingExecutions = await this.playbookExecutionModel
      .find({
        status: "pending",
        scheduledFor: { $lte: now },
      })
      .populate("playbookId")
      .populate("opportunityId")
      .limit(100)
      .exec();

    this.logger.log(`Processing ${pendingExecutions.length} pending playbook steps`);

    for (const execution of pendingExecutions) {
      try {
        await this.executeStep(execution);
      } catch (error) {
        this.logger.error(
          `Failed to execute playbook step ${execution._id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Ejecutar un paso individual del playbook
   */
  private async executeStep(
    execution: PlaybookExecutionDocument,
  ): Promise<void> {
    const playbook = execution.playbookId as any as PlaybookDocument;
    const opportunity = execution.opportunityId as any as OpportunityDocument;

    const step = playbook.steps.find((s) => s.order === execution.stepOrder);

    if (!step) {
      throw new Error(`Step ${execution.stepOrder} not found in playbook ${playbook._id}`);
    }

    // Marcar como ejecutando
    execution.status = "executing";
    await execution.save();

    this.logger.log(
      `Executing step ${step.order} (${step.type}) for opportunity ${opportunity._id}`,
    );

    try {
      let activityId: Types.ObjectId | undefined;

      switch (step.type) {
        case PlaybookStepType.TASK:
          activityId = await this.executeTaskStep(step, opportunity, playbook);
          break;

        case PlaybookStepType.EMAIL:
          activityId = await this.executeEmailStep(step, opportunity, playbook);
          break;

        case PlaybookStepType.WHATSAPP:
          activityId = await this.executeWhatsAppStep(step, opportunity, playbook);
          break;

        case PlaybookStepType.NOTIFICATION:
          await this.executeNotificationStep(step, opportunity, playbook);
          break;

        case PlaybookStepType.WAIT:
          // Wait step no hace nada, solo espera
          this.logger.log(`Wait step ${step.order} completed`);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Marcar como completado
      execution.status = "completed";
      execution.executedAt = new Date();
      if (activityId) {
        execution.activityId = activityId;
      }
      await execution.save();

      this.logger.log(
        `Step ${step.order} executed successfully for opportunity ${opportunity._id}`,
      );
    } catch (error) {
      execution.status = "failed";
      execution.error = error.message;
      await execution.save();
      throw error;
    }
  }

  private async executeTaskStep(
    step: any,
    opportunity: OpportunityDocument,
    playbook: PlaybookDocument,
  ): Promise<Types.ObjectId> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (step.taskDueDays || 1));

    const activity = await this.activitiesService.create(
      {
        type: "task",
        subject: step.taskTitle || `Task from playbook: ${playbook.name}`,
        body: step.taskDescription,
        scheduledAt: dueDate,
        customerId: opportunity.customerId.toString(),
        opportunityId: opportunity._id.toString(),
        ownerId: opportunity.ownerId?.toString(),
      },
      {
        tenantId: opportunity.tenantId.toString(),
        id: playbook.createdBy.toString(),
      },
    );

    return activity._id as Types.ObjectId;
  }

  private async executeEmailStep(
    step: any,
    opportunity: OpportunityDocument,
    playbook: PlaybookDocument,
  ): Promise<Types.ObjectId> {
    // Crear actividad de email (outbound)
    const activity = await this.activitiesService.create(
      {
        type: "email",
        direction: "outbound",
        subject: step.messageSubject || `Message from ${playbook.name}`,
        body: step.messageBody,
        customerId: opportunity.customerId.toString(),
        opportunityId: opportunity._id.toString(),
        channel: "email",
      },
      {
        tenantId: opportunity.tenantId.toString(),
        id: playbook.createdBy.toString(),
      },
    );

    // TODO: Enviar email real usando NotificationsService si hay templateId o body
    this.logger.log(`Email step created as activity ${activity._id}`);

    return activity._id as Types.ObjectId;
  }

  private async executeWhatsAppStep(
    step: any,
    opportunity: OpportunityDocument,
    playbook: PlaybookDocument,
  ): Promise<Types.ObjectId> {
    // Crear actividad de WhatsApp (outbound)
    const activity = await this.activitiesService.create(
      {
        type: "whatsapp",
        direction: "outbound",
        subject: `WhatsApp message from ${playbook.name}`,
        body: step.messageBody,
        customerId: opportunity.customerId.toString(),
        opportunityId: opportunity._id.toString(),
        channel: "whatsapp",
      },
      {
        tenantId: opportunity.tenantId.toString(),
        id: playbook.createdBy.toString(),
      },
    );

    // TODO: Enviar WhatsApp real usando NotificationsService
    this.logger.log(`WhatsApp step created as activity ${activity._id}`);

    return activity._id as Types.ObjectId;
  }

  private async executeNotificationStep(
    step: any,
    opportunity: OpportunityDocument,
    playbook: PlaybookDocument,
  ): Promise<void> {
    await this.notificationsService.enqueueInAppNotification({
      tenantId: opportunity.tenantId.toString(),
      userId: opportunity.ownerId?.toString(),
      title: step.notificationTitle || `Notification from ${playbook.name}`,
      message: step.notificationMessage || "",
      metadata: {
        opportunityId: opportunity._id.toString(),
        playbookId: playbook._id.toString(),
      },
    });
  }

  /**
   * Trigger automático de playbooks al cambiar de etapa
   */
  async triggerByStageEntry(
    stage: string,
    opportunityId: string,
    pipeline: string,
    user: any,
  ): Promise<void> {
    const playbooks = await this.playbookModel
      .find({
        tenantId: user.tenantId,
        active: true,
        triggerType: "stage_entry",
        triggerStage: stage,
        $or: [
          { triggerPipeline: pipeline },
          { triggerPipeline: { $exists: false } },
        ],
      })
      .exec();

    this.logger.log(
      `Found ${playbooks.length} playbooks for stage ${stage} (pipeline: ${pipeline})`,
    );

    for (const playbook of playbooks) {
      await this.executePlaybook(playbook._id.toString(), opportunityId, user);
    }
  }

  /**
   * Trigger automático de playbooks por fuente
   */
  async triggerBySource(
    source: string,
    opportunityId: string,
    user: any,
  ): Promise<void> {
    const playbooks = await this.playbookModel
      .find({
        tenantId: user.tenantId,
        active: true,
        triggerType: "source",
        triggerSource: source,
      })
      .exec();

    this.logger.log(
      `Found ${playbooks.length} playbooks for source ${source}`,
    );

    for (const playbook of playbooks) {
      await this.executePlaybook(playbook._id.toString(), opportunityId, user);
    }
  }
}
