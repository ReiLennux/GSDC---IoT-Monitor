import { IsString, IsNumber, IsEnum, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReadingQuality } from '../../domain/enums';

class ReadingItemDto {
  @IsString()
  deviceId!: string;

  @IsNumber()
  value!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsEnum(ReadingQuality)
  quality?: ReadingQuality;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class BatchReadingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReadingItemDto)
  readings!: ReadingItemDto[];
}
