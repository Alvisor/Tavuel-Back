import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsUUID,
  MaxLength,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProviderDto {
  @ApiPropertyOptional({ example: 'Plomero con 5 años de experiencia' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'Calle 50 #30-20, Medellín' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: 6.2442 })
  @IsNumber()
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: -75.5812 })
  @IsNumber()
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ example: ['uuid1', 'uuid2'], type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  serviceCategoryIds?: string[];
}
