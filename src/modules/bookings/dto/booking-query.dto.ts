import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BookingStatus } from '@prisma/client';

export class BookingQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: BookingStatus,
    description: 'Filter by booking status',
  })
  @IsOptional()
  @IsEnum(BookingStatus, { message: 'status must be a valid BookingStatus' })
  status?: BookingStatus;

  @ApiPropertyOptional({
    example: '2026-03-01T00:00:00.000Z',
    description: 'Filter bookings from this date (inclusive)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be a valid ISO 8601 date' })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-03-31T23:59:59.999Z',
    description: 'Filter bookings until this date (inclusive)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be a valid ISO 8601 date' })
  dateTo?: string;
}
