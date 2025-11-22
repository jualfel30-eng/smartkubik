import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  WaitListEntry,
  WaitListEntryDocument,
} from "../../schemas/wait-list-entry.schema";
import { Table, TableDocument } from "../../schemas/table.schema";
import {
  CreateWaitListEntryDto,
  UpdateWaitListEntryDto,
  NotifyCustomerDto,
  SeatFromWaitListDto,
  UpdateWaitListStatusDto,
  WaitListQueryDto,
  WaitListStatsResponse,
  WaitTimeEstimationResponse,
} from "../../dto/wait-list.dto";

@Injectable()
export class WaitListService {
  constructor(
    @InjectModel(WaitListEntry.name)
    private readonly waitListModel: Model<WaitListEntryDocument>,
    @InjectModel(Table.name)
    private readonly tableModel: Model<TableDocument>,
  ) {}

  /**
   * Crear nueva entrada en la lista de espera
   */
  async create(
    dto: CreateWaitListEntryDto,
    tenantId: string,
  ): Promise<WaitListEntry> {
    // Calcular la posición en la cola
    const position = await this.getNextPosition(tenantId);

    // Estimar tiempo de espera
    const estimatedWaitTime = await this.calculateEstimatedWaitTime(
      tenantId,
      dto.partySize,
      position,
    );

    const entry = new this.waitListModel({
      tenantId: new Types.ObjectId(tenantId),
      customerName: dto.customerName,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      partySize: dto.partySize,
      notes: dto.notes,
      position,
      estimatedWaitTime,
      arrivalTime: new Date(),
      status: "waiting",
    });

    return entry.save();
  }

  /**
   * Obtener todas las entradas (con filtros opcionales)
   */
  async findAll(
    query: WaitListQueryDto,
    tenantId: string,
  ): Promise<WaitListEntry[]> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.date) {
      const startOfDay = new Date(query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(query.date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.arrivalTime = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    if (query.activeOnly) {
      filter.status = { $in: ["waiting", "notified"] };
    }

    return this.waitListModel
      .find(filter)
      .populate("tableId")
      .sort({ position: 1 })
      .exec();
  }

  /**
   * Obtener una entrada por ID
   */
  async findOne(id: string, tenantId: string): Promise<WaitListEntry> {
    const entry = await this.waitListModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .populate("tableId")
      .exec();

    if (!entry) {
      throw new NotFoundException("Wait list entry not found");
    }

    return entry;
  }

  /**
   * Actualizar entrada
   */
  async update(
    id: string,
    dto: UpdateWaitListEntryDto,
    tenantId: string,
  ): Promise<WaitListEntry> {
    const entry = await this.findOne(id, tenantId);

    Object.assign(entry, dto);

    return entry.save();
  }

  /**
   * Actualizar estado de una entrada
   */
  async updateStatus(
    id: string,
    dto: UpdateWaitListStatusDto,
    tenantId: string,
  ): Promise<WaitListEntry> {
    const entry = await this.findOne(id, tenantId);

    entry.status = dto.status as any;

    if (dto.status === "seated") {
      entry.seatedAt = new Date();
      if (dto.tableId) {
        entry.tableId = new Types.ObjectId(dto.tableId);
      }
      // Calcular tiempo real de espera
      const waitTime = Math.floor(
        (entry.seatedAt.getTime() - entry.arrivalTime.getTime()) / 60000,
      );
      entry.actualWaitTime = waitTime;

      // Recalcular posiciones de las entradas restantes
      await this.recalculatePositions(tenantId);
    }

    if (dto.status === "cancelled" || dto.status === "no-show") {
      // Recalcular posiciones
      await this.recalculatePositions(tenantId);
    }

    return entry.save();
  }

  /**
   * Notificar a un cliente que su mesa está lista
   */
  async notifyCustomer(
    dto: NotifyCustomerDto,
    tenantId: string,
  ): Promise<WaitListEntry> {
    const entry = await this.findOne(dto.entryId, tenantId);

    if (entry.status !== "waiting") {
      throw new BadRequestException(
        "Can only notify customers with status 'waiting'",
      );
    }

    // TODO: Integración real con servicio de SMS/WhatsApp (Twilio, etc.)
    // Por ahora, solo actualizamos el estado
    entry.status = "notified";
    entry.notifiedAt = new Date();
    entry.notification = {
      sentAt: new Date(),
      method: dto.method,
      delivered: true, // Mock - en producción verificar con API
    };

    return entry.save();
  }

  /**
   * Sentar a un cliente desde la wait list
   */
  async seatCustomer(
    dto: SeatFromWaitListDto,
    tenantId: string,
  ): Promise<WaitListEntry> {
    const entry = await this.findOne(dto.entryId, tenantId);

    // Verificar que la mesa exista y esté disponible
    const table = await this.tableModel
      .findOne({
        _id: new Types.ObjectId(dto.tableId),
        tenantId: new Types.ObjectId(tenantId),
        status: "available",
      })
      .exec();

    if (!table) {
      throw new BadRequestException("Table not available");
    }

    // Verificar capacidad
    if (table.maxCapacity < entry.partySize) {
      throw new BadRequestException(
        `Table capacity (${table.maxCapacity}) is less than party size (${entry.partySize})`,
      );
    }

    // Actualizar mesa a ocupada
    table.status = "occupied";
    table.guestCount = entry.partySize;
    await table.save();

    // Actualizar entrada
    entry.status = "seated";
    entry.seatedAt = new Date();
    entry.tableId = new Types.ObjectId(dto.tableId);
    entry.actualWaitTime = Math.floor(
      (new Date().getTime() - entry.arrivalTime.getTime()) / 60000,
    );

    await entry.save();

    // Recalcular posiciones
    await this.recalculatePositions(tenantId);

    return entry;
  }

  /**
   * Eliminar entrada (soft delete)
   */
  async remove(id: string, tenantId: string): Promise<void> {
    const entry = await this.findOne(id, tenantId);
    entry.isDeleted = true;
    await entry.save();

    // Recalcular posiciones
    await this.recalculatePositions(tenantId);
  }

  /**
   * Obtener estadísticas de la wait list
   */
  async getStats(tenantId: string): Promise<WaitListStatsResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entries = await this.waitListModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        arrivalTime: { $gte: today },
        isDeleted: false,
      })
      .exec();

    const totalWaiting = entries.filter((e) => e.status === "waiting").length;
    const totalNotified = entries.filter((e) => e.status === "notified").length;

    // Calcular tiempo promedio de espera de las entradas ya sentadas
    const seatedEntries = entries.filter((e) => e.status === "seated");
    const averageWaitTime =
      seatedEntries.length > 0
        ? seatedEntries.reduce((sum, e) => sum + (e.actualWaitTime || 0), 0) /
          seatedEntries.length
        : 0;

    // Cola actual
    const currentQueue = entries
      .filter((e) => e.status === "waiting" || e.status === "notified")
      .sort((a, b) => a.position - b.position)
      .map((e) => ({
        position: e.position,
        customerName: e.customerName,
        partySize: e.partySize,
        arrivalTime: e.arrivalTime,
        estimatedWaitTime: e.estimatedWaitTime,
        status: e.status,
      }));

    return {
      totalWaiting,
      totalNotified,
      averageWaitTime: Math.round(averageWaitTime),
      currentQueue,
    };
  }

  /**
   * Estimar tiempo de espera para un nuevo grupo
   */
  async estimateWaitTime(
    partySize: number,
    tenantId: string,
  ): Promise<WaitTimeEstimationResponse> {
    const position = await this.getNextPosition(tenantId);
    const estimatedWaitTime = await this.calculateEstimatedWaitTime(
      tenantId,
      partySize,
      position,
    );

    // Usar promedio de rotación de mesas basado en datos históricos de wait list
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSeated = await this.waitListModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: "seated",
        seatedAt: { $gte: sevenDaysAgo },
        actualWaitTime: { $exists: true, $gt: 0 },
      })
      .exec();

    let averageTableTurnover = 60; // Default: 60 minutos
    let confidence: "low" | "medium" | "high" = "low";

    if (recentSeated.length > 50) {
      const avgWait =
        recentSeated.reduce((sum, e) => sum + (e.actualWaitTime || 0), 0) /
        recentSeated.length;
      averageTableTurnover = avgWait;
      confidence = "high";
    } else if (recentSeated.length > 20) {
      const avgWait =
        recentSeated.reduce((sum, e) => sum + (e.actualWaitTime || 0), 0) /
        recentSeated.length;
      averageTableTurnover = avgWait;
      confidence = "medium";
    }

    const partiesAhead = position - 1;

    return {
      estimatedWaitTime: Math.round(estimatedWaitTime),
      position,
      partiesAhead,
      averageTableTurnover: Math.round(averageTableTurnover),
      confidence,
    };
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Obtener la siguiente posición en la cola
   */
  private async getNextPosition(tenantId: string): Promise<number> {
    const lastEntry = await this.waitListModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        status: { $in: ["waiting", "notified"] },
        isDeleted: false,
      })
      .sort({ position: -1 })
      .exec();

    return lastEntry ? lastEntry.position + 1 : 1;
  }

  /**
   * Calcular tiempo estimado de espera
   */
  private async calculateEstimatedWaitTime(
    tenantId: string,
    partySize: number,
    position: number,
  ): Promise<number> {
    // Número de grupos adelante
    const partiesAhead = position - 1;

    if (partiesAhead === 0) {
      return 5; // Si eres el primero, espera mínima de 5 min
    }

    // Obtener promedio de tiempo de espera real de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const seatedToday = await this.waitListModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: "seated",
        seatedAt: { $gte: today },
        actualWaitTime: { $exists: true, $gt: 0 },
      })
      .exec();

    let avgWaitPerParty = 20; // Default: 20 minutos por grupo

    if (seatedToday.length > 0) {
      const totalWait = seatedToday.reduce(
        (sum, e) => sum + (e.actualWaitTime || 0),
        0,
      );
      avgWaitPerParty = totalWait / seatedToday.length;
    }

    // Estimar basado en grupos adelante
    const baseEstimate = partiesAhead * avgWaitPerParty;

    // Ajustar por tamaño del grupo (grupos más grandes tienden a esperar más)
    const sizeMultiplier = partySize > 4 ? 1.2 : 1.0;

    return Math.round(baseEstimate * sizeMultiplier);
  }

  /**
   * Recalcular posiciones después de cambios
   */
  private async recalculatePositions(tenantId: string): Promise<void> {
    const activeEntries = await this.waitListModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: { $in: ["waiting", "notified"] },
        isDeleted: false,
      })
      .sort({ arrivalTime: 1 })
      .exec();

    for (let i = 0; i < activeEntries.length; i++) {
      activeEntries[i].position = i + 1;
      await activeEntries[i].save();
    }
  }
}
