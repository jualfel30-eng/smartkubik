import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
  ResourceBlock,
  ResourceBlockDocument,
} from '../../../schemas/resource-block.schema';
import {
  Inventory,
  InventoryDocument,
  InventoryMovement,
  InventoryMovementDocument,
} from '../../../schemas/inventory.schema';
import {
  Customer,
  CustomerDocument,
} from '../../../schemas/customer.schema';
import {
  CreateBeautyBookingDto,
  UpdateBookingStatusDto,
  UpdateBeautyBookingDto,
  GetAvailabilityDto,
} from '../../../dto/beauty';
import { BeautyWhatsAppNotificationsService } from './beauty-whatsapp-notifications.service';
import { BeautyLoyaltyService } from './beauty-loyalty.service';
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
    @InjectModel(ResourceBlock.name)
    private resourceBlockModel: Model<ResourceBlockDocument>,
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
    @InjectModel(InventoryMovement.name)
    private inventoryMovementModel: Model<InventoryMovementDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    private readonly whatsappService: BeautyWhatsAppNotificationsService,
    private readonly loyaltyService: BeautyLoyaltyService,
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
      packageId: dto.packageId
        ? new Types.ObjectId(dto.packageId)
        : undefined,
    });

    // 8. Enviar notificación WhatsApp de confirmación (si autoConfirmation no está deshabilitado)
    try {
      const storefront = await this.storefrontConfigModel
        .findOne({ tenantId: dto.tenantId })
        .exec();
      const autoConfirmation =
        (storefront as any)?.beautyConfig?.notifications?.autoConfirmation !== false;

      if (autoConfirmation && booking.client.phone) {
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

    // Generate recurring occurrences if requested
    let occurrencesCreated = 0;
    if (dto.recurrenceRule) {
      const seriesId = new Types.ObjectId();

      // Update main booking with series info
      await this.beautyBookingModel.updateOne(
        { _id: booking._id },
        {
          $set: {
            seriesId,
            isRecurring: true,
            occurrenceIndex: 0,
            recurrenceRule: dto.recurrenceRule,
          },
        },
      );

      const mainDate = new Date(dto.date);
      const futureDates = this.calculateRecurringDates(mainDate, dto.recurrenceRule);

      for (let i = 0; i < futureDates.length; i++) {
        try {
          const futureDate = futureDates[i];
          const futureDateStr = futureDate.toISOString().split('T')[0];

          // Check for conflicts with existing bookings (same professional, same time)
          if (dto.professionalId) {
            const conflict = await this.beautyBookingModel.findOne({
              tenantId: booking.tenantId,
              professional: new Types.ObjectId(dto.professionalId),
              date: {
                $gte: new Date(futureDateStr),
                $lt: new Date(new Date(futureDateStr).getTime() + 24 * 60 * 60 * 1000),
              },
              startTime: dto.startTime,
              status: { $nin: ['cancelled', 'no_show'] },
              isDeleted: { $ne: true },
            });
            if (conflict) {
              this.logger.warn(
                `Skipping recurring occurrence ${i + 1}: conflict on ${futureDateStr} at ${dto.startTime}`,
              );
              continue;
            }
          }

          const bookingObj = booking.toObject();
          await this.beautyBookingModel.create({
            ...bookingObj,
            _id: new Types.ObjectId(),
            date: futureDate,
            seriesId,
            isRecurring: true,
            occurrenceIndex: i + 1,
            recurrenceRule: undefined,
            status: 'pending',
            whatsappNotifications: [],
            reminderSentAt: undefined,
            loyaltyPointsAwarded: 0,
            loyaltyPointsRedeemed: 0,
            loyaltyDiscount: 0,
            paymentStatus: 'unpaid',
            bookingNumber: await this.generateBookingNumber(booking.tenantId.toString()),
            createdAt: undefined,
            updatedAt: undefined,
          });
          occurrencesCreated++;
        } catch (err) {
          this.logger.error(`Failed to create recurring occurrence ${i + 1}:`, err);
          // Continue — don't fail the whole series
        }
      }
    }

    // Return with occurrences count
    return { ...booking.toObject(), occurrencesCreated } as any;
  }

  /**
   * Calcula fechas futuras para una serie de citas recurrentes
   */
  private calculateRecurringDates(startDate: Date, rule: any): Date[] {
    const dates: Date[] = [];
    const maxOccurrences = Math.min(rule.endAfterOccurrences || 12, 12);
    const endDate = rule.endDate ? new Date(rule.endDate) : null;

    // Interval in days
    let intervalDays: number;
    if (rule.frequency === 'weekly') intervalDays = 7 * (rule.interval || 1);
    else if (rule.frequency === 'biweekly') intervalDays = 14;
    else if (rule.frequency === 'monthly') intervalDays = 30; // approximate
    else intervalDays = 7;

    let current = new Date(startDate);
    let count = 0;

    while (count < maxOccurrences) {
      current = new Date(current.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      if (endDate && current > endDate) break;
      dates.push(new Date(current));
      count++;
    }

    return dates;
  }

  /**
   * Cancela todas las citas futuras de una serie
   */
  async cancelSeries(
    seriesId: string,
    tenantId: string,
    cancelledBy?: string,
  ): Promise<{ cancelledCount: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.beautyBookingModel.updateMany(
      {
        tenantId: new Types.ObjectId(tenantId),
        seriesId: new Types.ObjectId(seriesId),
        date: { $gte: today },
        status: { $nin: ['completed', 'cancelled'] },
        isDeleted: { $ne: true },
      },
      {
        $set: {
          status: 'cancelled',
          cancellationReason: 'Serie cancelada',
          cancelledBy: cancelledBy ? new Types.ObjectId(cancelledBy) : undefined,
          cancelledAt: new Date(),
        },
      },
    );

    return { cancelledCount: result.modifiedCount };
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
    const previousPaymentStatus = booking.paymentStatus;

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

        // Check waitlist for freed slot (fire-and-forget)
        this.checkWaitlistAvailability(
          booking.tenantId.toString(),
          booking.date instanceof Date ? booking.date.toISOString().split('T')[0] : booking.date as string,
          booking.professional?.toString(),
          booking.startTime,
        ).catch(err => this.logger.error(`Waitlist check error: ${err}`));
      } else if (dto.status === 'no_show' && previousStatus !== 'no_show') {
        // Process no-show penalty (fire-and-forget)
        this.processNoShow(booking).catch(err =>
          this.logger.error(`No-show processing error: ${err}`)
        );
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

    // ── Lealtad: al marcar como pagado ──────────────────────────────────
    if (dto.paymentStatus === 'paid' && previousPaymentStatus !== 'paid' && booking.client.phone) {
      try {
        const storefront = await this.storefrontConfigModel
          .findOne({ tenantId: booking.tenantId })
          .exec();
        const loyaltyConfig = (storefront as any)?.beautyConfig?.loyalty;

        // 1. Redimir puntos si se solicitó
        if (dto.loyaltyPointsRedeemed && dto.loyaltyPointsRedeemed > 0) {
          await this.loyaltyService.redeemPoints(
            booking.tenantId.toString(),
            booking.client.phone,
            dto.loyaltyPointsRedeemed,
            `Redención en cita ${booking.bookingNumber}`,
          );
          booking.loyaltyPointsRedeemed = dto.loyaltyPointsRedeemed;
        }

        // 2. Acumular puntos automáticamente si el programa de lealtad está activo
        if (loyaltyConfig?.enabled && booking.loyaltyPointsAwarded === 0) {
          const amountPaid = (dto.amountPaid ?? booking.totalPrice) - (dto.loyaltyDiscount ?? 0);
          const pointsPerUnit = loyaltyConfig.pointsPerUnit ?? 1;
          const pointsEarned = Math.floor(amountPaid * pointsPerUnit);

          if (pointsEarned > 0) {
            await this.loyaltyService.addPoints(
              booking.tenantId.toString(),
              booking.client.phone,
              booking.client.name,
              pointsEarned,
              booking._id.toString(),
              `Cita ${booking.bookingNumber}`,
            );
            booking.loyaltyPointsAwarded = pointsEarned;
            this.logger.log(
              `Loyalty: awarded ${pointsEarned} pts to ${booking.client.phone} for booking ${booking.bookingNumber}`,
            );
          }
        }
      } catch (error) {
        // No revertir el pago si falla lealtad
        this.logger.error(`Error handling loyalty on payment: ${error.message}`);
      }
    }

    // ── Addons: guardar productos adicionales vendidos ───────────────────────
    if (dto.addons && dto.addons.length > 0) {
      booking.addons = dto.addons.map((a) => ({
        name: a.name || '',
        price: a.price ?? 0,
        quantity: a.quantity ?? 1,
        productId: a.productId ? new Types.ObjectId(a.productId) : undefined,
      })) as any;
    }

    // ── Inventario: descontar stock de productos adicionales al confirmar pago ──
    if (dto.paymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
      const addonsToDeduct = dto.addons?.length ? dto.addons : (booking.addons || []);
      for (const addon of addonsToDeduct) {
        if (!addon.productId) continue;
        try {
          const productIdStr = addon.productId.toString();
          const inventory = await this.inventoryModel.findOne({
            tenantId: booking.tenantId,
            productId: {
              $in: [
                productIdStr,
                new Types.ObjectId(productIdStr),
              ],
            },
            isDeleted: { $ne: true },
          });

          if (!inventory) {
            this.logger.warn(`No se encontró inventario para productId=${productIdStr} al pagar cita ${booking.bookingNumber}`);
            continue;
          }

          const deductQty = addon.quantity ?? 1;
          const currentAvail = inventory.availableQuantity ?? 0;

          if (currentAvail >= deductQty) {
            await this.inventoryModel.updateOne(
              { _id: inventory._id },
              {
                $inc: {
                  totalQuantity: -deductQty,
                  availableQuantity: -deductQty,
                },
              },
            );

            // Registro de movimiento de inventario
            try {
              await this.inventoryMovementModel.create({
                tenantId: booking.tenantId,
                inventoryId: inventory._id,
                productId: inventory.productId,
                productSku: inventory.productSku,
                warehouseId: inventory.warehouseId,
                movementType: 'out',
                quantity: deductQty,
                unitCost: inventory.averageCostPrice ?? 0,
                totalCost: (inventory.averageCostPrice ?? 0) * deductQty,
                referenceType: 'beauty_booking',
                referenceId: booking._id,
                notes: `Venta en cita ${booking.bookingNumber}`,
                balanceAfter: {
                  totalQuantity: (inventory.totalQuantity ?? 0) - deductQty,
                  availableQuantity: currentAvail - deductQty,
                  reservedQuantity: inventory.reservedQuantity ?? 0,
                  averageCostPrice: inventory.averageCostPrice ?? 0,
                },
              });
            } catch (movErr) {
              // Movimiento fallido no revierte el descuento ya aplicado
              this.logger.error(`Error registrando movimiento de inventario para productId=${productIdStr}: ${movErr.message}`);
            }

            this.logger.log(`Inventario descontado: ${deductQty} unidades de productId=${productIdStr} para cita ${booking.bookingNumber}`);
          } else {
            this.logger.warn(`Stock insuficiente para productId=${productIdStr}: disponible=${currentAvail}, solicitado=${deductQty}`);
          }
        } catch (invErr) {
          // No revertir el pago si falla el descuento de inventario
          this.logger.error(`Error descontando inventario para addon productId=${addon.productId?.toString()}: ${invErr.message}`);
        }
      }
    }

    return booking.save();
  }

  /**
   * Actualiza datos de una reserva (reagendamiento — fecha, hora, profesional, notas).
   * Si la fecha u hora cambian, envía notificación WhatsApp de reagendamiento.
   */
  async update(
    id: string,
    dto: UpdateBeautyBookingDto,
    tenantId: string,
    userId: string,
  ): Promise<BeautyBookingDocument> {
    const booking = await this.findOne(id, tenantId);

    const previousDateStr = new Date(booking.date).toISOString().split('T')[0];
    const previousTime = booking.startTime;

    if (dto.date) booking.date = new Date(dto.date);

    if (dto.startTime) {
      booking.startTime = dto.startTime;
      // Recalcular endTime con la nueva hora de inicio
      booking.endTime = this.addMinutesToTime(dto.startTime, booking.totalDuration);
    }

    if (dto.professionalId !== undefined) {
      if (dto.professionalId) {
        booking.professional = new Types.ObjectId(dto.professionalId);
        const prof = await this.professionalModel.findById(dto.professionalId).exec();
        booking.professionalName = prof?.name || undefined;
      } else {
        booking.professional = undefined;
        booking.professionalName = undefined;
      }
    }

    if (dto.notes !== undefined) booking.notes = dto.notes;

    const saved = await booking.save();

    // Notificar al cliente si fecha u hora cambiaron
    const newDateStr = dto.date || previousDateStr;
    const newTime = dto.startTime || previousTime;
    const dateTimeChanged = newDateStr !== previousDateStr || newTime !== previousTime;

    if (dateTimeChanged && saved.client.phone) {
      try {
        await this.whatsappService.sendRescheduledNotification(
          saved,
          previousDateStr,
          previousTime,
        );
      } catch (error) {
        this.logger.error(`Error sending reschedule notification: ${error.message}`);
      }
    }

    return saved;
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

    // 6b. Fetch resource blocks for each professional on this date
    // Also check recurring blocks (isRecurring=true, recurringDays includes dayOfWeek)
    // dayOfWeek here: 0=Sunday,1=Monday,...,6=Saturday (JS getDay())
    // ResourceBlock uses 0=Monday...6=Sunday convention, so convert:
    const blockDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dateObj = new Date(dto.date);
    const profIdList = professionals.map((p) => p._id);
    const resourceBlocks = await this.resourceBlockModel
      .find({
        tenantId,
        professionalId: { $in: profIdList },
        isDeleted: { $ne: true },
        $or: [
          { date: dateObj, isRecurring: { $ne: true } },
          { isRecurring: true, recurringDays: blockDayOfWeek },
        ],
      })
      .lean();

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
        if (hasConflict) return false;

        // Verificar bloqueos de recurso
        const hasBlock = resourceBlocks.some(
          (block) =>
            block.professionalId.toString() === prof._id.toString() &&
            !(slotEnd <= block.startTime || slot >= block.endTime),
        );

        return !hasBlock;
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

  // ── WAITLIST METHODS ─────────────────────────────────────────────────

  /**
   * Agrega un cliente a la lista de espera
   */
  async addToWaitlist(dto: {
    tenantId: string;
    client: { name: string; phone: string; email?: string };
    services: any[];
    preferredDate: string;
    preferredTimeRange?: { from: string; to: string };
    preferredProfessionalId?: string;
  }) {
    const position = await this.beautyBookingModel.countDocuments({
      tenantId: new Types.ObjectId(dto.tenantId),
      status: 'waitlisted',
      waitlistPreferredDate: new Date(dto.preferredDate),
      isDeleted: { $ne: true },
    }) + 1;

    const bookingNumber = await this.generateBookingNumber(dto.tenantId);

    const booking = await this.beautyBookingModel.create({
      tenantId: new Types.ObjectId(dto.tenantId),
      client: dto.client,
      services: dto.services,
      status: 'waitlisted',
      waitlistPosition: position,
      waitlistPreferredDate: new Date(dto.preferredDate),
      waitlistPreferredTimeRange: dto.preferredTimeRange,
      waitlistPreferredProfessionalId: dto.preferredProfessionalId
        ? new Types.ObjectId(dto.preferredProfessionalId)
        : undefined,
      bookingNumber,
      date: new Date(dto.preferredDate),
      startTime: dto.preferredTimeRange?.from || '09:00',
      endTime: dto.preferredTimeRange?.to || '18:00',
      totalDuration: 0,
      totalPrice: 0,
      isDeleted: false,
    });

    return booking;
  }

  /**
   * Obtiene lista de espera (opcionalmente filtrada por fecha)
   */
  async getWaitlist(tenantId: string, date?: string) {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      status: 'waitlisted',
      isDeleted: { $ne: true },
    };
    if (date) {
      filter.waitlistPreferredDate = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
      };
    }
    return this.beautyBookingModel.find(filter).sort({ waitlistPosition: 1 }).lean();
  }

  /**
   * Verifica si hay clientes en espera cuando se libera un slot
   * y notifica al primero elegible
   */
  async checkWaitlistAvailability(
    tenantId: string,
    date: string,
    professionalId?: string,
    timeSlot?: string,
  ) {
    const dateObj = new Date(date);
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      status: 'waitlisted',
      waitlistPreferredDate: { $gte: dateObj, $lt: new Date(dateObj.getTime() + 24 * 60 * 60 * 1000) },
      waitlistNotifiedAt: { $exists: false },
      isDeleted: { $ne: true },
    };

    if (professionalId) {
      filter.$or = [
        { waitlistPreferredProfessionalId: { $exists: false } },
        { waitlistPreferredProfessionalId: new Types.ObjectId(professionalId) },
      ];
    }

    const waitlisted = await this.beautyBookingModel.find(filter).sort({ waitlistPosition: 1 }).limit(1);
    if (!waitlisted.length) return;

    const first = waitlisted[0];
    const notifyAt = new Date();
    const expiresAt = new Date(notifyAt.getTime() + 2 * 60 * 60 * 1000); // +2h

    await this.beautyBookingModel.updateOne(
      { _id: first._id },
      { $set: { waitlistNotifiedAt: notifyAt, waitlistExpiresAt: expiresAt } },
    );

    try {
      await this.whatsappService.sendWaitlistNotification(first, date, timeSlot);
    } catch (err) {
      this.logger.error(`Waitlist WhatsApp notification failed: ${err}`);
    }
  }

  // ── NO-SHOW METHODS ──────────────────────────────────────────────────

  /**
   * Verifica si un cliente puede reservar (política de no-shows)
   * Endpoint público — solo expone canBook y requiresDeposit
   */
  async getClientNoShowStatus(tenantId: string, phone: string): Promise<{
    canBook: boolean;
    requiresDeposit: boolean;
    depositAmount: number;
    message?: string;
  }> {
    try {
      const config = await this.storefrontConfigModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
      }).lean();

      const policy = (config as any)?.beautyConfig?.noShowPolicy;
      if (!policy?.enabled) {
        return { canBook: true, requiresDeposit: false, depositAmount: 0 };
      }

      const customer = await this.customerModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        $or: [
          { whatsappNumber: phone },
          { 'contacts.value': phone },
        ],
        isDeleted: { $ne: true },
      }).lean();

      if (!customer) return { canBook: true, requiresDeposit: false, depositAmount: 0 };

      return {
        canBook: !(customer as any).isBlacklisted,
        requiresDeposit: (customer as any).requiresDeposit || false,
        depositAmount: 0,
        message: (customer as any).isBlacklisted
          ? 'No es posible realizar la reserva. Por favor contacta al negocio directamente.'
          : undefined,
      };
    } catch (err) {
      this.logger.error(`getClientNoShowStatus error: ${err.message}`);
      return { canBook: true, requiresDeposit: false, depositAmount: 0 };
    }
  }

  /**
   * Procesa las penalidades por no-show según la política del negocio
   */
  private async processNoShow(booking: any) {
    const config = await this.storefrontConfigModel.findOne({
      tenantId: booking.tenantId,
      isDeleted: { $ne: true },
    }).lean();

    const policy = (config as any)?.beautyConfig?.noShowPolicy;
    if (!policy?.enabled) return; // Policy disabled — do nothing

    const defaultThresholds = {
      warning: policy.warningThreshold ?? 2,
      deposit: policy.depositThreshold ?? 3,
      blacklist: policy.blacklistThreshold ?? 5,
      resetDays: policy.resetAfterDays ?? 180,
    };

    // Find customer by phone (use whatsappNumber or contacts array value)
    const customer = await this.customerModel.findOne({
      tenantId: booking.tenantId,
      $or: [
        { whatsappNumber: booking.client.phone },
        { 'contacts.value': booking.client.phone },
      ],
      isDeleted: { $ne: true },
    });

    if (!customer) return;

    // Check if reset applies
    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() - defaultThresholds.resetDays);
    if (customer.lastNoShowDate && customer.lastNoShowDate < resetDate) {
      customer.noShowCount = 0;
      customer.requiresDeposit = false;
      customer.isBlacklisted = false;
    }

    customer.noShowCount = (customer.noShowCount || 0) + 1;
    customer.lastNoShowDate = new Date();

    if (customer.noShowCount >= defaultThresholds.blacklist) {
      customer.isBlacklisted = true;
      customer.requiresDeposit = true;
    } else if (customer.noShowCount >= defaultThresholds.deposit) {
      customer.requiresDeposit = true;
    }

    await customer.save();
    this.logger.log(`No-show processed for customer phone=${booking.client.phone}, count=${customer.noShowCount}`);
  }
}
