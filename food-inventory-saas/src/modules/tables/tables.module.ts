import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TablesController } from "./tables.controller";
import { TablesService } from "./tables.service";
import { Table, TableSchema } from "../../schemas/table.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Table.name, schema: TableSchema }]),
  ],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
