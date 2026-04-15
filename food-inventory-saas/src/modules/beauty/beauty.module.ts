import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

// Schemas
import {
  BeautyService,
  BeautyServiceSchema,
} from '../../schemas/beauty-service.schema';
import {
  Professional,
  ProfessionalSchema,
} from '../../schemas/professional.schema';
import {
  BeautyBooking,
  BeautyBookingSchema,
} from '../../schemas/beauty-booking.schema';
import {
  BeautyGalleryItem,
  BeautyGalleryItemSchema,
} from '../../schemas/beauty-gallery.schema';
import {
  BeautyReview,
  BeautyReviewSchema,
} from '../../schemas/beauty-review.schema';
import {
  BeautyLoyaltyRecord,
  BeautyLoyaltyRecordSchema,
} from '../../schemas/beauty-loyalty.schema';
import {
  StorefrontConfig,
  StorefrontConfigSchema,
} from '../../schemas/storefront-config.schema';

// Services
import { BeautyServicesService } from './services/beauty-services.service';
import { ProfessionalsService } from './services/professionals.service';
import { BeautyBookingsService } from './services/beauty-bookings.service';
import { BeautyGalleryService } from './services/beauty-gallery.service';
import { BeautyReviewsService } from './services/beauty-reviews.service';
import { BeautyLoyaltyService } from './services/beauty-loyalty.service';
import { BeautyWhatsAppNotificationsService } from './services/beauty-whatsapp-notifications.service';
import { BeautyBookingsJobsService } from './services/beauty-bookings-jobs.service';
import { NotificationCenterModule } from '../notification-center/notification-center.module';

// Controllers - Private
import { BeautyServicesController } from './controllers/beauty-services.controller';
import { ProfessionalsController } from './controllers/professionals.controller';
import { BeautyBookingsController } from './controllers/beauty-bookings.controller';
import { BeautyGalleryController } from './controllers/beauty-gallery.controller';
import { BeautyReviewsController } from './controllers/beauty-reviews.controller';

// Controllers - Public
import { BeautyServicesPublicController } from './controllers/beauty-services-public.controller';
import { ProfessionalsPublicController } from './controllers/professionals-public.controller';
import { BeautyBookingsPublicController } from './controllers/beauty-bookings-public.controller';
import { BeautyGalleryPublicController } from './controllers/beauty-gallery-public.controller';
import { BeautyReviewsPublicController } from './controllers/beauty-reviews-public.controller';
import { BeautyLoyaltyPublicController } from './controllers/beauty-loyalty-public.controller';

/**
 * Módulo Beauty - Sistema completo de reservas para salones de belleza
 *
 * Características:
 * - Gestión de servicios con precios, duración, imágenes
 * - Gestión de profesionales con horarios y especialidades
 * - Sistema de reservas con cálculo inteligente de disponibilidad
 * - Galería de trabajos (portfolio)
 * - Sistema de reseñas con moderación
 * - Programa de lealtad basado en teléfono (sin cuenta requerida)
 *
 * Endpoints públicos (para storefront):
 * - GET /public/beauty-services/:tenantId
 * - GET /public/professionals/:tenantId
 * - POST /public/beauty-bookings
 * - POST /public/beauty-bookings/availability
 * - GET /public/beauty-gallery/:tenantId
 * - GET /public/beauty-reviews/:tenantId
 * - POST /public/beauty-reviews
 * - GET /public/beauty-loyalty/:tenantId/balance
 *
 * Endpoints privados (para admin):
 * - CRUD completo para todas las entidades
 * - Gestión de estado de reservas
 * - Moderación de reseñas
 * - Dashboard de reservas
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationCenterModule,
    MongooseModule.forFeature([
      { name: BeautyService.name, schema: BeautyServiceSchema },
      { name: Professional.name, schema: ProfessionalSchema },
      { name: BeautyBooking.name, schema: BeautyBookingSchema },
      { name: BeautyGalleryItem.name, schema: BeautyGalleryItemSchema },
      { name: BeautyReview.name, schema: BeautyReviewSchema },
      { name: BeautyLoyaltyRecord.name, schema: BeautyLoyaltyRecordSchema },
      { name: StorefrontConfig.name, schema: StorefrontConfigSchema },
    ]),
  ],
  controllers: [
    // Private controllers
    BeautyServicesController,
    ProfessionalsController,
    BeautyBookingsController,
    BeautyGalleryController,
    BeautyReviewsController,
    // Public controllers
    BeautyServicesPublicController,
    ProfessionalsPublicController,
    BeautyBookingsPublicController,
    BeautyGalleryPublicController,
    BeautyReviewsPublicController,
    BeautyLoyaltyPublicController,
  ],
  providers: [
    BeautyServicesService,
    ProfessionalsService,
    BeautyBookingsService,
    BeautyGalleryService,
    BeautyReviewsService,
    BeautyLoyaltyService,
    BeautyWhatsAppNotificationsService,
    BeautyBookingsJobsService,
  ],
  exports: [
    // Exportar servicios para usar en otros módulos si es necesario
    BeautyServicesService,
    ProfessionalsService,
    BeautyBookingsService,
    BeautyGalleryService,
    BeautyReviewsService,
    BeautyLoyaltyService,
    BeautyWhatsAppNotificationsService,
  ],
})
export class BeautyModule {}
