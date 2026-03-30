import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BeautyLoyaltyRecord,
  BeautyLoyaltyRecordDocument,
} from '../../../schemas/beauty-loyalty.schema';

@Injectable()
export class BeautyLoyaltyService {
  constructor(
    @InjectModel(BeautyLoyaltyRecord.name)
    private loyaltyRecordModel: Model<BeautyLoyaltyRecordDocument>,
  ) {}

  async findOrCreateByPhone(
    tenantId: string,
    clientPhone: string,
    clientName: string,
    clientEmail?: string,
  ): Promise<BeautyLoyaltyRecordDocument> {
    let record = await this.loyaltyRecordModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        clientPhone,
      })
      .exec();

    if (!record) {
      record = await this.loyaltyRecordModel.create({
        tenantId: new Types.ObjectId(tenantId),
        clientPhone,
        clientName,
        clientEmail,
        points: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        totalVisits: 0,
      });
    }

    return record;
  }

  async addPoints(
    tenantId: string,
    clientPhone: string,
    clientName: string,
    amount: number,
    bookingId: string,
    description: string,
  ): Promise<BeautyLoyaltyRecordDocument> {
    const record = await this.findOrCreateByPhone(
      tenantId,
      clientPhone,
      clientName,
    );

    record.points += amount;
    record.totalEarned += amount;
    record.totalVisits += 1;
    record.lastVisit = new Date();

    record.history.push({
      type: 'earned',
      amount,
      booking: new Types.ObjectId(bookingId),
      description,
      date: new Date(),
    });

    return record.save();
  }

  async redeemPoints(
    tenantId: string,
    clientPhone: string,
    amount: number,
    description: string,
  ): Promise<BeautyLoyaltyRecordDocument> {
    const record = await this.loyaltyRecordModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        clientPhone,
      })
      .exec();

    if (!record) {
      throw new NotFoundException('Loyalty record not found');
    }

    if (record.points < amount) {
      throw new NotFoundException('Insufficient points');
    }

    record.points -= amount;
    record.totalRedeemed += amount;

    record.history.push({
      type: 'redeemed',
      amount,
      description,
      date: new Date(),
    });

    return record.save();
  }

  async getBalance(
    tenantId: string,
    clientPhone: string,
  ): Promise<{
    points: number;
    totalEarned: number;
    totalRedeemed: number;
    totalVisits: number;
  }> {
    const record = await this.loyaltyRecordModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        clientPhone,
      })
      .exec();

    if (!record) {
      return {
        points: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        totalVisits: 0,
      };
    }

    return {
      points: record.points,
      totalEarned: record.totalEarned,
      totalRedeemed: record.totalRedeemed,
      totalVisits: record.totalVisits,
    };
  }

  async getTopCustomers(
    tenantId: string,
    limit: number = 10,
  ): Promise<BeautyLoyaltyRecordDocument[]> {
    return this.loyaltyRecordModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ points: -1 })
      .limit(limit)
      .exec();
  }
}
