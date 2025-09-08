import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class UserPermission {
  @Prop({ required: true })
  module: string; // products, inventory, orders, customers, reports, settings

  @Prop({ required: true })
  actions: string[]; // create, read, update, delete, export, import

  @Prop({ default: Date.now })
  grantedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  grantedBy: Types.ObjectId;
}

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

  @Prop({ required: true })
  role: string; // admin, manager, employee, viewer

  @Prop([UserPermission])
  permissions: UserPermission[];

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

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índices para usuarios
UserSchema.index({ email: 1, tenantId: 1 }, { unique: true });
UserSchema.index({ role: 1, tenantId: 1 });
UserSchema.index({ isActive: 1, tenantId: 1 });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ passwordResetToken: 1 });
UserSchema.index({ lockUntil: 1 });

