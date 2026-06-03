import { IsOptional, IsNumber, IsString } from 'class-validator';

export class ListAlertsDto {
  @IsOptional() @IsNumber() limit?: number;
}

export class AcknowledgeAlertDto {
  @IsString() alertId!: string;
}

export class ResolveAlertDto {
  @IsString() alertId!: string;
}
