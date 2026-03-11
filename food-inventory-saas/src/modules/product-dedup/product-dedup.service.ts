import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  MergeJob,
  MergeJobDocument,
} from "@/schemas/merge-job.schema";
import {
  DuplicateGroup,
  DuplicateGroupDocument,
} from "@/schemas/duplicate-group.schema";
import { Product, ProductDocument } from "@/schemas/product.schema";
import { DedupEngineService } from "./dedup-engine.service";
import { MergeExecutorService } from "./merge-executor.service";
import { ScanDuplicatesDto } from "./dto/scan-duplicates.dto";
import { MergeProductsDto, ReverseMergeDto } from "./dto/merge-products.dto";
import {
  DuplicateGroupsFilterDto,
  MergeJobsFilterDto,
} from "./dto/dedup-filter.dto";

@Injectable()
export class ProductDedupService {
  private readonly logger = new Logger(ProductDedupService.name);

  constructor(
    @InjectModel(MergeJob.name)
    private mergeJobModel: Model<MergeJobDocument>,
    @InjectModel(DuplicateGroup.name)
    private duplicateGroupModel: Model<DuplicateGroupDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    private readonly dedupEngine: DedupEngineService,
    private readonly mergeExecutor: MergeExecutorService,
  ) {}

  // ── Scan Operations ──

  async triggerScan(config: ScanDuplicatesDto, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const userId = new Types.ObjectId(user.id || user._id);
    return this.dedupEngine.scanForDuplicates(config, tenantId, userId);
  }

  async getScans(user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);

    const scans = await this.duplicateGroupModel.aggregate([
      { $match: { tenantId, isDeleted: false } },
      {
        $group: {
          _id: "$scanId",
          totalGroups: { $sum: 1 },
          pendingGroups: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          mergedGroups: {
            $sum: { $cond: [{ $eq: ["$status", "merged"] }, 1, 0] },
          },
          dismissedGroups: {
            $sum: {
              $cond: [{ $eq: ["$status", "dismissed"] }, 1, 0],
            },
          },
          avgConfidence: { $avg: "$confidenceScore" },
          createdAt: { $min: "$createdAt" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return scans.map((s) => ({
      scanId: s._id,
      totalGroups: s.totalGroups,
      pendingGroups: s.pendingGroups,
      mergedGroups: s.mergedGroups,
      dismissedGroups: s.dismissedGroups,
      avgConfidence: Math.round(s.avgConfidence || 0),
      createdAt: s.createdAt,
    }));
  }

  // ── Group Operations ──

  async getGroups(filter: DuplicateGroupsFilterDto, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { tenantId, isDeleted: false };
    if (filter.scanId) query.scanId = filter.scanId;
    if (filter.status) query.status = filter.status;
    if (filter.matchType) query.matchType = filter.matchType;
    if (filter.minConfidence !== undefined) {
      query.confidenceScore = { $gte: filter.minConfidence };
    }

    const [data, total] = await Promise.all([
      this.duplicateGroupModel
        .find(query)
        .sort({ confidenceScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.duplicateGroupModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getGroupById(groupId: string, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const group = await this.duplicateGroupModel
      .findOne({
        _id: new Types.ObjectId(groupId),
        tenantId,
        isDeleted: false,
      })
      .lean();

    if (!group) {
      throw new NotFoundException("Grupo de duplicados no encontrado");
    }

    // Populate full product data for side-by-side view
    const products = await this.productModel
      .find({
        _id: { $in: group.productIds },
        tenantId,
      })
      .lean();

    return { ...group, products };
  }

  async dismissGroup(groupId: string, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const group = await this.duplicateGroupModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(groupId),
        tenantId,
        isDeleted: false,
        status: "pending",
      },
      { $set: { status: "dismissed" } },
      { new: true },
    );

    if (!group) {
      throw new NotFoundException(
        "Grupo no encontrado o ya procesado",
      );
    }

    return group;
  }

  // ── Merge Operations ──

  async mergeGroup(
    groupId: string,
    mergeDto: MergeProductsDto,
    user: any,
  ) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const userId = new Types.ObjectId(user.id || user._id);

    // Validate group exists and is pending
    const group = await this.duplicateGroupModel.findOne({
      _id: new Types.ObjectId(groupId),
      tenantId,
      isDeleted: false,
    });

    if (!group) {
      throw new NotFoundException("Grupo de duplicados no encontrado");
    }

    if (group.status === "merged") {
      throw new BadRequestException("Este grupo ya fue fusionado");
    }

    if (group.status === "dismissed") {
      throw new BadRequestException("Este grupo fue descartado");
    }

    // Validate master product is in the group
    const masterProductId = new Types.ObjectId(
      mergeDto.masterProductId,
    );
    if (
      !group.productIds.some((id) => id.toString() === masterProductId.toString())
    ) {
      throw new BadRequestException(
        "El producto maestro debe ser parte del grupo",
      );
    }

    // Get duplicate IDs (all group members except master)
    const duplicateProductIds = group.productIds.filter(
      (id) => id.toString() !== masterProductId.toString(),
    );

    // Check no product is in a pending merge
    const pendingMerge = await this.mergeJobModel.findOne({
      tenantId,
      status: { $in: ["pending_review", "approved", "executing"] },
      $or: [
        { masterProductId: { $in: [...duplicateProductIds, masterProductId] } },
        { duplicateProductIds: { $in: [...duplicateProductIds, masterProductId] } },
      ],
    });

    if (pendingMerge) {
      throw new BadRequestException(
        "Uno o más productos ya están en un merge pendiente",
      );
    }

    // Generate job number
    const lastJob = await this.mergeJobModel
      .findOne({ tenantId })
      .sort({ createdAt: -1 })
      .select("jobNumber")
      .lean();

    let nextNumber = 1;
    if (lastJob?.jobNumber) {
      const match = lastJob.jobNumber.match(/MRG-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const jobNumber = `MRG-${String(nextNumber).padStart(4, "0")}`;

    // Get master product info
    const masterProduct = await this.productModel
      .findOne({ _id: masterProductId, tenantId })
      .lean();

    if (!masterProduct) {
      throw new NotFoundException("Producto maestro no encontrado");
    }

    // Create merge job
    const mergeJob = new this.mergeJobModel({
      jobNumber,
      status: "executing",
      masterProductId,
      masterProductSku: masterProduct.sku,
      masterProductName: masterProduct.name,
      duplicateProductIds,
      notes: mergeDto.notes,
      tenantId,
      createdBy: userId,
      executedBy: userId,
    });

    await mergeJob.save();

    // Execute the merge
    try {
      const result = await this.mergeExecutor.executeMerge(
        mergeJob._id as Types.ObjectId,
        mergeDto,
        user,
      );

      // Mark the group as merged
      group.status = "merged";
      await group.save();

      return result;
    } catch (error) {
      this.logger.error(
        `Merge failed for job ${jobNumber}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async bulkMerge(scanId: string | undefined, minConfidence: number | undefined, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Only auto-merge high-confidence barcode/sku matches
    const query: any = {
      tenantId,
      isDeleted: false,
      status: "pending",
      confidenceScore: { $gte: minConfidence || 95 },
      matchType: { $in: ["barcode_exact", "sku_exact"] },
    };
    if (scanId) query.scanId = scanId;

    const groups = await this.duplicateGroupModel.find(query);

    const results: any[] = [];
    for (const group of groups) {
      try {
        const mergeDto: MergeProductsDto = {
          masterProductId:
            group.suggestedMasterId?.toString() ||
            group.productIds[0].toString(),
          variantMergeStrategy: "combine",
          notes: `Auto-merge (confianza: ${group.confidenceScore}%)`,
        };

        const result = await this.mergeGroup(
          (group._id as Types.ObjectId).toString(),
          mergeDto,
          user,
        );
        results.push({
          groupId: group._id,
          status: "success",
          mergeJob: result,
        });
      } catch (error) {
        results.push({
          groupId: group._id,
          status: "failed",
          error: error.message,
        });
      }
    }

    return {
      totalProcessed: results.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    };
  }

  // ── Merge Job History ──

  async getMergeJobs(filter: MergeJobsFilterDto, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { tenantId, isDeleted: false };
    if (filter.status) query.status = filter.status;

    const [data, total] = await Promise.all([
      this.mergeJobModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.mergeJobModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMergeJobById(jobId: string, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const job = await this.mergeJobModel
      .findOne({
        _id: new Types.ObjectId(jobId),
        tenantId,
        isDeleted: false,
      })
      .lean();

    if (!job) {
      throw new NotFoundException("Merge job no encontrado");
    }

    return job;
  }

  async reverseMergeJob(
    jobId: string,
    reverseDto: ReverseMergeDto,
    user: any,
  ) {
    return this.mergeExecutor.reverseMerge(
      new Types.ObjectId(jobId),
      reverseDto.reason,
      user,
    );
  }

  // ── Stats ──

  async getStats(user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);

    const [
      totalProducts,
      productsWithoutPrice,
      productsWithoutBarcode,
      productsWithoutCategory,
      pendingGroups,
      completedMerges,
    ] = await Promise.all([
      this.productModel.countDocuments({
        tenantId,
        isActive: true,
        mergedIntoProductId: { $exists: false },
      }),
      this.productModel.countDocuments({
        tenantId,
        isActive: true,
        mergedIntoProductId: { $exists: false },
        $or: [
          { variants: { $size: 0 } },
          { "variants.basePrice": { $lte: 0 } },
        ],
      }),
      this.productModel.countDocuments({
        tenantId,
        isActive: true,
        mergedIntoProductId: { $exists: false },
        $or: [
          { variants: { $size: 0 } },
          {
            variants: {
              $not: {
                $elemMatch: {
                  barcode: { $exists: true, $ne: "" },
                },
              },
            },
          },
        ],
      }),
      this.productModel.countDocuments({
        tenantId,
        isActive: true,
        mergedIntoProductId: { $exists: false },
        $or: [
          { category: { $exists: false } },
          { category: { $size: 0 } },
        ],
      }),
      this.duplicateGroupModel.countDocuments({
        tenantId,
        isDeleted: false,
        status: "pending",
      }),
      this.mergeJobModel.countDocuments({
        tenantId,
        isDeleted: false,
        status: "completed",
      }),
    ]);

    return {
      totalProducts,
      productsWithoutPrice,
      productsWithoutBarcode,
      productsWithoutCategory,
      pendingGroups,
      completedMerges,
    };
  }
}
