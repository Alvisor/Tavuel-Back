import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a review for a completed booking' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my reviews as client' })
  @ApiResponse({ status: 200, description: 'My reviews' })
  async getMyReviews(@CurrentUser('id') userId: string) {
    return this.reviewsService.findByClient(userId);
  }

  @Get('provider/:id')
  @ApiOperation({ summary: 'Get reviews for a provider' })
  @ApiResponse({ status: 200, description: 'Provider reviews' })
  async findByProvider(
    @Param('id', ParseUuidPipe) providerId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findByProvider(providerId, query);
  }

  @Get('provider/:id/stats')
  @ApiOperation({ summary: 'Get rating statistics for a provider' })
  @ApiResponse({ status: 200, description: 'Provider rating stats' })
  async getProviderStats(@Param('id', ParseUuidPipe) providerId: string) {
    return this.reviewsService.getProviderStats(providerId);
  }
}
