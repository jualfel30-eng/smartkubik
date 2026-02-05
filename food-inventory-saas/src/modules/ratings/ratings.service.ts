import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  PurchaseOrderRating,
  PurchaseOrderRatingDocument,
} from "../../schemas/purchase-order-rating.schema";
import { CreateRatingDto } from "../../dto/rating.dto";
import { PurchaseOrder, PurchaseOrderDocument } from "../../schemas/purchase-order.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Supplier, SupplierDocument } from "../../schemas/supplier.schema";

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    @InjectModel(PurchaseOrderRating.name)
    private ratingModel: Model<PurchaseOrderRatingDocument>,
    @InjectModel(PurchaseOrder.name)
    private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(Supplier.name)
    private supplierModel: Model<SupplierDocument>,
  ) { }

  async create(
    createRatingDto: CreateRatingDto,
    user: any,
  ): Promise<PurchaseOrderRatingDocument> {
    this.logger.log(
      `Creating rating for purchase order: ${createRatingDto.purchaseOrderId}`,
    );

    const session = await this.ratingModel.startSession();
    session.startTransaction();

    try {
      const ratingData = {
        ...createRatingDto,
        createdBy: user.id,
        tenantId: user.tenantId,
      };

      const rating = new this.ratingModel(ratingData);
      const savedRating = await rating.save({ session });

      // Fix: Handle mixed BSON types for tenantId
      const tenantObjectId = new Types.ObjectId(user.tenantId);

      // 1. Update Purchase Order with rating
      const po = await this.poModel.findOneAndUpdate(
        {
          _id: createRatingDto.purchaseOrderId,
          tenantId: { $in: [user.tenantId, tenantObjectId] }
        },
        {
          $set: { rating: createRatingDto.rating }
        },
        { session, new: true }
      );

      if (!po) {
        throw new NotFoundException(`Purchase Order ${createRatingDto.purchaseOrderId} not found`);
      }

      // 2. Recalculate Supplier/Customer Averages
      // Get all rated orders for this supplier
      const supplierId = po.supplierId;

      // Fix: Handle mixed supplierId types
      let supplierIdFilter: any = supplierId;
      if (typeof supplierId === 'string' && Types.ObjectId.isValid(supplierId)) {
        supplierIdFilter = { $in: [supplierId, new Types.ObjectId(supplierId)] };
      } else if (supplierId instanceof Types.ObjectId) {
        supplierIdFilter = { $in: [supplierId.toString(), supplierId] };
      }

      // We need to find all orders for this supplierId that have a rating
      const allRatedOrders = await this.poModel.find({
        supplierId: supplierIdFilter,
        tenantId: { $in: [user.tenantId, tenantObjectId] },
        rating: { $exists: true, $ne: null }
      }).select('rating').session(session);

      const totalRatings = allRatedOrders.length;
      const sumRatings = allRatedOrders.reduce((sum, order: any) => sum + (order.rating || 0), 0);
      const averageRating = totalRatings > 0 ? parseFloat((sumRatings / totalRatings).toFixed(2)) : 0;

      // 3. Update Customer (Supplier Profile)
      // Use hybrid ID check if the _id could be mixed (though _id is usually cleaner)
      await this.customerModel.findOneAndUpdate(
        { _id: supplierId },
        {
          $set: {
            'metrics.averageRating': averageRating,
            'metrics.totalRatings': totalRatings
          }
        },
        { session }
      );

      // 4. Also update explicit Supplier document if it seems to exist link
      if (Types.ObjectId.isValid(supplierId.toString())) {
        await this.supplierModel.findOneAndUpdate(
          { customerId: new Types.ObjectId(supplierId.toString()) },
          {
            $set: {
              'metrics.averageRating': averageRating,
              'metrics.totalRatings': totalRatings
            }
          },
          { session }
        );
      }

      await session.commitTransaction();
      this.logger.log(`Rating created and supplier stats updated. Avg: ${averageRating} (${totalRatings} ratings)`);

      return savedRating;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error creating rating: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }
}
