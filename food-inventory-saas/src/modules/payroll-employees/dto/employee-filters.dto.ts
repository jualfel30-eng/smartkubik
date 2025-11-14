import { PaginationDto } from "../../../dto/pagination.dto";
import { IsOptional, IsString } from "class-validator";

export class EmployeeFiltersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  structureId?: string;
}
