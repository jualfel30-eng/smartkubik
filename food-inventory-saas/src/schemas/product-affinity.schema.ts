import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * Customer Purchase Record - Tracking individual customer purchases of a product
 */
@Schema()
export class CustomerPurchaseRecord {
  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customerId: Types.ObjectId;

  @Prop({ required: true })
  customerName: string;

  @Prop({ type: Number, default: 0 })
  totalPurchaseCount: number; // Total number of times purchased

  @Prop({ type: Number, default: 0 })
  totalQuantityPurchased: number; // Total quantity purchased

  @Prop({ type: Number, default: 0 })
  totalSpent: number; // Total amount spent on this product

  @Prop({ type: Date })
  firstPurchaseDate: Date;

  @Prop({ type: Date })
  lastPurchaseDate: Date;

  @Prop({ type: Number, default: 0 })
  averageOrderValue: number; // Average spent per order

  @Prop({ type: Number, default: 0 })
  purchaseFrequencyDays?: number; // Average days between purchases
}

const CustomerPurchaseRecordSchema = SchemaFactory.createForClass(
  CustomerPurchaseRecord,
);

/**
 * Co-Purchase Pattern - Products frequently bought together with this product
 */
@Schema()
export class CoPurchasePattern {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop()
  productCode?: string;

  @Prop({ type: Number, default: 0 })
  coPurchaseCount: number; // Number of times bought together

  @Prop({ type: Number, default: 0 })
  affinityScore: number; // 0-100 score of how often they're bought together

  @Prop({ type: Date })
  lastCoPurchaseDate: Date;

  // Customer-specific co-purchase (which customers buy these together)
  @Prop({ type: [Types.ObjectId] })
  customerIds: Types.ObjectId[];
}

const CoPurchasePatternSchema = SchemaFactory.createForClass(CoPurchasePattern);

/**
 * ProductAffinity - Customer-Product Matrix and Purchase Analytics
 *
 * This schema tracks:
 * 1. Which customers purchased which products (customerPurchaseMatrix)
 * 2. Product co-purchase patterns (frequently bought together)
 * 3. Purchase frequency and recency metrics
 *
 * Use Cases:
 * - Targeted marketing campaigns by product
 * - Product recommendation engines
 * - Customer segmentation by purchase behavior
 * - Inventory forecasting based on customer patterns
 */
@Schema({ timestamps: true })
export class ProductAffinity {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop()
  productCode?: string;

  @Prop({ type: [String] })
  productCategories: string[];

  // CUSTOMER PURCHASE MATRIX - Core feature for CRM targeting
  @Prop({ type: [CustomerPurchaseRecordSchema], default: [] })
  customerPurchaseMatrix: CustomerPurchaseRecord[];

  // CO-PURCHASE PATTERNS - Products bought together
  @Prop({ type: [CoPurchasePatternSchema], default: [] })
  coPurchasePatterns: CoPurchasePattern[];

  // AGGREGATE METRICS
  @Prop({ type: Number, default: 0 })
  totalUniqueCustomers: number; // Total unique customers who purchased

  @Prop({ type: Number, default: 0 })
  totalTransactions: number; // Total transactions with this product

  @Prop({ type: Number, default: 0 })
  totalQuantitySold: number;

  @Prop({ type: Number, default: 0 })
  totalRevenue: number;

  @Prop({ type: Date })
  firstSaleDate: Date;

  @Prop({ type: Date })
  lastSaleDate: Date;

  // Quick access array for customer IDs (for fast lookups)
  @Prop({ type: [Types.ObjectId], index: true })
  customerIds: Types.ObjectId[];

  // Metadata
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Date })
  lastUpdated: Date;
}

export type ProductAffinityDocument = ProductAffinity & Document;
export const ProductAffinitySchema =
  SchemaFactory.createForClass(ProductAffinity);

// Compound indexes for efficient queries
ProductAffinitySchema.index({ tenantId: 1, productId: 1 }, { unique: true });
ProductAffinitySchema.index({ tenantId: 1, customerIds: 1 }); // Find products by customer
ProductAffinitySchema.index({ tenantId: 1, totalUniqueCustomers: -1 }); // Sort by popularity
ProductAffinitySchema.index({ tenantId: 1, totalRevenue: -1 }); // Sort by revenue
ProductAffinitySchema.index({
  tenantId: 1,
  "customerPurchaseMatrix.customerId": 1,
}); // Customer lookup
ProductAffinitySchema.index({ tenantId: 1, productCategories: 1 }); // Category filtering
