import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Table } from "../../schemas/table.schema";
import {
  CreateTableDto,
  UpdateTableDto,
  SeatGuestsDto,
  TransferTableDto,
  CombineTablesDto,
} from "../../dto/table.dto";

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);

  constructor(
    @InjectModel(Table.name)
    private tableModel: Model<Table>,
  ) { }

  async create(dto: CreateTableDto, tenantId: string): Promise<Table> {
    // Validar que no exista una mesa con el mismo número en el mismo tenant
    const existing = await this.tableModel
      .findOne({
        tenantId,
        tableNumber: dto.tableNumber,
        isDeleted: false,
      })
      .exec();

    if (existing) {
      throw new BadRequestException(`Table ${dto.tableNumber} already exists`);
    }

    const table = new this.tableModel({
      ...dto,
      tenantId,
      status: "available",
      isDeleted: false,
    });

    this.logger.log(`Created table ${dto.tableNumber} for tenant ${tenantId}`);
    return table.save();
  }

  async findAll(tenantId: string): Promise<Table[]> {
    return this.tableModel
      .find({ tenantId, isDeleted: false })
      .populate("assignedServerId")
      .populate("currentOrderId")
      .sort({ section: 1, tableNumber: 1 })
      .exec();
  }

  async findBySection(section: string, tenantId: string): Promise<Table[]> {
    return this.tableModel
      .find({ tenantId, section, isDeleted: false })
      .populate("assignedServerId")
      .sort({ tableNumber: 1 })
      .exec();
  }

  async findAvailable(tenantId: string): Promise<Table[]> {
    return this.tableModel
      .find({ tenantId, status: "available", isDeleted: false })
      .sort({ section: 1, tableNumber: 1 })
      .exec();
  }

  async seatGuests(dto: SeatGuestsDto, tenantId: string): Promise<Table> {
    const table = await this.tableModel
      .findOne({ _id: dto.tableId, tenantId, isDeleted: false })
      .exec();

    if (!table) {
      throw new NotFoundException(`Table not found`);
    }

    if (table.status !== "available") {
      throw new BadRequestException(`Table is not available`);
    }

    if (dto.guestCount < table.minCapacity) {
      throw new BadRequestException(
        `Guest count must be at least ${table.minCapacity}`,
      );
    }

    if (dto.guestCount > table.maxCapacity) {
      throw new BadRequestException(
        `Guest count cannot exceed ${table.maxCapacity}`,
      );
    }

    table.status = "occupied";
    table.guestCount = dto.guestCount;
    table.seatedAt = new Date();

    if (dto.serverId) {
      table.assignedServerId = new Types.ObjectId(dto.serverId);
    }

    await table.save();

    this.logger.log(
      `Seated ${dto.guestCount} guests at table ${table.tableNumber}`,
    );
    return table;
  }

  async clearTable(id: string, tenantId: string): Promise<Table> {
    const table = await this.tableModel
      .findOne({ _id: id, tenantId, isDeleted: false })
      .exec();

    if (!table) {
      throw new NotFoundException(`Table not found`);
    }

    table.status = "cleaning";
    table.guestCount = 0;
    table.currentOrderId = undefined;
    table.seatedAt = undefined;

    await table.save();

    // Auto-set to available after 5 minutes
    setTimeout(
      async () => {
        const stillCleaning = await this.tableModel
          .findOne({ _id: id, status: "cleaning" })
          .exec();

        if (stillCleaning) {
          stillCleaning.status = "available";
          await stillCleaning.save();
          this.logger.log(`Auto-set table ${table.tableNumber} to available`);
        }
      },
      5 * 60 * 1000,
    );

    this.logger.log(`Cleared table ${table.tableNumber}`);
    return table;
  }

  async markAvailable(id: string, tenantId: string): Promise<Table> {
    const table = await this.tableModel
      .findOne({ _id: id, tenantId, isDeleted: false })
      .exec();

    if (!table) {
      throw new NotFoundException(`Table not found`);
    }

    // Allow transition from cleaning or occupied (manual override)
    table.status = "available";
    table.guestCount = 0;
    table.currentOrderId = undefined;
    table.seatedAt = undefined;

    await table.save();

    this.logger.log(`Manually set table ${table.tableNumber} to available`);
    return table;
  }

  async transferTable(dto: TransferTableDto, tenantId: string): Promise<Table> {
    const fromTable = await this.tableModel
      .findOne({ _id: dto.fromTableId, tenantId, isDeleted: false })
      .exec();

    const toTable = await this.tableModel
      .findOne({ _id: dto.toTableId, tenantId, isDeleted: false })
      .exec();

    if (!fromTable || !toTable) {
      throw new NotFoundException(`One or both tables not found`);
    }

    if (fromTable.status !== "occupied") {
      throw new BadRequestException(`Source table is not occupied`);
    }

    if (toTable.status !== "available") {
      throw new BadRequestException(`Destination table is not available`);
    }

    // Transfer data
    toTable.status = "occupied";
    toTable.guestCount = fromTable.guestCount;
    toTable.currentOrderId = fromTable.currentOrderId;
    toTable.seatedAt = fromTable.seatedAt;
    toTable.assignedServerId = fromTable.assignedServerId;

    // Clear source table
    fromTable.status = "available";
    fromTable.guestCount = 0;
    fromTable.currentOrderId = undefined;
    fromTable.seatedAt = undefined;

    await fromTable.save();
    await toTable.save();

    this.logger.log(
      `Transferred guests from table ${fromTable.tableNumber} to ${toTable.tableNumber}`,
    );
    return toTable;
  }

  async combineTables(
    dto: CombineTablesDto,
    tenantId: string,
  ): Promise<Table[]> {
    const tables = await this.tableModel
      .find({
        _id: { $in: dto.tableIds },
        tenantId,
        isDeleted: false,
      })
      .exec();

    if (tables.length !== dto.tableIds.length) {
      throw new NotFoundException(`Some tables not found`);
    }

    // Validate all tables are available
    const notAvailable = tables.filter((t) => t.status !== "available");
    if (notAvailable.length > 0) {
      throw new BadRequestException(`All tables must be available to combine`);
    }

    const parentTable = tables.find(
      (t) => t._id.toString() === dto.parentTableId,
    );

    if (!parentTable) {
      throw new NotFoundException(`Parent table not found`);
    }

    // Update parent
    parentTable.combinesWith = dto.tableIds
      .filter((id: string) => id !== dto.parentTableId)
      .map((id: string) => new Types.ObjectId(id));

    // Update children
    for (const table of tables) {
      if (table._id.toString() !== dto.parentTableId) {
        table.combinedWithParent = parentTable._id;
        table.status = "occupied"; // Mark as occupied
        await table.save();
      }
    }

    await parentTable.save();

    this.logger.log(`Combined ${tables.length} tables`);
    return tables;
  }

  async getFloorPlan(tenantId: string): Promise<any> {
    const tables = await this.findAll(tenantId);

    // Group by section
    const sections = tables.reduce(
      (acc, table) => {
        if (!acc[table.section]) {
          acc[table.section] = [];
        }
        acc[table.section].push(table);
        return acc;
      },
      {} as Record<string, Table[]>,
    );

    // Calculate statistics
    const totalTables = tables.length;
    const availableTables = tables.filter(
      (t) => t.status === "available",
    ).length;
    const occupiedTables = tables.filter((t) => t.status === "occupied").length;
    const occupancyRate =
      totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;

    return {
      sections: Object.keys(sections).map((section) => ({
        section,
        tables: sections[section],
      })),
      totalTables,
      availableTables,
      occupiedTables,
      occupancyRate,
    };
  }

  async update(
    id: string,
    dto: UpdateTableDto,
    tenantId: string,
  ): Promise<Table> {
    const table = await this.tableModel
      .findOneAndUpdate(
        { _id: id, tenantId, isDeleted: false },
        { $set: dto },
        { new: true },
      )
      .exec();

    if (!table) {
      throw new NotFoundException(`Table not found`);
    }

    this.logger.log(`Updated table ${table.tableNumber}`);
    return table;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const table = await this.tableModel
      .findOneAndUpdate(
        { _id: id, tenantId, isDeleted: false },
        { $set: { isDeleted: true } },
      )
      .exec();

    if (!table) {
      throw new NotFoundException(`Table not found`);
    }

    this.logger.log(`Deleted table ${table.tableNumber}`);
  }
}
