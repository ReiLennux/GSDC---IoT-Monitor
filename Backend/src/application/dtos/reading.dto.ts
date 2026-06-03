import { IsArray, IsString, IsNumber, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ReadingQuality } from '../../domain/enums';

export class GetAllReadingsDto {
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsNumber() limit?: number;
  @IsOptional() @IsString() cursor?: string;
}

export class AnalyticsDto {
  @IsOptional() @IsNumber() hours?: number;
}

class ReadingItemDto {
  @IsString() deviceId!: string;
  @IsNumber() value!: number;
  @IsString() unit!: string;
  @IsOptional() @IsEnum(ReadingQuality) quality?: ReadingQuality;
  @IsOptional() @IsString() timestamp?: string;
}

export class BatchReadingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReadingItemDto)
  readings!: ReadingItemDto[];
}
