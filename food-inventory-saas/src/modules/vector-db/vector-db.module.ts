import { Module, forwardRef } from "@nestjs/common";
import { VectorDbService } from "./vector-db.service";
import { OpenaiModule } from "../openai/openai.module";
import { SuperAdminModule } from "../super-admin/super-admin.module";

@Module({
  imports: [OpenaiModule, forwardRef(() => SuperAdminModule)],
  providers: [VectorDbService],
  exports: [VectorDbService],
})
export class VectorDbModule {}
