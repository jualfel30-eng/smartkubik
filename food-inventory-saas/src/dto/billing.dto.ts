import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import {
  BillingDocumentStatus,
  BillingDocumentType,
} from "../schemas/billing-document.schema";

export class CreateBillingDocumentDto {
  @ApiProperty({
    enum: ["invoice", "credit_note", "debit_note", "delivery_note", "quote"],
  })
  @IsEnum(["invoice", "credit_note", "debit_note", "delivery_note", "quote"])
  type: BillingDocumentType;

  @ApiProperty()
  @IsMongoId()
  seriesId: string;

  @ApiPropertyOptional({ description: "Documento original (para notas)" })
  @IsOptional()
  @IsMongoId()
  originalDocumentId?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerTaxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  customerData?: {
    address?: string;
    email?: string;
    phone?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  items?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  totals?: any;

  @ApiPropertyOptional()
  @IsOptional()
  paymentMethod?: string; // e.g. 'cash', 'card'

  @ApiPropertyOptional()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  exchangeRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  issueDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  relatedOrderId?: string;
}

export class IssueBillingDocumentDto {
  @ApiPropertyOptional({ description: "Opcional: referencia de orden" })
  @IsOptional()
  @IsString()
  orderId?: string;
}

export class UpdateBillingStatusDto {
  @ApiProperty({
    enum: [
      "draft",
      "validated",
      "sent_to_imprenta",
      "issued",
      "sent",
      "adjusted",
      "closed",
      "archived",
    ],
  })
  @IsEnum([
    "draft",
    "validated",
    "sent_to_imprenta",
    "issued",
    "sent",
    "adjusted",
    "closed",
    "archived",
  ])
  status: BillingDocumentStatus;
}
