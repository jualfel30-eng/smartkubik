import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { Service, ServiceSchema } from '../../schemas/service.schema';
import { Resource, ResourceSchema } from '../../schemas/resource.schema';
import { Customer, CustomerSchema } from '../../schemas/customer.schema';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';
import { AppointmentsController } from './appointments.controller';
import { ServicesController } from './services.controller';
import { ResourcesController } from './resources.controller';
import { AppointmentsService } from './appointments.service';
import { ServicesService } from './services.service';
import { ResourcesService } from './resources.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [AppointmentsController, ServicesController, ResourcesController],
  providers: [AppointmentsService, ServicesService, ResourcesService],
  exports: [AppointmentsService, ServicesService, ResourcesService],
})
export class AppointmentsModule {}
