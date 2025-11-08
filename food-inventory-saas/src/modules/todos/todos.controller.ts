import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  NotFoundException,
  HttpCode,
  Query,
} from "@nestjs/common";
import { TodosService } from "./todos.service";
import {
  CreateTodoDto,
  TodoFilterDto,
  UpdateTodoDto,
} from "../../dto/todo.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("todos")
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Post()
  create(@Body() createTodoDto: CreateTodoDto, @Req() req) {
    return this.todosService.create(createTodoDto, req.user);
  }

  @Get()
  findAll(@Req() req, @Query() filters: TodoFilterDto) {
    return this.todosService.findAll(req.user.tenantId, filters);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateTodoDto: UpdateTodoDto,
    @Req() req,
  ) {
    const updatedTodo = await this.todosService.update(
      id,
      updateTodoDto,
      req.user.tenantId,
    );
    if (!updatedTodo) {
      throw new NotFoundException(`Todo with ID ${id} not found`);
    }
    return updatedTodo;
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @Req() req) {
    const result = await this.todosService.remove(id, req.user.tenantId);
    if (!result || result.deletedCount === 0) {
      throw new NotFoundException(`Todo with ID ${id} not found`);
    }
  }
}
