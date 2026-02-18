import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectBookingDto {
  @ApiPropertyOptional({
    example: 'No tengo disponibilidad en esa fecha',
    description: 'Reason for rejecting the booking',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must be at most 500 characters' })
  reason?: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional({
    example: 'Ya no necesito el servicio',
    description: 'Reason for cancelling the booking',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must be at most 500 characters' })
  reason?: string;
}
