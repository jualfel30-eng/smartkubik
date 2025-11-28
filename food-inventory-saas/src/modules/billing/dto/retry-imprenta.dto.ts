import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsMongoId } from "class-validator";

export class RetryImprentaDto {
  @ApiProperty({ type: [String], description: "IDs de fallos a reintentar" })
  @IsArray()
  @IsMongoId({ each: true })
  failureIds: string[];
}
