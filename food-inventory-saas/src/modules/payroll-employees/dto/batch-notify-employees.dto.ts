import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
} from "class-validator";
import { NotificationChannel } from "../../notifications/notifications.service";

const SUPPORTED_CHANNELS: NotificationChannel[] = [
  "email",
  "sms",
  "whatsapp",
];

export class BatchNotifyEmployeesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  employeeIds: string[];

  @IsString()
  templateId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(SUPPORTED_CHANNELS, { each: true })
  channels: NotificationChannel[];

  @IsOptional()
  context?: Record<string, any>;

  @IsOptional()
  @IsString()
  language?: string;
}
