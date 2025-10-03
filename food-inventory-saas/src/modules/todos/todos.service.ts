
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTodoDto, UpdateTodoDto } from '../../dto/todo.dto';
import { Todo, TodoDocument } from '../../schemas/todo.schema';
import { Event, EventDocument } from '../../schemas/event.schema';

@Injectable()
export class TodosService {
  constructor(
    @InjectModel(Todo.name) private todoModel: Model<TodoDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async create(createTodoDto: CreateTodoDto, user: any): Promise<Todo> {
    const newTodo = new this.todoModel({
      ...createTodoDto,
      createdBy: new Types.ObjectId(user.sub),
      tenantId: new Types.ObjectId(user.tenantId),
    });
    return newTodo.save();
  }

  async findAll(tenantId: string): Promise<Todo[]> {
    return this.todoModel.find({ tenantId }).sort({ createdAt: -1 }).exec();
  }

  async update(id: string, updateTodoDto: UpdateTodoDto, tenantId: string): Promise<Todo | null> {
    const todo = await this.todoModel.findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) });

    if (!todo) {
      return null;
    }

    // Si se marca como completada y tiene un evento relacionado, eliminar el evento
    if (updateTodoDto.isCompleted && todo.relatedEventId) {
      try {
        await this.eventModel.findByIdAndDelete(todo.relatedEventId).exec();
      } catch (error) {
        console.error('Error deleting related event:', error);
        // Continuar con la actualización del todo aunque falle la eliminación del evento
      }
    }

    return this.todoModel.findOneAndUpdate({ _id: id, tenantId: new Types.ObjectId(tenantId) }, updateTodoDto, { new: true }).exec();
  }

  async remove(id: string, tenantId: string): Promise<any> {
    // Validar que el todo existe y pertenece al tenant antes de eliminar
    const todo = await this.todoModel.findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) });
    if (!todo) {
      throw new NotFoundException(`Todo con ID "${id}" no encontrado o no tiene permisos para eliminarlo`);
    }

    return this.todoModel.findOneAndDelete({ _id: id, tenantId: new Types.ObjectId(tenantId) }).exec();
  }
}
