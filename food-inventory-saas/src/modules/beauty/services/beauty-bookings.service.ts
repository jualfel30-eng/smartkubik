import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BeautyBooking,
  BeautyBookingDocument,
} from '../../../schemas/beauty-booking.schema';
import {
  BeautyService,
  BeautyServiceDocument,
} from '../../../schemas/beauty-service.schema';
import {
  Professional,
  ProfessionalDocument,
} from '../../../schemas/professional.schema';
import {
  StorefrontConfig,
  StorefrontConfigDocument,
} from '../../../schemas/storefront-config.schema';
import {
  CreateBeautyBookingDto,
  UpdateBookingStatusDto,
  GetAvailabilityDto,
} from '../../../dto/beauty';
import { BeautyWhatsAppNotificationsService } from './beauty-whatsapp-notifications.service';
import { WebPushService } from '../../notification-center/web-push.service';

/**
 * Servicio para gestión de reservas de belleza
 * Incluye algoritmo completo de cálculo de disponibilidad
 */
@Injectable()
export class BeautyBookingsService {
  private readonly logger = new Logger(BeautyBookingsService.name);

  constructor(
    @InjectModel(BeautyBooking.name)
    private beautyBookingModel: Model<BeautyBookingDocument>,
    @InjectModel(BeautyService.name)
    private beautyServiceModel: Model<BeautyServiceDocument>,
    @InjectModel(Professional.name)
    private professionalModel: Model<ProfessionalDocument>,
    @InjectModel(StorefrontConfig.name)
    private storefrontConfigModel: Model<StorefrontConfigDocument>,
    private readonly whatsappService: BeautyWhatsAppNotificationsService,
    private readonly webPushService: WebPushService,
  ) {}

  /**
   * Crea una nueva reserva
   */
  async create(dto: CreateBeautyBookingDto): Promise<BeautyBookingDocument> {
    const tenantId = new Types.ObjectId(dto.tenantId);

    // 1. Obtener servicios seleccionados
    const services = await this.beautyServiceModel
      .find({
        _id: { $in: dto.services.map((s) => new Types.ObjectId(s.service)) },
        tenantId,
      })
      .exec();

    if (services.length !== dto.services.length) {
      throw new BadRequestException('Some services not found');
    }

    // 2. Calcular totales
    let totalDuration = 0;
    let totalPrice = 0;

    const bookingServices = dto.services.map((serviceDto) => {
      const service = services.find(
        (s) => s._id.toString() === serviceDto.service,
      );

      if (!service) {
        throw new BadRequestException(`Service ${serviceDto.service} not found`);
      }

      let serviceDuration =
        service.duration + service.bufferBefore + service.bufferAfter;
      let servicePrice = service.price.amount;

      // Procesar addons si existen
      const addons: Array<{ name: string; price: number; duration: number }> = [];
      if (serviceDto.addonNames && serviceDto.addonNames.length > 0 && service.addons) {
        for (const addonName of serviceDto.addonNames) {
          const addon = service.addons.find((a) => a.name === addonName);
          if (addon && addon.isActive) {
            addons.push({
              name: addon.name,
              price: addon.price,
              duration: addon.duration || 0,
            });
            servicePrice += addon.price;
            serviceDuration += addon.duration || 0;
          }
        }
      }

      totalDuration += serviceDuration;
      totalPrice += servicePrice;

      return {
        service: service._id,
        name: service.name,
        duration: serviceDuration,
        price: servicePrice,
        addons,
      };
    });

    // 3. Calcular endTime
    const endTime = this.addMinutesToTime(dto.startTime, totalDuration);

    // 4. Validar disponibilidad
    const isAvailable = await this.validateAvailability({
      tenantId: dto.tenantId,
      date: dto.date,
      professionalId: dto.professionalId || undefined,
      serviceIds: dto.services.map((s) => s.service),
      startTime: dto.startTime,
      duration: totalDuration,
      locationId: dto.professionalId || undefined,
    });

    if (!isAvailable) {
      throw new BadRequestException(
        'The selected time slot is not available',
      );
    }

    // 5. Generar booking number
    const bookingNumber = await this.generateBookingNumber(dto.tenantId);

    // 6. Obtener nombre del profesional si existe
    let professionalName: string | undefined = undefined;
    if (dto.professionalId) {
      const professional = await this.professionalModel
        .findById(dto.professionalId)
        .exec();
      professionalName = professional?.name || undefined;
    }

    // 7. Crear booking
    const booking = await this.beautyBookingModel.create({
      tenantId,
      bookingNumber,
      client: dto.client,
      professional: dto.professionalId
        ? new Types.ObjectId(dto.professionalId)
        : undefined,
      professionalName: professionalName ?? undefined,
      services: bookingServices,
      date: new Date(dto.date),
      startTime: dto.startTime,
      endTime,
      totalPrice,
      totalDuration,
      status: 'pending',
      paymentStatus: 'unpaid',
      notes: dto.notes,
      locationId: dto.locationId
        ? new Types.ObjectId(dto.locationId)
        : undefined,
    });

    // 8. Enviar notificación WhatsApp de confirmación
    try {
      const notificationResult =
        await this.whatsappService.sendConfirmationNotification(booking);

      if (notificationResult.success) {
        this.logger.log(
          `WhatsApp confirmation sent for booking ${booking.bookingNumber}`,
        );
      } else {
        this.logger.warn(
          `WhatsApp notification failed for booking ${booking.bookingNumber}: ${notificationResult.error}`,
        );
      }
    } catch (error) {
      // No bloquear la creación del booking si falla WhatsApp
      this.logger.error(
        `Error sending WhatsApp notification: ${error.message}`,
      );
    }

    // 9. Push notification al equipo del salón
    try {
      const clientName = booking.client?.name || 'Un cliente';
      const serviceNames = booking.services?.map((s) => s.name).join(', ') || 'servicio';
      await this.webPushService.sendToTenant(dto.tenantId, {
        title: '📅 Nueva reserva',
        body: `${clientName} — ${serviceNames} a las ${booking.startTime}`,
        url: '/appointments',
      });
    } catch (error) {
      this.logger.error(`Push notification error on create: ${error.message}`);
    }

    return booking;
  }

  /**
   * Obtiene reservas con filtros
   */
  async findAll(
    tenantId: string,
    filters?: {
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      professionalId?: string;
      clientPhone?: string;
      locationId?: string;
    },
  ): Promise<BeautyBookingDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters) {
      if (filters.date) {
        query.date = new Date(filters.date);
      } else if (filters.startDate || filters.endDate) {
        query.date = {};
        if (filters.startDate) {
          query.date.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          // Include full end day
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.professionalId) {
        query.professional = new Types.ObjectId(filters.professionalId);
      }
      if (filters.clientPhone) {
        query['client.phone'] = filters.clientPhone;
      }
      if (filters.locationId) {
        query.locationId = new Types.ObjectId(filters.locationId);
      }
    }

    return this.beautyBookingModel
      .find(query)
      .populate('professional', 'name role avatar')
      .sort({ date: -1, startTime: -1 })
      .exec();
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<BeautyBookingDocument> {
    const booking = await this.beautyBookingModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      })
      .populate('professional', 'name role avatar instagram')
      .populate('services.service', 'name category')
      .exec();

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async findByBookingNumber(
    bookingNumber: string,
  ): Promise<BeautyBookingDocument> {
    const booking = await this.beautyBookingModel
      .findOne({ bookingNumber })
      .populate('professional', 'name role avatar')
      .exec();

    if (!booking) {
      throw new NotFoundException(
        `Booking with number ${bookingNumber} not found`,
      );
    }

    return booking;
  }

  async updateStatus(
    id: string,
    dto: UpdateBookingStatusDto,
    tenantId: string,
    userId: string,
  ): Promise<BeautyBookingDocument> {
    const booking = await this.findOne(id, tenantId);

    const previousStatus = booking.status;

    if (dto.status) {
      booking.status = dto.status;

      if (dto.status === 'confirmed') {
        booking.confirmedBy = new Types.ObjectId(userId);
        booking.confirmedAt = new Date();

        // Push al equipo: cita confirmada
        try {
          const clientName = booking.client?.name || 'Cliente';
          const serviceNames = booking.services?.map((s) => s.name).join(', ') || 'servicio';
          await this.webPushService.sendToTenant(tenantId, {
            title: '✅ Cita confirmada',
            body: `${clientName} — ${serviceNames} a las ${booking.startTime}`,
            url: '/appointments',
          });
        } catch (error) {
          this.logger.error(`Push notification error on confirm: ${error.message}`);
        }
      } else if (dto.status === 'cancelled') {
        booking.cancelledBy = new Types.ObjectId(userId);
        booking.cancelledAt = new Date();
        if (dto.cancellationReason) {
          booking.cancellationReason = dto.cancellationReason;
        }

        // Enviar notificación de cancelación
        try {
          const result =
            await this.whatsappService.sendCancellationNotification(booking);
          if (result.success) {
            this.logger.log(
              `WhatsApp cancellation sent for booking ${booking.bookingNumber}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error sending cancellation notification: ${error.message}`,
          );
        }
      }
    }

    if (dto.paymentStatus) {
      booking.paymentStatus = dto.paymentStatus;
    }

    if (dto.paymentMethod) {
      booking.paymentMethod = dto.paymentMethod;
    }

    if (dto.amountPaid !== undefined) {
      booking.amountPaid = dto.amountPaid;
    }

    return booking.save();
  }

  /**
   * ========== ALGORITMO DE DISPONIBILIDAD ==========
   * Calcula slots disponibles para una fecha específica
   */
  async getAvailability(dto: GetAvailabilityDto): Promise<{
    slots: Array<{
      time: string;
      endTime: string;
      availableProfessional?: string;
    }>;
  }> {
    const tenantId = new Types.ObjectId(dto.tenantId);
    const tenantIdString = dto.tenantId; // Guardar el string original para query de storefront

    // 1. Obtener servicios y calcular duración total
    const services = await this.beautyServiceModel
      .find({
        _id: { $in: dto.serviceIds.map((id) => new Types.ObjectId(id)) },
        tenantId,
      })
      .exec();

    const totalDuration = services.reduce(
      (sum, s) => sum + s.duration + s.bufferBefore + s.bufferAfter,
      0,
    );

    // 2. Obtener configuración del storefront
    // IMPORTANTE: El campo tenantId en storefrontconfigs está como STRING, no ObjectId
    const storefront = await this.storefrontConfigModel
      .findOne({ tenantId: tenantIdString })
      .exec();

    if (!storefront || !(storefront as any).beautyConfig?.enabled) {
      throw new BadRequestException('Beauty booking not enabled for tenant');
    }

    const beautyConfig = (storefront as any).beautyConfig;
    const slotDuration = beautyConfig.bookingSettings?.slotDuration || 30;

    // 3. Obtener horarios del negocio para ese día
    const dayOfWeek = new Date(dto.date).getDay();
    const businessHours = beautyConfig.businessHours?.find(
      (h: any) => h.day === dayOfWeek,
    );

    if (!businessHours || !businessHours.isOpen) {
      return { slots: [] }; // Cerrado ese día
    }

    // 4. Generar slots candidatos
    const allSlots = this.generateTimeSlots(
      businessHours.open,
      businessHours.close,
      slotDuration,
    );

    // 5. Obtener profesionales elegibles
    let professionals: ProfessionalDocument[];
    if (dto.professionalId) {
      const prof = await this.professionalModel.findById(dto.professionalId);
      professionals = prof ? [prof] : [];
    } else {
      // Profesionales que ofrecen TODOS los servicios
      professionals = await this.getProfessionalsForServices(
        dto.serviceIds,
        tenantId,
      );
    }

    if (professionals.length === 0) {
      return { slots: [] };
    }

    // 6. Obtener bookings existentes del día
    const existingBookings = await this.beautyBookingModel
      .find({
        tenantId,
        date: new Date(dto.date),
        status: { $nin: ['cancelled'] },
        professional: dto.professionalId
          ? new Types.ObjectId(dto.professionalId)
          : { $in: professionals.map((p) => p._id) },
      })
      .exec();

    // 7. Filtrar slots disponibles
    const availableSlots: Array<{
      time: string;
      endTime: string;
      availableProfessional?: string;
    }> = [];
    for (const slot of allSlots) {
      const slotEnd = this.addMinutesToTime(slot, totalDuration);

      // Verificar que cabe antes del cierre
      if (slotEnd > businessHours.close) continue;

      // Buscar profesional disponible
      const availableProfessional = professionals.find((prof) => {
        // Verificar horario del profesional
        const profSchedule = prof.schedule.find((s) => s.day === dayOfWeek);
        if (!profSchedule || !profSchedule.isWorking) return false;
        if (slot < profSchedule.start || slotEnd > profSchedule.end)
          return false;

        // Verificar break del profesional
        if (profSchedule.breakStart && profSchedule.breakEnd) {
          const overlapsBreak = !(
            slotEnd <= profSchedule.breakStart || slot >= profSchedule.breakEnd
          );
          if (overlapsBreak) return false;
        }

        // Verificar conflictos con bookings existentes
        const hasConflict = existingBookings.some(
          (booking) =>
            booking.professional?.toString() === prof._id.toString() &&
            !(slotEnd <= booking.startTime || slot >= booking.endTime),
        );

        return !hasConflict;
      });

      if (availableProfessional) {
        availableSlots.push({
          time: slot,
          endTime: slotEnd,
          availableProfessional: availableProfessional._id.toString(),
        });
      } else if (!dto.professionalId) {
        // Si no se especificó profesional, buscar CUALQUIERA disponible
        continue;
      }
    }

    return { slots: availableSlots };
  }

  /**
   * Valida si un slot específico está disponible
   */
  private async validateAvailability(params: {
    tenantId: string;
    date: string;
    professionalId?: string;
    serviceIds: string[];
    startTime: string;
    duration: number;
    locationId?: string;
  }): Promise<boolean> {
    const availabilityDto: GetAvailabilityDto = {
      tenantId: params.tenantId,
      date: params.date,
      professionalId: params.professionalId,
      serviceIds: params.serviceIds,
      locationId: params.locationId,
    };

    const { slots } = await this.getAvailability(availabilityDto);

    return slots.some((slot) => slot.time === params.startTime);
  }

  /**
   * Genera array de slots de tiempo
   */
  private generateTimeSlots(
    start: string,
    end: string,
    intervalMinutes: number,
  ): string[] {
    const slots: string[] = [];
    let current = start;

    while (current < end) {
      slots.push(current);
      current = this.addMinutesToTime(current, intervalMinutes);
    }

    return slots;
  }

  /**
   * Suma minutos a una hora en formato HH:MM
   */
  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  }

  /**
   * Obtiene profesionales que ofrecen TODOS los servicios especificados
   */
  private async getProfessionalsForServices(
    serviceIds: string[],
    tenantId: Types.ObjectId,
  ): Promise<ProfessionalDocument[]> {
    const services = await this.beautyServiceModel
      .find({
        _id: { $in: serviceIds.map((id) => new Types.ObjectId(id)) },
        tenantId,
      })
      .exec();

    if (services.length === 0) return [];

    // Intersección de profesionales
    const professionalSets = services.map((s) => s.professionals);
    const commonProfessionalIds = this.findIntersection(professionalSets);

    if (commonProfessionalIds.length === 0) return [];

    return this.professionalModel
      .find({
        _id: { $in: commonProfessionalIds },
        tenantId,
        isActive: true,
      })
      .exec();
  }

  /**
   * Encuentra intersección de arrays de ObjectId
   */
  private findIntersection(arrays: Types.ObjectId[][]): Types.ObjectId[] {
    if (arrays.length === 0) return [];
    if (arrays.length === 1) return arrays[0];

    return arrays.reduce((common, current) =>
      common.filter((id) =>
        current.some((cid) => cid.toString() === id.toString()),
      ),
    );
  }

  /**
   * Genera número de reserva único
   */
  private async generateBookingNumber(tenantId: string): Promise<string> {
    const count = await this.beautyBookingModel
      .countDocuments({
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    return `BBK-${String(count + 1).padStart(5, '0')}`;
  }
}
