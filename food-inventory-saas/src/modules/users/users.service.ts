import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async searchByEmail(email: string): Promise<User[]> {
    if (!email) {
      return [];
    }

    return this.userModel
      .find({
        email: { $regex: email, $options: 'i' },
        isActive: true,
      })
      .select('_id firstName lastName email')
      .limit(10)
      .exec();
  }
}
