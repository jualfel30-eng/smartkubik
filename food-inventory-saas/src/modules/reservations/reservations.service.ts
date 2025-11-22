import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Reservation,
  ReservationDocument,
} from "../../schemas/reservation.schema";
import {
  ReservationSettings,
  ReservationSettingsDocument,
} from "../../schemas/reservation-settings.schema";
import { Table, TableDocument } from "../../schemas/table.schema";
import {
  CreateReservationDto,
  UpdateReservationDto,
  CheckAvailabilityDto,
  SeatReservationDto,
  CancelReservationDto,
  ReservationQueryDto,
  UpdateReservationSettingsDto,
} from "../../dto/reservation.dto";

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @InjectModel(Reservation.name)
    private reservationModel: Model<ReservationDocument>,
    @InjectModel(ReservationSettings.name)
    private settingsModel: Model<ReservationSettingsDocument>,
    @InjectModel(Table.name)
    private tableModel: Model<TableDocument>,
  ) {}

  // ========== Settings ==========

  async getSettings(tenantId: string): Promise<ReservationSettingsDocument> {
    let settings = await this.settingsModel
      .findOne({ tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!settings) {
      // Create default settings
      settings = new this.settingsModel({
        tenantId: new Types.ObjectId(tenantId),
      });
      await settings.save();
    }

    return settings;
  }

  async updateSettings(
    dto: UpdateReservationSettingsDto,
    tenantId: string,
  ): Promise<ReservationSettingsDocument> {
    const settings = await this.getSettings(tenantId);

    Object.assign(settings, dto);
    return settings.save();
  }

  // ========== Availability ==========

  async checkAvailability(
    dto: CheckAvailabilityDto,
    tenantId: string,
  ): Promise<{
    available: boolean;
    alternativeTimes: string[];
    tablesAvailable: number;
    message?: string;
  }> {
    const settings = await this.getSettings(tenantId);
    const requestedDate = new Date(dto.date);
    const dayOfWeek = requestedDate.getDay();

    // Check if reservations are accepted
    if (!settings.acceptReservations) {
      return {
        available: false,
        alternativeTimes: [],
        tablesAvailable: 0,
        message: "Reservations are not currently being accepted",
      };
    }

    // Check if date is within advance booking window
    const daysUntilReservation = Math.floor(
      (requestedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntilReservation > settings.advanceBookingDays) {
      return {
        available: false,
        alternativeTimes: [],
        tablesAvailable: 0,
        message: `Reservations can only be made ${settings.advanceBookingDays} days in advance`,
      };
    }

    // Check if restaurant is open on this day/time
    const serviceHours = settings.serviceHours.find(
      (sh) => sh.dayOfWeek === dayOfWeek,
    );
    if (!serviceHours || serviceHours.shifts.length === 0) {
      return {
        available: false,
        alternativeTimes: [],
        tablesAvailable: 0,
        message: "Restaurant is closed on this day",
      };
    }

    // Check if requested time falls within a service shift
    const timeInShift = serviceHours.shifts.some(
      (shift) =>
        shift.isActive && dto.time >= shift.start && dto.time <= shift.end,
    );

    if (!timeInShift) {
      return {
        available: false,
        alternativeTimes: this.getSuggestedTimes(serviceHours.shifts, dto.time),
        tablesAvailable: 0,
        message: "Requested time is outside service hours",
      };
    }

    // Check party size
    if (
      dto.partySize < settings.minPartySize ||
      dto.partySize > settings.maxPartySize
    ) {
      return {
        available: false,
        alternativeTimes: [],
        tablesAvailable: 0,
        message: `Party size must be between ${settings.minPartySize} and ${settings.maxPartySize}`,
      };
    }

    // Count existing reservations for this slot
    const slotStart = new Date(`${dto.date}T${dto.time}`);
    const slotEnd = new Date(
      slotStart.getTime() + settings.slotDuration * 60000,
    );

    const existingReservations = await this.reservationModel
      .countDocuments({
        tenantId,
        date: requestedDate,
        status: { $in: ["pending", "confirmed", "seated"] },
        time: {
          $gte: new Date(slotStart.getTime() - settings.bufferTime * 60000)
            .toISOString()
            .substr(11, 5),
          $lte: new Date(slotEnd.getTime() + settings.bufferTime * 60000)
            .toISOString()
            .substr(11, 5),
        },
      })
      .exec();

    if (existingReservations >= settings.maxReservationsPerSlot) {
      return {
        available: false,
        alternativeTimes: await this.findAlternativeTimes(
          dto.date,
          dto.time,
          dto.partySize,
          tenantId,
        ),
        tablesAvailable: 0,
        message: "Time slot is fully booked",
      };
    }

    // Check available tables for party size
    const availableTables = await this.tableModel
      .countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        maxCapacity: { $gte: dto.partySize },
        isActive: true,
      })
      .exec();

    return {
      available: availableTables > 0,
      alternativeTimes:
        availableTables > 0
          ? []
          : await this.findAlternativeTimes(
              dto.date,
              dto.time,
              dto.partySize,
              tenantId,
            ),
      tablesAvailable: availableTables,
    };
  }

  private getSuggestedTimes(shifts: any[], requestedTime: string): string[] {
    // Return start times of available shifts
    return shifts
      .filter((s) => s.isActive)
      .map((s) => s.start)
      .filter((time) => time !== requestedTime)
      .slice(0, 3);
  }

  private async findAlternativeTimes(
    date: string,
    time: string,
    partySize: number,
    tenantId: string,
  ): Promise<string[]> {
    const alternatives: string[] = [];
    const baseTime = new Date(`${date}T${time}`);

    // Try ±30 min, ±1 hour, ±1.5 hours
    const offsets = [-90, -60, -30, 30, 60, 90]; // minutes

    for (const offset of offsets) {
      const altTime = new Date(baseTime.getTime() + offset * 60000);
      const altTimeStr = altTime.toISOString().substr(11, 5);

      const availability = await this.checkAvailability(
        {
          date,
          time: altTimeStr,
          partySize,
        },
        tenantId,
      );

      if (availability.available) {
        alternatives.push(altTimeStr);
      }

      if (alternatives.length >= 3) break;
    }

    return alternatives;
  }

  // ========== CRUD Operations ==========

  async create(
    dto: CreateReservationDto,
    tenantId: string,
  ): Promise<ReservationDocument> {
    const settings = await this.getSettings(tenantId);

    // Check availability first
    const availability = await this.checkAvailability(
      {
        date: dto.date,
        time: dto.time,
        partySize: dto.partySize,
      },
      tenantId,
    );

    if (!availability.available) {
      throw new BadRequestException(
        availability.message || "Time slot not available",
      );
    }

    // Find suitable table if not specified
    let tableId = dto.tableId ? new Types.ObjectId(dto.tableId) : null;
    if (!tableId) {
      const suitableTable = await this.tableModel
        .findOne({
          tenantId: new Types.ObjectId(tenantId),
          maxCapacity: { $gte: dto.partySize },
          minCapacity: { $lte: dto.partySize },
          isActive: true,
          status: "available",
        })
        .sort({ maxCapacity: 1 }) // Prefer smallest suitable table
        .exec();

      if (suitableTable) {
        tableId = suitableTable._id;
      }
    }

    const reservation = new this.reservationModel({
      ...dto,
      tenantId,
      tableId,
      date: new Date(dto.date),
      status: settings.autoConfirm ? "confirmed" : "pending",
      duration: dto.duration || 120,
    });

    await reservation.save();

    this.logger.log(
      `Reservation ${reservation.reservationNumber} created for ${dto.guestName}`,
    );

    // If table assigned, mark it as reserved
    if (tableId) {
      await this.tableModel.updateOne({ _id: tableId }, { status: "reserved" });
    }

    return reservation;
  }

  async findAll(
    query: ReservationQueryDto,
    tenantId: string,
  ): Promise<ReservationDocument[]> {
    const filter: any = { tenantId };

    if (query.date) {
      filter.date = new Date(query.date);
    }

    if (query.start && query.end) {
      filter.date = {
        $gte: new Date(query.start),
        $lte: new Date(query.end),
      };
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.guestName) {
      filter.guestName = { $regex: query.guestName, $options: "i" };
    }

    if (query.guestPhone) {
      filter.guestPhone = { $regex: query.guestPhone, $options: "i" };
    }

    return this.reservationModel
      .find(filter)
      .populate("tableId", "tableNumber section maxCapacity")
      .populate("customerId", "name email phone")
      .sort({ date: 1, time: 1 })
      .exec();
  }

  async findOne(id: string, tenantId: string): Promise<ReservationDocument> {
    const reservation = await this.reservationModel
      .findOne({ _id: id, tenantId })
      .populate("tableId")
      .populate("customerId")
      .exec();

    if (!reservation) {
      throw new NotFoundException("Reservation not found");
    }

    return reservation;
  }

  async update(
    id: string,
    dto: UpdateReservationDto,
    tenantId: string,
  ): Promise<ReservationDocument> {
    const reservation = await this.findOne(id, tenantId);

    // If changing date/time/party size, check availability
    if (dto.date || dto.time || dto.partySize) {
      const availability = await this.checkAvailability(
        {
          date: dto.date || reservation.date.toISOString().split("T")[0],
          time: dto.time || reservation.time,
          partySize: dto.partySize || reservation.partySize,
        },
        tenantId,
      );

      if (!availability.available) {
        throw new BadRequestException("New time slot not available");
      }
    }

    Object.assign(reservation, dto);
    if (dto.date) {
      reservation.date = new Date(dto.date);
    }

    return reservation.save();
  }

  async confirm(id: string, tenantId: string): Promise<ReservationDocument> {
    const reservation = await this.findOne(id, tenantId);

    if (reservation.status !== "pending") {
      throw new BadRequestException(
        "Only pending reservations can be confirmed",
      );
    }

    reservation.status = "confirmed";
    reservation.confirmationSentAt = new Date();

    return reservation.save();
  }

  async seat(
    id: string,
    dto: SeatReservationDto,
    tenantId: string,
  ): Promise<ReservationDocument> {
    const reservation = await this.findOne(id, tenantId);

    if (
      reservation.status !== "confirmed" &&
      reservation.status !== "pending"
    ) {
      throw new BadRequestException(
        "Only confirmed or pending reservations can be seated",
      );
    }

    // Update table
    const table = await this.tableModel
      .findOne({ _id: dto.tableId, tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    if (table.status !== "available" && table.status !== "reserved") {
      throw new BadRequestException("Table is not available");
    }

    table.status = "occupied";
    table.guestCount = reservation.partySize;
    table.seatedAt = new Date();
    await table.save();

    // Update reservation
    reservation.status = "seated";
    reservation.seatedAt = new Date();
    reservation.tableId = new Types.ObjectId(dto.tableId);
    reservation.tableNumber = table.tableNumber;
    reservation.section = table.section;

    return reservation.save();
  }

  async cancel(
    id: string,
    dto: CancelReservationDto,
    tenantId: string,
  ): Promise<ReservationDocument> {
    const reservation = await this.findOne(id, tenantId);

    if (
      reservation.status === "cancelled" ||
      reservation.status === "completed"
    ) {
      throw new BadRequestException(
        `Cannot cancel ${reservation.status} reservation`,
      );
    }

    reservation.status = "cancelled";
    reservation.cancelledAt = new Date();
    reservation.cancelReason = dto.reason;

    // Release table if assigned
    if (reservation.tableId) {
      await this.tableModel.updateOne(
        { _id: reservation.tableId },
        { status: "available" },
      );
    }

    return reservation.save();
  }

  async markNoShow(id: string, tenantId: string): Promise<ReservationDocument> {
    const reservation = await this.findOne(id, tenantId);

    if (
      reservation.status !== "confirmed" &&
      reservation.status !== "pending"
    ) {
      throw new BadRequestException(
        "Only confirmed or pending reservations can be marked as no-show",
      );
    }

    reservation.status = "no-show";

    // Release table
    if (reservation.tableId) {
      await this.tableModel.updateOne(
        { _id: reservation.tableId },
        { status: "available" },
      );
    }

    return reservation.save();
  }

  // ========== Calendar View ==========

  async getCalendar(
    month: string,
    tenantId: string,
  ): Promise<ReservationDocument[]> {
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    const reservations = await this.reservationModel
      .find({
        tenantId,
        date: { $gte: startDate, $lte: endDate },
        status: { $in: ["pending", "confirmed", "seated"] },
      })
      .populate("tableId", "tableNumber section")
      .sort({ date: 1, time: 1 })
      .exec();

    return reservations;
  }

  // ========== Notifications (to be called by jobs) ==========

  async getPendingConfirmations(
    tenantId: string,
  ): Promise<ReservationDocument[]> {
    // Reservations created more than 5 minutes ago without confirmation sent
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return this.reservationModel
      .find({
        tenantId,
        status: "pending",
        confirmationSentAt: { $exists: false },
        createdAt: { $lte: fiveMinutesAgo },
      })
      .exec();
  }

  async getPendingReminders(tenantId: string): Promise<ReservationDocument[]> {
    const settings = await this.getSettings(tenantId);
    const reminderTime = new Date(
      Date.now() + settings.reminderHoursBefore * 60 * 60 * 1000,
    );

    return this.reservationModel
      .find({
        tenantId,
        status: "confirmed",
        reminderSentAt: { $exists: false },
        date: {
          $gte: new Date(),
          $lte: reminderTime,
        },
      })
      .exec();
  }

  async getPotentialNoShows(tenantId: string): Promise<ReservationDocument[]> {
    const settings = await this.getSettings(tenantId);
    const graceTime = new Date(
      Date.now() - settings.noShowGracePeriodMinutes * 60 * 1000,
    );

    // Find confirmed reservations that are past their time + grace period
    return this.reservationModel
      .find({
        tenantId,
        status: { $in: ["confirmed", "pending"] },
        date: { $lte: graceTime },
      })
      .exec();
  }
}
