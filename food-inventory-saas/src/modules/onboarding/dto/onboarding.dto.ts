import { IsString, IsEmail, MinLength, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SanitizeString } from '../../../decorators/sanitize.decorator';

export class CreateTenantWithAdminDto {
  @ApiProperty({ description: 'Nombre del negocio', example: 'Restaurante El Buen Sabor' })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  businessName: string;

  @ApiProperty({ description: 'Tipo de negocio', example: 'restaurante' })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  businessType: string;

  @ApiProperty({ description: 'Número de usuarios que usarán el sistema', example: 5 })
  @IsNumber()
  @IsNotEmpty()
  numberOfUsers: number;

  @ApiProperty({ description: 'Categorías principales del negocio (separadas por comas)', example: 'Carnes, Vegetales, Lácteos', required: false })
  @IsString()
  @IsOptional()
  @SanitizeString()
  categories?: string;

  @ApiProperty({ description: 'Subcategorías del negocio (separadas por comas)', example: 'Res, Pollo, Pescado', required: false })
  @IsString()
  @IsOptional()
  @SanitizeString()
  subcategories?: string;

  @ApiProperty({ description: 'Nombre del administrador', example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  firstName: string;

  @ApiProperty({ description: 'Apellido del administrador', example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  lastName: string;

  @ApiProperty({ description: 'Email del administrador', example: 'juan.perez@buensabor.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Teléfono de contacto', example: '+14155552671', required: false })
  @IsPhoneNumber()
  @IsOptional()
  @SanitizeString()
  phone?: string;

  @ApiProperty({ description: 'Contraseña para el administrador (mínimo 8 caracteres)', example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string; // No sanitizar passwords
}
