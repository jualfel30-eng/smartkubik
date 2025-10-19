import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { KnowledgeBaseService } from "./knowledge-base.service";
import { OpenaiModule } from "../openai/openai.module";
import { VectorDbModule } from "../vector-db/vector-db.module";
import { KnowledgeBaseController } from "./knowledge-base.controller";
import {
  KnowledgeBaseDocument,
  KnowledgeBaseDocumentSchema,
} from "../../schemas/knowledge-base-document.schema";

@Module({
  imports: [
    OpenaiModule,
    VectorDbModule,
    MongooseModule.forFeature([
      { name: KnowledgeBaseDocument.name, schema: KnowledgeBaseDocumentSchema },
    ]),
  ],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
