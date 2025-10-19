import { Module, forwardRef } from "@nestjs/common";
import { OpenaiService } from "./openai.service";
import { SuperAdminModule } from "../super-admin/super-admin.module";

@Module({
  imports: [forwardRef(() => SuperAdminModule)], // It needs access to SuperAdminService
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
