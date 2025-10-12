import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModifierGroupsController } from './modifier-groups.controller';
import { ModifierGroupsService } from './modifier-groups.service';
import {
  ModifierGroup,
  ModifierGroupSchema,
} from '../../schemas/modifier-group.schema';
import { Modifier, ModifierSchema } from '../../schemas/modifier.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ModifierGroup.name, schema: ModifierGroupSchema },
      { name: Modifier.name, schema: ModifierSchema },
    ]),
  ],
  controllers: [ModifierGroupsController],
  providers: [ModifierGroupsService],
  exports: [ModifierGroupsService],
})
export class ModifierGroupsModule {}
