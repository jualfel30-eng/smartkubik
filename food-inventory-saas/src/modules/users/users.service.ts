import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "../../schemas/user.schema";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) { }

  async searchByEmail(email: string): Promise<User[]> {
    if (!email) {
      return [];
    }

    return this.userModel
      .find({
        email: { $regex: email, $options: "i" },
        isActive: true,
      })
      .select("_id firstName lastName email")
      .limit(10)
      .exec();
  }

  async findAll(filter: any = {}): Promise<User[]> {
    return this.userModel.find(filter).select("-password").exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByPhone(
    phone: string,
    tenantId: string,
  ): Promise<UserDocument | null> {
    // 1. Sanitize input: Remove "+" and any non-numeric chars
    const strippedPhone = phone.replace(/\D/g, "");

    const variations = [
      phone,
      strippedPhone,
      `+${strippedPhone}`
    ];

    // Handle Venezuela (58) -> Local (0...)
    if (strippedPhone.startsWith('58') && strippedPhone.length === 12) {
      // 58 412... -> 0412...
      variations.push('0' + strippedPhone.substring(2));
      // 58 412... -> 412... (no prefix)
      variations.push(strippedPhone.substring(2));
    }

    console.log(`[DEBUG UsersService] findByPhone input="${phone}". Variations: ${JSON.stringify(variations)}`);

    // 2. Search for ANY of the variations using NATIVE collection to bypass schema/casting issues
    let tenantObjectId: Types.ObjectId | null = null;
    try {
      tenantObjectId = new Types.ObjectId(tenantId);
    } catch (e) { }

    const tenantQuery = { $in: [tenantId, tenantObjectId].filter(Boolean) };

    console.log(`[DEBUG UsersService] Native Query: tenantId IN ${JSON.stringify(tenantQuery)}, phone IN ${JSON.stringify(variations)}`);

    const rawUser = await this.userModel.collection.findOne({
      tenantId: tenantQuery,
      phone: { $in: variations }
    });

    if (rawUser) {
      console.log(`[DEBUG UsersService] ✅ Found User via Native Query: ${rawUser['firstName']} (ID: ${rawUser['_id']})`);

      // Hydrate to Mongoose Document to ensure compatibility
      // @ts-ignore
      return this.userModel.hydrate(rawUser);
    }

    console.log(`[DEBUG UsersService] ❌ Native Query returned null.`);
    return null;
  }
}
