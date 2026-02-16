import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string; // hash bcrypt

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  phone?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: Types.ObjectId, ref: "Role" })
  role: Types.ObjectId;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  lastLoginIP?: string;

  @Prop({ default: 0 })
  loginAttempts: number;

  @Prop()
  lockUntil?: Date;

  @Prop({ type: Boolean, default: false })
  twoFactorEnabled: boolean;

  @Prop({ type: String })
  twoFactorSecret?: string;

  @Prop({ type: [String], default: [] })
  twoFactorBackupCodes: string[];

  @Prop({ type: Date })
  twoFactorLastVerifiedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: false })
  tenantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  /**
   * Preferencias de notificaciones del usuario
   */
  @Prop({
    type: Object,
    default: () => ({
      enabled: true,
      categories: {
        sales: { inApp: true, email: true, whatsapp: false },
        inventory: { inApp: true, email: true, whatsapp: false },
        hr: { inApp: true, email: false, whatsapp: false },
        finance: { inApp: true, email: true, whatsapp: false },
        marketing: { inApp: true, email: false, whatsapp: false },
        system: { inApp: true, email: false, whatsapp: false },
      },
      soundEnabled: true,
    }),
  })
  notificationPreferences?: {
    enabled: boolean;
    categories: {
      sales: { inApp: boolean; email: boolean; whatsapp: boolean };
      inventory: { inApp: boolean; email: boolean; whatsapp: boolean };
      hr: { inApp: boolean; email: boolean; whatsapp: boolean };
      finance: { inApp: boolean; email: boolean; whatsapp: boolean };
      marketing: { inApp: boolean; email: boolean; whatsapp: boolean };
      system: { inApp: boolean; email: boolean; whatsapp: boolean };
    };
    soundEnabled: boolean;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índices para usuarios
UserSchema.index({ email: 1, tenantId: 1 }, { unique: true });
UserSchema.index({ role: 1, tenantId: 1 });
UserSchema.index({ isActive: 1, tenantId: 1 });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ passwordResetToken: 1 });
UserSchema.index({ lockUntil: 1 });
UserSchema.index({ phone: 1, tenantId: 1 }, { unique: true, sparse: true });
