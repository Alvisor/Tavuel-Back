import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { RejectBookingDto, CancelBookingDto } from './dto/update-booking-status.dto';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking (direct or open request)' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Provider or service not found' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my bookings as a client' })
  @ApiResponse({ status: 200, description: 'Paginated list of client bookings' })
  async findMyBookings(
    @CurrentUser('id') userId: string,
    @Query() query: BookingQueryDto,
  ) {
    return this.bookingsService.findAllForClient(userId, query);
  }

  @Get('provider')
  @ApiOperation({ summary: 'Get my bookings as a provider' })
  @ApiResponse({ status: 200, description: 'Paginated list of provider bookings' })
  @ApiResponse({ status: 400, description: 'User is not a provider' })
  async findProviderBookings(
    @CurrentUser('id') userId: string,
    @Query() query: BookingQueryDto,
  ) {
    const provider = await this.getProviderIdForUser(userId);
    return this.bookingsService.findAllForProvider(provider.id, query);
  }

  @Get('open-requests')
  @ApiOperation({ summary: 'Get open requests matching provider categories' })
  @ApiResponse({ status: 200, description: 'Paginated list of open requests' })
  async findOpenRequests(
    @CurrentUser('id') userId: string,
    @Query() query: BookingQueryDto,
  ) {
    const provider = await this.getProviderIdForUser(userId);
    return this.bookingsService.findOpenRequests(provider.id, query);
  }

  @Get('providers/:providerId/busy-slots')
  @ApiOperation({ summary: 'Get busy time slots for a provider on a date' })
  @ApiResponse({ status: 200, description: 'Array of busy time slots' })
  async getBusySlots(
    @Param('providerId', ParseUuidPipe) providerId: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('date query parameter is required (YYYY-MM-DD)');
    }
    return this.bookingsService.getBusySlots(providerId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Provider accepts a booking' })
  @ApiResponse({ status: 200, description: 'Booking accepted' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not the booking provider' })
  async acceptBooking(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const provider = await this.getProviderIdForUser(userId);
    return this.bookingsService.acceptBooking(id, provider.id);
  }

  @Patch(':id/claim')
  @ApiOperation({ summary: 'Provider claims an open request' })
  @ApiResponse({ status: 200, description: 'Open request claimed' })
  @ApiResponse({ status: 400, description: 'Request already claimed' })
  async claimOpenRequest(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const provider = await this.getProviderIdForUser(userId);
    return this.bookingsService.claimOpenRequest(id, provider.id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Provider rejects a booking' })
  @ApiResponse({ status: 200, description: 'Booking rejected (cancelled)' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not the booking provider' })
  async rejectBooking(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RejectBookingDto,
  ) {
    const provider = await this.getProviderIdForUser(userId);
    return this.bookingsService.rejectBooking(id, provider.id, dto.reason);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Provider starts the service' })
  @ApiResponse({ status: 200, description: 'Service started (IN_PROGRESS)' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not the booking provider' })
  async startService(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const provider = await this.getProviderIdForUser(userId);
    return this.bookingsService.startService(id, provider.id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Provider completes the service' })
  @ApiResponse({ status: 200, description: 'Service completed' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not the booking provider' })
  async completeService(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const provider = await this.getProviderIdForUser(userId);
    return this.bookingsService.completeService(id, provider.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking (client or provider)' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel this booking' })
  @ApiResponse({ status: 403, description: 'Not part of this booking' })
  async cancelBooking(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking(id, userId, dto.reason);
  }

  // ────────────────────────────────────────────────
  // Metodo auxiliar
  // ────────────────────────────────────────────────

  private async getProviderIdForUser(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!provider) {
      throw new BadRequestException('No provider profile found');
    }

    return provider;
  }
}
