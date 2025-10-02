import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ClientSession } from "mongoose";
import { Event, EventDocument } from "../../schemas/event.schema";
import { CreateEventDto, UpdateEventDto } from "../../dto/event.dto";

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async create(
    createEventDto: CreateEventDto,
    user: any,
    session?: ClientSession,
  ): Promise<EventDocument> {
    const eventData = {
      ...createEventDto,
      createdBy: user.id,
      tenantId: user.tenantId,
    };
    const createdEvent = new this.eventModel(eventData);
    return createdEvent.save({ session });
  }

  async findAll(
    user: any,
    startDate?: string,
    endDate?: string,
  ): Promise<EventDocument[]> {
    const query: any = { tenantId: user.tenantId };
    if (startDate && endDate) {
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);

      query.$or = [
        {
          // Case 1: Event has an end date and overlaps with the range
          $and: [
            { end: { $exists: true, $ne: null } },
            { start: { $lt: rangeEnd } },
            { end: { $gt: rangeStart } },
          ],
        },
        {
          // Case 2: Event has no end date (point in time) and is within the range
          $and: [
            { $or: [{ end: { $exists: false } }, { end: null }] },
            { start: { $gte: rangeStart, $lt: rangeEnd } },
          ],
        },
      ];
    }
    return this.eventModel.find(query).exec();
  }

  async findOne(id: string, user: any): Promise<EventDocument> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) {
      throw new NotFoundException(`Evento con ID "${id}" no encontrado.`);
    }
    if (event.tenantId.toString() !== user.tenantId) {
      throw new ForbiddenException(
        "No tienes permiso para acceder a este evento.",
      );
    }
    return event;
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    user: any,
  ): Promise<EventDocument> {
    const existingEvent = await this.findOne(id, user);

    Object.assign(existingEvent, updateEventDto);

    return existingEvent.save();
  }

  async remove(
    id: string,
    user: any,
  ): Promise<{ deleted: boolean; id: string }> {
    // Validar propiedad antes de eliminar
    const event = await this.findOne(id, user);

    // findOne ya valida tenantId, pero aseguramos la eliminación también lo haga
    await this.eventModel.deleteOne({ _id: id, tenantId: event.tenantId }).exec();
    return { deleted: true, id };
  }
}
