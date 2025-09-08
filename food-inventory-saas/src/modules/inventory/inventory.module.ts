import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { AuthModule } from '../../auth/auth.module';
import { Inventory, InventorySchema } from '../../schemas/inventory.schema';
import { InventoryMovement, InventoryMovementSchema } from '../../schemas/inventory.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

