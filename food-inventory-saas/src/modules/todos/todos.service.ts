import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CreateTodoDto, UpdateTodoDto } from "../../dto/todo.dto";
import { Todo, TodoDocument } from "../../schemas/todo.schema";
import { Event, EventDocument } from "../../schemas/event.schema";

@Injectable()
export class TodosService {
  constructor(
    @InjectModel(Todo.name) private todoModel: Model<TodoDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async create(createTodoDto: CreateTodoDto, user: any): Promise<Todo> {
    const newTodo = new this.todoModel({
      ...createTodoDto,
      createdBy: this.toObjectIdOrValue(user.sub),
      tenantId: this.normalizeTenantValue(user.tenantId),
    });
    return newTodo.save();
  }

  async findAll(tenantId: string): Promise<Todo[]> {
    return this.todoModel
      .find({ tenantId: this.buildTenantFilter(tenantId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(
    id: string,
    updateTodoDto: UpdateTodoDto,
    tenantId: string,
  ): Promise<Todo | null> {
    const tenantFilter = this.buildTenantFilter(tenantId);
    const todo = await this.todoModel.findOne({
      _id: this.toObjectIdOrValue(id),
      tenantId: tenantFilter,
    });

    if (!todo) {
      return null;
    }

    // Si se marca como completada y tiene un evento relacionado, eliminar el evento
    if (updateTodoDto.isCompleted && todo.relatedEventId) {
      try {
        await this.eventModel.findByIdAndDelete(todo.relatedEventId).exec();
      } catch (error) {
        console.error("Error deleting related event:", error);
        // Continuar con la actualización del todo aunque falle la eliminación del evento
      }
    }

    const updatedTodo = await this.todoModel
      .findOneAndUpdate(
        { _id: this.toObjectIdOrValue(id), tenantId: tenantFilter },
        updateTodoDto,
        { new: true },
      )
      .exec();

    if (updatedTodo?.relatedEventId) {
      const eventUpdate: any = {};
      if (updateTodoDto.title) {
        eventUpdate.title = updateTodoDto.title;
      }
      if (updateTodoDto.dueDate) {
        const dueDate = new Date(updateTodoDto.dueDate);
        eventUpdate.start = dueDate;
        eventUpdate.allDay = true;
        eventUpdate.end = null;
      }
      if (Object.keys(eventUpdate).length > 0) {
        try {
          await this.eventModel.findOneAndUpdate(
            {
              _id: this.toObjectIdOrValue(updatedTodo.relatedEventId),
              tenantId: tenantFilter,
            },
            eventUpdate,
          );
        } catch (error) {
          console.error("Error syncing event from todo update:", error);
        }
      }
    }

    return updatedTodo;
  }

  async remove(id: string, tenantId: string): Promise<any> {
    // Validar que el todo existe y pertenece al tenant antes de eliminar
    const tenantFilter = this.buildTenantFilter(tenantId);
    const todo = await this.todoModel.findOne({
      _id: this.toObjectIdOrValue(id),
      tenantId: tenantFilter,
    });
    if (!todo) {
      throw new NotFoundException(
        `Todo con ID "${id}" no encontrado o no tiene permisos para eliminarlo`,
      );
    }

    if (todo.relatedEventId) {
      try {
        await this.eventModel.findOneAndDelete({
          _id: this.toObjectIdOrValue(todo.relatedEventId),
          tenantId: tenantFilter,
        });
      } catch (error) {
        console.error("Error deleting related event from todo removal:", error);
      }
    }

    return this.todoModel
      .findOneAndDelete({
        _id: this.toObjectIdOrValue(id),
        tenantId: tenantFilter,
      })
      .exec();
  }

  private toObjectIdOrValue(id: string | Types.ObjectId) {
    if (id instanceof Types.ObjectId) {
      return id;
    }
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
  }

  private normalizeTenantValue(tenantId: string | Types.ObjectId) {
    const maybeObjectId = this.toObjectIdOrValue(tenantId);
    return maybeObjectId;
  }

  private buildTenantFilter(tenantId: string | Types.ObjectId) {
    const maybeObjectId = this.toObjectIdOrValue(tenantId);
    if (maybeObjectId instanceof Types.ObjectId) {
      return { $in: [maybeObjectId, maybeObjectId.toHexString()] };
    }
    return tenantId;
  }
}
