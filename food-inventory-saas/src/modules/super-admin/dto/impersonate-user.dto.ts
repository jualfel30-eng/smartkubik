import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ImpersonateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
