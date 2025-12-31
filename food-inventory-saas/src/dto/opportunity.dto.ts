import {
  IsArray,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  IsEnum,
  ValidateNested,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OpportunityPipeline } from "../schemas/opportunity.schema";

const STAGE_PROBABILITIES: Record<string, number> = {
  Prospecto: 0,
  Contactado: 5,
  Calificado: 15,
  "Demo/Discovery": 30,
  Propuesta: 50,
  Negociación: 70,
  "Cierre ganado": 100,
  "Cierre perdido": 0,
};

export const REQUIRED_FIELDS_BY_STAGE: Record<string, string[]> = {
  Prospecto: ["nextStep", "nextStepDue"],
  Contactado: ["nextStep", "nextStepDue"],
  Calificado: ["nextStep", "nextStepDue", "painNeed", "budgetFit", "decisionMaker", "timeline"],
  "Demo/Discovery": ["nextStep", "nextStepDue", "stakeholders", "useCases", "risks"],
  Propuesta: ["nextStep", "nextStepDue", "amount", "currency", "expectedCloseDate", "competitor"],
  Negociación: [
    "nextStep",
    "nextStepDue",
    "amount",
    "currency",
    "expectedCloseDate",
    "razonesBloqueo",
    "requisitosLegales",
  ],
  "Cierre ganado": ["nextStep", "nextStepDue", "amount", "currency"],
  "Cierre perdido": ["reasonLost"],
};

export const defaultProbabilityForStage = (stage: string) =>
  STAGE_PROBABILITIES[stage] ?? 0;

function IsNextStepWithin(limitDays: number, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "isNextStepWithin",
      target: object.constructor,
      propertyName,
      constraints: [limitDays],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          const limit = args.constraints[0] as number;
          const due = new Date(value);
          if (Number.isNaN(due.getTime())) return false;
          const now = new Date();
          const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= limit;
        },
        defaultMessage(args: ValidationArguments) {
          return `nextStepDue debe ser en ${args.constraints[0]} días o menos`;
        },
      },
    });
  };
}

export class CreateOpportunityDto {
  @ApiProperty({ description: "Nombre de la oportunidad" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name: string;

  @ApiProperty({
    description: "Embudo",
    enum: OpportunityPipeline,
    default: OpportunityPipeline.NEW_BUSINESS,
  })
  @IsEnum(OpportunityPipeline)
  pipeline: OpportunityPipeline = OpportunityPipeline.NEW_BUSINESS;

  @ApiProperty({
    description: "Etapa inicial",
    default: "Prospecto",
  })
  @IsString()
  @IsNotEmpty()
  stage: string = "Prospecto";

  @ApiPropertyOptional({ description: "Monto estimado" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: "Moneda", default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: "Fecha estimada de cierre" })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @ApiPropertyOptional({ description: "Competidor principal" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  competitor?: string;

  @ApiPropertyOptional({ description: "Razones de bloqueo" })
  @IsOptional()
  @IsArray()
  razonesBloqueo?: string[];

  @ApiPropertyOptional({ description: "Requisitos legales" })
  @IsOptional()
  @IsArray()
  requisitosLegales?: string[];

  @ApiPropertyOptional({ description: "Reason lost" })
  @IsOptional()
  @IsString()
  reasonLost?: string;

  @ApiProperty({ description: "Próximo paso" })
  @IsString()
  @IsNotEmpty()
  nextStep: string;

  @ApiProperty({ description: "Fecha límite del próximo paso (≤14 días)" })
  @IsDateString()
  @IsNotEmpty()
  @IsNextStepWithin(14)
  nextStepDue: string;

  @ApiProperty({ description: "Cliente asociado (Contact/Account)" })
  @IsMongoId()
  customerId: string;

  @ApiPropertyOptional({ description: "Owner (usuario asignado)" })
  @IsOptional()
  @IsMongoId()
  ownerId?: string;

  @ApiPropertyOptional({ description: "Territorio" })
  @IsOptional()
  @IsString()
  territory?: string;

  @ApiPropertyOptional({ description: "Fuente" })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: "UTM source" })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional({ description: "UTM medium" })
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiPropertyOptional({ description: "UTM campaign" })
  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @ApiPropertyOptional({ description: "UTM term" })
  @IsOptional()
  @IsString()
  utmTerm?: string;

  @ApiPropertyOptional({ description: "UTM content" })
  @IsOptional()
  @IsString()
  utmContent?: string;

  @ApiPropertyOptional({ description: "Lead score" })
  @IsOptional()
  @IsNumber()
  leadScore?: number;

  @ApiPropertyOptional({ description: "Intent score" })
  @IsOptional()
  @IsNumber()
  intentScore?: number;

  @ApiPropertyOptional({ description: "Desglose de scoring" })
  @IsOptional()
  scoringBreakdown?: Record<string, any>;

  @ApiPropertyOptional({ description: "Datos de calificación" })
  @IsOptional()
  @IsString()
  painNeed?: string;

  @ApiPropertyOptional({ description: "Budget fit" })
  @IsOptional()
  @IsString()
  budgetFit?: string;

  @ApiPropertyOptional({ description: "Decision maker" })
  @IsOptional()
  @IsString()
  decisionMaker?: string;

  @ApiPropertyOptional({ description: "Timeline" })
  @IsOptional()
  @IsString()
  timeline?: string;

  @ApiPropertyOptional({ description: "Stakeholders" })
  @IsOptional()
  @IsArray()
  stakeholders?: string[];

  @ApiPropertyOptional({ description: "Use cases" })
  @IsOptional()
  @IsArray()
  useCases?: string[];

  @ApiPropertyOptional({ description: "Riesgos" })
  @IsOptional()
  @IsArray()
  risks?: string[];
}

export class UpdateOpportunityDto {
  @ApiPropertyOptional({ description: "Nombre de la oportunidad" })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  name?: string;

  @ApiPropertyOptional({ description: "Monto estimado" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: "Moneda" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: "Fecha estimada de cierre" })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @ApiPropertyOptional({ description: "Próximo paso" })
  @IsOptional()
  @IsString()
  nextStep?: string;

  @ApiPropertyOptional({ description: "Fecha del próximo paso (≤14 días)" })
  @IsOptional()
  @IsDateString()
  @IsNextStepWithin(14)
  nextStepDue?: string;

  @ApiPropertyOptional({ description: "Owner" })
  @IsOptional()
  @IsMongoId()
  ownerId?: string;

  @ApiPropertyOptional({ description: "Territorio" })
  @IsOptional()
  @IsString()
  territory?: string;
}

export class ChangeStageDto {
  @ApiProperty({ description: "Nueva etapa" })
  @IsString()
  @IsNotEmpty()
  stage: string;

  @ApiPropertyOptional({ description: "Reason lost (solo en cierre perdido)" })
  @ValidateIf((o) => o.stage === "Cierre perdido")
  @IsString()
  @IsNotEmpty()
  reasonLost?: string;

  @ApiPropertyOptional({ description: "Competidor" })
  @IsOptional()
  @IsString()
  competitor?: string;

  @ApiPropertyOptional({ description: "Monto (Propuesta/Negociación/Ganado)" })
  @ValidateIf((o) =>
    ["Propuesta", "Negociación", "Cierre ganado"].includes(o.stage),
  )
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: "Moneda" })
  @ValidateIf((o) =>
    ["Propuesta", "Negociación", "Cierre ganado"].includes(o.stage),
  )
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: "Fecha estimada de cierre" })
  @ValidateIf((o) =>
    ["Propuesta", "Negociación", "Cierre ganado"].includes(o.stage),
  )
  @IsDateString()
  expectedCloseDate?: string;

  @ApiPropertyOptional({ description: "Próximo paso" })
  @IsOptional()
  @IsString()
  nextStep?: string;

  @ApiPropertyOptional({ description: "Fecha del próximo paso (≤14 días)" })
  @IsOptional()
  @IsDateString()
  @IsNextStepWithin(14)
  nextStepDue?: string;

  @ApiPropertyOptional({ description: "Estado MQL", enum: ["pending", "accepted", "rejected"] })
  @IsOptional()
  @IsString()
  @IsIn(["pending", "accepted", "rejected"])
  mqlStatus?: string;

  @ApiPropertyOptional({ description: "Mensaje origen (id del canal)" })
  @IsOptional()
  @IsString()
  messageId?: string;

  @ApiPropertyOptional({ description: "Thread/conversación" })
  @IsOptional()
  @IsString()
  threadId?: string;

  @ApiPropertyOptional({ description: "Canal (whatsapp, email, chat)" })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ description: "Idioma detectado" })
  @IsOptional()
  @IsString()
  language?: string;

  probability?: number;
}

export class BulkCaptureDto {
  @ApiProperty({
    description: "Fuente de captura",
    enum: ["csv", "ads", "linkedin", "chat", "whatsapp", "email", "api", "other"],
    default: "csv",
  })
  @IsString()
  @IsIn(["csv", "ads", "linkedin", "chat", "whatsapp", "email", "api", "other"])
  sourceType: string = "csv";

  @ApiProperty({
    description: "Registros a importar (CreateOpportunityDto)",
    type: [CreateOpportunityDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOpportunityDto)
  records: CreateOpportunityDto[];
}

export class OpportunityQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: "Etapa" })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({ enum: OpportunityPipeline })
  @IsOptional()
  @IsEnum(OpportunityPipeline)
  pipeline?: OpportunityPipeline;

  @ApiPropertyOptional({ description: "Owner" })
  @IsOptional()
  @IsMongoId()
  ownerId?: string;

  @ApiPropertyOptional({ description: "Territorio" })
  @IsOptional()
  @IsString()
  territory?: string;

  @ApiPropertyOptional({ description: "Texto de búsqueda" })
  @IsOptional()
  @IsString()
  search?: string;
}

export const OPPORTUNITY_STAGE_PROBABILITIES = STAGE_PROBABILITIES;

export class MqlDecisionDto {
  @ApiProperty({ description: "Estado MQL", enum: ["accepted", "rejected"] })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: "Razón (si se rechaza)" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SqlDecisionDto {
  @ApiProperty({ description: "Estado SQL", enum: ["accepted", "rejected"] })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: "Razón (si se rechaza)" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class LinkDocumentDto {
  @ApiProperty({ description: "ID del documento (BillingDocument)" })
  @IsMongoId()
  documentId: string;

  @ApiProperty({ description: "Tipo de documento", enum: ["quote", "invoice"] })
  @IsString()
  @IsIn(["quote", "invoice"])
  type: "quote" | "invoice";
}
