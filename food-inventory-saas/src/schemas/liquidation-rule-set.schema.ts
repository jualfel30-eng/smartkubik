import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type LiquidationRuleSetDocument = LiquidationRuleSet & Document;

@Schema({ _id: false })
export class LiquidationContributionRate {
  @Prop({ type: Number, default: 0 })
  employer?: number;

  @Prop({ type: Number, default: 0 })
  employee?: number;
}
const ContributionRateSchema = SchemaFactory.createForClass(
  LiquidationContributionRate,
);

@Schema({ timestamps: true })
export class LiquidationRuleSet {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, default: "VE" })
  country: string;

  @Prop({ type: Number, default: 1 })
  version: number;

  @Prop({ type: Date })
  validFrom?: Date;

  @Prop({ type: Date })
  validTo?: Date;

  @Prop({ type: Object, default: {} })
  config: {
    // Días por año de servicio para cálculo de prestaciones
    daysPerYear?: number;
    // Tope mínimo de días pagados por año
    minDaysPerYear?: number;
    // Bono adicional por año a partir de cierto umbral
    bonusDaysAfterYears?: { thresholdYears?: number; daysPerYear?: number };
    // Días por concepto de utilidades pendientes
    utilitiesDays?: number;
    // Días de vacaciones pendientes
    vacationDays?: number;
    // Factor de salario integral (por ejemplo, 1.3 si se suma prorrateo de utilidades/bonos)
    integralSalaryFactor?: number;
    // Mapping contable por concepto
    accounts?: {
      severanceDebit?: string;
      severanceCredit?: string;
      vacationDebit?: string;
      vacationCredit?: string;
      utilitiesDebit?: string;
      utilitiesCredit?: string;
    };
  };

  @Prop({ type: ContributionRateSchema, default: {} })
  severanceFund?: LiquidationContributionRate;

  @Prop({ type: ContributionRateSchema, default: {} })
  socialSecurity?: LiquidationContributionRate;

  @Prop({ type: String })
  notes?: string;
}

export const LiquidationRuleSetSchema =
  SchemaFactory.createForClass(LiquidationRuleSet);

LiquidationRuleSetSchema.index({ tenantId: 1, country: 1, version: -1 });
