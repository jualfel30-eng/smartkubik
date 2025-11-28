import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
  IsUrl,
  IsPhoneNumber,
  ArrayMinSize,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import {
  TemplateHeader,
  TemplateBody,
  TemplateFooter,
  TemplateButton,
} from "../schemas/whatsapp-template.schema";

// ==================== Template DTOs ====================

export class CreateTemplateHeaderDto implements TemplateHeader {
  @IsEnum(["text", "image", "video", "document"])
  type: "text" | "image" | "video" | "document";

  @IsOptional()
  @IsString()
  @MaxLength(60)
  content?: string;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  example?: string[];
}

export class CreateTemplateBodyDto implements TemplateBody {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  text: string;

  @IsOptional()
  @IsArray()
  examples?: string[][];
}

export class CreateTemplateFooterDto implements TemplateFooter {
  @IsString()
  @MaxLength(60)
  text: string;
}

export class CreateTemplateButtonDto implements TemplateButton {
  @IsEnum(["quick_reply", "url", "phone_number"])
  type: "quick_reply" | "url" | "phone_number";

  @IsString()
  @MaxLength(25)
  text: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  example?: string[];
}

export class CreateWhatsAppTemplateDto {
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message: "Name must be lowercase with underscores only",
  })
  @MinLength(1)
  @MaxLength(512)
  name: string;

  @IsString()
  @MinLength(1)
  displayName: string;

  @IsEnum(["marketing", "utility", "authentication"])
  category: "marketing" | "utility" | "authentication";

  @IsString()
  @IsOptional()
  language?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTemplateHeaderDto)
  header?: CreateTemplateHeaderDto;

  @ValidateNested()
  @Type(() => CreateTemplateBodyDto)
  body: CreateTemplateBodyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTemplateFooterDto)
  footer?: CreateTemplateFooterDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateButtonDto)
  buttons?: CreateTemplateButtonDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateWhatsAppTemplateDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SubmitTemplateForApprovalDto {
  @IsArray()
  @IsString({ each: true })
  templateIds: string[];
}

export class GetWhatsAppTemplatesQueryDto {
  @IsOptional()
  @IsEnum(["draft", "pending", "approved", "rejected"])
  status?: "draft" | "pending" | "approved" | "rejected";

  @IsOptional()
  @IsEnum(["marketing", "utility", "authentication"])
  category?: "marketing" | "utility" | "authentication";

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;
}

// ==================== Message Sending DTOs ====================

export class SendTemplateMessageDto {
  @IsString()
  templateId: string; // Our internal template ID

  @IsString()
  @IsPhoneNumber()
  to: string; // Recipient phone number in international format

  @IsOptional()
  @IsString()
  customerId?: string; // Link to customer for tracking

  @IsOptional()
  @IsString()
  campaignId?: string; // Link to campaign for tracking

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  headerParams?: string[]; // Values for header variables

  @IsArray()
  @IsString({ each: true })
  bodyParams: string[]; // Values for body variables {{1}}, {{2}}, etc.

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  buttonParams?: string[]; // Values for button URL variables

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ==================== Interactive Message DTOs ====================

export class InteractiveButton {
  @IsString()
  id: string;

  @IsString()
  @MaxLength(20)
  title: string;
}

export class InteractiveListSection {
  @IsString()
  @MaxLength(24)
  title: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InteractiveListRow)
  rows: InteractiveListRow[];
}

export class InteractiveListRow {
  @IsString()
  id: string;

  @IsString()
  @MaxLength(24)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(72)
  description?: string;
}

export class SendInteractiveButtonMessageDto {
  @IsString()
  @IsPhoneNumber()
  to: string;

  @IsString()
  @MaxLength(1024)
  bodyText: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  headerText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  footerText?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InteractiveButton)
  @ArrayMinSize(1)
  buttons: InteractiveButton[];

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SendInteractiveListMessageDto {
  @IsString()
  @IsPhoneNumber()
  to: string;

  @IsString()
  @MaxLength(1024)
  bodyText: string;

  @IsString()
  @MaxLength(20)
  buttonText: string; // Text for the list button

  @IsOptional()
  @IsString()
  @MaxLength(60)
  headerText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  footerText?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InteractiveListSection)
  @ArrayMinSize(1)
  sections: InteractiveListSection[];

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ==================== Media Message DTOs ====================

export class SendMediaMessageDto {
  @IsString()
  @IsPhoneNumber()
  to: string;

  @IsEnum(["image", "video", "document", "audio"])
  mediaType: "image" | "video" | "document" | "audio";

  @IsUrl()
  mediaUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string; // For images and videos

  @IsOptional()
  @IsString()
  filename?: string; // For documents

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ==================== Webhook DTOs ====================

export class WhatsAppStatusUpdateDto {
  @IsString()
  messageId: string; // WhatsApp message ID

  @IsEnum(["sent", "delivered", "read", "failed"])
  status: "sent" | "delivered" | "read" | "failed";

  @IsOptional()
  @IsString()
  errorCode?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class WhatsAppIncomingMessageDto {
  @IsString()
  from: string; // Sender phone number

  @IsString()
  messageId: string;

  @IsEnum(["text", "image", "video", "document", "audio", "button", "list"])
  type: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  buttonId?: string; // For button replies

  @IsOptional()
  @IsString()
  listId?: string; // For list replies

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ==================== Bulk Send DTOs ====================

export class BulkSendWhatsAppDto {
  @IsString()
  templateId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkRecipient)
  @ArrayMinSize(1)
  recipients: BulkRecipient[];

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  rateLimit?: number; // Messages per second (default: 10)
}

export class BulkRecipient {
  @IsString()
  @IsPhoneNumber()
  to: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  headerParams?: string[];

  @IsArray()
  @IsString({ each: true })
  bodyParams: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  buttonParams?: string[];
}
