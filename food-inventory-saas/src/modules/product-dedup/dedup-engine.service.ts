import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "@/schemas/product.schema";
import {
  Inventory,
  InventoryDocument,
} from "@/schemas/inventory.schema";
import {
  DuplicateGroup,
  DuplicateGroupDocument,
  MatchType,
} from "@/schemas/duplicate-group.schema";
import { Order, OrderDocument } from "@/schemas/order.schema";
import { ScanDuplicatesDto, ScanStrategy } from "./dto/scan-duplicates.dto";
import {
  normalizeProductName,
  normalizeSku,
  stringSimilarity,
  extractSize,
  hasSignificantWordDiff,
} from "./utils/text-normalizer.util";

interface ProductForScan {
  _id: Types.ObjectId;
  sku: string;
  name: string;
  brand: string;
  category: string[];
  variants: {
    _id?: Types.ObjectId;
    sku: string;
    barcode: string;
    basePrice: number;
    costPrice: number;
    unitSize: number;
  }[];
  suppliers: { supplierId: Types.ObjectId }[];
  tags: string[];
  description: string;
}

interface MatchPair {
  productIdA: string;
  productIdB: string;
  matchType: MatchType;
  confidence: number;
  details: string;
}

// Union-Find for transitive grouping
class UnionFind {
  private parent: Map<string, string> = new Map();

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }

  getGroups(): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const key of this.parent.keys()) {
      const root = this.find(key);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(key);
    }
    return groups;
  }
}

@Injectable()
export class DedupEngineService {
  private readonly logger = new Logger(DedupEngineService.name);

  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(DuplicateGroup.name)
    private duplicateGroupModel: Model<DuplicateGroupDocument>,
  ) {}

  async scanForDuplicates(
    config: ScanDuplicatesDto,
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<{ scanId: string; groupsFound: number }> {
    const scanId = new Types.ObjectId().toHexString();
    const strategies: ScanStrategy[] = config.strategies || [
      "barcode_exact",
      "sku_exact",
      "name_brand_size",
      "name_fuzzy",
    ];
    const minConfidence = config.minConfidence ?? 50;

    // Load all active products for the tenant
    const products = await this.productModel
      .find({
        tenantId,
        isActive: true,
        mergedIntoProductId: { $exists: false },
      })
      .select(
        "sku name brand category variants suppliers tags description",
      )
      .lean<ProductForScan[]>();

    this.logger.log(
      `Scanning ${products.length} products for tenant ${tenantId} (scanId: ${scanId})`,
    );

    const allMatches: MatchPair[] = [];

    // Level 1: Barcode Exact Match
    if (strategies.includes("barcode_exact")) {
      const barcodeMatches = this.findBarcodeMatches(products);
      allMatches.push(...barcodeMatches);
    }

    // Level 2: SKU Near Match
    if (strategies.includes("sku_exact")) {
      const skuMatches = this.findSkuMatches(products);
      allMatches.push(...skuMatches);
    }

    // Level 3: Name + Brand + Size Match
    if (strategies.includes("name_brand_size")) {
      const nameBrandMatches = this.findNameBrandMatches(
        products,
        85,
      );
      allMatches.push(...nameBrandMatches);
    }

    // Level 4: Fuzzy Name Only
    if (strategies.includes("name_fuzzy")) {
      const fuzzyMatches = this.findFuzzyNameMatches(products, 80);
      allMatches.push(...fuzzyMatches);
    }

    // Filter by minimum confidence
    const filteredMatches = allMatches.filter(
      (m) => m.confidence >= minConfidence,
    );

    // Deduplicate pairs (keep highest confidence)
    const pairMap = new Map<string, MatchPair>();
    for (const match of filteredMatches) {
      const key = [match.productIdA, match.productIdB].sort().join("_");
      const existing = pairMap.get(key);
      if (!existing || existing.confidence < match.confidence) {
        pairMap.set(key, match);
      }
    }

    // Build transitive clusters via Union-Find
    const uf = new UnionFind();
    for (const match of pairMap.values()) {
      uf.union(match.productIdA, match.productIdB);
    }

    const clusters = uf.getGroups();
    // Filter out singleton groups
    const validClusters = Array.from(clusters.entries()).filter(
      ([, members]) => members.length >= 2,
    );

    // Build DuplicateGroup documents
    const productMap = new Map(
      products.map((p) => [p._id.toString(), p]),
    );

    // Pre-fetch inventory and order counts
    const inventoryMap = await this.getInventoryCounts(tenantId);
    const orderCountMap = await this.getOrderCounts(tenantId);

    const groups: DuplicateGroupDocument[] = [];

    for (const [, memberIds] of validClusters) {
      // Determine best match type and confidence for this cluster
      const clusterMatches = Array.from(pairMap.values()).filter(
        (m) =>
          memberIds.includes(m.productIdA) &&
          memberIds.includes(m.productIdB),
      );

      const bestMatch = clusterMatches.reduce((best, curr) =>
        curr.confidence > best.confidence ? curr : best,
      );

      // Determine overall match type
      const matchTypes = new Set(clusterMatches.map((m) => m.matchType));
      let matchType: MatchType = bestMatch.matchType;
      if (matchTypes.size > 1) matchType = "composite";

      const avgConfidence = Math.round(
        clusterMatches.reduce((sum, m) => sum + m.confidence, 0) /
          clusterMatches.length,
      );

      // Build product summaries and completeness scores
      const productIds = memberIds.map((id) => new Types.ObjectId(id));
      const completenessScores = memberIds.map((id) => {
        const product = productMap.get(id);
        return this.calculateCompleteness(
          id,
          product,
          inventoryMap,
        );
      });

      const productSummaries = memberIds.map((id) => {
        const product = productMap.get(id);
        return this.buildProductSummary(
          id,
          product,
          inventoryMap,
          orderCountMap,
        );
      });

      // Suggest master (highest completeness)
      const suggestedMaster = completenessScores.reduce(
        (best, curr) => (curr.score > best.score ? curr : best),
      );

      const matchDetails = clusterMatches
        .map((m) => m.details)
        .join("; ");

      const group = new this.duplicateGroupModel({
        scanId,
        status: "pending",
        confidenceScore: avgConfidence,
        matchType,
        matchDetails,
        productIds,
        suggestedMasterId: new Types.ObjectId(
          suggestedMaster.productId,
        ),
        completenessScores,
        productSummaries,
        tenantId,
        createdBy: userId,
      });

      groups.push(group);
    }

    // Persist all groups
    if (groups.length > 0) {
      await this.duplicateGroupModel.insertMany(groups);
    }

    this.logger.log(
      `Scan complete: found ${groups.length} duplicate groups (scanId: ${scanId})`,
    );

    return { scanId, groupsFound: groups.length };
  }

  // ── Level 1: Barcode Exact Match ──

  private findBarcodeMatches(products: ProductForScan[]): MatchPair[] {
    const barcodeMap = new Map<string, string[]>();

    for (const product of products) {
      for (const variant of product.variants || []) {
        if (variant.barcode && variant.barcode.trim()) {
          const barcode = variant.barcode.trim();
          if (!barcodeMap.has(barcode)) barcodeMap.set(barcode, []);
          const list = barcodeMap.get(barcode)!;
          const pid = product._id.toString();
          if (!list.includes(pid)) list.push(pid);
        }
      }
    }

    const matches: MatchPair[] = [];
    for (const [barcode, pids] of barcodeMap) {
      if (pids.length < 2) continue;
      for (let i = 0; i < pids.length; i++) {
        for (let j = i + 1; j < pids.length; j++) {
          matches.push({
            productIdA: pids[i],
            productIdB: pids[j],
            matchType: "barcode_exact",
            confidence: 98,
            details: `Barcode match: ${barcode}`,
          });
        }
      }
    }

    return matches;
  }

  // ── Level 2: SKU Near Match ──

  private findSkuMatches(products: ProductForScan[]): MatchPair[] {
    const skuMap = new Map<string, string[]>();

    for (const product of products) {
      if (!product.sku) continue;
      const normalized = normalizeSku(product.sku);
      if (!normalized) continue;
      if (!skuMap.has(normalized)) skuMap.set(normalized, []);
      const list = skuMap.get(normalized)!;
      const pid = product._id.toString();
      if (!list.includes(pid)) list.push(pid);
    }

    const matches: MatchPair[] = [];
    for (const [normalizedSku, pids] of skuMap) {
      if (pids.length < 2) continue;
      for (let i = 0; i < pids.length; i++) {
        for (let j = i + 1; j < pids.length; j++) {
          matches.push({
            productIdA: pids[i],
            productIdB: pids[j],
            matchType: "sku_exact",
            confidence: 90,
            details: `SKU normalizado: ${normalizedSku}`,
          });
        }
      }
    }

    return matches;
  }

  // ── Level 3: Name + Brand + Size Match ──

  private findNameBrandMatches(
    products: ProductForScan[],
    threshold: number,
  ): MatchPair[] {
    const matches: MatchPair[] = [];

    // Pre-compute normalized names, extract sizes
    const productData = new Map<
      string,
      { baseName: string; sizeKey: string; brand: string }
    >();
    for (const product of products) {
      const normName = normalizeProductName(product.name);
      const { baseName, sizeKey } = extractSize(normName);
      const brand = product.brand
        ? product.brand.toLowerCase().trim()
        : "__no_brand__";
      productData.set(product._id.toString(), {
        baseName,
        sizeKey,
        brand,
      });
    }

    // Group by brand + sizeKey — only compare products with the SAME size
    const buckets = new Map<string, ProductForScan[]>();
    for (const product of products) {
      const data = productData.get(product._id.toString())!;
      const bucket = `${data.brand}|${data.sizeKey}`;
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket)!.push(product);
    }

    for (const [, group] of buckets) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const dataA = productData.get(group[i]._id.toString())!;
          const dataB = productData.get(group[j]._id.toString())!;
          const similarity = stringSimilarity(
            dataA.baseName,
            dataB.baseName,
          );

          if (similarity >= threshold) {
            // Reject if words differ in semantically significant ways
            if (
              hasSignificantWordDiff(dataA.baseName, dataB.baseName)
            ) {
              continue;
            }
            const confidence = Math.round(similarity * 0.9);
            matches.push({
              productIdA: group[i]._id.toString(),
              productIdB: group[j]._id.toString(),
              matchType: "name_brand_size",
              confidence,
              details: `Nombre+marca+tamaño: "${group[i].name}" ↔ "${group[j].name}" (${similarity}%)`,
            });
          }
        }
      }
    }

    return matches;
  }

  // ── Level 4: Fuzzy Name Only ──

  private findFuzzyNameMatches(
    products: ProductForScan[],
    threshold: number,
  ): MatchPair[] {
    const matches: MatchPair[] = [];

    // Pre-compute normalized names and extract sizes
    const productData = new Map<
      string,
      { baseName: string; sizeKey: string; prefix: string }
    >();
    for (const product of products) {
      const normName = normalizeProductName(product.name);
      const { baseName, sizeKey } = extractSize(normName);
      const prefix = baseName.substring(0, 3);
      if (!prefix) continue;
      productData.set(product._id.toString(), {
        baseName,
        sizeKey,
        prefix,
      });
    }

    // Group by prefix + sizeKey to reduce N² while ensuring different sizes never merge
    const buckets = new Map<string, ProductForScan[]>();
    for (const product of products) {
      const data = productData.get(product._id.toString());
      if (!data) continue;
      const bucket = `${data.prefix}|${data.sizeKey}`;
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket)!.push(product);
    }

    for (const [, group] of buckets) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const dataA = productData.get(group[i]._id.toString())!;
          const dataB = productData.get(group[j]._id.toString())!;
          // Compare base names (sizes already matched via bucketing)
          const similarity = stringSimilarity(
            dataA.baseName,
            dataB.baseName,
          );

          if (similarity >= threshold) {
            // Reject if words differ in semantically significant ways
            if (
              hasSignificantWordDiff(dataA.baseName, dataB.baseName)
            ) {
              continue;
            }
            const confidence = Math.round(similarity * 0.7);
            matches.push({
              productIdA: group[i]._id.toString(),
              productIdB: group[j]._id.toString(),
              matchType: "name_fuzzy",
              confidence,
              details: `Nombre similar: "${group[i].name}" ↔ "${group[j].name}" (${similarity}%)`,
            });
          }
        }
      }
    }

    return matches;
  }

  // ── Completeness Score ──

  private calculateCompleteness(
    productId: string,
    product: ProductForScan | undefined,
    inventoryMap: Map<string, number>,
  ): { productId: Types.ObjectId; score: number; missingFields: string[] } {
    const missingFields: string[] = [];
    let score = 0;

    if (!product) {
      return {
        productId: new Types.ObjectId(productId),
        score: 0,
        missingFields: ["product_not_found"],
      };
    }

    // +15 if has name
    if (product.name && product.name.trim()) {
      score += 15;
    } else {
      missingFields.push("name");
    }

    // +10 if has brand
    if (product.brand && product.brand.trim()) {
      score += 10;
    } else {
      missingFields.push("brand");
    }

    // +10 if has category
    if (product.category && product.category.length > 0) {
      score += 10;
    } else {
      missingFields.push("category");
    }

    // +15 if has at least 1 variant with price > 0
    const hasPrice = (product.variants || []).some(
      (v) => v.basePrice > 0,
    );
    if (hasPrice) {
      score += 15;
    } else {
      missingFields.push("price");
    }

    // +15 if has at least 1 variant with cost > 0
    const hasCost = (product.variants || []).some(
      (v) => v.costPrice > 0,
    );
    if (hasCost) {
      score += 15;
    } else {
      missingFields.push("costPrice");
    }

    // +10 if has at least 1 variant with barcode
    const hasBarcode = (product.variants || []).some(
      (v) => v.barcode && v.barcode.trim(),
    );
    if (hasBarcode) {
      score += 10;
    } else {
      missingFields.push("barcode");
    }

    // +10 if has inventory with stock > 0
    const totalStock = inventoryMap.get(productId) || 0;
    if (totalStock > 0) {
      score += 10;
    } else {
      missingFields.push("inventory");
    }

    // +5 if has description
    if (product.description && product.description.trim()) {
      score += 5;
    } else {
      missingFields.push("description");
    }

    // +5 if has suppliers
    if (product.suppliers && product.suppliers.length > 0) {
      score += 5;
    } else {
      missingFields.push("suppliers");
    }

    // +5 if has tags
    if (product.tags && product.tags.length > 0) {
      score += 5;
    } else {
      missingFields.push("tags");
    }

    return {
      productId: new Types.ObjectId(productId),
      score,
      missingFields,
    };
  }

  // ── Product Summary ──

  private buildProductSummary(
    productId: string,
    product: ProductForScan | undefined,
    inventoryMap: Map<string, number>,
    orderCountMap: Map<string, number>,
  ) {
    if (!product) {
      return {
        productId: new Types.ObjectId(productId),
        sku: "",
        name: "",
        brand: "",
        variantCount: 0,
        hasPrice: false,
        hasCost: false,
        hasBarcode: false,
        hasInventory: false,
        totalStock: 0,
        orderCount: 0,
      };
    }

    const variants = product.variants || [];
    return {
      productId: new Types.ObjectId(productId),
      sku: product.sku || "",
      name: product.name || "",
      brand: product.brand || "",
      variantCount: variants.length,
      hasPrice: variants.some((v) => v.basePrice > 0),
      hasCost: variants.some((v) => v.costPrice > 0),
      hasBarcode: variants.some((v) => v.barcode && v.barcode.trim()),
      hasInventory: (inventoryMap.get(productId) || 0) > 0,
      totalStock: inventoryMap.get(productId) || 0,
      orderCount: orderCountMap.get(productId) || 0,
    };
  }

  // ── Inventory Counts ──

  private async getInventoryCounts(
    tenantId: Types.ObjectId,
  ): Promise<Map<string, number>> {
    const results = await this.inventoryModel.aggregate([
      { $match: { tenantId, isActive: true } },
      {
        $group: {
          _id: "$productId",
          totalStock: { $sum: "$totalQuantity" },
        },
      },
    ]);

    const map = new Map<string, number>();
    for (const r of results) {
      map.set(r._id.toString(), r.totalStock);
    }
    return map;
  }

  // ── Order Counts ──

  private async getOrderCounts(
    tenantId: Types.ObjectId,
  ): Promise<Map<string, number>> {
    const results = await this.orderModel.aggregate([
      { $match: { tenantId } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          count: { $sum: 1 },
        },
      },
    ]);

    const map = new Map<string, number>();
    for (const r of results) {
      map.set(r._id.toString(), r.count);
    }
    return map;
  }
}
