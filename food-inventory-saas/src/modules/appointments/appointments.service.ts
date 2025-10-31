import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, PipelineStage } from "mongoose";
import { randomUUID } from "crypto";
import {
  Appointment,
  AppointmentDocument,
} from "../../schemas/appointment.schema";
import {
  Customer,
  CustomerDocument,
  CustomerContact,
} from "../../schemas/customer.schema";
import { Service, ServiceDocument } from "../../schemas/service.schema";
import { Resource, ResourceDocument } from "../../schemas/resource.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import { Todo, TodoDocument } from "../../schemas/todo.schema";
import { BankAccountsService } from "../bank-accounts/bank-accounts.service";
import { BankTransactionsService } from "../bank-accounts/bank-transactions.service";
import { AccountingService } from "../accounting/accounting.service";
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  AppointmentFilterDto,
  CheckAvailabilityDto,
  CreateAppointmentSeriesDto,
  CreateAppointmentGroupDto,
  CreateRoomBlockDto,
  CreateManualDepositDto,
  UpdateManualDepositDto,
} from "./dto/appointment.dto";
import {
  PublicAvailabilityDto,
  PublicCancelAppointmentDto,
  PublicCreateAppointmentDto,
  PublicAppointmentLookupDto,
  PublicRescheduleAppointmentDto,
} from "./dto/public-appointment.dto";
import { AppointmentQueueService } from "./queues/appointment-queue.service";
import { APPOINTMENT_DEPOSIT_ALERT_JOB } from "./queues/appointments.queue.constants";
import { isFeatureEnabled } from "../../config/features.config";
import { CalendarIntegrationService } from "../hospitality-integrations/calendar-integration.service";
import { AppointmentAuditService } from "./appointment-audit.service";

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Todo.name) private todoModel: Model<TodoDocument>,
    private readonly appointmentQueueService: AppointmentQueueService,
    private readonly configService: ConfigService,
    private readonly bankAccountsService: BankAccountsService,
    private readonly bankTransactionsService: BankTransactionsService,
    private readonly accountingService: AccountingService,
    private readonly calendarIntegrationService: CalendarIntegrationService,
    private readonly appointmentAuditService: AppointmentAuditService,
  ) {}

  private ensureProofWithinLimit(base64?: string): void {
    if (!base64) {
      return;
    }

    try {
      const buffer = Buffer.from(base64, "base64");
      const maxBytes = 5 * 1024 * 1024; // 5MB
      if (buffer.length > maxBytes) {
        throw new BadRequestException(
          "El comprobante supera el límite permitido de 5MB. Reduce el tamaño antes de cargarlo.",
        );
      }
    } catch (error) {
      throw new BadRequestException(
        "El comprobante cargado no es un archivo Base64 válido.",
      );
    }
  }

  private mapMethodToChannel(
    method?: string,
  ): "pago_movil" | "transferencia" | "pos" | "deposito_cajero" | "ajuste_manual" | "otros" {
    if (!method) {
      return "otros";
    }
    const normalized = method.trim().toLowerCase();
    if (
      ["pago movil", "pagomovil", "pago_movil", "pm"].includes(normalized)
    ) {
      return "pago_movil";
    }
    if (
      [
        "transferencia",
        "transfer",
        "bank_transfer",
        "zelle",
        "zfb",
        "zelle transfer",
      ].includes(normalized)
    ) {
      return "transferencia";
    }
    if (["pos", "punto", "tarjeta", "debito", "crédito", "credito"].includes(normalized)) {
      return "pos";
    }
    if (
      ["deposito", "depósito", "deposito cajero", "cajero"].includes(
        normalized,
      )
    ) {
      return "deposito_cajero";
    }
    if (["ajuste", "ajuste_manual"].includes(normalized)) {
      return "ajuste_manual";
    }
    return "otros";
  }

  async create(
    tenantId: string,
    createAppointmentDto: CreateAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    this.logger.log(`Creating appointment for tenant: ${tenantId}`);

    // Validate customer
    const customer = await this.customerModel
      .findOne({ _id: createAppointmentDto.customerId, tenantId })
      .exec();

    if (!customer) {
      throw new NotFoundException("Cliente no encontrado");
    }

    // Validate service
    const service = await this.serviceModel
      .findOne({ _id: createAppointmentDto.serviceId, tenantId })
      .exec();

    if (!service) {
      throw new NotFoundException("Servicio no encontrado");
    }

    if (service.status !== "active") {
      throw new BadRequestException("El servicio no está activo");
    }

    // Validate resource (if provided)
    let resource: any = null;
    const primaryResourceId = createAppointmentDto.resourceId;
    if (primaryResourceId) {
      resource = await this.resourceModel
        .findOne({ _id: primaryResourceId, tenantId })
        .exec();

      if (!resource) {
        throw new NotFoundException("Recurso no encontrado");
      }

      if (resource.status !== "active") {
        throw new BadRequestException("El recurso no está activo");
      }
    }

    const additionalResourceIds =
      createAppointmentDto.additionalResourceIds || [];

    if (additionalResourceIds.length) {
      const additionalResources = await this.resourceModel
        .find({ _id: { $in: additionalResourceIds }, tenantId })
        .exec();

      if (additionalResources.length !== additionalResourceIds.length) {
        throw new NotFoundException(
          "Uno o más recursos adicionales no existen",
        );
      }

      const inactive = additionalResources.find(
        (item) => item.status !== "active",
      );
      if (inactive) {
        throw new BadRequestException(
          "Uno o más recursos adicionales no están activos",
        );
      }
    }

    const resourcesInvolved = [
      primaryResourceId,
      ...additionalResourceIds,
    ].filter(Boolean) as string[];

    // Check for conflicts
    const hasConflict = await this.checkConflict(
      tenantId,
      new Date(createAppointmentDto.startTime),
      new Date(createAppointmentDto.endTime),
      resourcesInvolved,
      undefined,
      createAppointmentDto.locationId,
    );

    if (hasConflict) {
      throw new ConflictException(
        "Ya existe una cita en ese horario para el recurso seleccionado",
      );
    }

    // Get primary contact info from customer contacts
    const primaryPhone =
      customer.contacts?.find((c: any) => c.type === "phone" && c.isPrimary)
        ?.value ||
      customer.contacts?.find((c: any) => c.type === "phone")?.value;

    const primaryEmailRaw =
      customer.contacts?.find((c: any) => c.type === "email" && c.isPrimary)
        ?.value ||
      customer.contacts?.find((c: any) => c.type === "email")?.value;
    const primaryEmail =
      typeof primaryEmailRaw === "string"
        ? primaryEmailRaw.trim().toLowerCase()
        : undefined;

    // Create appointment with denormalized data
    if (
      createAppointmentDto.capacity !== undefined &&
      createAppointmentDto.capacity < (createAppointmentDto.capacityUsed ?? 1)
    ) {
      throw new BadRequestException(
        "La capacidad no puede ser menor al cupo usado",
      );
    }

    const newAppointment = new this.appointmentModel({
      ...createAppointmentDto,
      tenantId,
      customerName: customer.name,
      customerPhone: primaryPhone,
      customerEmail: primaryEmail,
      serviceName: service.name,
      serviceDuration: service.duration,
      servicePrice: service.price,
      resourceName: resource?.name,
      status: createAppointmentDto.status || "pending",
      capacityUsed: createAppointmentDto.capacityUsed ?? 1,
      capacity: createAppointmentDto.capacity ?? 1,
      participants:
        createAppointmentDto.participants?.map((participant) => ({
          name: participant.name,
          email: participant.email,
          phone: participant.phone,
          role: participant.role,
        })) || [],
      addons:
        createAppointmentDto.addons?.map((addon) => ({
          name: addon.name,
          price: addon.price ?? 0,
          quantity: addon.quantity ?? 1,
        })) || [],
      source: createAppointmentDto.source || "backoffice",
      additionalResourceIds,
      resourcesInvolved,
    });

    if (createAppointmentDto.externalId) {
      newAppointment.externalId = createAppointmentDto.externalId;
      newAppointment.externalSource =
        createAppointmentDto.externalSource || createAppointmentDto.source;
    }

    if (createAppointmentDto.metadata) {
      newAppointment.metadata = {
        ...(createAppointmentDto.metadata || {}),
      };
    }

    const saved = await newAppointment.save();
    this.logger.log(`Appointment created successfully: ${saved._id}`);

    await this.scheduleReminderIfEnabled(saved, tenantId, userId);

    const housekeepingUserId = await this.resolveUserObjectId(userId, tenantId);
    await this.scheduleHousekeepingTask({
      appointment: saved,
      service,
      tenantId,
      userObjectId: housekeepingUserId,
    });

    await this.scheduleDepositTask({
      appointment: saved,
      service,
      tenantId,
      userObjectId: housekeepingUserId,
    });

    const calendarResult = await this.calendarIntegrationService.syncAppointment({
      tenantId,
      appointment: saved,
    });

    if (
      calendarResult &&
      (calendarResult.googleEventId || calendarResult.outlookEventId)
    ) {
      const calendarMetadata = {
        ...(saved.metadata?.calendar || {}),
        googleEventId:
          calendarResult.googleEventId || saved.metadata?.calendar?.googleEventId,
        outlookEventId:
          calendarResult.outlookEventId || saved.metadata?.calendar?.outlookEventId,
        icsPayload: calendarResult.icsPayload,
        lastSyncAt: new Date().toISOString(),
      };

      saved.metadata = {
        ...(saved.metadata || {}),
        calendar: calendarMetadata,
      };

      await this.appointmentModel.updateOne(
        { _id: saved._id },
        { $set: { metadata: saved.metadata } },
      );
    }

    await this.appointmentAuditService.record({
      tenantId,
      appointmentId: saved._id,
      action: "create",
      performedBy: userId,
      source: createAppointmentDto.externalSource || createAppointmentDto.source,
      changes: createAppointmentDto,
    });

    return saved;
  }

  async createSeries(
    tenantId: string,
    createSeriesDto: CreateAppointmentSeriesDto,
    userId: string,
  ): Promise<Appointment[]> {
    const {
      baseAppointment,
      frequency,
      interval,
      count,
      until,
      daysOfWeek,
      markSeriesMaster = true,
    } = createSeriesDto;

    if (!count && !until) {
      throw new BadRequestException(
        "Debe especificar 'count' o 'until' para crear una serie de citas.",
      );
    }

    const baseStart = new Date(baseAppointment.startTime);
    const baseEnd = new Date(baseAppointment.endTime);
    if (!(baseStart instanceof Date) || Number.isNaN(baseStart.getTime())) {
      throw new BadRequestException("startTime de la cita base no es válido");
    }
    if (!(baseEnd instanceof Date) || Number.isNaN(baseEnd.getTime())) {
      throw new BadRequestException("endTime de la cita base no es válido");
    }
    if (baseEnd <= baseStart) {
      throw new BadRequestException(
        "endTime debe ser mayor que startTime en la cita base",
      );
    }

    const occurrences = this.generateSeriesOccurrences({
      baseStart,
      baseEnd,
      frequency,
      interval,
      count,
      until: until ? new Date(until) : undefined,
      daysOfWeek,
    });

    if (!occurrences.length) {
      throw new BadRequestException(
        "No se generaron ocurrencias para la serie con los parámetros indicados.",
      );
    }

    const seriesId = baseAppointment.seriesId || randomUUID();
    const createdAppointments: Appointment[] = [];

    let order = 0;
    for (const occurrence of occurrences) {
      const occurrenceDto: CreateAppointmentDto = {
        ...baseAppointment,
        startTime: occurrence.start.toISOString(),
        endTime: occurrence.end.toISOString(),
        seriesId,
        seriesOrder: order,
        isSeriesMaster: markSeriesMaster ? order === 0 : baseAppointment.isSeriesMaster,
      };

      const created = await this.create(tenantId, occurrenceDto, userId);
      createdAppointments.push(created);
      order += 1;
    }

    return createdAppointments;
  }

  async createGroup(
    tenantId: string,
    createGroupDto: CreateAppointmentGroupDto,
    userId: string,
  ): Promise<{ groupId: string; appointments: Appointment[] }> {
    const { baseAppointment, attendees = [], metadata } = createGroupDto;
    if (!baseAppointment?.customerId) {
      throw new BadRequestException(
        "Se requiere un cliente principal en baseAppointment.customerId",
      );
    }

    const allAttendees = [
      {
        customerId: baseAppointment.customerId,
        notes: baseAppointment.notes,
        capacityUsed: baseAppointment.capacityUsed ?? 1,
        participants: baseAppointment.participants,
        addons: baseAppointment.addons,
      },
      ...attendees.map((attendee) => ({
        customerId: attendee.customerId,
        notes: attendee.notes,
        capacityUsed: attendee.capacityUsed ?? 1,
        participants: attendee.participants,
        addons: attendee.addons,
      })),
    ].filter((item) => item.customerId);

    if (!allAttendees.length) {
      throw new BadRequestException(
        "Debe incluir al menos un participante para crear un bloque grupal",
      );
    }

    const hostCustomerId = baseAppointment.customerId;
    const totalCapacity = allAttendees.reduce(
      (sum, attendee) => sum + (attendee.capacityUsed || 1),
      0,
    );

    const service = await this.serviceModel
      .findOne({ _id: baseAppointment.serviceId, tenantId })
      .lean();

    if (!service) {
      throw new NotFoundException("Servicio no encontrado para el bloque");
    }

    if (
      service.maxSimultaneous &&
      totalCapacity > Number(service.maxSimultaneous || 0)
    ) {
      throw new BadRequestException(
        `La capacidad total ${totalCapacity} excede el máximo permitido (${service.maxSimultaneous}) para ${service.name}`,
      );
    }

    const groupId = randomUUID();
    const created: Appointment[] = [];

    for (const attendee of allAttendees) {
      const attendeeAppointment: CreateAppointmentDto = {
        ...baseAppointment,
        customerId: attendee.customerId,
        notes: attendee.notes ?? baseAppointment.notes,
        participants: attendee.participants ?? baseAppointment.participants,
        addons: attendee.addons ?? baseAppointment.addons,
        capacity: totalCapacity,
        capacityUsed: attendee.capacityUsed ?? 1,
        metadata: {
          ...baseAppointment.metadata,
          ...metadata,
          groupId,
          groupHostCustomerId: hostCustomerId,
        },
      };

      const createdAppointment = (await this.create(
        tenantId,
        attendeeAppointment,
        userId,
      )) as AppointmentDocument;
      created.push(createdAppointment);

      if (created.length === 1) {
        await this.scheduleDepositTask({
          appointment: createdAppointment,
          service,
          tenantId,
          userObjectId: await this.resolveUserObjectId(userId, tenantId),
        });
      }
    }

    return { groupId, appointments: created };
  }

  async createRoomBlock(
    tenantId: string,
    createRoomBlockDto: CreateRoomBlockDto,
    userId: string,
  ): Promise<Appointment> {
    const { resourceId, locationId, startTime, endTime, reason, metadata } =
      createRoomBlockDto;

    const maintenanceCustomer = await this.ensureMaintenanceCustomer(tenantId);
    const maintenanceService = await this.ensureMaintenanceService(tenantId);

    const bookingPayload: CreateAppointmentDto = {
      customerId: maintenanceCustomer._id.toString(),
      serviceId: maintenanceService._id.toString(),
      resourceId,
      locationId,
      startTime,
      endTime,
      notes: reason,
      status: "confirmed",
      capacity: 1,
      capacityUsed: 1,
      source: "backoffice",
      metadata: {
        ...metadata,
        blockType: "maintenance",
        createdBy: userId,
      },
    };

    const appointment = (await this.create(
      tenantId,
      bookingPayload,
      userId,
    )) as AppointmentDocument;

    await this.appointmentModel.updateOne(
      { _id: appointment._id },
      {
        $set: {
          status: "confirmed",
          "metadata.blockReason": reason,
        },
      },
    );

    await this.scheduleDepositTask({
      appointment,
      service: maintenanceService,
      tenantId,
      userObjectId: await this.resolveUserObjectId(userId, tenantId),
    });

    return this.findOne(tenantId, appointment._id.toString());
  }

  async createManualDeposit(
    tenantId: string,
    appointmentId: string,
    createManualDepositDto: CreateManualDepositDto,
    userId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentModel
      .findOne({ _id: appointmentId, tenantId })
      .exec();

    if (!appointment) {
      throw new NotFoundException("Cita no encontrada");
    }

    const userObjectId = await this.resolveUserObjectId(userId, tenantId);

    const amount = Number(createManualDepositDto.amount ?? 0);
    if (Number.isNaN(amount) || amount <= 0) {
      throw new BadRequestException("El monto del depósito debe ser mayor a 0");
    }

    this.ensureProofWithinLimit(createManualDepositDto.proofBase64);

    if (
      createManualDepositDto.bankAccountId &&
      !Types.ObjectId.isValid(createManualDepositDto.bankAccountId)
    ) {
      throw new BadRequestException("Cuenta bancaria inválida");
    }

    appointment.depositRecords = appointment.depositRecords || [];
    const depositRecord: any = {
      amount,
      currency: createManualDepositDto.currency || "VES",
      status: "submitted",
      reference: createManualDepositDto.reference,
      proofUrl: createManualDepositDto.proofUrl,
      notes: createManualDepositDto.notes,
      channel: "backoffice",
      method: createManualDepositDto.method,
      createdAt: new Date(),
      createdBy: userObjectId.toHexString(),
    };

    if (createManualDepositDto.bankAccountId) {
      depositRecord.bankAccountId = this.toObjectIdOrValue(
        createManualDepositDto.bankAccountId,
      );
    }

    if (createManualDepositDto.amountUsd !== undefined) {
      depositRecord.amountUsd = Number(createManualDepositDto.amountUsd);
    }

    if (createManualDepositDto.amountVes !== undefined) {
      depositRecord.amountVes = Number(createManualDepositDto.amountVes);
    }

    if (createManualDepositDto.exchangeRate !== undefined) {
      depositRecord.exchangeRate = Number(createManualDepositDto.exchangeRate);
    }

    if (createManualDepositDto.proofBase64) {
      depositRecord.proof = {
        fileName: createManualDepositDto.proofFileName,
        mimeType: createManualDepositDto.proofMimeType,
        base64: createManualDepositDto.proofBase64,
        uploadedAt: new Date(),
        uploadedBy: userObjectId.toHexString(),
      };
    }

    appointment.depositRecords.push(depositRecord);

    appointment.paymentStatus = "pending";

    appointment.markModified("depositRecords");
    await appointment.save();

    const depositTaskId = (appointment.metadata as any)?.depositTaskId;
    if (depositTaskId) {
      await this.todoModel.findOneAndUpdate(
        { _id: this.toObjectIdOrValue(depositTaskId) },
        { $set: { isCompleted: false } },
      );
    }

    return this.findOne(tenantId, appointmentId);
  }

  async updateManualDeposit(
    tenantId: string,
    appointmentId: string,
    depositId: string,
    updateManualDepositDto: UpdateManualDepositDto,
    userId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentModel
      .findOne({ _id: appointmentId, tenantId })
      .exec();

    if (!appointment) {
      throw new NotFoundException("Cita no encontrada");
    }

    const deposit = (appointment.depositRecords || []).find(
      (record: any) => record._id?.toString() === depositId,
    );

    if (!deposit) {
      throw new NotFoundException("Depósito no encontrado");
    }

    this.ensureProofWithinLimit(updateManualDepositDto.proofBase64);

    if (
      updateManualDepositDto.bankAccountId &&
      !Types.ObjectId.isValid(updateManualDepositDto.bankAccountId)
    ) {
      throw new BadRequestException("Cuenta bancaria inválida");
    }

    const previousStatus = deposit.status;
    const targetStatus = updateManualDepositDto.status;

    if (previousStatus === "confirmed" && targetStatus === "rejected") {
      throw new BadRequestException(
        "No es posible rechazar un depósito que ya fue confirmado.",
      );
    }

    const now = new Date();
    const userObjectId = await this.resolveUserObjectId(userId, tenantId);
    const userHexId = userObjectId.toHexString();

    if (updateManualDepositDto.notes !== undefined) {
      deposit.notes = updateManualDepositDto.notes;
    }

    if (updateManualDepositDto.decisionNotes !== undefined) {
      deposit.decisionNotes = updateManualDepositDto.decisionNotes;
    }

    if (updateManualDepositDto.reference) {
      deposit.reference = updateManualDepositDto.reference;
    }

    if (updateManualDepositDto.method) {
      deposit.method = updateManualDepositDto.method;
    }

    if (updateManualDepositDto.proofUrl) {
      deposit.proofUrl = updateManualDepositDto.proofUrl;
    }

    if (updateManualDepositDto.proofBase64) {
      deposit.proof = {
        fileName: updateManualDepositDto.proofFileName,
        mimeType: updateManualDepositDto.proofMimeType,
        base64: updateManualDepositDto.proofBase64,
        uploadedAt: now,
        uploadedBy: userHexId,
      };
    }

    if (updateManualDepositDto.bankAccountId) {
      deposit.bankAccountId = this.toObjectIdOrValue(
        updateManualDepositDto.bankAccountId,
      );
    }

    if (updateManualDepositDto.amountUsd !== undefined) {
      deposit.amountUsd = Number(updateManualDepositDto.amountUsd);
    }

    if (updateManualDepositDto.amountVes !== undefined) {
      deposit.amountVes = Number(updateManualDepositDto.amountVes);
    }

    if (updateManualDepositDto.exchangeRate !== undefined) {
      deposit.exchangeRate = Number(updateManualDepositDto.exchangeRate);
    }

    const isNewConfirmation =
      targetStatus === "confirmed" && previousStatus !== "confirmed";

    deposit.status = targetStatus;

    if (targetStatus === "confirmed") {
      const confirmedAmount = Number(
        updateManualDepositDto.confirmedAmount ?? deposit.amount ?? 0,
      );
      if (Number.isNaN(confirmedAmount) || confirmedAmount <= 0) {
        throw new BadRequestException(
          "El monto confirmado debe ser mayor a 0",
        );
      }

      deposit.confirmedAmount = confirmedAmount;
      deposit.transactionDate = updateManualDepositDto.transactionDate
        ? new Date(updateManualDepositDto.transactionDate)
        : now;
      deposit.confirmedAt = now;
      deposit.confirmedBy = userHexId;

      if (!deposit.receiptNumber) {
        const receiptNumber = await this.generateDepositReceiptNumber(tenantId);
        deposit.receiptNumber = receiptNumber;
        deposit.receiptIssuedAt = now;
      }

      if (isNewConfirmation) {
        const bankAccountId =
          updateManualDepositDto.bankAccountId ||
          (deposit.bankAccountId instanceof Types.ObjectId
            ? deposit.bankAccountId.toHexString()
            : deposit.bankAccountId);

        if (bankAccountId && !deposit.bankTransactionId) {
          try {
            const updatedAccount =
              await this.bankAccountsService.updateBalance(
                bankAccountId,
                confirmedAmount,
                tenantId,
                undefined,
                { userId: userHexId },
              );

            const descriptionParts = [
              "Depósito manual",
              appointment.serviceName
                ? `para ${appointment.serviceName}`
                : undefined,
              appointment.customerName
                ? `(${appointment.customerName})`
                : undefined,
            ].filter(Boolean);

            const description =
              descriptionParts.length > 0
                ? descriptionParts.join(" ")
                : `Depósito manual cita ${appointment._id?.toString()}`;

            const channel = this.mapMethodToChannel(
              deposit.method || updateManualDepositDto.method,
            );

            const transaction =
              await this.bankTransactionsService.createTransaction(
                tenantId,
                bankAccountId,
                {
                  type: "credit",
                  channel,
                  method: deposit.method || updateManualDepositDto.method,
                  amount: confirmedAmount,
                  description,
                  reference: deposit.reference,
                  transactionDate: (
                    deposit.transactionDate || now
                  ).toISOString(),
                  metadata: {
                    appointmentId,
                    depositId,
                    createdFrom: "appointments_manual_deposit",
                    currency: deposit.currency,
                    amountUsd: deposit.amountUsd,
                    amountVes: deposit.amountVes,
                  },
                  counterpart: {
                    name: appointment.customerName,
                    phone: appointment.customerPhone,
                  },
                },
                userHexId,
                updatedAccount.currentBalance,
                {
                  metadata: {
                    serviceId:
                      appointment.serviceId instanceof Types.ObjectId
                        ? appointment.serviceId.toHexString()
                        : appointment.serviceId,
                    tenantId,
                  },
                },
              );

            deposit.bankTransactionId = transaction._id;
          } catch (error) {
            this.logger.error(
              `No se pudo registrar la transacción bancaria para el depósito ${depositId}`,
              error instanceof Error ? error.stack : undefined,
            );
          }
        }

        try {
          const appointmentReference =
            (appointment as any).referenceId ||
            (appointment.metadata as any)?.publicCode ||
            appointment._id?.toString();
          const journalEntry =
            await this.accountingService.createJournalEntryForManualDeposit({
              tenantId,
              amount: confirmedAmount,
              currency: deposit.currency || "VES",
              appointmentId,
              appointmentNumber: appointmentReference,
              customerName: appointment.customerName,
              serviceName: appointment.serviceName,
              reference: deposit.reference,
              method: deposit.method,
              transactionDate: deposit.transactionDate || now,
            });
          if (journalEntry?._id) {
            deposit.journalEntryId = journalEntry._id;
          }
        } catch (error) {
          this.logger.error(
            `No se pudo generar el asiento contable para el depósito ${depositId}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      const confirmedTotal = (appointment.depositRecords || [])
        .filter((record) => record.status === "confirmed")
        .reduce(
          (sum, record) =>
            sum + (record.confirmedAmount ?? record.amount ?? 0),
          0,
        );

      appointment.paidAmount = confirmedTotal;

      if (confirmedTotal >= (appointment.servicePrice || 0)) {
        appointment.paymentStatus = "paid";
      } else if (confirmedTotal > 0) {
        appointment.paymentStatus = "partial";
      }

      const depositTaskId = (appointment.metadata as any)?.depositTaskId;
      if (depositTaskId) {
        await this.todoModel.findOneAndUpdate(
          { _id: this.toObjectIdOrValue(depositTaskId) },
          { $set: { isCompleted: true } },
        );
      }
    } else if (targetStatus === "rejected") {
      deposit.rejectedAt = now;
      deposit.rejectedBy = userHexId;

      const confirmedTotal = (appointment.depositRecords || [])
        .filter((record) => record._id?.toString() !== depositId)
        .filter((record) => record.status === "confirmed")
        .reduce(
          (sum, record) =>
            sum + (record.confirmedAmount ?? record.amount ?? 0),
          0,
        );

      appointment.paidAmount = confirmedTotal;
      appointment.paymentStatus =
        confirmedTotal > 0 ? "partial" : "pending";

      const depositTaskId = (appointment.metadata as any)?.depositTaskId;
      if (depositTaskId) {
        await this.todoModel.findOneAndUpdate(
          { _id: this.toObjectIdOrValue(depositTaskId) },
          { $set: { isCompleted: false } },
        );
      }
    }

    appointment.markModified("depositRecords");
    await appointment.save();

    return this.findOne(tenantId, appointmentId);
  }

  async getPendingDeposits(
    tenantId: string,
  ): Promise<{
    summary: {
      total: number;
      byCurrency: Record<string, number>;
      earliest?: Date | null;
    };
    items: Array<{
      appointmentId: string;
      depositId: string;
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      serviceName?: string;
      serviceId?: string;
      startTime?: Date;
      createdAt?: Date;
      amount: number;
      currency: string;
      method?: string;
      status: string;
      reference?: string;
      notes?: string;
      decisionNotes?: string;
      bankAccountId?: string;
    }>;
  }> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          tenantId,
        },
      },
      {
        $project: {
          serviceName: 1,
          serviceId: 1,
          customerName: 1,
          customerPhone: 1,
          customerEmail: 1,
          startTime: 1,
          depositRecords: 1,
        },
      },
      {
        $unwind: "$depositRecords",
      },
      {
        $match: {
          "depositRecords.status": { $in: ["requested", "submitted"] },
        },
      },
      {
        $sort: {
          "depositRecords.createdAt": 1,
        },
      },
    ];

    const raw = await this.appointmentModel
      .aggregate(pipeline)
      .allowDiskUse(true)
      .exec();

    const items = raw.map((doc) => {
      const deposit = doc.depositRecords as any;
      return {
        appointmentId: doc._id?.toString() || "",
        depositId: deposit?._id?.toString() || "",
        customerName: doc.customerName,
        customerPhone: doc.customerPhone,
        customerEmail: doc.customerEmail,
        serviceName: doc.serviceName,
        serviceId:
          doc.serviceId instanceof Types.ObjectId
            ? doc.serviceId.toHexString()
            : doc.serviceId,
        startTime: doc.startTime,
        createdAt: deposit?.createdAt,
        amount: Number(deposit?.amount ?? 0),
        currency: deposit?.currency || "VES",
        method: deposit?.method,
        status: deposit?.status,
        reference: deposit?.reference,
        notes: deposit?.notes,
        decisionNotes: deposit?.decisionNotes,
        bankAccountId:
          deposit?.bankAccountId instanceof Types.ObjectId
            ? deposit.bankAccountId.toHexString()
            : deposit?.bankAccountId,
      };
    });

    const summary = items.reduce<{
      total: number;
      byCurrency: Record<string, number>;
      earliest?: Date | null;
    }>(
      (acc, item) => {
        acc.total += 1;
        const currency = item.currency || "VES";
        acc.byCurrency[currency] =
          (acc.byCurrency[currency] ?? 0) + Number(item.amount || 0);

        if (item.createdAt) {
          if (!acc.earliest || item.createdAt < acc.earliest) {
            acc.earliest = item.createdAt;
          }
        }
        return acc;
      },
      { total: 0, byCurrency: {}, earliest: undefined },
    );

    return {
      summary,
      items,
    };
  }

  async getDepositReceipt(
    tenantId: string,
    appointmentId: string,
    depositId: string,
  ): Promise<Record<string, any>> {
    const appointment = await this.appointmentModel
      .findOne({
        _id: this.toObjectIdOrValue(appointmentId),
        tenantId,
      })
      .select(
        "serviceName serviceId customerName customerEmail customerPhone startTime depositRecords",
      )
      .lean();

    if (!appointment) {
      throw new NotFoundException("Cita no encontrada");
    }

    const deposit = (appointment.depositRecords || []).find(
      (record: any) => record._id?.toString() === depositId,
    );

    if (!deposit) {
      throw new NotFoundException("Depósito no encontrado");
    }

    if (deposit.status !== "confirmed") {
      throw new BadRequestException(
        "El depósito debe estar confirmado para generar el comprobante",
      );
    }

    if (!deposit.receiptNumber) {
      throw new BadRequestException(
        "El comprobante aún no ha sido generado para este depósito",
      );
    }

    return {
      receiptNumber: deposit.receiptNumber,
      receiptIssuedAt: deposit.receiptIssuedAt,
      tenantId,
      appointmentId,
      depositId,
      serviceName: appointment.serviceName,
      serviceId:
        appointment.serviceId instanceof Types.ObjectId
          ? appointment.serviceId.toHexString()
          : appointment.serviceId,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      appointmentStart: appointment.startTime,
      amount: deposit.confirmedAmount ?? deposit.amount ?? 0,
      currency: deposit.currency || "VES",
      method: deposit.method,
      reference: deposit.reference,
      bankTransactionId: deposit.bankTransactionId
        ? deposit.bankTransactionId.toString()
        : undefined,
      journalEntryId: deposit.journalEntryId
        ? deposit.journalEntryId.toString()
        : undefined,
    };
  }

  async findAll(
    tenantId: string,
    filters?: AppointmentFilterDto,
  ): Promise<Appointment[]> {
    const andConditions: any[] = [{ tenantId }];

    // Date range filter
    if (filters?.startDate || filters?.endDate) {
      const dateCondition: any = { startTime: {} };
      if (filters.startDate) {
        dateCondition.startTime.$gte = new Date(filters.startDate);
      }

      if (filters.endDate) {
        dateCondition.startTime.$lte = new Date(filters.endDate);
      }
      andConditions.push(dateCondition);
    }

    // Other filters
    if (filters?.customerId) {
      andConditions.push({ customerId: filters.customerId });
    }

    if (filters?.serviceId) {
      andConditions.push({ serviceId: filters.serviceId });
    }

    if (filters?.resourceId) {
      andConditions.push({
        $or: [
          { resourceId: filters.resourceId },
          { resourcesInvolved: filters.resourceId },
        ],
      });
    }

    if (filters?.locationId) {
      andConditions.push({ locationId: filters.locationId });
    }

    if (filters?.capacityUsed !== undefined) {
      andConditions.push({ capacityUsed: filters.capacityUsed });
    }

    if (filters?.source) {
      andConditions.push({ source: filters.source });
    }

    if (filters?.status) {
      andConditions.push({ status: filters.status });
    }

    // Text search
    if (filters?.search) {
      andConditions.push({
        $or: [
          { customerName: { $regex: filters.search, $options: "i" } },
          { serviceName: { $regex: filters.search, $options: "i" } },
          { resourceName: { $regex: filters.search, $options: "i" } },
          { "participants.name": { $regex: filters.search, $options: "i" } },
        ],
      });
    }

    const query =
      andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    return this.appointmentModel
      .find(query)
      .sort({ startTime: 1 })
      .populate("customerId", "name phone email")
      .populate("serviceId", "name duration price")
      .populate("resourceId", "name type")
      .populate("additionalResourceIds", "name type")
      .exec();
  }

  async findOne(tenantId: string, id: string): Promise<Appointment> {
    const appointment = await this.appointmentModel
      .findOne({ _id: id, tenantId })
      .populate("customerId", "name phone email")
      .populate("serviceId", "name duration price category")
      .populate("resourceId", "name type email phone")
      .populate("additionalResourceIds", "name type email phone")
      .exec();

    if (!appointment) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    return appointment;
  }

  async findByExternalId(
    tenantId: string,
    externalId: string,
    source?: string,
  ): Promise<AppointmentDocument | null> {
    if (!externalId) {
      return null;
    }

    const query: Record<string, any> = {
      tenantId,
      externalId,
    };

    if (source) {
      query.externalSource = source;
    }

    return this.appointmentModel.findOne(query).exec();
  }

  async update(
    tenantId: string,
    id: string,
    updateAppointmentDto: UpdateAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    this.logger.log(`Updating appointment ${id} for tenant: ${tenantId}`);

    const existing = await this.findOne(tenantId, id);

    const newAdditionalResourceIds =
      updateAppointmentDto.additionalResourceIds !== undefined
        ? updateAppointmentDto.additionalResourceIds
        : existing.additionalResourceIds?.map((item) => item.toString()) || [];

    if (updateAppointmentDto.additionalResourceIds !== undefined) {
      const additionalResources = await this.resourceModel
        .find({
          _id: { $in: updateAppointmentDto.additionalResourceIds },
          tenantId,
        })
        .exec();

      if (
        additionalResources.length !==
        updateAppointmentDto.additionalResourceIds.length
      ) {
        throw new NotFoundException(
          "Uno o más recursos adicionales no existen",
        );
      }

      const inactive = additionalResources.find(
        (item) => item.status !== "active",
      );
      if (inactive) {
        throw new BadRequestException(
          "Uno o más recursos adicionales no están activos",
        );
      }
    }

    // If changing time or resource, check conflicts
    if (
      updateAppointmentDto.startTime ||
      updateAppointmentDto.endTime ||
      updateAppointmentDto.resourceId ||
      updateAppointmentDto.additionalResourceIds
    ) {
      const startTime = updateAppointmentDto.startTime
        ? new Date(updateAppointmentDto.startTime)
        : existing.startTime;
      const endTime = updateAppointmentDto.endTime
        ? new Date(updateAppointmentDto.endTime)
        : existing.endTime;

      const primaryResourceId =
        updateAppointmentDto.resourceId || existing.resourceId?.toString();

      const hasConflict = await this.checkConflict(
        tenantId,
        startTime,
        endTime,
        [primaryResourceId, ...newAdditionalResourceIds].filter(
          Boolean,
        ) as string[],
        id,
        updateAppointmentDto.locationId ?? existing.locationId,
      );

      if (hasConflict) {
        throw new ConflictException(
          "Ya existe una cita en ese horario para los recursos seleccionados",
        );
      }
    }

    // Handle status changes
    const updateData: any = { ...updateAppointmentDto };

    if (updateAppointmentDto.metadata) {
      updateData.metadata = {
        ...(existing.metadata || {}),
        ...updateAppointmentDto.metadata,
      };
    }

    if (updateAppointmentDto.externalId !== undefined) {
      updateData.externalId = updateAppointmentDto.externalId;
    }

    if (updateAppointmentDto.externalSource !== undefined) {
      updateData.externalSource = updateAppointmentDto.externalSource;
    }

    if (updateAppointmentDto.status === "confirmed" && !existing.confirmed) {
      updateData.confirmed = true;
      updateData.confirmedAt = new Date();
      updateData.confirmedBy = userId;
    }

    if (updateAppointmentDto.status === "completed" && !existing.completedAt) {
      updateData.completedAt = new Date();
      updateData.completedBy = userId;
    }

    if (updateAppointmentDto.status === "cancelled" && !existing.cancelledAt) {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = userId;
    }

    if (
      updateData.capacity !== undefined &&
      updateData.capacity <
        (updateData.capacityUsed ?? existing.capacityUsed ?? 1)
    ) {
      throw new BadRequestException(
        "La capacidad no puede ser menor al cupo usado",
      );
    }

    if (updateData.participants) {
      updateData.participants = updateData.participants.map((participant) => ({
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        role: participant.role,
      }));
    }

    if (updateData.addons) {
      updateData.addons = updateData.addons.map((addon) => ({
        name: addon.name,
        price: addon.price ?? 0,
        quantity: addon.quantity ?? 1,
      }));
    }

    if (updateData.additionalResourceIds !== undefined) {
      updateData.resourcesInvolved = [
        updateData.resourceId || existing.resourceId?.toString(),
        ...newAdditionalResourceIds,
      ].filter(Boolean);
    } else if (updateData.resourceId) {
      updateData.resourcesInvolved = [
        updateData.resourceId,
        ...newAdditionalResourceIds,
      ].filter(Boolean);
    }

    const updated = await this.appointmentModel
      .findOneAndUpdate(
        { _id: id, tenantId },
        { $set: updateData },
        { new: true },
      )
      .populate("customerId", "name contacts email")
      .populate("serviceId", "name duration price")
      .populate("resourceId", "name type")
      .populate("additionalResourceIds", "name type")
      .exec();

    if (!updated) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    this.logger.log(`Appointment updated successfully: ${id}`);

    if (updated.status === "cancelled") {
      await this.calendarIntegrationService.cancelAppointment({
        tenantId,
        appointment: updated,
      });
      await this.appointmentModel.updateOne(
        { _id: updated._id },
        {
          $set: {
            "metadata.calendar.cancelledAt": new Date().toISOString(),
          },
        },
      );
      updated.metadata = {
        ...(updated.metadata || {}),
        calendar: {
          ...(updated.metadata?.calendar || {}),
          cancelledAt: new Date().toISOString(),
        },
      };
    } else {
      const calendarResult = await this.calendarIntegrationService.syncAppointment({
        tenantId,
        appointment: updated,
      });

      if (
        calendarResult &&
        (calendarResult.googleEventId || calendarResult.outlookEventId)
      ) {
        const calendarMetadata = {
          ...(updated.metadata?.calendar || {}),
          googleEventId:
            calendarResult.googleEventId || updated.metadata?.calendar?.googleEventId,
          outlookEventId:
            calendarResult.outlookEventId || updated.metadata?.calendar?.outlookEventId,
          icsPayload: calendarResult.icsPayload,
          lastSyncAt: new Date().toISOString(),
        };

        updated.metadata = {
          ...(updated.metadata || {}),
          calendar: calendarMetadata,
        };

        await this.appointmentModel.updateOne(
          { _id: updated._id },
          { $set: { metadata: updated.metadata } },
        );
      }
    }

    await this.appointmentAuditService.record({
      tenantId,
      appointmentId: updated._id,
      action: "update",
      performedBy: userId,
      source: updateAppointmentDto.externalSource || updated.externalSource,
      changes: updateAppointmentDto,
    });

    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    this.logger.log(`Deleting appointment ${id} for tenant: ${tenantId}`);

    const existing = await this.appointmentModel
      .findOne({ _id: id, tenantId })
      .exec();

    if (!existing) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    await this.calendarIntegrationService.cancelAppointment({
      tenantId,
      appointment: existing,
    });

    const result = await this.appointmentModel
      .deleteOne({ _id: id, tenantId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    this.logger.log(`Appointment deleted successfully: ${id}`);

    await this.appointmentAuditService.record({
      tenantId,
      appointmentId: existing._id,
      action: "delete",
      performedBy: undefined,
      source: existing.externalSource,
      changes: {},
    });
  }

  async getAuditTrail(tenantId: string, appointmentId: string) {
    return this.appointmentAuditService.list(tenantId, appointmentId);
  }

  async getPublicAvailability(
    payload: PublicAvailabilityDto,
  ): Promise<{ start: string; end: string }[]> {
    await this.ensurePublicBookingEnabled(payload.tenantId);

    const availabilityRequest: CheckAvailabilityDto = {
      serviceId: payload.serviceId,
      resourceId: payload.resourceId,
      additionalResourceIds: payload.additionalResourceIds,
      date: payload.date,
      capacity: payload.capacity,
    };

    return this.getAvailableSlots(payload.tenantId, availabilityRequest);
  }

  async createFromPublic(payload: PublicCreateAppointmentDto): Promise<{
    appointmentId: string;
    status: string;
    cancellationCode: string;
    startTime: Date;
    endTime: Date;
  }> {
    const tenant = await this.ensurePublicBookingEnabled(payload.tenantId);

    const service = await this.serviceModel
      .findOne({ _id: payload.serviceId, tenantId: payload.tenantId })
      .lean();
    if (!service) {
      throw new NotFoundException("Servicio no encontrado");
    }
    if (service.status !== "active") {
      throw new BadRequestException("El servicio no está disponible");
    }

    const startTime = new Date(payload.startTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new BadRequestException("Fecha/hora seleccionada inválida");
    }

    const now = new Date();
    if (startTime.getTime() <= now.getTime()) {
      throw new BadRequestException(
        "La reserva debe hacerse con antelación a la hora actual",
      );
    }

    const diffHours = (startTime.getTime() - now.getTime()) / 36e5;
    if (
      service.minAdvanceBooking &&
      diffHours < Number(service.minAdvanceBooking)
    ) {
      throw new BadRequestException(
        `La reserva debe realizarse con al menos ${service.minAdvanceBooking} horas de anticipación`,
      );
    }

    if (
      service.maxAdvanceBooking &&
      diffHours > Number(service.maxAdvanceBooking)
    ) {
      throw new BadRequestException(
        `La reserva no puede hacerse con más de ${service.maxAdvanceBooking} horas de anticipación`,
      );
    }

    const selectedAddons = payload.addons || [];
    const serviceAddonMap = new Map(
      (service.addons || []).map((addon: any) => [addon.name, addon]),
    );

    const addonsForCreation = selectedAddons.map((addon) => ({
      name: addon.name,
      price: addon.price ?? serviceAddonMap.get(addon.name)?.price ?? 0,
      quantity: addon.quantity ?? 1,
    }));

    const addonExtraDuration = selectedAddons.reduce((total, addon) => {
      const definition = serviceAddonMap.get(addon.name);
      return total + (definition?.duration ?? 0);
    }, 0);

    const totalDurationMinutes =
      (service.duration || 60) +
      (service.bufferTimeBefore || 0) +
      (service.bufferTimeAfter || 0) +
      addonExtraDuration;

    const endTime = new Date(startTime.getTime() + totalDurationMinutes * 60000);

    const partySize = payload.partySize ?? 1;
    if (partySize < 1) {
      throw new BadRequestException("La cantidad de huéspedes debe ser mayor a cero");
    }
    if (service.maxSimultaneous && partySize > service.maxSimultaneous) {
      throw new BadRequestException(
        `La capacidad máxima para este servicio es ${service.maxSimultaneous} huéspedes`,
      );
    }

    const systemUserId = await this.resolveSystemUserId(payload.tenantId);
    const customer = await this.findOrCreatePublicCustomer(
      payload,
      systemUserId,
    );

    const cancellationCode = `CNL-${randomUUID().slice(0, 6).toUpperCase()}`;

    const participants =
      payload.guests?.map((guest) => ({
        name: guest.name,
        email: guest.guestEmail,
        phone: guest.guestPhone,
        role: guest.role,
      })) || [];

    const metadata = {
      ...(payload.metadata || {}),
      cancellationCode,
      acceptPolicies: payload.acceptPolicies !== false,
      portalSubmission: {
        submittedAt: now.toISOString(),
        tenantTimezone: tenant.timezone || "UTC",
        source: "booking_portal",
      },
      contactDetails: {
        email: payload.customer.email,
        phone: payload.customer.phone,
      },
    };

    const createAppointmentDto: CreateAppointmentDto = {
      customerId: customer._id.toString(),
      serviceId: payload.serviceId,
      locationId: payload.locationId,
      resourceId: payload.resourceId,
      additionalResourceIds: payload.additionalResourceIds,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      notes: payload.notes,
      status: service.requiresDeposit ? "pending" : "confirmed",
      capacity: partySize,
      capacityUsed: partySize,
      participants,
      addons: addonsForCreation,
      metadata,
      source: "storefront",
    };

    const appointment = await this.create(
      payload.tenantId,
      createAppointmentDto,
      systemUserId.toHexString(),
    );

    const appointmentDocument = appointment as AppointmentDocument;

    await this.scheduleHousekeepingTask({
      appointment: appointmentDocument,
      service,
      tenantId: payload.tenantId,
      userObjectId: systemUserId,
    });

    await this.scheduleDepositTask({
      appointment: appointmentDocument,
      service,
      tenantId: payload.tenantId,
      userObjectId: systemUserId,
    });

    return {
      appointmentId: appointmentDocument._id.toString(),
      status: appointmentDocument.status,
      cancellationCode,
      startTime: appointmentDocument.startTime,
      endTime: appointmentDocument.endTime,
    };
  }

  async cancelFromPublic(
    appointmentId: string,
    payload: PublicCancelAppointmentDto,
  ): Promise<{
    appointmentId: string;
    previousStatus: string;
    newStatus: string;
    cancelledAt: Date;
  }> {
    await this.ensurePublicBookingEnabled(payload.tenantId);

    const appointment = await this.appointmentModel
      .findOne({
        _id: appointmentId,
        tenantId: payload.tenantId,
      })
      .exec();

    if (!appointment) {
      throw new NotFoundException("Reserva no encontrada");
    }

    const metaCancellationCode = (appointment.metadata as any)?.cancellationCode;
    if (!metaCancellationCode) {
      throw new ForbiddenException(
        "La reserva no admite cancelaciones por el portal",
      );
    }

    if (metaCancellationCode !== payload.cancellationCode) {
      throw new ForbiddenException("El código de cancelación no es válido");
    }

    if (appointment.status === "cancelled") {
      return {
        appointmentId: appointment._id.toString(),
        previousStatus: "cancelled",
        newStatus: "cancelled",
        cancelledAt: appointment.cancelledAt || new Date(),
      };
    }

    const startTime =
      appointment.startTime instanceof Date
        ? appointment.startTime
        : new Date(appointment.startTime);

    if (startTime.getTime() <= Date.now()) {
      throw new BadRequestException(
        "No es posible cancelar reservas que ya han comenzado",
      );
    }

    const previousStatus = appointment.status;
    appointment.status = "cancelled";
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = "booking_portal";
    appointment.cancellationReason =
      payload.reason || "Cancelado por el huésped desde el portal";
    appointment.metadata = {
      ...(appointment.metadata || {}),
      cancellationCode: metaCancellationCode,
      cancelledViaPortal: true,
      cancellationPayload: {
        reason: payload.reason,
        requestedAt: appointment.cancelledAt.toISOString(),
      },
    };

    await appointment.save();

    return {
      appointmentId: appointment._id.toString(),
      previousStatus,
      newStatus: appointment.status,
      cancelledAt: appointment.cancelledAt,
    };
  }

  async lookupPublic(
    payload: PublicAppointmentLookupDto,
  ): Promise<
    Array<{
      appointmentId: string;
      serviceId: string | null;
      serviceName: string;
      startTime: string;
      endTime: string;
      status: string;
      cancellationCode?: string;
      locationName?: string;
      resourceName?: string;
      capacity: number;
      addons: Appointment["addons"];
      price: number;
      canModify: boolean;
    }>
  > {
    await this.ensurePublicBookingEnabled(payload.tenantId);

    const normalizedEmail = payload.email.trim().toLowerCase();
    const filter: any = {
      tenantId: payload.tenantId,
      customerEmail: normalizedEmail,
    };

    if (payload.phone) {
      filter.customerPhone = payload.phone;
    }

    if (payload.cancellationCode) {
      filter["metadata.cancellationCode"] = payload.cancellationCode;
    }

    if (!payload.includePast) {
      filter.startTime = { $gte: new Date() };
    }

    const appointments = await this.appointmentModel
      .find(filter)
      .sort({ startTime: 1 })
      .limit(25)
      .select(
        "_id serviceId serviceName servicePrice startTime endTime status metadata addons capacity capacityUsed locationName resourceName customerEmail customerPhone",
      )
      .lean();

    return appointments.map((apt) => {
      const metadata = (apt.metadata as Record<string, any>) || {};
      const cancellationCode =
        typeof metadata.cancellationCode === "string"
          ? metadata.cancellationCode
          : undefined;

      const startIso =
        apt.startTime instanceof Date
          ? apt.startTime.toISOString()
          : new Date(apt.startTime).toISOString();

      const endIso =
        apt.endTime instanceof Date
          ? apt.endTime.toISOString()
          : new Date(apt.endTime).toISOString();

      const startTimeDate = new Date(startIso);

      return {
        appointmentId: apt._id.toString(),
        serviceId: apt.serviceId ? apt.serviceId.toString() : null,
        serviceName: apt.serviceName,
        startTime: startIso,
        endTime: endIso,
        status: apt.status,
        cancellationCode,
        locationName: apt.locationName,
        resourceName: apt.resourceName,
        capacity: apt.capacity || apt.capacityUsed || 1,
        addons: apt.addons || [],
        price: apt.servicePrice ?? 0,
        canModify: startTimeDate.getTime() > Date.now(),
      };
    });
  }

  async rescheduleFromPublic(
    appointmentId: string,
    payload: PublicRescheduleAppointmentDto,
  ): Promise<{
    appointmentId: string;
    status: string;
    startTime: string;
    endTime: string;
  }> {
    await this.ensurePublicBookingEnabled(payload.tenantId);

    const appointment = await this.appointmentModel
      .findOne({
        _id: appointmentId,
        tenantId: payload.tenantId,
      })
      .exec();

    if (!appointment) {
      throw new NotFoundException("Reserva no encontrada");
    }

    const meta = (appointment.metadata as Record<string, any>) || {};
    const storedCode = meta.cancellationCode;
    if (!storedCode || storedCode !== payload.cancellationCode) {
      throw new ForbiddenException("Código de cancelación inválido");
    }

    const newStart = new Date(payload.newStartTime);
    if (Number.isNaN(newStart.getTime())) {
      throw new BadRequestException("Fecha/hora de reprogramación inválida");
    }

    const now = new Date();
    if (newStart.getTime() <= now.getTime()) {
      throw new BadRequestException(
        "El nuevo horario debe ser posterior al momento actual",
      );
    }

    const service = await this.serviceModel
      .findOne({ _id: appointment.serviceId, tenantId: payload.tenantId })
      .lean();

    if (!service) {
      throw new NotFoundException(
        "Servicio asociado a la reserva no encontrado",
      );
    }

    const diffHours = (newStart.getTime() - now.getTime()) / 36e5;
    if (
      service.minAdvanceBooking !== undefined &&
      diffHours < Number(service.minAdvanceBooking)
    ) {
      throw new BadRequestException(
        `Debes reprogramar con al menos ${service.minAdvanceBooking} horas de anticipación`,
      );
    }

    if (
      service.maxAdvanceBooking !== undefined &&
      diffHours > Number(service.maxAdvanceBooking)
    ) {
      throw new BadRequestException(
        `La reprogramación supera el máximo permitido de ${service.maxAdvanceBooking} horas`,
      );
    }

    const serviceAddons = service.addons || [];
    const addonDuration = (appointment.addons || []).reduce((sum, addon) => {
      const definition = serviceAddons.find(
        (serviceAddon: any) => serviceAddon.name === addon.name,
      );
      const addonQuantity = addon.quantity ?? 1;
      return (
        sum +
        (definition?.duration ?? 0) * (addonQuantity > 0 ? addonQuantity : 1)
      );
    }, 0);

    const totalDurationMinutes =
      (service.duration || 60) +
      (service.bufferTimeBefore || 0) +
      (service.bufferTimeAfter || 0) +
      addonDuration;

    const newEnd = new Date(newStart.getTime() + totalDurationMinutes * 60000);

    const resourcesInvolved =
      appointment.resourcesInvolved?.length > 0
        ? appointment.resourcesInvolved
        : [
            appointment.resourceId?.toString(),
            ...(appointment.additionalResourceIds || []).map((id: any) =>
              id?.toString(),
            ),
          ].filter(Boolean);

    const hasConflict = await this.checkConflict(
      payload.tenantId,
      newStart,
      newEnd,
      resourcesInvolved,
      appointment._id.toString(),
      appointment.locationId?.toString(),
    );

    if (hasConflict) {
      throw new ConflictException(
        "No hay disponibilidad para el horario seleccionado",
      );
    }

    appointment.startTime = newStart;
    appointment.endTime = newEnd;
    appointment.notes = payload.notes ?? appointment.notes;
    appointment.status =
      appointment.status === "cancelled" ? "pending" : appointment.status;
    appointment.confirmed = false;
    appointment.set("confirmedAt", undefined);
    appointment.reminderSent = false;
    appointment.set("reminderSentAt", undefined);
    appointment.metadata = {
      ...meta,
      rescheduledViaPortal: true,
      lastRescheduledAt: new Date().toISOString(),
    };

    await appointment.save();
    if (meta.housekeepingTodoId) {
      try {
        await this.todoModel.findOneAndUpdate(
          { _id: this.toObjectIdOrValue(meta.housekeepingTodoId) },
          {
            dueDate: newEnd,
            isCompleted: false,
          },
        );
      } catch (error) {
        this.logger.warn(
          `No se pudo actualizar la tarea de housekeeping para la cita ${appointment._id}`,
        );
      }
    }
    await this.scheduleReminderIfEnabled(
      appointment,
      payload.tenantId,
      "public-portal",
    );

    return {
      appointmentId: appointment._id.toString(),
      status: appointment.status,
      startTime:
        appointment.startTime instanceof Date
          ? appointment.startTime.toISOString()
          : new Date(appointment.startTime).toISOString(),
      endTime:
        appointment.endTime instanceof Date
          ? appointment.endTime.toISOString()
          : new Date(appointment.endTime).toISOString(),
    };
  }

  /**
   * Check if there's a conflict with existing appointments
   */
  async checkConflict(
    tenantId: string,
    startTime: Date,
    endTime: Date,
    resourceIds?: string | string[],
    excludeAppointmentId?: string,
    locationId?: string,
  ): Promise<boolean> {
    const query: any = {
      tenantId,
      status: { $in: ["pending", "confirmed", "in_progress"] }, // Only check active appointments
      $or: [
        // New appointment starts during existing appointment
        { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
        // New appointment ends during existing appointment
        { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
        // New appointment completely contains existing appointment
        { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
      ],
    };

    let resourceIdList: string[] = [];
    if (typeof resourceIds === "string") {
      resourceIdList = [resourceIds];
    } else if (Array.isArray(resourceIds)) {
      resourceIdList = resourceIds.filter(Boolean) as string[];
    }

    if (resourceIdList.length > 0) {
      query.$and = [
        ...(query.$and || []),
        {
          resourcesInvolved: { $in: resourceIdList },
        },
      ];
    }

    if (locationId) {
      query.$and = [
        ...(query.$and || []),
        { locationId },
      ];
    }

    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }

    const conflicts = await this.appointmentModel.findOne(query).exec();
    return !!conflicts;
  }

  private generateSeriesOccurrences(options: {
    baseStart: Date;
    baseEnd: Date;
    frequency: string;
    interval: number;
    count?: number;
    until?: Date;
    daysOfWeek?: number[];
  }): { start: Date; end: Date }[] {
    const {
      baseStart,
      baseEnd,
      frequency,
      interval,
      count,
      until,
      daysOfWeek,
    } = options;

    const durationMs = baseEnd.getTime() - baseStart.getTime();
    const occurrences: { start: Date; end: Date }[] = [];

    const maxOccurrences = count ?? 200;
    const untilDate = until ? new Date(until) : undefined;

    const addOccurrence = (start: Date) => {
      const end = new Date(start.getTime() + durationMs);
      if (untilDate && start > untilDate) {
        return false;
      }
      occurrences.push({ start, end });
      return occurrences.length < (count ?? maxOccurrences);
    };

    if (frequency === "daily") {
      let currentStart = new Date(baseStart);
      while (occurrences.length < (count ?? maxOccurrences)) {
        if (!addOccurrence(new Date(currentStart))) {
          break;
        }
        currentStart = new Date(
          currentStart.getTime() + interval * 24 * 60 * 60 * 1000,
        );
        if (untilDate && currentStart > untilDate) {
          break;
        }
      }
    } else if (frequency === "weekly") {
      const daySet = (
        daysOfWeek && daysOfWeek.length
          ? Array.from(new Set(daysOfWeek))
          : [baseStart.getDay()]
      )
        .map((day) => {
          const normalized = Math.floor(day);
          if (Number.isNaN(normalized) || normalized < 0 || normalized > 6) {
            throw new BadRequestException(
              "Los días de la semana deben estar entre 0 (domingo) y 6 (sábado).",
            );
          }
          return normalized;
        })
        .sort((a, b) => a - b);

      const baseWeekStart = new Date(baseStart);
      baseWeekStart.setHours(0, 0, 0, 0);
      baseWeekStart.setDate(
        baseWeekStart.getDate() - baseWeekStart.getDay(),
      ); // domingo

      const baseDayStart = new Date(baseStart.getTime());
      baseDayStart.setHours(0, 0, 0, 0);
      const timeOffsetMs = baseStart.getTime() - baseDayStart.getTime();

      let weekOffset = 0;
      let safetyCounter = 0;
      const maxIterations = 520; // 10 años aprox.

      // eslint-disable-next-line no-constant-condition
      while (true) {
        for (const day of daySet) {
          const occurrenceStart = new Date(baseWeekStart);
          occurrenceStart.setDate(
            baseWeekStart.getDate() + day + weekOffset * 7,
          );
          occurrenceStart.setTime(occurrenceStart.getTime() + timeOffsetMs);

          if (occurrenceStart < baseStart) {
            continue;
          }

          if (!addOccurrence(occurrenceStart)) {
            return occurrences;
          }

          if (count && occurrences.length >= count) {
            return occurrences;
          }

          if (untilDate && occurrenceStart > untilDate) {
            return occurrences;
          }
        }

        weekOffset += interval;
        safetyCounter += 1;

        if (untilDate) {
          const nextWeekStart = new Date(baseWeekStart);
          nextWeekStart.setDate(
            baseWeekStart.getDate() + weekOffset * 7,
          );
          if (nextWeekStart > untilDate) {
            break;
          }
        }

        if (count && occurrences.length >= count) {
          break;
        }

        if (safetyCounter > maxIterations) {
          break;
        }
      }
    } else {
      throw new BadRequestException(
        `Frecuencia '${frequency}' no soportada para series de citas.`,
      );
    }

    return occurrences;
  }

  /**
   * Get available time slots for a service on a specific date
   */
  async getAvailableSlots(
    tenantId: string,
    checkAvailabilityDto: CheckAvailabilityDto,
  ): Promise<{ start: string; end: string }[]> {
    const {
      serviceId,
      resourceId,
      additionalResourceIds = [],
      date,
    } = checkAvailabilityDto;

    // Get service details
    const service = await this.serviceModel
      .findOne({ _id: serviceId, tenantId })
      .exec();
    if (!service) {
      throw new NotFoundException("Servicio no encontrado");
    }

    const targetDate = new Date(date);
    const dayOfWeek = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][targetDate.getDay()];

    const allResourceIds = [resourceId, ...additionalResourceIds].filter(
      Boolean,
    ) as string[];
    const resources: Resource[] = [];

    if (allResourceIds.length) {
      const fetchedResources = await this.resourceModel
        .find({
          _id: { $in: allResourceIds },
          tenantId,
        })
        .exec();

      if (fetchedResources.length !== allResourceIds.length) {
        throw new NotFoundException(
          "Uno o más recursos solicitados no existen",
        );
      }

      const inactive = fetchedResources.find(
        (item) => item.status !== "active",
      );
      if (inactive) {
        throw new BadRequestException(
          "Uno o más recursos solicitados no están activos",
        );
      }

      resources.push(...fetchedResources);
    }

    // Get resource schedule (if resource specified)
    const defaultWork = { start: "09:00", end: "18:00" };
    let workStartMinutes = this.timeStringToMinutes(defaultWork.start);
    let workEndMinutes = this.timeStringToMinutes(defaultWork.end);

    if (resources.length) {
      let computed = false;
      for (const res of resources) {
        const daySchedule = res.schedule?.[dayOfWeek];
        if (!daySchedule || !daySchedule.available) {
          return [];
        }
        const startMinutes = this.timeStringToMinutes(daySchedule.start);
        const endMinutes = this.timeStringToMinutes(daySchedule.end);
        if (!computed) {
          workStartMinutes = startMinutes;
          workEndMinutes = endMinutes;
          computed = true;
        } else {
          workStartMinutes = Math.max(workStartMinutes, startMinutes);
          workEndMinutes = Math.min(workEndMinutes, endMinutes);
        }
        if (workStartMinutes >= workEndMinutes) {
          return [];
        }
      }
    }

    // Get existing appointments for this resource on this date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query: any = {
      tenantId,
      status: { $in: ["pending", "confirmed", "in_progress"] },
      startTime: { $gte: startOfDay, $lte: endOfDay },
    };

    if (resources.length) {
      query.$and = [
        {
          $or: [
            { resourceId: { $in: allResourceIds } },
            { resourcesInvolved: { $in: allResourceIds } },
          ],
        },
      ];
    }

    const existingAppointments = await this.appointmentModel
      .find(query)
      .sort({ startTime: 1 })
      .exec();

    // Generate available slots
    const slots: { start: string; end: string }[] = [];

    let currentTime = new Date(targetDate);
    currentTime.setHours(0, 0, 0, 0);
    currentTime = new Date(currentTime.getTime() + workStartMinutes * 60000);

    const workEndTime = new Date(targetDate);
    workEndTime.setHours(0, 0, 0, 0);
    workEndTime.setTime(workEndTime.getTime() + workEndMinutes * 60000);

    const slotDuration =
      service.duration +
      (service.bufferTimeBefore || 0) +
      (service.bufferTimeAfter || 0);

    while (
      currentTime.getTime() + slotDuration * 60000 <=
      workEndTime.getTime()
    ) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);

      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments.some((apt) => {
        return (
          (currentTime >= apt.startTime && currentTime < apt.endTime) ||
          (slotEnd > apt.startTime && slotEnd <= apt.endTime) ||
          (currentTime <= apt.startTime && slotEnd >= apt.endTime)
        );
      });

      if (!hasConflict) {
        if (checkAvailabilityDto.capacity) {
          const usedCapacity = this.getAppointmentCapacityUsed(
            existingAppointments,
            currentTime,
            slotEnd,
          );
          if (usedCapacity >= checkAvailabilityDto.capacity) {
            currentTime = new Date(currentTime.getTime() + 15 * 60000);
            continue;
          }
        }

        slots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
        });
      }

      // Move to next 15-minute slot
      currentTime = new Date(currentTime.getTime() + 15 * 60000);
    }

    return slots;
  }

  private timeStringToMinutes(time: string): number {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  }

  private getAppointmentCapacityUsed(
    appointments: Appointment[],
    start: Date,
    end: Date,
  ): number {
    return appointments
      .filter((apt) => {
        return (
          (start >= apt.startTime && start < apt.endTime) ||
          (end > apt.startTime && end <= apt.endTime) ||
          (start <= apt.startTime && end >= apt.endTime)
        );
      })
      .reduce((sum, apt) => sum + (apt.capacityUsed || 0), 0);
  }

  private async resolveUserObjectId(
    userId: string,
    tenantId: string,
  ): Promise<Types.ObjectId> {
    if (userId && Types.ObjectId.isValid(userId)) {
      return new Types.ObjectId(userId);
    }
    return this.resolveSystemUserId(tenantId);
  }

  private async scheduleHousekeepingTask(params: {
    appointment: AppointmentDocument;
    service: Pick<Service, "serviceType" | "bufferTimeAfter" | "name">;
    tenantId: string;
    userObjectId: Types.ObjectId;
  }): Promise<void> {
    const { appointment, service, tenantId, userObjectId } = params;
    if (service.serviceType !== "room") {
      return;
    }

    const meta = (appointment.metadata || {}) as Record<string, any>;
    if (meta.blockType === "maintenance") {
      return;
    }

    const endTime =
      appointment.endTime instanceof Date
        ? appointment.endTime
        : new Date(appointment.endTime);

    if (Number.isNaN(endTime.getTime())) {
      return;
    }

    const cleanupStart = new Date(endTime);
    const bufferAfter = Number(service.bufferTimeAfter ?? 0);
    cleanupStart.setMinutes(cleanupStart.getMinutes() + bufferAfter);

    const todo = new this.todoModel({
      title:
        appointment.locationName ||
        appointment.resourceName ||
        `Housekeeping - ${service.name}`,
      isCompleted: false,
      dueDate: cleanupStart,
      tags: ["housekeeping", "mantenimiento"],
      priority: "medium",
      createdBy: userObjectId,
      tenantId: this.toObjectIdOrValue(tenantId) as Types.ObjectId,
    });

    try {
      const savedTodo = await todo.save();
      await this.appointmentModel.updateOne(
        { _id: appointment._id },
        {
          $set: {
            "metadata.housekeepingTodoId": savedTodo._id,
          },
        },
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo crear la tarea de housekeeping para la cita ${appointment._id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async scheduleDepositTask(params: {
    appointment: AppointmentDocument;
    service: Pick<
      Service,
      "requiresDeposit" | "depositAmount" | "depositType" | "name" | "metadata"
    >;
    tenantId: string;
    userObjectId: Types.ObjectId;
  }): Promise<void> {
    const { appointment, service, tenantId, userObjectId } = params;

    if (!service.requiresDeposit || (service.depositAmount ?? 0) <= 0) {
      return;
    }

    const basePrice = appointment.servicePrice ?? service["price"] ?? 0;
    let depositAmount = Number(service.depositAmount ?? 0);
    if (service.depositType === "percentage") {
      depositAmount = Math.round(((depositAmount / 100) * basePrice) * 100) / 100;
    }

    if (depositAmount <= 0) {
      return;
    }

    const metadata = (appointment.metadata || {}) as Record<string, any>;

    if (!metadata.depositTaskId) {
      const todo = new this.todoModel({
        title: `Cobrar depósito - ${service.name}`,
        isCompleted: false,
        dueDate:
          appointment.startTime instanceof Date
            ? appointment.startTime
            : new Date(appointment.startTime),
        tags: ["pagos", "deposito"],
        priority: "high",
        createdBy: userObjectId,
        tenantId: this.toObjectIdOrValue(tenantId) as Types.ObjectId,
      });

      try {
        const savedTodo = await todo.save();
        metadata.depositTaskId = savedTodo._id;
      } catch (error) {
        this.logger.warn(
          `No se pudo crear la tarea de depósito para la cita ${appointment._id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    appointment.depositRecords = appointment.depositRecords || [];
    const hasPendingDeposit = appointment.depositRecords.some(
      (record) => record.status === "requested" || record.status === "submitted",
    );

    if (!hasPendingDeposit) {
      appointment.depositRecords.push({
        amount: depositAmount,
        currency: "VES",
        status: "requested",
        channel: "whatsapp",
        createdAt: new Date(),
        createdBy: userObjectId.toHexString(),
        notes: "Depósito generado automáticamente",
      });
    }

    appointment.metadata = metadata;
    if (typeof appointment.markModified === "function") {
      appointment.markModified("depositRecords");
      appointment.markModified("metadata");
    }
    await appointment.save();

    if (!hasPendingDeposit) {
      const latestDeposit =
        appointment.depositRecords[appointment.depositRecords.length - 1];
      if (latestDeposit?._id) {
        await this.schedulePendingDepositReminder({
          tenantId,
          appointmentId:
            appointment._id instanceof Types.ObjectId
              ? appointment._id
              : new Types.ObjectId(appointment._id),
          depositId: latestDeposit._id.toString(),
          startTime: appointment.startTime,
        });
      }
    }
  }

  private async schedulePendingDepositReminder(params: {
    tenantId: string;
    appointmentId: Types.ObjectId;
    depositId: string;
    startTime: Date | string;
  }): Promise<void> {
    if (!params.startTime) {
      return;
    }

    const startDate =
      params.startTime instanceof Date
        ? params.startTime
        : new Date(params.startTime);

    if (Number.isNaN(startDate.getTime())) {
      return;
    }

    const tenantSettings = await this.tenantModel
      .findById(this.toObjectIdOrValue(params.tenantId))
      .select("settings.hospitalityPolicies")
      .lean();

    const policies = tenantSettings?.settings?.hospitalityPolicies || {};
    const cancellationWindowHours = Math.max(
      Number(policies.cancellationWindowHours ?? 24),
      0,
    );
    const alertWindowHours = Math.max(
      Math.min(cancellationWindowHours || 24, 12),
      2,
    );

    const reminderAt = new Date(
      startDate.getTime() - alertWindowHours * 60 * 60 * 1000,
    );
    const minimumLeadMs = 30 * 60 * 1000; // 30 minutos
    if (reminderAt.getTime() <= Date.now() + minimumLeadMs) {
      reminderAt.setTime(Date.now() + minimumLeadMs);
    }

    await this.appointmentQueueService.scheduleReminderJob({
      appointmentId: params.appointmentId.toHexString(),
      tenantId: params.tenantId,
      reminderAt,
      channels: ["email", "whatsapp"],
      metadata: {
        depositId: params.depositId,
        templateId: "hospitality_reminder_24h",
      },
      jobName: APPOINTMENT_DEPOSIT_ALERT_JOB,
    });
  }

  async handlePendingDepositReminder(
    tenantId: string,
    appointmentId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const appointment = await this.appointmentModel
      .findOne({
        _id: this.toObjectIdOrValue(appointmentId),
        tenantId,
      })
      .select(
        "depositRecords metadata serviceName customerName customerPhone startTime",
      )
      .exec();

    if (!appointment) {
      this.logger.warn(
        `Deposit reminder skipped: appointment ${appointmentId} not found for tenant ${tenantId}`,
      );
      return;
    }

    const targetDepositId = metadata?.depositId;
    const depositRecord = (appointment.depositRecords || []).find((record) => {
      if (targetDepositId && record._id) {
        return record._id.toString() === targetDepositId;
      }
      return record.status === "requested" || record.status === "submitted";
    });

    if (!depositRecord) {
      return;
    }

    if (depositRecord.status !== "requested" && depositRecord.status !== "submitted") {
      return;
    }

    const followUpNote = `Seguimiento automático generado ${new Date().toISOString()}`;
    if (!depositRecord.notes) {
      depositRecord.notes = followUpNote;
    } else if (!depositRecord.notes.includes("Seguimiento automático")) {
      depositRecord.notes = `${depositRecord.notes} | ${followUpNote}`;
    }

    appointment.markModified("depositRecords");
    await appointment.save();

    const metadataRecord = (appointment.metadata || {}) as Record<string, any>;
    if (metadataRecord.depositTaskId) {
      const todo = await this.todoModel
        .findById(this.toObjectIdOrValue(metadataRecord.depositTaskId))
        .exec();
      if (todo) {
        todo.priority = "high";
        todo.tags = Array.from(new Set([...(todo.tags || []), "deposito", "followup"]));
        await todo.save();
      }
    } else {
      try {
        const systemUserId = await this.resolveSystemUserId(tenantId);
        const newTodo = await this.todoModel.create({
          title: `Seguimiento depósito - ${appointment.serviceName || appointment.customerName || "Reserva"}`,
          isCompleted: false,
          priority: "high",
          tags: ["deposito", "followup"],
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
          createdBy: systemUserId,
          tenantId: this.toObjectIdOrValue(tenantId) as Types.ObjectId,
        });
        appointment.set("metadata.depositTaskId", newTodo._id);
        appointment.markModified("metadata");
        await appointment.save();
      } catch (error) {
        this.logger.error(
          `Failed to create follow-up todo for appointment ${appointmentId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private async generateDepositReceiptNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `DP-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const exists = await this.appointmentModel.exists({
        tenantId,
        "depositRecords.receiptNumber": candidate,
      });
      if (!exists) {
        return candidate;
      }
    }
    return `DP-${year}-${Date.now()}`;
  }

  private toObjectIdOrValue(
    id: string | Types.ObjectId,
  ): Types.ObjectId | string {
    if (id instanceof Types.ObjectId) {
      return id;
    }
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
  }

  private buildTenantMatchArray(
    tenantId: string | Types.ObjectId,
  ): Array<string | Types.ObjectId> {
    if (tenantId instanceof Types.ObjectId) {
      return [tenantId, tenantId.toHexString()];
    }
    if (Types.ObjectId.isValid(tenantId)) {
      const asObjectId = new Types.ObjectId(tenantId);
      return [tenantId, asObjectId];
    }
    return [tenantId];
  }

  private async ensurePublicBookingEnabled(
    tenantId: string,
  ): Promise<TenantDocument> {
    if (!Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException("Tenant inválido para reservas públicas");
    }

    const featureFlagEnabled =
      isFeatureEnabled("SERVICE_BOOKING_PORTAL") ||
      this.configService.get<string>("ENABLE_SERVICE_BOOKING_PORTAL") === "true";

    if (!featureFlagEnabled) {
      throw new ForbiddenException(
        "El portal de reservas no está habilitado globalmente",
      );
    }

    const tenant = await this.tenantModel
      .findById(new Types.ObjectId(tenantId))
      .select("enabledModules timezone name")
      .exec();

    if (!tenant) {
      throw new NotFoundException("Tenant no encontrado");
    }

    if (!tenant.enabledModules?.appointments || !tenant.enabledModules?.booking) {
      throw new ForbiddenException(
        "El portal de reservas no está habilitado para este tenant",
      );
    }

    return tenant;
  }

  private async resolveSystemUserId(
    tenantId: string,
  ): Promise<Types.ObjectId> {
    const tenantValue = this.toObjectIdOrValue(tenantId);

    const user = await this.userModel
      .findOne({ tenantId: tenantValue, isActive: true })
      .select("_id")
      .sort({ createdAt: 1 })
      .lean();

    if (user?._id) {
      return user._id instanceof Types.ObjectId
        ? user._id
        : new Types.ObjectId(user._id);
    }

    const fallback = await this.userModel
      .findOne({ isActive: true })
      .select("_id")
      .sort({ createdAt: 1 })
      .lean();

    if (fallback?._id) {
      return fallback._id instanceof Types.ObjectId
        ? fallback._id
        : new Types.ObjectId(fallback._id);
    }

    throw new NotFoundException(
      "No existen usuarios activos para asociar la reserva pública",
    );
  }

  private async generateCustomerNumber(tenantId: string): Promise<string> {
    const tenantMatches = this.buildTenantMatchArray(tenantId);
    const count = await this.customerModel.countDocuments({
      tenantId: { $in: tenantMatches },
    });
    return `CLI-${(count + 1).toString().padStart(6, "0")}`;
  }

  private async ensureMaintenanceCustomer(
    tenantId: string,
  ): Promise<CustomerDocument> {
    const tenantFilter = this.buildTenantMatchArray(tenantId);
    let customer = await this.customerModel
      .findOne({
        tenantId: { $in: tenantFilter },
        "metadata.system": "maintenance",
      })
      .exec();

    if (customer) {
      return customer;
    }

    const customerNumber = await this.generateCustomerNumber(tenantId);
    const systemUserId = await this.resolveSystemUserId(tenantId);

    customer = new this.customerModel({
      customerNumber,
      name: "Bloqueo / Mantenimiento",
      customerType: "internal",
      contacts: [],
      status: "active",
      source: "system",
      createdBy: systemUserId,
      tenantId: this.toObjectIdOrValue(tenantId) as Types.ObjectId,
      metadata: { system: "maintenance" },
    });

    return customer.save();
  }

  private async ensureMaintenanceService(
    tenantId: string,
  ): Promise<ServiceDocument> {
    let service = await this.serviceModel
      .findOne({ tenantId, "metadata.system": "room-block" })
      .exec();

    if (service) {
      return service;
    }

    service = new this.serviceModel({
      tenantId,
      name: "Bloqueo de Habitación",
      description: "Servicio interno para bloquear habitaciones o recursos",
      category: "Mantenimiento",
      duration: 120,
      price: 0,
      status: "active",
      color: "#6b7280",
      requiresResource: true,
      allowedResourceTypes: ["room"],
      bufferTimeBefore: 0,
      bufferTimeAfter: 0,
      maxSimultaneous: 1,
      serviceType: "room",
      metadata: { system: "room-block" },
    });

    return service.save();
  }

  private async findOrCreatePublicCustomer(
    payload: PublicCreateAppointmentDto,
    systemUserId: Types.ObjectId,
  ): Promise<CustomerDocument> {
    const { tenantId } = payload;
    const tenantMatches = this.buildTenantMatchArray(tenantId);
    const normalizedEmail = payload.customer.email
      ? payload.customer.email.toLowerCase()
      : undefined;

    const orConditions: any[] = [];
    if (normalizedEmail) {
      orConditions.push({
        contacts: { $elemMatch: { type: "email", value: normalizedEmail } },
      });
    }
    if (payload.customer.phone) {
      orConditions.push({
        contacts: { $elemMatch: { type: "phone", value: payload.customer.phone } },
      });
    }

    let customer = await this.customerModel
      .findOne({
        tenantId: { $in: tenantMatches },
        ...(orConditions.length ? { $or: orConditions } : {}),
      })
      .exec();

    if (customer) {
      let shouldSave = false;
      if (normalizedEmail) {
        const hasEmail = (customer.contacts || []).some(
          (contact: any) =>
            contact.type === "email" &&
            contact.value.toLowerCase() === normalizedEmail,
        );
        if (!hasEmail) {
          customer.contacts = customer.contacts || [];
          customer.contacts.push({
            type: "email",
            value: normalizedEmail,
            isPrimary: customer.contacts.length === 0,
            isActive: true,
          });
          shouldSave = true;
        }
      }
      if (payload.customer.phone) {
        const hasPhone = (customer.contacts || []).some(
          (contact: any) =>
            contact.type === "phone" && contact.value === payload.customer.phone,
        );
        if (!hasPhone) {
          customer.contacts = customer.contacts || [];
          customer.contacts.push({
            type: "phone",
            value: payload.customer.phone,
            isPrimary: customer.contacts.length === 0,
            isActive: true,
          });
          shouldSave = true;
        }
      }

      const fullName = `${payload.customer.firstName} ${payload.customer.lastName || ""}`.trim();
      if (fullName && customer.name !== fullName) {
        customer.name = fullName;
        shouldSave = true;
      }

      if (shouldSave) {
        await customer.save();
      }

      return customer;
    }

    const fullName = `${payload.customer.firstName} ${payload.customer.lastName || ""}`.trim();
    const tenantObjectId = this.toObjectIdOrValue(tenantId);
    if (!(tenantObjectId instanceof Types.ObjectId)) {
      throw new BadRequestException(
        "El identificador del tenant no es válido para crear el cliente",
      );
    }

    const customerNumber = await this.generateCustomerNumber(tenantId);

    const contacts: CustomerContact[] = [];
    if (normalizedEmail) {
      contacts.push({
        type: "email",
        value: normalizedEmail,
        isPrimary: true,
        isActive: true,
      });
    }
    if (payload.customer.phone) {
      contacts.push({
        type: "phone",
        value: payload.customer.phone,
        isPrimary: !contacts.length,
        isActive: true,
      });
    }

    const newCustomer = new this.customerModel({
      customerNumber,
      name: fullName || payload.customer.firstName,
      customerType: "individual",
      contacts,
      status: "active",
      source: "storefront",
      createdBy: systemUserId,
      tenantId: tenantObjectId,
      preferences: {
        communicationChannel: normalizedEmail ? "email" : "phone",
        marketingOptIn: false,
        invoiceRequired: false,
        specialInstructions: payload.notes,
      },
    });

    customer = await newCustomer.save();
    return customer;
  }

  /**
   * Get appointments for a specific date range (for calendar view)
   */
  async getCalendarView(
    tenantId: string,
    startDate: string,
    endDate: string,
    resourceId?: string,
    locationId?: string,
  ): Promise<any[]> {
    const query: any = {
      tenantId,
      startTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    if (resourceId) {
      query.resourceId = resourceId;
    }

    if (locationId) {
      query.locationId = locationId;
    }

    const appointments = await this.appointmentModel
      .find(query)
      .sort({ startTime: 1 })
      .populate("serviceId", "name serviceType color bufferTimeAfter bufferTimeBefore")
      .populate("resourceId", "name type color")
      .populate("additionalResourceIds", "name type color")
      .lean();

    const statusPalette: Record<string, string> = {
      pending: "#f97316",
      confirmed: "#2563eb",
      in_progress: "#a855f7",
      completed: "#22c55e",
      cancelled: "#ef4444",
      no_show: "#f97316",
    };

    return appointments.map((apt: any) => {
      const service: any = apt.serviceId || {};
      const primaryResource: any = apt.resourceId || {};
      const additionalResources: any[] = apt.additionalResourceIds || [];
      const eventColor =
        apt.color || primaryResource.color || service.color || "#2563eb";

      const locationLabel = apt.locationName || service.metadata?.locationName;
      const resourceLabel =
        primaryResource.name || apt.resourceName || service.name;

      const startIso =
        apt.startTime instanceof Date
          ? apt.startTime.toISOString()
          : new Date(apt.startTime).toISOString();
      const endIso =
        apt.endTime instanceof Date
          ? apt.endTime.toISOString()
          : new Date(apt.endTime).toISOString();

      return {
        ...apt,
        startTime: startIso,
        endTime: endIso,
        serviceType: service.serviceType || "general",
        resourceLabel,
        locationLabel,
        statusColor: statusPalette[apt.status] || eventColor,
        additionalResourceNames: additionalResources.map((res) => res.name),
      };
    });
  }

  /**
   * Get appointment statistics
   */
  async getStatistics(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    revenue: number;
    mostPopularServices: { serviceName: string; count: number }[];
  }> {
    const appointments = await this.appointmentModel
      .find({
        tenantId,
        startTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
      })
      .exec();

    const byStatus = appointments.reduce(
      (acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const revenue = appointments
      .filter(
        (apt) => apt.status === "completed" && apt.paymentStatus === "paid",
      )
      .reduce((sum, apt) => sum + (apt.paidAmount || 0), 0);

    const serviceCount = appointments.reduce(
      (acc, apt) => {
        if (apt.serviceName) {
          acc[apt.serviceName] = (acc[apt.serviceName] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostPopularServices = Object.entries(serviceCount)
      .map(([serviceName, count]) => ({ serviceName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: appointments.length,
      byStatus,
      revenue,
      mostPopularServices,
    };
  }

  async buildHospitalityNotificationContext(
    tenantId: string,
    appointmentId: string,
  ): Promise<{
    customerId: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    whatsappChatId?: string | null;
    language?: string | null;
    templateContext: Record<string, any>;
    preferredChannels: string[];
  } | null> {
    const appointment = await this.appointmentModel
      .findOne({
        _id: this.toObjectIdOrValue(appointmentId),
        tenantId,
      })
      .populate("customerId")
      .populate("serviceId")
      .populate("resourceId")
      .exec();

    if (!appointment) {
      this.logger.warn(
        `Cannot build notification context: appointment ${appointmentId} not found for tenant ${tenantId}`,
      );
      return null;
    }

    const customerDoc = appointment.customerId as unknown as CustomerDocument;
    const serviceDoc = appointment.serviceId as unknown as ServiceDocument | undefined;
    const resourceDoc = appointment.resourceId as unknown as ResourceDocument | undefined;

    const tenant = await this.tenantModel
      .findById(this.toObjectIdOrValue(tenantId))
      .select("name settings timezone")
      .lean();

    const hotelName = tenant?.name || "Tu hotel";
    const tenantTimezone = tenant?.timezone || "America/Caracas";
    const tenantLanguage = ((tenant as Record<string, any> | undefined)?.settings?.language || tenant?.language || "es").toLowerCase();
    const locale = tenantLanguage === "en" ? "en-US" : "es-VE";

    const startDate =
      appointment.startTime instanceof Date
        ? appointment.startTime
        : new Date(appointment.startTime);

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: tenantTimezone,
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    };

    const formatShort: Intl.DateTimeFormatOptions = {
      timeZone: tenantTimezone,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };

    const startTimeLong = startDate.toLocaleString(locale, formatOptions);
    const startTimeShort = startDate.toLocaleString(locale, formatShort);
    const startTimeLocal = startDate.toLocaleString(locale, {
      timeZone: tenantTimezone,
      dateStyle: "full",
      timeStyle: "short",
    });

    const addonsList = (appointment.addons || [])
      .map((addon) => `${addon.name} x${addon.quantity}`)
      .join(", ");

    const depositRecord = (appointment.depositRecords || []).find((record) =>
      ["requested", "submitted"].includes(record.status),
    );

    const metadata = appointment.metadata || {};
    const policySettings = (tenant?.settings?.hospitalityPolicies || {}) as Record<string, any>;
    const arrivalLeadMinutes =
      typeof policySettings.arrivalLeadMinutes === "number"
        ? policySettings.arrivalLeadMinutes
        : metadata?.arrivalLeadMinutes ?? 15;

    const portalBase =
      this.configService.get<string>("BOOKING_PORTAL_URL") ||
      this.configService.get<string>("FRONTEND_URL") ||
      "https://smartkubik.com";

    const selfServiceUrl = `${portalBase}/reservations/${appointment._id}?tenant=${tenantId}`;

    const customerPreferences = (customerDoc?.preferences || {}) as Record<string, any>;
    const preferredChannels: string[] = [];
    if (customerPreferences.communicationChannel) {
      preferredChannels.push(customerPreferences.communicationChannel);
    }
    if (!preferredChannels.includes("email")) {
      preferredChannels.push("email");
    }
    if (!preferredChannels.includes("sms")) {
      preferredChannels.push("sms");
    }
    if (!preferredChannels.includes("whatsapp")) {
      preferredChannels.push("whatsapp");
    }

    const templateContext = {
      hotelName,
      guestName:
        appointment.customerName ||
        customerDoc?.name ||
        customerDoc?.companyName ||
        "Huésped",
      serviceName: appointment.serviceName,
      resourceName: resourceDoc?.name || appointment.resourceName,
      startTimeLocal,
      startTimeShort,
      startTimeLong,
      addons: appointment.addons || [],
      addonsList,
      depositRequired: Boolean(depositRecord),
      depositAmount: depositRecord?.amount
        ? `${depositRecord.amount} ${depositRecord.currency || "USD"}`
        : undefined,
      depositStatus: depositRecord?.status,
      pendingDeposit: Boolean(depositRecord),
      confirmationCode: metadata?.cancellationCode,
      upsellRecommendation:
        serviceDoc?.metadata?.hospitality?.upsellCopy ||
        "Completa tu experiencia con nuestro circuito de spa",
      upsellShort:
        serviceDoc?.metadata?.hospitality?.upsellShort ||
        "un masaje relajante",
      arrivalLead: `${arrivalLeadMinutes} minutos`,
      locationInstructions:
        serviceDoc?.metadata?.hospitality?.locationInstructions ||
        metadata?.locationInstructions,
      contactPhone:
        customerDoc?.contacts?.find(
          (contact: any) => contact.type === "phone" && contact.isPrimary,
        )?.value || metadata?.contactPhone || appointment.customerPhone,
      selfServiceUrl,
      selfServiceShortUrl: metadata?.selfServiceShortUrl || selfServiceUrl,
      loyaltyOffer:
        metadata?.loyaltyOffer ||
        serviceDoc?.metadata?.hospitality?.loyaltyOffer,
      feedbackUrl:
        metadata?.feedbackUrl ||
        `${portalBase}/reservations/${appointment._id}/feedback`,
      feedbackShortUrl:
        metadata?.feedbackShortUrl ||
        `${portalBase}/r/${appointment._id.toString().slice(-6)}`,
    };

    return {
      customerId: (customerDoc?._id || appointment.customerId)?.toString(),
      customerEmail:
        appointment.customerEmail ||
        customerDoc?.contacts?.find((contact: any) => contact.type === "email")
          ?.value,
      customerPhone:
        appointment.customerPhone ||
        customerDoc?.contacts?.find((contact: any) => contact.type === "phone")
          ?.value,
      whatsappChatId: customerDoc?.whatsappChatId || customerDoc?.whatsappNumber,
      language: customerPreferences.language || tenantLanguage,
      templateContext,
      preferredChannels,
    };
  }

  async markReminderDispatched(
    tenantId: string,
    appointmentId: string,
    jobName: string,
    channels: string[],
  ): Promise<void> {
    await this.appointmentModel.updateOne(
      {
        _id: this.toObjectIdOrValue(appointmentId),
        tenantId,
      },
      {
        $set: {
          reminderSent: true,
          reminderSentAt: new Date(),
          "metadata.lastReminderJob": jobName,
          "metadata.lastReminderChannels": channels,
        },
        $push: {
          "metadata.reminderHistory": {
            jobName,
            channels,
            sentAt: new Date(),
          },
        },
      },
    );
  }

  private async scheduleReminderIfEnabled(
    appointment: AppointmentDocument,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const remindersFlag =
      this.configService.get<string>("ENABLE_APPOINTMENT_REMINDERS") ||
      this.configService.get<string>("enableAppointmentReminders");

    const isGloballyEnabled = isFeatureEnabled("APPOINTMENT_REMINDERS");

    if (
      !isGloballyEnabled &&
      remindersFlag?.toString().toLowerCase() !== "true"
    ) {
      return;
    }

    const startTime =
      appointment.startTime instanceof Date
        ? appointment.startTime
        : new Date(appointment.startTime);

    if (!(startTime instanceof Date) || Number.isNaN(startTime.getTime())) {
      this.logger.warn(
        `Unable to schedule reminder for appointment ${appointment._id}: invalid start time`,
      );
      return;
    }

    const offsetRaw =
      this.configService.get<string>("APPOINTMENT_REMINDER_OFFSET_MINUTES") ||
      "60";
    const offsetMinutes = Number(offsetRaw);
    const sanitizedOffset = Number.isNaN(offsetMinutes) ? 60 : offsetMinutes;

    const minimumLeadMs = 30 * 60 * 1000;
    const reminderCandidates = [
      { offsetMinutes: 24 * 60, templateId: "hospitality_reminder_24h" },
      { offsetMinutes: 120, templateId: "hospitality_reminder_2h" },
    ];

    if (!reminderCandidates.some((candidate) => candidate.offsetMinutes === sanitizedOffset)) {
      reminderCandidates.push({
        offsetMinutes: sanitizedOffset,
        templateId: sanitizedOffset <= 150
          ? "hospitality_reminder_2h"
          : "hospitality_reminder_24h",
      });
    }

    for (const candidate of reminderCandidates) {
      const reminderAt = new Date(
        startTime.getTime() - candidate.offsetMinutes * 60000,
      );

      if (reminderAt.getTime() <= Date.now() + minimumLeadMs) {
        continue;
      }

      try {
        await this.appointmentQueueService.scheduleReminderJob({
          appointmentId: appointment._id.toString(),
          tenantId,
          reminderAt,
          channels: ["email", "sms", "whatsapp"],
          metadata: {
            triggeredBy: userId,
            offsetMinutes: candidate.offsetMinutes,
            templateId: candidate.templateId,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to schedule reminder for appointment ${appointment._id}`,
          (error as Error).stack,
        );
      }
    }
  }
}
