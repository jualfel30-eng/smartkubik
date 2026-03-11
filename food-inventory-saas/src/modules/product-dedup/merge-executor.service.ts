import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Types, Connection, ClientSession } from "mongoose";
import { Product, ProductDocument } from "@/schemas/product.schema";
import {
  Inventory,
  InventoryDocument,
  InventoryMovement,
  InventoryMovementDocument,
} from "@/schemas/inventory.schema";
import { Order, OrderDocument } from "@/schemas/order.schema";
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from "@/schemas/purchase-order.schema";
import {
  TransferOrder,
  TransferOrderDocument,
} from "@/schemas/transfer-order.schema";
import {
  ProductPriceList,
  ProductPriceListDocument,
} from "@/schemas/product-price-list.schema";
import {
  BillOfMaterials,
  BillOfMaterialsDocument,
} from "@/schemas/bill-of-materials.schema";
import {
  ProductCampaign,
  ProductCampaignDocument,
} from "@/schemas/product-campaign.schema";
import {
  ProductConsumableConfig,
  ProductConsumableConfigDocument,
} from "@/schemas/product-consumable-config.schema";
import {
  ProductSupplyConfig,
  ProductSupplyConfigDocument,
} from "@/schemas/product-supply-config.schema";
import {
  ProductConsumableRelation,
  ProductConsumableRelationDocument,
} from "@/schemas/product-consumable-relation.schema";
import {
  MergeJob,
  MergeJobDocument,
  Reassignments,
} from "@/schemas/merge-job.schema";
import { MergeProductsDto } from "./dto/merge-products.dto";

@Injectable()
export class MergeExecutorService {
  private readonly logger = new Logger(MergeExecutorService.name);

  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
    @InjectModel(InventoryMovement.name)
    private movementModel: Model<InventoryMovementDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(PurchaseOrder.name)
    private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(TransferOrder.name)
    private transferModel: Model<TransferOrderDocument>,
    @InjectModel(ProductPriceList.name)
    private priceListModel: Model<ProductPriceListDocument>,
    @InjectModel(BillOfMaterials.name)
    private bomModel: Model<BillOfMaterialsDocument>,
    @InjectModel(ProductCampaign.name)
    private campaignModel: Model<ProductCampaignDocument>,
    @InjectModel(ProductConsumableConfig.name)
    private consumableConfigModel: Model<ProductConsumableConfigDocument>,
    @InjectModel(ProductSupplyConfig.name)
    private supplyConfigModel: Model<ProductSupplyConfigDocument>,
    @InjectModel(ProductConsumableRelation.name)
    private consumableRelModel: Model<ProductConsumableRelationDocument>,
    @InjectModel(MergeJob.name)
    private mergeJobModel: Model<MergeJobDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  // ══════════════════════════════════════════════════════════
  //  EXECUTE MERGE
  // ══════════════════════════════════════════════════════════

  async executeMerge(
    mergeJobId: Types.ObjectId,
    mergeDto: MergeProductsDto,
    user: any,
  ): Promise<MergeJobDocument> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const mergeJob = await this.mergeJobModel
        .findById(mergeJobId)
        .session(session);

      if (!mergeJob) {
        throw new NotFoundException("Merge job no encontrado");
      }

      const tenantId = mergeJob.tenantId;
      const masterProductId = mergeJob.masterProductId;
      const duplicateProductIds = mergeJob.duplicateProductIds;

      // ── Step 1: VALIDATE ──
      const allProductIds = [masterProductId, ...duplicateProductIds];
      const products = await this.productModel
        .find({ _id: { $in: allProductIds }, tenantId })
        .session(session);

      if (products.length !== allProductIds.length) {
        throw new BadRequestException(
          "Uno o más productos no existen o no pertenecen al tenant",
        );
      }

      // ── Step 2: SNAPSHOT ──
      const snapshots = products.map((p) => p.toObject());
      mergeJob.duplicateSnapshots = snapshots;

      // ── Step 3: MERGE FIELDS ──
      await this.mergeProductFields(
        masterProductId,
        duplicateProductIds,
        mergeDto,
        tenantId,
        session,
      );

      // ── Step 4: REASSIGN RELATIONS ──
      const reassignments = await this.reassignAllRelations(
        masterProductId,
        duplicateProductIds,
        tenantId,
        session,
      );

      // ── Step 5: DEACTIVATE DUPLICATES ──
      await this.productModel.updateMany(
        { _id: { $in: duplicateProductIds }, tenantId },
        {
          $set: {
            isActive: false,
            mergedIntoProductId: masterProductId,
            mergedAt: new Date(),
            mergeJobId: mergeJobId,
          },
        },
        { session },
      );

      // ── Step 6: UPDATE MERGE JOB ──
      mergeJob.reassignments = reassignments;
      mergeJob.status = "completed";
      mergeJob.executedAt = new Date();
      mergeJob.executedBy = new Types.ObjectId(user.id || user._id);
      mergeJob.reverseDeadline = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      );
      await mergeJob.save({ session });

      await session.commitTransaction();

      this.logger.log(
        `Merge completed: ${mergeJob.jobNumber} — master: ${mergeJob.masterProductSku}`,
      );

      return mergeJob;
    } catch (error) {
      await session.abortTransaction();
      // Mark job as failed
      await this.mergeJobModel.findByIdAndUpdate(mergeJobId, {
        status: "failed",
        errorMessage: error.message,
      });
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ── Field Merging ──

  private async mergeProductFields(
    masterProductId: Types.ObjectId,
    duplicateProductIds: Types.ObjectId[],
    mergeDto: MergeProductsDto,
    tenantId: Types.ObjectId,
    session: ClientSession,
  ) {
    const master = await this.productModel
      .findOne({ _id: masterProductId, tenantId })
      .session(session);

    const duplicates = await this.productModel
      .find({ _id: { $in: duplicateProductIds }, tenantId })
      .session(session);

    if (!master) {
      throw new NotFoundException("Producto maestro no encontrado");
    }

    const updates: any = {};

    // a) Field resolutions from user
    const fieldResolutions = mergeDto.fieldResolutions || [];
    for (const resolution of fieldResolutions) {
      const source = duplicates.find(
        (d) => d._id.toString() === resolution.sourceProductId,
      );
      if (source && source[resolution.field] !== undefined) {
        updates[resolution.field] = source[resolution.field];
      }
    }

    // b) Simple fields: fill gaps from duplicates
    const simpleFields = [
      "name",
      "brand",
      "description",
      "origin",
      "unitOfMeasure",
      "taxCategory",
    ];
    for (const field of simpleFields) {
      // Skip if already resolved by user
      if (fieldResolutions.some((r) => r.field === field)) continue;
      // If master is empty, try duplicates
      if (!master[field] || (typeof master[field] === "string" && !master[field].trim())) {
        for (const dup of duplicates) {
          if (dup[field] && (typeof dup[field] !== "string" || dup[field].trim())) {
            updates[field] = dup[field];
            break;
          }
        }
      }
    }

    // c) Array fields: union of unique values
    const arrayFields = ["category", "subcategory", "tags", "allergens"];
    for (const field of arrayFields) {
      const allValues = new Set<string>();
      const masterArr = master[field] as string[] | undefined;
      if (masterArr) masterArr.forEach((v) => allValues.add(v));
      for (const dup of duplicates) {
        const dupArr = dup[field] as string[] | undefined;
        if (dupArr) dupArr.forEach((v) => allValues.add(v));
      }
      if (allValues.size > 0) {
        updates[field] = Array.from(allValues);
      }
    }

    // d) Variants
    const strategy = mergeDto.variantMergeStrategy || "combine";
    if (strategy === "combine") {
      const masterVariants = [...(master.variants || [])];
      const existingBarcodes = new Set(
        masterVariants
          .filter((v) => v.barcode && v.barcode.trim())
          .map((v) => v.barcode.trim()),
      );
      const existingSkus = new Set(
        masterVariants.map((v) => v.sku),
      );

      for (const dup of duplicates) {
        for (const variant of dup.variants || []) {
          // Check barcode match → merge into existing variant
          if (
            variant.barcode &&
            variant.barcode.trim() &&
            existingBarcodes.has(variant.barcode.trim())
          ) {
            const existingVar = masterVariants.find(
              (v) =>
                v.barcode &&
                v.barcode.trim() === variant.barcode.trim(),
            );
            if (existingVar) {
              // Fill gaps in existing variant
              if (!existingVar.costPrice && variant.costPrice) {
                (existingVar as any).costPrice = variant.costPrice;
              }
              if (!existingVar.basePrice && variant.basePrice) {
                (existingVar as any).basePrice = variant.basePrice;
              }
              continue;
            }
          }

          // Check SKU match → merge into existing variant
          if (existingSkus.has(variant.sku)) {
            const existingVar = masterVariants.find(
              (v) => v.sku === variant.sku,
            );
            if (existingVar) {
              if (!existingVar.costPrice && variant.costPrice) {
                (existingVar as any).costPrice = variant.costPrice;
              }
              if (!existingVar.basePrice && variant.basePrice) {
                (existingVar as any).basePrice = variant.basePrice;
              }
              continue;
            }
          }

          // New variant — resolve SKU collision
          let newSku = variant.sku;
          let suffix = 2;
          while (existingSkus.has(newSku)) {
            newSku = `${variant.sku}-${suffix}`;
            suffix++;
          }
          existingSkus.add(newSku);
          if (variant.barcode && variant.barcode.trim()) {
            existingBarcodes.add(variant.barcode.trim());
          }

          masterVariants.push({
            ...variant,
            sku: newSku,
          } as any);
        }
      }
      updates.variants = masterVariants;
    }
    // 'keep_master' → no variant changes

    // e) Suppliers: merge unique by supplierId
    const masterSuppliers = [...(master.suppliers || [])];
    const existingSupplierIds = new Set(
      masterSuppliers.map((s) => s.supplierId.toString()),
    );

    for (const dup of duplicates) {
      for (const supplier of dup.suppliers || []) {
        if (!existingSupplierIds.has(supplier.supplierId.toString())) {
          masterSuppliers.push(supplier as any);
          existingSupplierIds.add(supplier.supplierId.toString());
        }
      }
    }
    updates.suppliers = masterSuppliers;

    // f) Selling units: merge unique by abbreviation
    const masterUnits = [...(master.sellingUnits || [])];
    const existingAbbrs = new Set(
      masterUnits.map((u) => u.abbreviation),
    );

    for (const dup of duplicates) {
      for (const unit of dup.sellingUnits || []) {
        if (!existingAbbrs.has(unit.abbreviation)) {
          masterUnits.push(unit as any);
          existingAbbrs.add(unit.abbreviation);
        }
      }
    }
    updates.sellingUnits = masterUnits;

    // g) inventoryConfig, pricingRules: keep master's, fill from most complete duplicate
    if (!master.inventoryConfig || Object.keys(master.inventoryConfig).length === 0) {
      for (const dup of duplicates) {
        if (dup.inventoryConfig && Object.keys(dup.inventoryConfig).length > 0) {
          updates.inventoryConfig = dup.inventoryConfig;
          break;
        }
      }
    }

    if (!master.pricingRules || Object.keys(master.pricingRules).length === 0) {
      for (const dup of duplicates) {
        if (dup.pricingRules && Object.keys(dup.pricingRules).length > 0) {
          updates.pricingRules = dup.pricingRules;
          break;
        }
      }
    }

    // h) Nutritional info
    if (!master.nutritionalInfo || Object.keys(master.nutritionalInfo).length === 0) {
      for (const dup of duplicates) {
        if (dup.nutritionalInfo && Object.keys(dup.nutritionalInfo).length > 0) {
          updates.nutritionalInfo = dup.nutritionalInfo;
          break;
        }
      }
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      await this.productModel.updateOne(
        { _id: masterProductId, tenantId },
        { $set: updates },
        { session },
      );
    }
  }

  // ── Relation Reassignment ──

  private async reassignAllRelations(
    masterProductId: Types.ObjectId,
    duplicateProductIds: Types.ObjectId[],
    tenantId: Types.ObjectId,
    session: ClientSession,
  ): Promise<Reassignments> {
    const reassignments: Reassignments = {
      inventoryRecords: 0,
      inventoryMovements: 0,
      orderItems: 0,
      purchaseOrderItems: 0,
      transferOrderItems: 0,
      priceListEntries: 0,
      billOfMaterials: 0,
      campaigns: 0,
      otherReferences: 0,
    };

    // Get master product for denormalized fields
    const master = await this.productModel
      .findById(masterProductId)
      .session(session)
      .lean();

    if (!master) return reassignments;

    // ── 1. Inventory ──
    const sourceInventories = await this.inventoryModel
      .find({ productId: { $in: duplicateProductIds }, tenantId })
      .session(session);

    for (const inv of sourceInventories) {
      // Check if master already has inventory in same warehouse+variant
      const existingInv = await this.inventoryModel
        .findOne({
          productId: masterProductId,
          warehouseId: inv.warehouseId,
          variantId: inv.variantId,
          tenantId,
        })
        .session(session);

      if (existingInv) {
        // Sum quantities
        const prevTotal = existingInv.totalQuantity || 0;
        const addTotal = inv.totalQuantity || 0;
        const newTotal = prevTotal + addTotal;

        // Weighted average cost
        let newAvgCost = existingInv.averageCostPrice || 0;
        if (newTotal > 0) {
          newAvgCost =
            ((existingInv.averageCostPrice || 0) * prevTotal +
              (inv.averageCostPrice || 0) * addTotal) /
            newTotal;
        }

        existingInv.totalQuantity = newTotal;
        existingInv.availableQuantity =
          (existingInv.availableQuantity || 0) +
          (inv.availableQuantity || 0);
        existingInv.reservedQuantity =
          (existingInv.reservedQuantity || 0) +
          (inv.reservedQuantity || 0);
        existingInv.committedQuantity =
          (existingInv.committedQuantity || 0) +
          (inv.committedQuantity || 0);
        existingInv.averageCostPrice = newAvgCost;
        existingInv.lastCostPrice =
          inv.lastCostPrice || existingInv.lastCostPrice;

        // Merge lots
        const existingLots = existingInv.lots || [];
        const newLots = inv.lots || [];
        (existingInv as any).lots = [...existingLots, ...newLots];

        await existingInv.save({ session });

        // Deactivate source inventory record
        inv.isActive = false;
        await inv.save({ session });
      } else {
        // Reassign to master
        inv.productId = masterProductId;
        inv.productSku = master.sku;
        inv.productName = master.name;
        await inv.save({ session });
      }
      reassignments.inventoryRecords++;
    }

    // ── 2. Inventory Movements ──
    const movResult = await this.movementModel.updateMany(
      { productId: { $in: duplicateProductIds }, tenantId },
      {
        $set: {
          productId: masterProductId,
          productSku: master.sku,
        },
      },
      { session },
    );
    reassignments.inventoryMovements = movResult.modifiedCount;

    // ── 3. Orders (embedded items) ──
    const ordResult = await this.orderModel.updateMany(
      { "items.productId": { $in: duplicateProductIds }, tenantId },
      {
        $set: {
          "items.$[elem].productId": masterProductId,
          "items.$[elem].productSku": master.sku,
          "items.$[elem].productName": master.name,
        },
      },
      {
        arrayFilters: [
          { "elem.productId": { $in: duplicateProductIds } },
        ],
        session,
      },
    );
    reassignments.orderItems = ordResult.modifiedCount;

    // ── 4. Purchase Orders (embedded items) ──
    const poResult = await this.poModel.updateMany(
      {
        "items.productId": { $in: duplicateProductIds },
        tenantId,
      },
      {
        $set: {
          "items.$[elem].productId": masterProductId,
          "items.$[elem].productSku": master.sku,
          "items.$[elem].productName": master.name,
        },
      },
      {
        arrayFilters: [
          { "elem.productId": { $in: duplicateProductIds } },
        ],
        session,
      },
    );
    reassignments.purchaseOrderItems = poResult.modifiedCount;

    // ── 5. Transfer Orders (embedded items) ──
    const toResult = await this.transferModel.updateMany(
      {
        "items.productId": { $in: duplicateProductIds },
        tenantId,
      },
      {
        $set: {
          "items.$[elem].productId": masterProductId,
          "items.$[elem].productSku": master.sku,
          "items.$[elem].productName": master.name,
        },
      },
      {
        arrayFilters: [
          { "elem.productId": { $in: duplicateProductIds } },
        ],
        session,
      },
    );
    reassignments.transferOrderItems = toResult.modifiedCount;

    // ── 6. Product Price Lists ──
    // Handle unique constraint: if master already has an entry for the same priceList, deactivate duplicate's
    const sourcePriceLists = await this.priceListModel
      .find({
        productId: { $in: duplicateProductIds },
        tenantId,
      })
      .session(session);

    let plReassigned = 0;
    for (const pl of sourcePriceLists) {
      const existingPl = await this.priceListModel
        .findOne({
          productId: masterProductId,
          priceListId: pl.priceListId,
          variantSku: pl.variantSku,
          tenantId,
        })
        .session(session);

      if (existingPl) {
        // Master already has this price list entry — deactivate duplicate
        pl.isActive = false;
        await pl.save({ session });
      } else {
        // Reassign to master
        pl.productId = masterProductId;
        await pl.save({ session });
      }
      plReassigned++;
    }
    reassignments.priceListEntries = plReassigned;

    // ── 7. Bill of Materials ──
    let bomCount = 0;

    // 7a. Main productId (finished product)
    const bomMain = await this.bomModel.updateMany(
      { productId: { $in: duplicateProductIds }, tenantId },
      { $set: { productId: masterProductId } },
      { session },
    );
    bomCount += bomMain.modifiedCount;

    // 7b. Components
    const bomComp = await this.bomModel.updateMany(
      {
        "components.componentProductId": {
          $in: duplicateProductIds,
        },
        tenantId,
      },
      {
        $set: {
          "components.$[elem].componentProductId": masterProductId,
        },
      },
      {
        arrayFilters: [
          {
            "elem.componentProductId": {
              $in: duplicateProductIds,
            },
          },
        ],
        session,
      },
    );
    bomCount += bomComp.modifiedCount;

    // 7c. Byproducts
    const bomByp = await this.bomModel.updateMany(
      {
        "byproducts.byproductProductId": {
          $in: duplicateProductIds,
        },
        tenantId,
      },
      {
        $set: {
          "byproducts.$[elem].byproductProductId": masterProductId,
        },
      },
      {
        arrayFilters: [
          {
            "elem.byproductProductId": {
              $in: duplicateProductIds,
            },
          },
        ],
        session,
      },
    );
    bomCount += bomByp.modifiedCount;

    reassignments.billOfMaterials = bomCount;

    // ── 8. Product Campaigns ──
    let campCount = 0;

    // 8a. productTargeting[].productId
    const campTarget = await this.campaignModel.updateMany(
      {
        "productTargeting.productId": {
          $in: duplicateProductIds,
        },
        tenantId,
      },
      {
        $set: {
          "productTargeting.$[elem].productId": masterProductId,
        },
      },
      {
        arrayFilters: [
          { "elem.productId": { $in: duplicateProductIds } },
        ],
        session,
      },
    );
    campCount += campTarget.modifiedCount;

    // 8b. productPerformance[].productId
    const campPerf = await this.campaignModel.updateMany(
      {
        "productPerformance.productId": {
          $in: duplicateProductIds,
        },
        tenantId,
      },
      {
        $set: {
          "productPerformance.$[elem].productId": masterProductId,
        },
      },
      {
        arrayFilters: [
          { "elem.productId": { $in: duplicateProductIds } },
        ],
        session,
      },
    );
    campCount += campPerf.modifiedCount;

    reassignments.campaigns = campCount;

    // ── 9. Product Consumable Config ──
    let otherCount = 0;
    const targetConsumableConfig = await this.consumableConfigModel
      .findOne({ productId: masterProductId, tenantId })
      .session(session);

    if (targetConsumableConfig) {
      const ccResult = await this.consumableConfigModel.updateMany(
        { productId: { $in: duplicateProductIds }, tenantId },
        { $set: { isActive: false } },
        { session },
      );
      otherCount += ccResult.modifiedCount;
    } else {
      // Reassign first active source config
      const firstConfig = await this.consumableConfigModel
        .findOne({
          productId: { $in: duplicateProductIds },
          tenantId,
          isActive: true,
        })
        .session(session);

      if (firstConfig) {
        firstConfig.productId = masterProductId;
        await firstConfig.save({ session });
        otherCount++;

        // Deactivate remaining
        const ccRest = await this.consumableConfigModel.updateMany(
          {
            productId: { $in: duplicateProductIds },
            tenantId,
            _id: { $ne: firstConfig._id },
          },
          { $set: { isActive: false } },
          { session },
        );
        otherCount += ccRest.modifiedCount;
      }
    }

    // ── 10. Product Supply Config ──
    const targetSupplyConfig = await this.supplyConfigModel
      .findOne({ productId: masterProductId, tenantId })
      .session(session);

    if (targetSupplyConfig) {
      const scResult = await this.supplyConfigModel.updateMany(
        { productId: { $in: duplicateProductIds }, tenantId },
        { $set: { isActive: false } },
        { session },
      );
      otherCount += scResult.modifiedCount;
    } else {
      const firstConfig = await this.supplyConfigModel
        .findOne({
          productId: { $in: duplicateProductIds },
          tenantId,
          isActive: true,
        })
        .session(session);

      if (firstConfig) {
        firstConfig.productId = masterProductId;
        await firstConfig.save({ session });
        otherCount++;

        const scRest = await this.supplyConfigModel.updateMany(
          {
            productId: { $in: duplicateProductIds },
            tenantId,
            _id: { $ne: firstConfig._id },
          },
          { $set: { isActive: false } },
          { session },
        );
        otherCount += scRest.modifiedCount;
      }
    }

    // ── 11. Product Consumable Relations ──
    const crProduct = await this.consumableRelModel.updateMany(
      { productId: { $in: duplicateProductIds }, tenantId },
      { $set: { productId: masterProductId } },
      { session },
    );
    otherCount += crProduct.modifiedCount;

    const crConsumable = await this.consumableRelModel.updateMany(
      { consumableId: { $in: duplicateProductIds }, tenantId },
      { $set: { consumableId: masterProductId } },
      { session },
    );
    otherCount += crConsumable.modifiedCount;

    reassignments.otherReferences = otherCount;

    return reassignments;
  }

  // ══════════════════════════════════════════════════════════
  //  REVERSE MERGE
  // ══════════════════════════════════════════════════════════

  async reverseMerge(
    mergeJobId: Types.ObjectId,
    reason: string,
    user: any,
  ): Promise<MergeJobDocument> {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Pre-validate outside transaction
    const mergeJob = await this.mergeJobModel.findOne({
      _id: mergeJobId,
      tenantId,
    });

    if (!mergeJob) {
      throw new NotFoundException("Merge job no encontrado");
    }

    if (mergeJob.status !== "completed") {
      throw new BadRequestException(
        "Solo se pueden revertir merges completados",
      );
    }

    if (!mergeJob.canReverse) {
      throw new BadRequestException(
        "Este merge ya no puede ser revertido",
      );
    }

    if (
      mergeJob.reverseDeadline &&
      new Date() > mergeJob.reverseDeadline
    ) {
      throw new BadRequestException(
        "La ventana de reversión de 7 días ha expirado",
      );
    }

    if (
      !mergeJob.duplicateSnapshots ||
      mergeJob.duplicateSnapshots.length === 0
    ) {
      throw new BadRequestException(
        "No hay snapshots disponibles para revertir",
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // ── Step 1: Restore ALL products from snapshots ──
      for (const snapshot of mergeJob.duplicateSnapshots) {
        const snapshotId = snapshot._id;
        // Remove Mongoose internal fields
        const { __v, ...cleanSnapshot } = snapshot;

        await this.productModel.replaceOne(
          { _id: new Types.ObjectId(snapshotId) },
          { ...cleanSnapshot, _id: new Types.ObjectId(snapshotId) },
          { session, upsert: true },
        );
      }

      // ── Step 2: Re-activate previously merged products ──
      await this.productModel.updateMany(
        { _id: { $in: mergeJob.duplicateProductIds }, tenantId },
        {
          $set: { isActive: true },
          $unset: {
            mergedIntoProductId: 1,
            mergedAt: 1,
            mergeJobId: 1,
          },
        },
        { session },
      );

      // ── Step 3: Mark merge job as reversed ──
      mergeJob.status = "reversed";
      mergeJob.reversedAt = new Date();
      mergeJob.reversedBy = new Types.ObjectId(user.id || user._id);
      mergeJob.reversalReason = reason;
      mergeJob.canReverse = false;
      await mergeJob.save({ session });

      await session.commitTransaction();

      this.logger.log(
        `Merge reversed: ${mergeJob.jobNumber} — reason: ${reason}`,
      );

      return mergeJob;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
