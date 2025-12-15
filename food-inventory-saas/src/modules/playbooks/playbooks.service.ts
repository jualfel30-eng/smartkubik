import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Playbook, PlaybookDocument } from "../../schemas/playbook.schema";

@Injectable()
export class PlaybooksService {
  constructor(@InjectModel(Playbook.name) private readonly playbookModel: Model<PlaybookDocument>) {}

  create(dto: Partial<Playbook>) {
    return this.playbookModel.create(dto);
  }

  findAll(tenantId: string) {
    return this.playbookModel.find({ tenantId }).lean();
  }

  async update(id: string, dto: Partial<Playbook>, tenantId: string) {
    const updated = await this.playbookModel.findOneAndUpdate({ _id: id, tenantId }, dto, { new: true });
    if (!updated) throw new NotFoundException("Playbook no encontrado");
    return updated;
  }

  async delete(id: string, tenantId: string) {
    const res = await this.playbookModel.deleteOne({ _id: id, tenantId });
    return { deleted: res.deletedCount === 1 };
  }
}
