import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  Min,
  IsMongoId,
} from 'class-validator';

export class CreateIvaWithholdingDto {
  @IsDateString()
  @IsNotEmpty()
  withholdingDate: string;

  @IsMongoId()
  @IsNotEmpty()
  supplierId: string;

  @IsString()
  @IsNotEmpty()
  supplierRif: string;

  @IsString()
  @IsNotEmpty()
  supplierName: string;

  @IsString()
  @IsOptional()
  supplierAddress?: string;

  @IsMongoId()
  @IsOptional()
  purchaseId?: string;

  @IsMongoId()
  @IsOptional()
  payableId?: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsString()
  @IsNotEmpty()
  invoiceControlNumber: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsNumber()
  @Min(0)
  baseAmount: number;

  @IsNumber()
  @Min(0)
  ivaAmount: number;

  @IsEnum([75, 100])
  withholdingPercentage: number;

  @IsEnum([
    'compra_bienes',
    'compra_servicios',
    'importacion',
    'arrendamiento',
    'honorarios_profesionales',
  ])
  operationType: string;

  @IsString()
  @IsOptional()
  observations?: string;
}

export class UpdateIvaWithholdingDto {
  @IsDateString()
  @IsOptional()
  withholdingDate?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  invoiceControlNumber?: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ivaAmount?: number;

  @IsEnum([75, 100])
  @IsOptional()
  withholdingPercentage?: number;

  @IsEnum([
    'compra_bienes',
    'compra_servicios',
    'importacion',
    'arrendamiento',
    'honorarios_profesionales',
  ])
  @IsOptional()
  operationType?: string;

  @IsString()
  @IsOptional()
  observations?: string;
}

export class AnnulWithholdingDto {
  @IsString()
  @IsNotEmpty()
  annulmentReason: string;
}
