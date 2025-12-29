import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Reminder, ReminderDocument, ReminderType, ReminderChannel } from "../../schemas/reminder.schema";
import { Opportunity, OpportunityDocument } from "../../schemas/opportunity.schema";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateReminderDto, UpdateReminderDto, QueryRemindersDto } from "../../dto/reminder.dto";

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectModel(Reminder.name)
    private readonly reminderModel: Model<ReminderDocument>,
    @InjectModel(Opportunity.name)
    private readonly opportunityModel: Model<OpportunityDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Crear recordatorio
   */
  async create(createReminderDto: CreateReminderDto, user: any): Promise<ReminderDocument> {
    const reminder = new this.reminderModel({
      ...createReminderDto,
      tenantId: user.tenantId,
    });

    await reminder.save();
    this.logger.log(
      `Reminder created: ${reminder._id} (type: ${reminder.type}, scheduled: ${reminder.scheduledFor})`,
    );

    return reminder;
  }

  /**
   * Crear recordatorio automático para next step due
   */
  async createNextStepReminder(
    opportunityId: string,
    nextStepDue: Date,
    channels: ReminderChannel[],
    tenantId: string,
  ): Promise<ReminderDocument | null> {
    const opportunity = await this.opportunityModel.findById(opportunityId);

    if (!opportunity) {
      this.logger.warn(`Opportunity ${opportunityId} not found for reminder`);
      return null;
    }

    // Programar recordatorio 2 horas antes
    const reminderDate = new Date(nextStepDue.getTime() - 2 * 60 * 60 * 1000);

    // No crear si ya pasó la fecha
    if (reminderDate < new Date()) {
      this.logger.warn(`Reminder date ${reminderDate} is in the past. Skipping.`);
      return null;
    }

    // Verificar si ya existe un recordatorio para esta oportunidad y next step
    const existing = await this.reminderModel.findOne({
      opportunityId: opportunity._id,
      type: ReminderType.NEXT_STEP_DUE,
      status: { $in: ['pending', 'sent'] },
    });

    if (existing) {
      // Actualizar fecha si cambió
      existing.scheduledFor = reminderDate;
      existing.status = 'pending';
      await existing.save();
      return existing;
    }

    const reminder = new this.reminderModel({
      type: ReminderType.NEXT_STEP_DUE,
      title: `Próximo paso vence: ${opportunity.name}`,
      message: `El próximo paso "${opportunity.nextStep}" vence el ${nextStepDue.toLocaleString('es-ES')}`,
      scheduledFor: reminderDate,
      channels: channels.length > 0 ? channels : ['in_app'],
      opportunityId: opportunity._id,
      customerId: opportunity.customerId,
      userId: opportunity.ownerId,
      advanceMinutes: 120,
      tenantId,
    });

    await reminder.save();
    this.logger.log(
      `Next step reminder created: ${reminder._id} for opportunity ${opportunityId}`,
    );

    return reminder;
  }

  /**
   * Listar recordatorios con filtros
   */
  async findAll(query: QueryRemindersDto, user: any): Promise<ReminderDocument[]> {
    const filter: any = { tenantId: user.tenantId };

    if (query.type) {
      filter.type = query.type;
    }

    if (query.opportunityId) {
      filter.opportunityId = new Types.ObjectId(query.opportunityId);
    }

    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    return this.reminderModel
      .find(filter)
      .sort({ scheduledFor: 1 })
      .populate('opportunityId', 'name stage')
      .populate('customerId', 'name email phone')
      .populate('userId', 'name email')
      .exec();
  }

  /**
   * Procesar recordatorios pendientes (llamado por cron)
   */
  async processPendingReminders(): Promise<{ processed: number; failed: number }> {
    const now = new Date();

    const pendingReminders = await this.reminderModel
      .find({
        status: 'pending',
        scheduledFor: { $lte: now },
      })
      .populate('opportunityId')
      .populate('customerId')
      .populate('userId')
      .limit(100)
      .exec();

    this.logger.log(`Processing ${pendingReminders.length} pending reminders`);

    let processed = 0;
    let failed = 0;

    for (const reminder of pendingReminders) {
      try {
        await this.sendReminder(reminder);
        reminder.status = 'sent';
        reminder.sentAt = new Date();
        await reminder.save();
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to send reminder ${reminder._id}: ${error.message}`,
          error.stack,
        );
        reminder.status = 'failed';
        reminder.error = error.message;
        await reminder.save();
        failed++;
      }
    }

    this.logger.log(`Reminders processed: ${processed} sent, ${failed} failed`);
    return { processed, failed };
  }

  /**
   * Enviar recordatorio por los canales configurados
   */
  private async sendReminder(reminder: ReminderDocument): Promise<void> {
    for (const channel of reminder.channels) {
      switch (channel) {
        case 'email':
          // TODO: Implementar envío por email usando NotificationsService
          this.logger.log(`Email reminder sent (placeholder) for ${reminder._id}`);
          break;

        case 'whatsapp':
          // TODO: Implementar envío por WhatsApp usando NotificationsService
          this.logger.log(`WhatsApp reminder sent (placeholder) for ${reminder._id}`);
          break;

        case 'in_app':
          await this.notificationsService.enqueueInAppNotification({
            tenantId: reminder.tenantId.toString(),
            userId: reminder.userId?.toString(),
            title: reminder.title,
            message: reminder.message,
            metadata: {
              reminderId: reminder._id.toString(),
              opportunityId: reminder.opportunityId?.toString(),
              type: reminder.type,
            },
          });
          this.logger.log(`In-app reminder sent for ${reminder._id}`);
          break;

        default:
          this.logger.warn(`Unknown reminder channel: ${channel}`);
      }
    }
  }

  /**
   * Cancelar recordatorio
   */
  async cancel(id: string, user: any): Promise<ReminderDocument> {
    const reminder = await this.reminderModel.findOneAndUpdate(
      {
        _id: id,
        tenantId: user.tenantId,
      },
      {
        $set: { status: 'cancelled' },
      },
      { new: true },
    );

    if (!reminder) {
      throw new Error(`Reminder ${id} not found`);
    }

    this.logger.log(`Reminder cancelled: ${id}`);
    return reminder;
  }

  /**
   * Obtener recordatorios pendientes por usuario
   */
  async findPendingByUser(userId: string, tenantId: string): Promise<ReminderDocument[]> {
    return this.reminderModel
      .find({
        tenantId,
        userId: new Types.ObjectId(userId),
        status: 'pending',
        scheduledFor: { $gte: new Date() },
      })
      .sort({ scheduledFor: 1 })
      .populate('opportunityId', 'name stage')
      .limit(20)
      .exec();
  }
}
