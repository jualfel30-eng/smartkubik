import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../../schemas/subscription-plan.schema';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from '../../dto/subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectModel(SubscriptionPlan.name)
    private planModel: Model<SubscriptionPlanDocument>,
  ) {}

  async create(createPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const newPlan = new this.planModel(createPlanDto);
    return newPlan.save();
  }

  async findAll(): Promise<SubscriptionPlan[]> {
    return this.planModel.find({ isArchived: false }).exec();
  }

  async findOneByName(name: string): Promise<SubscriptionPlan> {
    const plan = await this.planModel.findOne({ name, isArchived: false }).exec();
    if (!plan) {
      throw new NotFoundException(`Subscription plan with name "${name}" not found`);
    }
    return plan;
  }

  async findOne(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planModel.findById(id).exec();
    if (!plan || plan.isArchived) {
      throw new NotFoundException(`Subscription plan with ID "${id}" not found`);
    }
    return plan;
  }

  async update(id: string, updatePlanDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const existingPlan = await this.planModel.findByIdAndUpdate(id, updatePlanDto, { new: true }).exec();
    if (!existingPlan) {
      throw new NotFoundException(`Subscription plan with ID "${id}" not found`);
    }
    return existingPlan;
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.planModel.updateOne({ _id: id }, { isArchived: true });
    if (result.matchedCount === 0) {
      throw new NotFoundException(`Subscription plan with ID "${id}" not found`);
    }
    return { message: `Subscription plan with ID "${id}" has been archived.` };
  }
}
