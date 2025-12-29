import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Calendar, CalendarDocument } from "../../schemas/calendar.schema";
import { Event, EventDocument } from "../../schemas/event.schema";
import { CreateCalendarDto, UpdateCalendarDto, CalendarResponseDto } from "../../dto/calendar.dto";
import { GmailOAuthService } from "../mail/gmail-oauth.service";

@Injectable()
export class CalendarsService {
  private readonly logger = new Logger(CalendarsService.name);

  constructor(
    @InjectModel(Calendar.name)
    private readonly calendarModel: Model<CalendarDocument>,
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
    private readonly gmailOAuthService: GmailOAuthService,
  ) {}

  /**
   * Crear un nuevo calendario
   */
  async create(
    createCalendarDto: CreateCalendarDto,
    user: any,
  ): Promise<CalendarDocument> {
    this.logger.log(`Creating calendar "${createCalendarDto.name}" for tenant ${user.tenantId}`);

    // Si es default, verificar que no exista otro
    if (createCalendarDto.isDefault) {
      const existingDefault = await this.calendarModel.findOne({
        tenantId: user.tenantId,
        isDefault: true,
      });
      if (existingDefault) {
        throw new BadRequestException("Ya existe un calendario por defecto para este tenant");
      }
    }

    // Crear calendario
    const calendar = new this.calendarModel({
      ...createCalendarDto,
      createdBy: user.id,
      tenantId: user.tenantId,
      color: createCalendarDto.color || this.getDefaultColorByCategory(createCalendarDto.category),
    });

    const savedCalendar = await calendar.save();

    // Si se solicitó sincronizar con Google, hacerlo
    if (createCalendarDto.syncWithGoogle) {
      try {
        await this.syncCalendarToGoogle(savedCalendar._id.toString(), user);
      } catch (error) {
        this.logger.error(`Error syncing calendar to Google: ${error.message}`);
        // No fallar la creación si falla el sync
      }
    }

    return savedCalendar;
  }

  /**
   * Obtener todos los calendarios visibles para el usuario
   */
  async findAll(user: any): Promise<CalendarResponseDto[]> {
    const userRoles = user.roles || [];
    const userId = new Types.ObjectId(user.id);

    // Buscar calendarios que el usuario puede ver
    const calendars = await this.calendarModel
      .find({
        tenantId: user.tenantId,
        isActive: true,
        $or: [
          { "visibility.public": true },
          { "visibility.shareWithTenant": true },
          { allowedRoles: { $in: userRoles } },
          { allowedUsers: userId },
          { createdBy: userId },
        ],
      })
      .sort({ isDefault: -1, name: 1 })
      .exec();

    // Obtener conteo de eventos por calendario
    const calendarIds = calendars.map((c) => c._id);
    const eventCounts = await this.eventModel.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(user.tenantId),
          calendarId: { $in: calendarIds },
        },
      },
      {
        $group: {
          _id: "$calendarId",
          count: { $sum: 1 },
        },
      },
    ]);

    const eventCountMap = new Map(
      eventCounts.map((ec) => [ec._id.toString(), ec.count]),
    );

    // Transformar a ResponseDto
    return calendars.map((calendar) => this.toResponseDto(calendar, user, eventCountMap));
  }

  /**
   * Obtener un calendario por ID
   */
  async findOne(id: string, user: any): Promise<CalendarDocument> {
    const calendar = await this.calendarModel.findOne({
      _id: id,
      tenantId: user.tenantId,
    }).exec();

    if (!calendar) {
      throw new NotFoundException(`Calendario con ID "${id}" no encontrado`);
    }

    // Verificar permisos
    if (!(await this.canUserAccessCalendar(calendar._id.toString(), user))) {
      throw new ForbiddenException("No tienes permisos para ver este calendario");
    }

    return calendar;
  }

  /**
   * Actualizar un calendario
   */
  async update(
    id: string,
    updateCalendarDto: UpdateCalendarDto,
    user: any,
  ): Promise<CalendarDocument> {
    const calendar = await this.findOne(id, user);

    // Verificar permisos de edición
    if (!this.canUserEditCalendar(calendar, user)) {
      throw new ForbiddenException("No tienes permisos para editar este calendario");
    }

    // Si se cambia a default, quitar el flag de otros
    if (updateCalendarDto.isDefault && !calendar.isDefault) {
      await this.calendarModel.updateMany(
        { tenantId: user.tenantId, isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    Object.assign(calendar, updateCalendarDto);
    return calendar.save();
  }

  /**
   * Eliminar un calendario
   */
  async remove(id: string, user: any): Promise<void> {
    const calendar = await this.findOne(id, user);

    // No permitir eliminar el calendario por defecto
    if (calendar.isDefault) {
      throw new BadRequestException("No se puede eliminar el calendario por defecto");
    }

    // Verificar permisos de eliminación
    if (!this.canUserDeleteCalendar(calendar, user)) {
      throw new ForbiddenException("No tienes permisos para eliminar este calendario");
    }

    // Verificar si tiene eventos
    const eventCount = await this.eventModel.countDocuments({
      calendarId: calendar._id,
      tenantId: user.tenantId,
    });

    if (eventCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar el calendario porque tiene ${eventCount} eventos asociados. Elimina o mueve los eventos primero.`,
      );
    }

    await this.calendarModel.deleteOne({ _id: id });
    this.logger.log(`Calendar ${id} deleted by user ${user.id}`);
  }

  /**
   * Sincronizar calendario con Google Calendar (crear calendario secundario)
   */
  async syncCalendarToGoogle(calendarId: string, user: any): Promise<any> {
    const calendar = await this.findOne(calendarId, user);

    this.logger.log(`Syncing calendar ${calendar.name} to Google for tenant ${user.tenantId}`);

    try {
      // Crear calendario secundario en Google
      const googleCalendarId = await this.gmailOAuthService.createSecondaryCalendar(
        user.tenantId,
        {
          summary: `${calendar.name}`,
          description: calendar.description || `Calendario ${calendar.name} de SmartKubik`,
          timeZone: "America/Caracas",
        },
        calendar.color,
      );

      // Actualizar el calendario con la info de Google
      calendar.googleSync = {
        enabled: true,
        calendarId: googleCalendarId,
        lastSyncAt: new Date(),
        syncStatus: "active",
      };

      await calendar.save();

      // Sincronizar eventos existentes
      await this.syncEventsToGoogle(calendar, user);

      this.logger.log(`Calendar ${calendar.name} synced to Google: ${googleCalendarId}`);

      return {
        success: true,
        googleCalendarId,
        message: `Calendario sincronizado exitosamente con Google Calendar`,
      };
    } catch (error) {
      this.logger.error(`Error syncing calendar to Google: ${error.message}`, error.stack);

      // Actualizar estado de error
      if (calendar.googleSync) {
        calendar.googleSync.syncStatus = "error";
        calendar.googleSync.errorMessage = error.message;
        await calendar.save();
      }

      throw new BadRequestException(`Error al sincronizar con Google Calendar: ${error.message}`);
    }
  }

  /**
   * Sincronizar eventos del calendario a Google
   */
  private async syncEventsToGoogle(calendar: CalendarDocument, user: any): Promise<void> {
    if (!calendar.googleSync?.enabled || !calendar.googleSync?.calendarId) {
      return;
    }

    const events = await this.eventModel.find({
      calendarId: calendar._id,
      tenantId: user.tenantId,
    }).limit(100); // Limitar para no sobrecargar

    this.logger.log(`Syncing ${events.length} events to Google Calendar ${calendar.googleSync.calendarId}`);

    // TODO: Implementar sincronización de eventos individuales
    // Por ahora solo se crea el calendario, los eventos se sincronizarán cuando se creen/actualicen
  }

  /**
   * Verificar si el usuario puede acceder al calendario
   */
  async canUserAccessCalendar(calendarId: string, user: any): Promise<boolean> {
    // Buscar el calendario
    const calendar = await this.calendarModel.findById(calendarId).exec();

    if (!calendar) {
      return false;
    }

    // Verificar que sea del mismo tenant
    if (calendar.tenantId.toString() !== user.tenantId) {
      return false;
    }

    const userRoles = user.roles || [];
    const userId = user.id;

    // Admin siempre puede
    if (userRoles.includes("admin") || userRoles.includes("super_admin")) {
      return true;
    }

    // Creador siempre puede
    if (calendar.createdBy.toString() === userId) {
      return true;
    }

    // Calendario público
    if (calendar.visibility?.public) {
      return true;
    }

    // Compartido con tenant
    if (calendar.visibility?.shareWithTenant) {
      return true;
    }

    // Roles permitidos
    if (calendar.allowedRoles?.some((role) => userRoles.includes(role))) {
      return true;
    }

    // Usuarios permitidos
    if (calendar.allowedUsers?.some((id) => id.toString() === userId)) {
      return true;
    }

    return false;
  }

  /**
   * Verificar si el usuario puede editar el calendario
   */
  private canUserEditCalendar(calendar: CalendarDocument, user: any): boolean {
    const userRoles = user.roles || [];
    const userId = user.id;

    // Admin siempre puede
    if (userRoles.includes("admin") || userRoles.includes("super_admin")) {
      return true;
    }

    // Creador siempre puede
    if (calendar.createdBy.toString() === userId) {
      return true;
    }

    return false;
  }

  /**
   * Verificar si el usuario puede eliminar el calendario
   */
  private canUserDeleteCalendar(_calendar: CalendarDocument, user: any): boolean {
    const userRoles = user.roles || [];

    // Solo admin puede eliminar
    if (userRoles.includes("admin") || userRoles.includes("super_admin")) {
      return true;
    }

    return false;
  }

  /**
   * Transformar a ResponseDto
   */
  private toResponseDto(
    calendar: CalendarDocument,
    user: any,
    eventCountMap: Map<string, number>,
  ): CalendarResponseDto {
    return {
      id: calendar._id.toString(),
      name: calendar.name,
      description: calendar.description,
      color: calendar.color,
      allowedRoles: calendar.allowedRoles,
      allowedUsers: calendar.allowedUsers,
      isDefault: calendar.isDefault,
      isActive: calendar.isActive,
      category: calendar.category,
      googleSync: calendar.googleSync,
      visibility: calendar.visibility,
      eventCount: eventCountMap.get(calendar._id.toString()) || 0,
      canEdit: this.canUserEditCalendar(calendar, user),
      canDelete: this.canUserDeleteCalendar(calendar, user),
      createdBy: calendar.createdBy,
      createdAt: (calendar as any).createdAt,
      updatedAt: (calendar as any).updatedAt,
    };
  }

  /**
   * Obtener color por defecto según categoría
   */
  private getDefaultColorByCategory(category?: string): string {
    const colors: Record<string, string> = {
      sales: "#FF6B6B",
      production: "#4ECDC4",
      hr: "#95E1D3",
      finance: "#F38181",
      general: "#3B82F6",
      custom: "#9333EA",
    };
    return colors[category || "general"] || colors.general;
  }

  /**
   * Obtener o crear calendario por defecto del tenant
   */
  async getOrCreateDefaultCalendar(tenantId: string, userId: string): Promise<CalendarDocument> {
    let defaultCalendar = await this.calendarModel.findOne({
      tenantId,
      isDefault: true,
    });

    if (!defaultCalendar) {
      this.logger.log(`Creating default calendar for tenant ${tenantId}`);
      defaultCalendar = await this.calendarModel.create({
        name: "General",
        description: "Calendario principal",
        color: "#3B82F6",
        isDefault: true,
        isActive: true,
        category: "general",
        allowedRoles: [],
        allowedUsers: [],
        visibility: {
          public: false,
          shareWithTenant: true,
        },
        createdBy: userId,
        tenantId,
      });
    }

    return defaultCalendar;
  }

  /**
   * Establecer watch channel para sincronización bidireccional
   * Solo admin puede configurar esto
   */
  async setupWatchChannel(
    calendarId: string,
    user: any,
    webhookUrl: string,
  ): Promise<CalendarDocument> {
    this.logger.log(`Setting up watch channel for calendar ${calendarId}`);

    // Validar permisos: solo admin puede configurar watch channels
    if (!user.roles?.includes("admin")) {
      throw new ForbiddenException(
        "Solo los administradores pueden configurar la sincronización bidireccional",
      );
    }

    const calendar = await this.calendarModel.findOne({
      _id: calendarId,
      tenantId: user.tenantId,
    });

    if (!calendar) {
      throw new NotFoundException("Calendario no encontrado");
    }

    // Verificar que el calendario tenga sincronización con Google habilitada
    if (!calendar.googleSync?.enabled || !calendar.googleSync.calendarId) {
      throw new BadRequestException(
        "El calendario debe estar sincronizado con Google primero",
      );
    }

    // Si ya existe un watch channel activo, detenerlo primero
    if (calendar.googleSync.watchChannel?.id) {
      try {
        await this.gmailOAuthService.stopWatchChannel(
          user.tenantId,
          calendar.googleSync.watchChannel.id,
          calendar.googleSync.watchChannel.resourceId,
        );
      } catch (error) {
        this.logger.warn(`Error stopping existing watch channel: ${error.message}`);
      }
    }

    // Crear nuevo watch channel
    const watchChannel = await this.gmailOAuthService.createWatchChannel(
      user.tenantId,
      calendar.googleSync.calendarId,
      webhookUrl,
    );

    // Actualizar calendario con la información del watch channel
    calendar.googleSync.watchChannel = watchChannel;
    calendar.googleSync.syncStatus = "active";
    await calendar.save();

    this.logger.log(`Watch channel configured successfully for calendar ${calendarId}`);

    return calendar;
  }

  /**
   * Sincronizar eventos desde Google Calendar hacia el ERP
   * Solo se sincronizan eventos de calendarios del ERP (no personales)
   */
  async syncEventsFromGoogle(
    calendarId: string,
    user: any,
  ): Promise<{ synced: number; errors: number }> {
    this.logger.log(`Syncing events from Google for calendar ${calendarId}`);

    // Validar permisos
    const hasAccess = await this.canUserAccessCalendar(calendarId, user);
    if (!hasAccess) {
      throw new ForbiddenException(
        "No tienes permisos para sincronizar este calendario",
      );
    }

    const calendar = await this.calendarModel.findById(calendarId);
    if (!calendar) {
      throw new NotFoundException("Calendario no encontrado");
    }

    if (!calendar.googleSync?.enabled || !calendar.googleSync.calendarId) {
      throw new BadRequestException(
        "El calendario no tiene sincronización con Google habilitada",
      );
    }

    // Obtener cambios desde Google
    const syncToken = (calendar.googleSync as any).syncToken || undefined;
    const { events: googleEvents, nextSyncToken } =
      await this.gmailOAuthService.getCalendarChanges(
        user.tenantId,
        calendar.googleSync.calendarId,
        syncToken,
      );

    let synced = 0;
    let errors = 0;

    // Procesar cada evento de Google
    for (const googleEvent of googleEvents) {
      try {
        // Si el evento fue cancelado en Google, eliminarlo del ERP
        if (googleEvent.status === "cancelled") {
          await this.eventModel.deleteOne({
            "googleSync.eventId": googleEvent.id,
            calendarId: calendar._id,
            tenantId: user.tenantId,
          });
          synced++;
          continue;
        }

        // Buscar si el evento ya existe en el ERP
        const existingEvent = await this.eventModel.findOne({
          "googleSync.eventId": googleEvent.id,
          calendarId: calendar._id,
          tenantId: user.tenantId,
        });

        const eventData = {
          title: googleEvent.summary || "Sin título",
          description: googleEvent.description || "",
          start: googleEvent.start?.dateTime || googleEvent.start?.date,
          end: googleEvent.end?.dateTime || googleEvent.end?.date,
          allDay: !!googleEvent.start?.date, // Si tiene 'date' en lugar de 'dateTime', es todo el día
          calendarId: calendar._id,
          tenantId: user.tenantId,
          googleSync: {
            eventId: googleEvent.id,
            calendarId: calendar.googleSync.calendarId,
            syncStatus: "synced",
          },
        };

        if (existingEvent) {
          // Actualizar evento existente
          Object.assign(existingEvent, eventData);
          await existingEvent.save();
        } else {
          // Crear nuevo evento
          await this.eventModel.create({
            ...eventData,
            createdBy: user.id,
          });
        }

        synced++;
      } catch (error) {
        this.logger.error(`Error syncing event ${googleEvent.id}: ${error.message}`);
        errors++;
      }
    }

    // Guardar el nuevo syncToken para la próxima sincronización incremental
    if (nextSyncToken) {
      calendar.googleSync.syncToken = nextSyncToken;
      calendar.googleSync.lastSyncAt = new Date();
      await calendar.save();
    }

    this.logger.log(
      `Sync completed for calendar ${calendarId}: ${synced} synced, ${errors} errors`,
    );

    return { synced, errors };
  }

  /**
   * Renovar watch channel antes de que expire
   * Debe ejecutarse periódicamente (ej: cada 6 días si expiran en 7)
   */
  async renewWatchChannel(
    calendarId: string,
    webhookUrl: string,
  ): Promise<void> {
    this.logger.log(`Renewing watch channel for calendar ${calendarId}`);

    const calendar = await this.calendarModel.findById(calendarId);
    if (!calendar || !calendar.googleSync?.watchChannel) {
      this.logger.warn(`No watch channel found for calendar ${calendarId}`);
      return;
    }

    // Detener el canal antiguo
    try {
      await this.gmailOAuthService.stopWatchChannel(
        calendar.tenantId.toString(),
        calendar.googleSync.watchChannel.id,
        calendar.googleSync.watchChannel.resourceId,
      );
    } catch (error) {
      this.logger.warn(`Error stopping watch channel: ${error.message}`);
    }

    // Crear nuevo canal
    const newChannel = await this.gmailOAuthService.createWatchChannel(
      calendar.tenantId.toString(),
      calendar.googleSync.calendarId,
      webhookUrl,
    );

    calendar.googleSync.watchChannel = newChannel;
    await calendar.save();

    this.logger.log(`Watch channel renewed for calendar ${calendarId}`);
  }
}
