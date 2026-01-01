import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Shift, ShiftDocument } from "../../schemas/shift.schema";

@Injectable()
export class ShiftsService {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
  ) { }

  async findActiveShift(
    userId: string,
    tenantId: string,
  ): Promise<ShiftDocument | null> {
    return this.shiftModel.findOne({ userId, tenantId, clockOut: null }).exec();
  }

  async createScheduledShift(tenantId: string, data: any) {
    // If frontend sends userId as employeeId, or explicitly employeeId
    const employeeId = data.employeeId || data.userId;

    // Default status to 'draft' if not provided
    const status = data.status || 'draft';

    const shift = new this.shiftModel({
      ...data,
      employeeId, // Use the correct field
      tenantId,
      status,
    });
    return shift.save();
  }

  async publishShifts(
    tenantId: string,
    shiftIds: string[],
    publisherId: string
  ): Promise<void> {
    await this.shiftModel.updateMany(
      {
        _id: { $in: shiftIds },
        tenantId,
        status: 'draft'
      },
      {
        $set: {
          status: 'published',
          publishedAt: new Date(),
          publishedBy: publisherId
        }
      }
    ).exec();
  }

  async getRosteredShifts(
    tenantId: string,
    start: Date,
    end: Date,
    userId?: string,
  ): Promise<ShiftDocument[]> {
    const query: any = {
      tenantId,
      $or: [
        { scheduledStart: { $gte: start, $lte: end } },
        { clockIn: { $gte: start, $lte: end } }
      ]
    };
    if (userId) query.userId = userId;
    return this.shiftModel.find(query)
      .populate('userId', 'name')
      .populate({
        path: 'employeeId',
        select: 'customerId position',
        populate: { path: 'customerId', select: 'name avatar email' }
      })
      .exec();
  }

  async clockIn(userId: string, tenantId: string): Promise<ShiftDocument> {
    const activeShift = await this.findActiveShift(userId, tenantId);
    if (activeShift) {
      throw new ConflictException("El usuario ya tiene un turno activo.");
    }

    // Smart Match: Find a PUBLISHED scheduled shift for today (approx +/- 12 hours)
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    const scheduledShift = await this.shiftModel.findOne({
      userId,
      tenantId,
      type: "scheduled",
      status: "published", // MUST be published to clock in
      scheduledStart: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ scheduledStart: 1 }).exec();

    if (scheduledShift) {
      // Activate this scheduled shift
      scheduledShift.clockIn = now;
      scheduledShift.status = "in-progress";
      return scheduledShift.save();
    }

    // Ad-hoc shift
    const newShift = new this.shiftModel({
      userId,
      tenantId,
      clockIn: now,
      type: "adhoc",
      status: "in-progress"
    });

    return newShift.save();
  }

  async clockOut(userId: string, tenantId: string): Promise<ShiftDocument> {
    const activeShift = await this.findActiveShift(userId, tenantId);
    if (!activeShift) {
      throw new NotFoundException(
        "No se encontró un turno activo para este usuario.",
      );
    }

    activeShift.clockOut = new Date();
    activeShift.status = "completed";

    // Calculate break duration or other logic here later
    return activeShift.save();
  }

  async getCurrentShift(
    userId: string,
    tenantId: string,
  ): Promise<ShiftDocument | null> {
    return this.findActiveShift(userId, tenantId);
  }
}
