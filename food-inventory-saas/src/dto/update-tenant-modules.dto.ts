import { IsObject, IsOptional } from "class-validator";

export class UpdateTenantModulesDto {
  @IsOptional()
  @IsObject()
  enabledModules?: Record<string, boolean>;
}
