import { PartialType } from '@nestjs/swagger';
import { CreateBeautyServiceDto } from './create-beauty-service.dto';

/**
 * DTO para actualizar un servicio de belleza
 * Todos los campos son opcionales (hereda de CreateBeautyServiceDto con PartialType)
 */
export class UpdateBeautyServiceDto extends PartialType(CreateBeautyServiceDto) {}
