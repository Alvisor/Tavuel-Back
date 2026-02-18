import {
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SearchSortBy {
  RATING = 'rating',
  DISTANCE = 'distance',
  REVIEWS = 'reviews',
  PRICE = 'price',
}

export class SearchProvidersDto {
  @ApiPropertyOptional({
    description: 'Text search on provider name and bio',
    example: 'plomero',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by service category UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by service category slug',
    example: 'plomeria',
  })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({
    description: 'Client latitude for distance-based search',
    example: 4.711,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Client longitude for distance-based search',
    example: -74.0721,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers (default: 30)',
    example: 15,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  radiusKm?: number = 30;

  @ApiPropertyOptional({
    description: 'Minimum rating filter (1-5)',
    example: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Sort results by',
    enum: SearchSortBy,
    default: SearchSortBy.RATING,
  })
  @IsOptional()
  @IsEnum(SearchSortBy)
  sortBy?: SearchSortBy = SearchSortBy.RATING;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 15;
}
