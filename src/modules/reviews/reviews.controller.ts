import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async create(@Body() body: any) {
    return this.reviewsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  async findAll(@Query() query: any) {
    return this.reviewsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiResponse({ status: 200, description: 'Review found' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update review' })
  @ApiResponse({ status: 200, description: 'Review updated' })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: any,
  ) {
    return this.reviewsService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete review' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  async remove(@Param('id', ParseUuidPipe) id: string) {
    return this.reviewsService.remove(id);
  }

  @Get('provider/:providerId')
  @ApiOperation({ summary: 'Get reviews by provider' })
  @ApiResponse({ status: 200, description: 'Provider reviews' })
  async findByProvider(@Param('providerId', ParseUuidPipe) providerId: string) {
    return this.reviewsService.findByProvider(providerId);
  }

  @Get('service/:serviceId')
  @ApiOperation({ summary: 'Get reviews by service' })
  @ApiResponse({ status: 200, description: 'Service reviews' })
  async findByService(@Param('serviceId', ParseUuidPipe) serviceId: string) {
    return this.reviewsService.findByService(serviceId);
  }
}
