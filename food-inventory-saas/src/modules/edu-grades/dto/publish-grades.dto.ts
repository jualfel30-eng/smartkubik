import { IsArray, IsMongoId, IsNotEmpty, IsString, ArrayMinSize } from "class-validator";

export class PublishGradesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  gradeIds: string[];

  @IsMongoId()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsNotEmpty()
  period: string;
}
