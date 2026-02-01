import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  async create(@Body() body: any) {
    return this.bookingsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiResponse({ status: 200, description: 'List of bookings' })
  async findAll(@Query() query: any) {
    return this.bookingsService.findAll(query);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user bookings' })
  @ApiResponse({ status: 200, description: 'User bookings' })
  async findMyBookings(@CurrentUser('id') userId: string) {
    return this.bookingsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update booking' })
  @ApiResponse({ status: 200, description: 'Booking updated' })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: any,
  ) {
    return this.bookingsService.update(id, body);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  async cancel(
    @Param('id', ParseUuidPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.bookingsService.cancel(id, reason);
  }
}
