import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveReviewDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isApproved: boolean;

  @ApiPropertyOptional({ example: 'Contenido inapropiado' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
