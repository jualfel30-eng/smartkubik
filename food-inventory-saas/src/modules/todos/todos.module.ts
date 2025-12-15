import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TodosService } from "./todos.service";
import { TodosController } from "./todos.controller";
import { Todo, TodoSchema } from "../../schemas/todo.schema";
import { Event, EventSchema } from "../../schemas/event.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Todo.name, schema: TodoSchema },
      { name: Event.name, schema: EventSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [TodosController],
  providers: [TodosService],
  exports: [TodosService],
})
export class TodosModule {}
