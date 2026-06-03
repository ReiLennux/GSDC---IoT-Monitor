import { IsString, IsEnum, IsObject, IsOptional, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceType, DeviceStatus } from '../../domain/enums';

class LocationDto {
  @IsString()
  rack!: string;

  @IsString()
  position!: string;

  @IsNumber()
  floor!: number;
}

class ThresholdsDto {
  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsNumber()
  criticalMin?: number;

  @IsOptional()
  @IsNumber()
  criticalMax?: number;
}

class MetadataDto {
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  firmwareVersion?: string;
}

export class CreateDeviceDto {
  @IsString()
  name!: string;

  @IsEnum(DeviceType)
  type!: DeviceType;

  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ThresholdsDto)
  thresholds?: ThresholdsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata?: MetadataDto;
}

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DeviceType)
  type?: DeviceType;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ThresholdsDto)
  thresholds?: ThresholdsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata?: MetadataDto;
}

export class UpdateStatusDto {
  @IsEnum(DeviceStatus)
  status!: DeviceStatus;
}
