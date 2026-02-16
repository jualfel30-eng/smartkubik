import { IsBoolean, IsOptional, ValidateNested, IsObject } from "class-validator";
import { Type } from "class-transformer";

class ChannelPreferencesDto {
  @IsBoolean()
  inApp: boolean;

  @IsBoolean()
  email: boolean;

  @IsBoolean()
  whatsapp: boolean;
}

class CategoryPreferencesDto {
  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  sales: ChannelPreferencesDto;

  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  inventory: ChannelPreferencesDto;

  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  hr: ChannelPreferencesDto;

  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  finance: ChannelPreferencesDto;

  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  marketing: ChannelPreferencesDto;

  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  system: ChannelPreferencesDto;
}

export class UpdatePreferencesDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ValidateNested()
  @Type(() => CategoryPreferencesDto)
  @IsOptional()
  categories?: CategoryPreferencesDto;

  @IsBoolean()
  @IsOptional()
  soundEnabled?: boolean;
}
