import {
  IsString,
  IsEmail,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from "class-validator";

export class ConnectResendDto {
  @IsString()
  apiKey: string;

  @IsEmail()
  fromEmail: string;
}

export class ConnectSmtpDto {
  @IsString()
  host: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @IsBoolean()
  secure: boolean;

  @IsString()
  user: string;

  @IsString()
  pass: string;

  @IsString()
  from: string;

  @IsOptional()
  @IsEmail()
  replyTo?: string;
}

export class TestEmailConfigDto {
  @IsEmail()
  testEmail: string;
}

export class DisconnectEmailDto {
  @IsEnum(["gmail", "outlook", "resend", "smtp"])
  provider: "gmail" | "outlook" | "resend" | "smtp";
}

export class GetEmailConfigResponseDto {
  provider: "none" | "gmail" | "outlook" | "resend" | "smtp";
  enabled: boolean;
  connectedEmail?: string;
  fromEmail?: string;
}

export class HandleOAuthCallbackDto {
  @IsString()
  code: string;

  @IsString()
  state: string; // tenantId encrypted
}
