import { IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum ReviewSortBy {
  RECENT = 'recent',
  RATING = 'rating',
}

export class ReviewQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ReviewSortBy, default: 'recent' })
  @IsEnum(ReviewSortBy)
  @IsOptional()
  sortBy?: ReviewSortBy = ReviewSortBy.RECENT;
}
