import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Professional,
  ProfessionalDocument,
} from '../../../schemas/professional.schema';
import {
  CreateProfessionalDto,
  UpdateProfessionalDto,
} from '../../../dto/beauty';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectModel(Professional.name)
    private professionalModel: Model<ProfessionalDocument>,
  ) {}

  async create(
    dto: CreateProfessionalDto,
    tenantId: string,
    userId: string,
  ): Promise<ProfessionalDocument> {
    // Validar horarios si se proporcionan
    if (dto.schedule && dto.schedule.length > 0) {
      this.validateSchedule(dto.schedule);
    }

    const locationId = dto.locationId
      ? new Types.ObjectId(dto.locationId)
      : undefined;

    return this.professionalModel.create({
      ...dto,
      locationId,
      tenantId: new Types.ObjectId(tenantId),
      createdBy: new Types.ObjectId(userId),
    });
  }

  async findAll(
    tenantId: string,
    filters?: {
      locationId?: string;
      isActive?: boolean;
    },
  ): Promise<ProfessionalDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters) {
      if (filters.locationId) {
        query.locationId = new Types.ObjectId(filters.locationId);
      }
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
    }

    return this.professionalModel
      .find(query)
      .populate('locationId', 'name address')
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<ProfessionalDocument> {
    const professional = await this.professionalModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      })
      .populate('locationId')
      .exec();

    if (!professional) {
      throw new NotFoundException(`Professional with ID ${id} not found`);
    }

    return professional;
  }

  async update(
    id: string,
    dto: UpdateProfessionalDto,
    tenantId: string,
    userId: string,
  ): Promise<ProfessionalDocument> {
    const professional = await this.findOne(id, tenantId);

    // Validar horarios si se actualizan
    if (dto.schedule && dto.schedule.length > 0) {
      this.validateSchedule(dto.schedule);
    }

    if (dto.locationId) {
      (dto as any).locationId = new Types.ObjectId(dto.locationId);
    }

    Object.assign(professional, dto);
    professional.updatedBy = new Types.ObjectId(userId);

    return professional.save();
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const professional = await this.findOne(id, tenantId);
    professional.isActive = false;
    await professional.save();
  }

  /**
   * Obtiene profesionales que ofrecen servicios específicos
   */
  async findByServices(
    serviceIds: string[],
    tenantId: string,
  ): Promise<ProfessionalDocument[]> {
    const { BeautyService } = await import(
      '../../../schemas/beauty-service.schema'
    );
    const beautyServiceModel = this.professionalModel.db.model(
      BeautyService.name,
    );

    // Buscar servicios que contengan estos profesionales
    const services = await beautyServiceModel
      .find({
        _id: { $in: serviceIds.map((id) => new Types.ObjectId(id)) },
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    // Extraer IDs de profesionales que ofrecen TODOS los servicios
    const professionalSets = services.map((s) => s.professionals);
    const commonProfessionalIds = this.findCommonElements(professionalSets);

    if (commonProfessionalIds.length === 0) {
      return [];
    }

    return this.professionalModel
      .find({
        _id: { $in: commonProfessionalIds },
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .exec();
  }

  /**
   * Valida la configuración de horarios
   */
  private validateSchedule(schedule: any[]): void {
    for (const slot of schedule) {
      const startMins = this.timeToMinutes(slot.start);
      const endMins = this.timeToMinutes(slot.end);

      if (endMins <= startMins) {
        throw new BadRequestException(
          `Invalid schedule: end time must be after start time for day ${slot.day}`,
        );
      }

      if (slot.breakStart && slot.breakEnd) {
        const breakStartMins = this.timeToMinutes(slot.breakStart);
        const breakEndMins = this.timeToMinutes(slot.breakEnd);

        if (
          breakStartMins < startMins ||
          breakStartMins >= endMins ||
          breakEndMins <= startMins ||
          breakEndMins > endMins
        ) {
          throw new BadRequestException(
            `Break time must be within working hours for day ${slot.day}`,
          );
        }

        if (breakEndMins <= breakStartMins) {
          throw new BadRequestException(
            `Break end must be after break start for day ${slot.day}`,
          );
        }
      }
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Encuentra elementos comunes en múltiples arrays
   */
  private findCommonElements(arrays: Types.ObjectId[][]): Types.ObjectId[] {
    if (arrays.length === 0) return [];
    if (arrays.length === 1) return arrays[0];

    return arrays.reduce((common, current) => {
      return common.filter((id) =>
        current.some((cid) => cid.toString() === id.toString()),
      );
    });
  }
}
