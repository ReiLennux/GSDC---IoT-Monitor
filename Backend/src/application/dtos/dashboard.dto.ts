import { IsOptional, IsNumber, IsString } from 'class-validator';

export class GetRackSummaryDto {
  @IsString() rackId!: string;
}

export class GetTrendsDto {
  @IsOptional() @IsNumber() days?: number;
}
