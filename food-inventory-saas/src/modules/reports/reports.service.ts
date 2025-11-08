import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import {
  Appointment,
  AppointmentDocument,
} from "../../schemas/appointment.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import * as moment from "moment-timezone";

interface HospitalityAppointmentReportOptions {
  startDate?: string;
  endDate?: string;
  locationId?: string;
  status?: string;
  includeHousekeeping?: boolean;
  format?: "csv" | "pdf";
}

interface AppointmentReportResult {
  format: "csv" | "pdf";
  filename: string;
  mimeType: string;
  data: string;
  generatedAt: string;
  timezone: string;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async generateAccountsReceivableAging(tenantId: string, asOfDate?: string) {
    this.logger.log(`Generating A/R aging report for tenant ${tenantId}`);
    const endDate = asOfDate
      ? moment(asOfDate).endOf("day").toDate()
      : new Date();

    const unpaidOrders = await this.orderModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        paymentStatus: { $in: ["pending", "partial"] },
        createdAt: { $lte: endDate },
      })
      .populate("customerId", "name")
      .exec();

    const report = new Map<string, any>();

    for (const order of unpaidOrders) {
      const customer = order.customerId as any;
      if (!customer) continue;

      const customerId = customer._id.toString();
      const customerName = customer.name;
      const orderData: any = order;

      const paidAmount = (orderData.payments || [])
        .filter((p) => p.status === "confirmed")
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = orderData.totalAmount - paidAmount;

      if (balance <= 0) continue;

      if (!report.has(customerId)) {
        report.set(customerId, {
          customerId,
          customerName,
          totalDue: 0,
          current: 0,
          "1-30": 0,
          "31-60": 0,
          "61-90": 0,
          ">90": 0,
        });
      }

      const customerReport = report.get(customerId);
      customerReport.totalDue += balance;

      const daysOverdue = moment(endDate).diff(
        moment(orderData.createdAt),
        "days",
      );

      if (daysOverdue <= 0) {
        // Should be current if not overdue
        customerReport.current += balance;
      } else if (daysOverdue <= 30) {
        customerReport["1-30"] += balance;
      } else if (daysOverdue <= 60) {
        customerReport["31-60"] += balance;
      } else if (daysOverdue <= 90) {
        customerReport["61-90"] += balance;
      } else {
        customerReport[">90"] += balance;
      }
    }

    const data = Array.from(report.values());
    const totals = {
      totalDue: data.reduce((sum, d) => sum + d.totalDue, 0),
      current: data.reduce((sum, d) => sum + d.current, 0),
      "1-30": data.reduce((sum, d) => sum + d["1-30"], 0),
      "31-60": data.reduce((sum, d) => sum + d["31-60"], 0),
      "61-90": data.reduce((sum, d) => sum + d["61-90"], 0),
      ">90": data.reduce((sum, d) => sum + d[">90"], 0),
    };

    return {
      asOfDate: endDate.toISOString().split("T")[0],
      data,
      totals,
    };
  }

  async exportHospitalityAppointments(
    tenantId: string,
    options: HospitalityAppointmentReportOptions,
  ): Promise<AppointmentReportResult> {
    const format = options.format || "csv";
    let tenant: Partial<Tenant> | null = null;
    try {
      tenant = await this.tenantModel.findById(tenantId).lean();
    } catch (error) {
      this.logger.warn(
        `No se pudo cargar el tenant ${tenantId} para el reporte hospitality: ${(error as Error).message}`,
      );
    }
    const timezone =
      tenant?.settings?.integrations?.calendar?.timezone ||
      tenant?.timezone ||
      "America/Caracas";

    const startDate = options.startDate
      ? moment(options.startDate).tz(timezone).startOf("day")
      : null;
    const endDate = options.endDate
      ? moment(options.endDate).tz(timezone).endOf("day")
      : null;

    const query: Record<string, any> = { tenantId };
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = startDate.toDate();
      }
      if (endDate) {
        query.startTime.$lte = endDate.toDate();
      }
    }
    if (options.locationId) {
      query.locationId = options.locationId;
    }
    if (options.status) {
      query.status = options.status;
    }

    const appointments = await this.appointmentModel
      .find(query)
      .sort({ startTime: 1 })
      .lean();

    let rows = appointments.map((appointment) => {
      const start = moment(appointment.startTime).tz(timezone);
      const end = moment(appointment.endTime).tz(timezone);
      const now = moment().tz(timezone);
      const isActive = now.isBetween(start, end, undefined, "[]");
      const nextCheckIn = start.isAfter(now) ? start.toISOString() : null;
      const requiresHousekeeping = Boolean(
        appointment.metadata?.requiresHousekeeping ||
          appointment.metadata?.housekeepingStatus === "pending" ||
          appointment.metadata?.needsHousekeeping,
      );

      return {
        appointmentId: appointment._id?.toString(),
        serviceName: appointment.serviceName,
        serviceType: (appointment as any)?.serviceType,
        status: appointment.status,
        start: start.format("YYYY-MM-DD HH:mm"),
        end: end.format("YYYY-MM-DD HH:mm"),
        durationMinutes: appointment.serviceDuration,
        locationName: appointment.locationName,
        resourceName: appointment.resourceName,
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        customerEmail: appointment.customerEmail,
        capacityUsed: appointment.capacityUsed,
        capacity: appointment.capacity,
        addons: Array.isArray(appointment.addons)
          ? appointment.addons
              .map((addon: any) => `${addon.name} x${addon.quantity || 1}`)
              .join("; ")
          : "",
        hasHousekeepingTask: requiresHousekeeping,
        currentStatus: isActive
          ? "occupied"
          : nextCheckIn
            ? "upcoming"
            : "available",
        nextCheckIn,
      };
    });

    if (options.includeHousekeeping) {
      rows = rows.filter((row) => row.hasHousekeepingTask);
    }

    if (format === "pdf") {
      return this.buildAppointmentsPdf(rows, timezone);
    }

    return this.buildAppointmentsCsv(rows, timezone);
  }

  private buildAppointmentsCsv(
    rows: Array<Record<string, any>>,
    timezone: string,
  ): AppointmentReportResult {
    const header = [
      "ID",
      "Servicio",
      "Tipo",
      "Estado",
      "Inicio",
      "Fin",
      "Duración (min)",
      "Sede",
      "Recurso",
      "Huésped",
      "Teléfono",
      "Correo",
      "Capacidad",
      "Addons",
      "Housekeeping",
      "Estado actual",
      "Próximo check-in",
    ];

    const csvLines = [
      header.join(","),
      ...rows.map((row) =>
        [
          row.appointmentId,
          this.escapeCsv(row.serviceName),
          this.escapeCsv(row.serviceType || ""),
          row.status,
          row.start,
          row.end,
          row.durationMinutes || "",
          this.escapeCsv(row.locationName || ""),
          this.escapeCsv(row.resourceName || ""),
          this.escapeCsv(row.customerName || ""),
          this.escapeCsv(row.customerPhone || ""),
          this.escapeCsv(row.customerEmail || ""),
          `${row.capacityUsed || 0}/${row.capacity || 1}`,
          this.escapeCsv(row.addons || ""),
          row.hasHousekeepingTask ? "Sí" : "No",
          row.currentStatus,
          row.nextCheckIn
            ? moment(row.nextCheckIn).tz(timezone).format("YYYY-MM-DD HH:mm")
            : "",
        ].join(","),
      ),
    ].join("\n");

    const filename = `hospitality-appointments-${moment()
      .tz(timezone)
      .format("YYYYMMDD-HHmm")}.csv`;

    return {
      format: "csv",
      filename,
      mimeType: "text/csv",
      data: Buffer.from(csvLines, "utf8").toString("base64"),
      generatedAt: new Date().toISOString(),
      timezone,
    };
  }

  private buildAppointmentsPdf(
    rows: Array<Record<string, any>>,
    timezone: string,
  ): AppointmentReportResult {
    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const margin = 32;
    const lineHeight = 14;
    const maxTextWidth = pageWidth - margin * 2;
    const maxChars = Math.floor(maxTextWidth / (lineHeight * 0.6));

    type Page = { lines: string[] };
    const pages: Page[] = [{ lines: [] }];
    let currentPage = pages[0];
    let cursorY = pageHeight - margin;

    const escapePdfText = (text: string) =>
      text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

    const ensureSpace = (linesNeeded = 1) => {
      if (cursorY - lineHeight * linesNeeded < margin) {
        currentPage = { lines: [] };
        pages.push(currentPage);
        cursorY = pageHeight - margin;
      }
    };

    const wrapText = (text: string, size: number) => {
      const limit = Math.max(24, Math.floor(maxTextWidth / (size * 0.55)));
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let buffer = "";

      words.forEach((word) => {
        const tentative = buffer ? `${buffer} ${word}` : word;
        if (tentative.length <= limit) {
          buffer = tentative;
        } else {
          if (buffer) {
            lines.push(buffer);
          }
          buffer = word;
        }
      });

      if (buffer) {
        lines.push(buffer);
      }

      return lines;
    };

    const addTextLines = (
      text: string,
      options: { size: number; color?: [number, number, number] },
    ) => {
      const lines = wrapText(text, options.size);
      const [r, g, b] = options.color ?? [0, 0, 0];

      lines.forEach((line) => {
        ensureSpace();
        currentPage.lines.push(
          `BT /F1 ${options.size.toFixed(2)} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(
            3,
          )} rg 1 0 0 1 ${margin.toFixed(2)} ${cursorY.toFixed(2)} Tm (${escapePdfText(
            line,
          )}) Tj ET`,
        );
        cursorY -= lineHeight;
      });
    };

    const addHeading = (text: string) => {
      ensureSpace();
      currentPage.lines.push(
        `BT /F1 18 Tf 0.100 0.100 0.100 rg 1 0 0 1 ${margin.toFixed(2)} ${cursorY.toFixed(
          2,
        )} Tm (${escapePdfText(text)}) Tj ET`,
      );
      cursorY -= lineHeight + 4;
    };

    const addDivider = () => {
      ensureSpace();
      currentPage.lines.push(
        `0.850 0.850 0.850 RG 0.5 w ${margin.toFixed(2)} ${cursorY.toFixed(2)} m ${(
          pageWidth - margin
        ).toFixed(2)} ${cursorY.toFixed(2)} l S`,
      );
      cursorY -= lineHeight;
    };

    addHeading("Reporte de Reservas Hospitality");
    addTextLines(
      `Generado: ${moment().tz(timezone).format("YYYY-MM-DD HH:mm")}`,
      { size: 10, color: [0.33, 0.33, 0.33] },
    );
    cursorY -= 6;

    rows.forEach((row, index) => {
      addTextLines(
        `${index + 1}. ${row.serviceName} · ${String(row.currentStatus || "").toUpperCase()}`,
        { size: 12, color: [0.07, 0.07, 0.07] },
      );

      const details: string[] = [
        `Reserva: ${row.appointmentId || "N/D"}`,
        `Horario: ${row.start} - ${row.end}`,
        `Ubicación: ${row.locationName || "General"}`,
        `Recurso: ${row.resourceName || "Sin asignar"}`,
        `Huésped: ${row.customerName || "Sin registrar"} (${row.customerEmail || "sin correo"})`,
        `Capacidad: ${row.capacityUsed || 0}/${row.capacity || 1}`,
      ];

      if (row.addons) {
        details.push(`Addons: ${row.addons}`);
      }

      details.push(
        `Housekeeping pendiente: ${row.hasHousekeepingTask ? "Sí" : "No"}`,
      );

      if (row.nextCheckIn) {
        details.push(
          `Próximo check-in: ${moment(row.nextCheckIn).tz(timezone).format("YYYY-MM-DD HH:mm")}`,
        );
      }

      details.forEach((detail) =>
        addTextLines(detail, { size: 10, color: [0.2, 0.2, 0.2] }),
      );

      cursorY -= 6;
      addDivider();
      cursorY -= 4;
    });

    const fontObjectId = 3 + pages.length * 2;
    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];

    const appendObject = (id: number, content: string) => {
      offsets[id] = Buffer.byteLength(pdf, "utf8");
      pdf += `${id} 0 obj\n${content}\nendobj\n`;
    };

    appendObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
    const pageIds = pages.map((_, index) => `${index + 3} 0 R`).join(" ");
    appendObject(
      2,
      `<< /Type /Pages /Kids [${pageIds}] /Count ${pages.length} >>`,
    );

    pages.forEach((page, index) => {
      const pageObjId = 3 + index;
      const contentObjId = 3 + pages.length + index;
      appendObject(
        pageObjId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(
          2,
        )}] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> >>`,
      );
    });

    pages.forEach((page, index) => {
      const contentObjId = 3 + pages.length + index;
      const streamContent = page.lines.join("\n");
      const length = Buffer.byteLength(streamContent, "utf8");
      appendObject(
        contentObjId,
        `<< /Length ${length} >>\nstream\n${streamContent}\nendstream`,
      );
    });

    appendObject(
      fontObjectId,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    );

    const totalObjects = fontObjectId;
    const startXref = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${totalObjects + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= totalObjects; i += 1) {
      pdf += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

    return {
      format: "pdf",
      filename: `hospitality-appointments-${moment()
        .tz(timezone)
        .format("YYYYMMDD-HHmm")}.pdf`,
      mimeType: "application/pdf",
      data: Buffer.from(pdf, "utf8").toString("base64"),
      generatedAt: new Date().toISOString(),
      timezone,
    };
  }

  private escapeCsv(value: string): string {
    if (!value) {
      return "";
    }
    if (value.includes(",") || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
