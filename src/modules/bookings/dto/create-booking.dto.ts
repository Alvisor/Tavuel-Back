import {
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID of the provider (required for direct bookings)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'providerId must be a valid UUID' })
  providerId?: string;

  @ApiPropertyOptional({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'UUID of the service (required for direct bookings)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'serviceId must be a valid UUID' })
  serviceId?: string;

  @ApiPropertyOptional({
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    description: 'UUID of the category (required for open requests)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;

  @ApiProperty({
    example: '2026-03-15T10:00:00.000Z',
    description: 'Scheduled date and time for the service (ISO 8601)',
  })
  @IsDateString({}, { message: 'scheduledAt must be a valid ISO 8601 date' })
  scheduledAt: string;

  @ApiProperty({
    example: 'Necesito reparar una fuga en el bano principal',
    description: 'Description of the service needed',
  })
  @IsString()
  @MinLength(10, {
    message: 'Description must be at least 10 characters',
  })
  @MaxLength(1000, {
    message: 'Description must be at most 1000 characters',
  })
  description: string;

  @ApiProperty({
    example: 'Calle 100 #15-20, Apto 301, Bogota',
    description: 'Address where the service will be performed',
  })
  @IsString()
  @MinLength(5, { message: 'Address must be at least 5 characters' })
  @MaxLength(500, { message: 'Address must be at most 500 characters' })
  address: string;

  @ApiProperty({
    example: 4.711,
    description: 'Latitude of the service location',
  })
  @IsNumber({}, { message: 'latitude must be a number' })
  @Min(-90, { message: 'latitude must be at least -90' })
  @Max(90, { message: 'latitude must be at most 90' })
  latitude: number;

  @ApiProperty({
    example: -74.0721,
    description: 'Longitude of the service location',
  })
  @IsNumber({}, { message: 'longitude must be a number' })
  @Min(-180, { message: 'longitude must be at least -180' })
  @Max(180, { message: 'longitude must be at most 180' })
  longitude: number;

  @ApiPropertyOptional({
    example: 'Tengo un perro, favor tocar el timbre antes',
    description: 'Additional notes for the provider',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes must be at most 500 characters' })
  notes?: string;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Optional budget for open requests',
  })
  @IsOptional()
  @IsNumber({}, { message: 'budget must be a number' })
  @Min(0)
  budget?: number;
}
