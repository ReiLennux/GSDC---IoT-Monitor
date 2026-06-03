import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../domain/enums';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) password!: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

export class RefreshDto {
  @IsString() refreshToken!: string;
}

export class LogoutDto {
  @IsString() userId!: string;
}

export class GetCurrentUserDto {
  @IsString() userId!: string;
}
