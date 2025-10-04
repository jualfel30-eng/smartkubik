import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from '../../schemas/appointment.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { Service, ServiceDocument } from '../../schemas/service.schema';
import { Resource, ResourceDocument } from '../../schemas/resource.schema';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  AppointmentFilterDto,
  CheckAvailabilityDto,
} from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
  ) {}

  async create(
    tenantId: string,
    createAppointmentDto: CreateAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    this.logger.log(`Creating appointment for tenant: ${tenantId}`);

    // Validate customer
    const customer = await this.customerModel
      .findOne({ _id: createAppointmentDto.customerId, tenantId })
      .exec();

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Validate service
    const service = await this.serviceModel
      .findOne({ _id: createAppointmentDto.serviceId, tenantId })
      .exec();

    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    if (service.status !== 'active') {
      throw new BadRequestException('El servicio no está activo');
    }

    // Validate resource (if provided)
    let resource: any = null;
    if (createAppointmentDto.resourceId) {
      resource = await this.resourceModel
        .findOne({ _id: createAppointmentDto.resourceId, tenantId })
        .exec();

      if (!resource) {
        throw new NotFoundException('Recurso no encontrado');
      }

      if (resource.status !== 'active') {
        throw new BadRequestException('El recurso no está activo');
      }
    }

    // Check for conflicts
    const hasConflict = await this.checkConflict(
      tenantId,
      new Date(createAppointmentDto.startTime),
      new Date(createAppointmentDto.endTime),
      createAppointmentDto.resourceId,
    );

    if (hasConflict) {
      throw new ConflictException(
        'Ya existe una cita en ese horario para el recurso seleccionado',
      );
    }

    // Get primary phone from customer contacts
    const primaryPhone = customer.contacts?.find(
      (c: any) => c.type === 'phone' && c.isPrimary,
    )?.value || customer.contacts?.find((c: any) => c.type === 'phone')?.value;

    // Create appointment with denormalized data
    const newAppointment = new this.appointmentModel({
      ...createAppointmentDto,
      tenantId,
      customerName: customer.name,
      customerPhone: primaryPhone,
      serviceName: service.name,
      serviceDuration: service.duration,
      servicePrice: service.price,
      resourceName: resource?.name,
      status: createAppointmentDto.status || 'pending',
    });

    const saved = await newAppointment.save();
    this.logger.log(`Appointment created successfully: ${saved._id}`);
    return saved;
  }

  async findAll(tenantId: string, filters?: AppointmentFilterDto): Promise<Appointment[]> {
    const query: any = { tenantId };

    // Date range filter
    if (filters?.startDate || filters?.endDate) {
      query.startTime = {};

      if (filters.startDate) {
        query.startTime.$gte = new Date(filters.startDate);
      }

      if (filters.endDate) {
        query.startTime.$lte = new Date(filters.endDate);
      }
    }

    // Other filters
    if (filters?.customerId) {
      query.customerId = filters.customerId;
    }

    if (filters?.serviceId) {
      query.serviceId = filters.serviceId;
    }

    if (filters?.resourceId) {
      query.resourceId = filters.resourceId;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    // Text search
    if (filters?.search) {
      query.$or = [
        { customerName: { $regex: filters.search, $options: 'i' } },
        { serviceName: { $regex: filters.search, $options: 'i' } },
        { resourceName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return this.appointmentModel
      .find(query)
      .sort({ startTime: 1 })
      .populate('customerId', 'name phone email')
      .populate('serviceId', 'name duration price')
      .populate('resourceId', 'name type')
      .exec();
  }

  async findOne(tenantId: string, id: string): Promise<Appointment> {
    const appointment = await this.appointmentModel
      .findOne({ _id: id, tenantId })
      .populate('customerId', 'name phone email')
      .populate('serviceId', 'name duration price category')
      .populate('resourceId', 'name type email phone')
      .exec();

    if (!appointment) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    return appointment;
  }

  async update(
    tenantId: string,
    id: string,
    updateAppointmentDto: UpdateAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    this.logger.log(`Updating appointment ${id} for tenant: ${tenantId}`);

    const existing = await this.findOne(tenantId, id);

    // If changing time or resource, check conflicts
    if (
      updateAppointmentDto.startTime ||
      updateAppointmentDto.endTime ||
      updateAppointmentDto.resourceId
    ) {
      const startTime = updateAppointmentDto.startTime
        ? new Date(updateAppointmentDto.startTime)
        : existing.startTime;
      const endTime = updateAppointmentDto.endTime
        ? new Date(updateAppointmentDto.endTime)
        : existing.endTime;
      const resourceId = updateAppointmentDto.resourceId || existing.resourceId?.toString();

      const hasConflict = await this.checkConflict(tenantId, startTime, endTime, resourceId, id);

      if (hasConflict) {
        throw new ConflictException(
          'Ya existe una cita en ese horario para el recurso seleccionado',
        );
      }
    }

    // Handle status changes
    const updateData: any = { ...updateAppointmentDto };

    if (updateAppointmentDto.status === 'confirmed' && !existing.confirmed) {
      updateData.confirmed = true;
      updateData.confirmedAt = new Date();
      updateData.confirmedBy = userId;
    }

    if (updateAppointmentDto.status === 'completed' && !existing.completedAt) {
      updateData.completedAt = new Date();
      updateData.completedBy = userId;
    }

    if (updateAppointmentDto.status === 'cancelled' && !existing.cancelledAt) {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = userId;
    }

    const updated = await this.appointmentModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: updateData }, { new: true })
      .populate('customerId', 'name contacts email')
      .populate('serviceId', 'name duration price')
      .populate('resourceId', 'name type')
      .exec();

    if (!updated) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    this.logger.log(`Appointment updated successfully: ${id}`);
    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    this.logger.log(`Deleting appointment ${id} for tenant: ${tenantId}`);

    const result = await this.appointmentModel.deleteOne({ _id: id, tenantId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    this.logger.log(`Appointment deleted successfully: ${id}`);
  }

  /**
   * Check if there's a conflict with existing appointments
   */
  async checkConflict(
    tenantId: string,
    startTime: Date,
    endTime: Date,
    resourceId?: string,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const query: any = {
      tenantId,
      status: { $in: ['pending', 'confirmed', 'in_progress'] }, // Only check active appointments
      $or: [
        // New appointment starts during existing appointment
        { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
        // New appointment ends during existing appointment
        { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
        // New appointment completely contains existing appointment
        { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
      ],
    };

    if (resourceId) {
      query.resourceId = resourceId;
    }

    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }

    const conflicts = await this.appointmentModel.findOne(query).exec();
    return !!conflicts;
  }

  /**
   * Get available time slots for a service on a specific date
   */
  async getAvailableSlots(
    tenantId: string,
    checkAvailabilityDto: CheckAvailabilityDto,
  ): Promise<{ start: string; end: string }[]> {
    const { serviceId, resourceId, date } = checkAvailabilityDto;

    // Get service details
    const service = await this.serviceModel.findOne({ _id: serviceId, tenantId }).exec();
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const targetDate = new Date(date);
    const dayOfWeek = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ][targetDate.getDay()];

    // Get resource schedule (if resource specified)
    let workStart = '09:00';
    let workEnd = '18:00';

    if (resourceId) {
      const resource = await this.resourceModel.findOne({ _id: resourceId, tenantId }).exec();
      if (!resource) {
        throw new NotFoundException('Recurso no encontrado');
      }

      const daySchedule = resource.schedule?.[dayOfWeek];
      if (!daySchedule || !daySchedule.available) {
        return []; // Resource not available on this day
      }

      workStart = daySchedule.start;
      workEnd = daySchedule.end;
    }

    // Get existing appointments for this resource on this date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query: any = {
      tenantId,
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
      startTime: { $gte: startOfDay, $lte: endOfDay },
    };

    if (resourceId) {
      query.resourceId = resourceId;
    }

    const existingAppointments = await this.appointmentModel.find(query).sort({ startTime: 1 }).exec();

    // Generate available slots
    const slots: { start: string; end: string }[] = [];
    const [workHour, workMin] = workStart.split(':').map(Number);
    const [endHour, endMin] = workEnd.split(':').map(Number);

    let currentTime = new Date(targetDate);
    currentTime.setHours(workHour, workMin, 0, 0);

    const workEndTime = new Date(targetDate);
    workEndTime.setHours(endHour, endMin, 0, 0);

    const slotDuration = service.duration + (service.bufferTimeBefore || 0) + (service.bufferTimeAfter || 0);

    while (currentTime.getTime() + slotDuration * 60000 <= workEndTime.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);

      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments.some((apt) => {
        return (
          (currentTime >= apt.startTime && currentTime < apt.endTime) ||
          (slotEnd > apt.startTime && slotEnd <= apt.endTime) ||
          (currentTime <= apt.startTime && slotEnd >= apt.endTime)
        );
      });

      if (!hasConflict) {
        slots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
        });
      }

      // Move to next 15-minute slot
      currentTime = new Date(currentTime.getTime() + 15 * 60000);
    }

    return slots;
  }

  /**
   * Get appointments for a specific date range (for calendar view)
   */
  async getCalendarView(
    tenantId: string,
    startDate: string,
    endDate: string,
    resourceId?: string,
  ): Promise<Appointment[]> {
    const query: any = {
      tenantId,
      startTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    if (resourceId) {
      query.resourceId = resourceId;
    }

    return this.appointmentModel.find(query).sort({ startTime: 1 }).exec();
  }

  /**
   * Get appointment statistics
   */
  async getStatistics(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    revenue: number;
    mostPopularServices: { serviceName: string; count: number }[];
  }> {
    const appointments = await this.appointmentModel
      .find({
        tenantId,
        startTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
      })
      .exec();

    const byStatus = appointments.reduce(
      (acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const revenue = appointments
      .filter((apt) => apt.status === 'completed' && apt.paymentStatus === 'paid')
      .reduce((sum, apt) => sum + (apt.paidAmount || 0), 0);

    const serviceCount = appointments.reduce(
      (acc, apt) => {
        if (apt.serviceName) {
          acc[apt.serviceName] = (acc[apt.serviceName] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostPopularServices = Object.entries(serviceCount)
      .map(([serviceName, count]) => ({ serviceName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: appointments.length,
      byStatus,
      revenue,
      mostPopularServices,
    };
  }
}
