import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import { AppointmentsService } from "../appointments/appointments.service";
import { CustomersService } from "../customers/customers.service";
import { CustomerDocument } from "../../schemas/customer.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import {
  HOSPITALITY_PMS_NIGHTLY_JOB,
  HOSPITALITY_PMS_SYNC_QUEUE,
  HOSPITALITY_PMS_UPSERT_JOB,
} from "./constants";

interface PmsReservationPayload {
  reservationId: string;
  status: string;
  guest: {
    name: string;
    email?: string;
    phone?: string;
  };
  serviceId: string;
  resourceId?: string;
  locationId?: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

@Injectable()
export class PmsIntegrationService {
  private readonly logger = new Logger(PmsIntegrationService.name);

  constructor(
    @InjectQueue(HOSPITALITY_PMS_SYNC_QUEUE)
    private readonly queue: Queue,
    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,
    private readonly customersService: CustomersService,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async enqueueWebhook(
    tenantId: string | undefined,
    payload: any,
  ): Promise<void> {
    const resolvedTenantId = tenantId || payload?.tenantId;
    if (!resolvedTenantId) {
      this.logger.warn("Webhook recibido sin tenantId");
      return;
    }

    await this.queue.add(
      HOSPITALITY_PMS_UPSERT_JOB,
      {
        tenantId: resolvedTenantId,
        reservation: payload?.reservation || payload,
      },
      { removeOnComplete: 100, removeOnFail: 25 },
    );
  }

  async scheduleNightlySync(tenantId: string): Promise<void> {
    await this.queue.add(
      HOSPITALITY_PMS_NIGHTLY_JOB,
      { tenantId },
      {
        repeat: { pattern: "0 3 * * *" },
        jobId: `${tenantId}:nightly`,
        removeOnComplete: true,
      },
    );
  }

  async processReservationUpsert(job: {
    data: { tenantId: string; reservation: PmsReservationPayload };
  }): Promise<void> {
    const { tenantId, reservation } = job.data;

    const tenant = await this.tenantModel.findOne({ _id: tenantId }).lean();
    if (!tenant) {
      this.logger.warn(`Tenant ${tenantId} no encontrado para PMS`);
      return;
    }

    const normalizedStatus = this.normalizeStatus(reservation.status);

    const guestCustomer = await this.upsertCustomerFromGuest({
      tenantId,
      guest: reservation.guest,
    });

    const existing = await this.appointmentsService.findByExternalId(
      tenantId,
      reservation.reservationId,
      "pms",
    );

    if (existing) {
      await this.appointmentsService.update(
        tenantId,
        existing._id.toString(),
        {
          status: normalizedStatus,
          notes: reservation.notes,
          resourceId: reservation.resourceId,
          locationId: reservation.locationId,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
        },
        "system",
      );
      return;
    }

    await this.appointmentsService.create(
      tenantId,
      {
        customerId: guestCustomer._id.toString(),
        serviceId: reservation.serviceId,
        resourceId: reservation.resourceId,
        locationId: reservation.locationId,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        status: normalizedStatus,
        notes: reservation.notes,
        metadata: {
          source: "pms",
          externalId: reservation.reservationId,
        },
      } as any,
      "system",
    );
  }

  async processNightlyReconcile(job: {
    data: { tenantId: string };
  }): Promise<void> {
    const { tenantId } = job.data;
    this.logger.log(`Iniciando reconciliación nocturna PMS para ${tenantId}`);

    // Placeholder: In a full implementation we'd call the PMS API.
    // For now we simply log and rely on webhooks to keep data fresh.
  }

  private async upsertCustomerFromGuest(params: {
    tenantId: string;
    guest: PmsReservationPayload["guest"];
  }): Promise<CustomerDocument> {
    const { tenantId, guest } = params;

    if (!guest.email) {
      const fallback = await this.customersService.create(
        {
          name: guest.name,
          contacts: [
            {
              type: "phone",
              value: guest.phone || "",
              isPrimary: true,
            },
          ],
          customerType: "individual",
        } as any,
        { id: "system", tenantId },
      );
      return fallback;
    }

    const existing = await this.customersService.findByEmail(
      guest.email,
      tenantId,
    );
    if (existing) {
      return existing;
    }

    const created = await this.customersService.create(
      {
        name: guest.name,
        customerType: "individual",
        contacts: [
          {
            type: "email",
            value: guest.email,
            isPrimary: true,
          },
        ],
      } as any,
      { id: "system", tenantId },
    );

    if (!created) {
      throw new Error("No se pudo registrar el huésped en CRM");
    }

    return created;
  }

  private normalizeStatus(status: string): string {
    const normalized = (status || "").toLowerCase();
    switch (normalized) {
      case "confirmed":
      case "checked_in":
        return "confirmed";
      case "cancelled":
      case "void":
        return "cancelled";
      case "completed":
      case "checked_out":
        return "completed";
      default:
        return "pending";
    }
  }
}
