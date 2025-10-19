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
  ) {}

  async findActiveShift(
    userId: string,
    tenantId: string,
  ): Promise<ShiftDocument | null> {
    return this.shiftModel.findOne({ userId, tenantId, clockOut: null }).exec();
  }

  async clockIn(userId: string, tenantId: string): Promise<ShiftDocument> {
    const activeShift = await this.findActiveShift(userId, tenantId);
    if (activeShift) {
      throw new ConflictException("El usuario ya tiene un turno activo.");
    }

    const newShift = new this.shiftModel({
      userId,
      tenantId,
      clockIn: new Date(),
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
    return activeShift.save();
  }

  async getCurrentShift(
    userId: string,
    tenantId: string,
  ): Promise<ShiftDocument | null> {
    return this.findActiveShift(userId, tenantId);
  }
}
