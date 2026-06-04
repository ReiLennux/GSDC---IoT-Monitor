import { IsString, IsEnum, IsOptional, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceType, DeviceStatus } from '../../domain/enums';

export class LocationDto {
  @IsString() rack!: string;
  @IsString() position!: string;
  @IsNumber() @Min(0) floor!: number;
}

export class PartialLocationDto {
  @IsOptional() @IsString() rack?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsNumber() @Min(0) floor?: number;
}

export class ThresholdsDto {
  @IsOptional() @IsNumber() min?: number;
  @IsOptional() @IsNumber() max?: number;
  @IsOptional() @IsNumber() criticalMin?: number;
  @IsOptional() @IsNumber() criticalMax?: number;
}

export class MetadataDto {
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() firmwareVersion?: string;
}

export class CreateDeviceDto {
  @IsString() name!: string;
  @IsEnum(DeviceType) type!: DeviceType;
  @ValidateNested() @Type(() => LocationDto) location!: LocationDto;
  @IsOptional() @ValidateNested() @Type(() => ThresholdsDto) thresholds?: ThresholdsDto;
  @IsOptional() @ValidateNested() @Type(() => MetadataDto) metadata?: MetadataDto;
}

export class UpdateDeviceDto {
  id!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(DeviceType) type?: DeviceType;
  @IsOptional() @ValidateNested() @Type(() => PartialLocationDto) location?: PartialLocationDto;
  @IsOptional() @ValidateNested() @Type(() => ThresholdsDto) thresholds?: ThresholdsDto;
  @IsOptional() @ValidateNested() @Type(() => MetadataDto) metadata?: MetadataDto;
}

export class UpdateStatusDto {
  id!: string;
  @IsEnum(DeviceStatus) status!: DeviceStatus;
}

export class DeleteDeviceDto {
  @IsString() id!: string;
}

export class ListDevicesDto {
  @IsOptional() @IsNumber() limit?: number;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsString() sortField?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class GetDeviceDto {
  @IsString() id!: string;
}

export class GetDeviceReadingsDto {
  @IsString() deviceId!: string;
  @IsOptional() @IsNumber() limit?: number;
  @IsOptional() @IsString() cursor?: string;
}

export class GetDeviceAlertsDto {
  @IsString() deviceId!: string;
}
