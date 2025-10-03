import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ClientSession } from "mongoose";
import { Event, EventDocument } from "../../schemas/event.schema";
import { CreateEventDto, UpdateEventDto } from "../../dto/event.dto";
import { Todo, TodoDocument } from "../../schemas/todo.schema";

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Todo.name) private todoModel: Model<TodoDocument>,
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

    // Eliminar tareas relacionadas con este evento
    try {
      await this.todoModel.deleteMany({ relatedEventId: id }).exec();
    } catch (error) {
      console.error('Error deleting related todos:', error);
      // Continuar con la eliminación del evento aunque falle la eliminación de todos
    }

    // findOne ya valida tenantId, pero aseguramos la eliminación también lo haga
    await this.eventModel.deleteOne({ _id: id, tenantId: event.tenantId }).exec();
    return { deleted: true, id };
  }

  /**
   * Crea un evento automático desde una compra con fecha de pago
   */
  async createFromPurchase(
    purchaseData: {
      _id: string;
      purchaseOrderNumber: string;
      supplierName: string;
      totalAmount: number;
      paymentDueDate: Date;
    },
    user: any,
  ): Promise<{ event: EventDocument; todo: any }> {
    // Crear evento
    const eventData = {
      title: `Pago: ${purchaseData.supplierName} - ${purchaseData.purchaseOrderNumber}`,
      description: `Pago pendiente para orden de compra ${purchaseData.purchaseOrderNumber}. Monto: $${purchaseData.totalAmount}`,
      start: purchaseData.paymentDueDate,
      allDay: true,
      type: 'purchase',
      relatedPurchaseId: purchaseData._id,
      color: '#3b82f6', // Azul para compras
    };

    const event = await this.create(eventData as any, user);

    // Crear tarea vinculada
    const todoData = {
      title: `Pagar a ${purchaseData.supplierName} - OC ${purchaseData.purchaseOrderNumber}`,
      dueDate: purchaseData.paymentDueDate,
      tags: ['compras', 'pagos'],
      priority: this.calculatePriority(purchaseData.paymentDueDate),
      relatedEventId: event._id.toString(),
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const todo = await this.todoModel.create(todoData);

    return { event, todo };
  }

  /**
   * Crea un evento automático para alertas de inventario
   */
  async createFromInventoryAlert(
    alertData: {
      productName: string;
      alertType: 'low_stock' | 'expiring_soon';
      expirationDate?: Date;
      currentStock?: number;
      minimumStock?: number;
    },
    user: any,
  ): Promise<{ event: EventDocument; todo: any }> {
    const isExpiring = alertData.alertType === 'expiring_soon';
    const title = isExpiring
      ? `⚠️ ${alertData.productName} - Por vencer`
      : `📦 ${alertData.productName} - Stock bajo`;

    const description = isExpiring
      ? `Producto próximo a vencer. Fecha de vencimiento: ${alertData.expirationDate?.toLocaleDateString()}`
      : `Stock actual: ${alertData.currentStock}, Mínimo: ${alertData.minimumStock}`;

    const dueDate = isExpiring
      ? alertData.expirationDate
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días desde ahora

    const eventData = {
      title,
      description,
      start: dueDate,
      allDay: true,
      type: 'inventory',
      color: isExpiring ? '#f59e0b' : '#22c55e', // Ámbar para vencimiento, verde para stock
    };

    const event = await this.create(eventData as any, user);

    const todoData = {
      title,
      dueDate,
      tags: ['produccion'],
      priority: isExpiring ? 'high' : 'medium',
      relatedEventId: event._id.toString(),
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const todo = await this.todoModel.create(todoData);

    return { event, todo };
  }

  /**
   * Calcula la prioridad basada en la fecha de vencimiento
   */
  private calculatePriority(dueDate: Date): string {
    const now = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 3) return 'high';
    if (daysUntilDue <= 7) return 'medium';
    return 'low';
  }
}
