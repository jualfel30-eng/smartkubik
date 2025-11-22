import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { WaitListController } from "./wait-list.controller";
import { WaitListService } from "./wait-list.service";
import {
  WaitListEntry,
  WaitListEntrySchema,
} from "../../schemas/wait-list-entry.schema";
import { Table, TableSchema } from "../../schemas/table.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WaitListEntry.name, schema: WaitListEntrySchema },
      { name: Table.name, schema: TableSchema },
    ]),
  ],
  controllers: [WaitListController],
  providers: [WaitListService],
  exports: [WaitListService],
})
export class WaitListModule {}
