import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a payment' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  async create(@Body() body: any) {
    return this.paymentsService.create(body);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  async findAll(@Query() query: any) {
    return this.paymentsService.findAll(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment found' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get('booking/:bookingId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payments by booking' })
  @ApiResponse({ status: 200, description: 'Booking payments' })
  async findByBooking(@Param('bookingId', ParseUuidPipe) bookingId: string) {
    return this.paymentsService.findByBooking(bookingId);
  }

  @Post(':id/refund')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Process refund' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  async refund(
    @Param('id', ParseUuidPipe) id: string,
    @Body('amount') amount: number,
  ) {
    return this.paymentsService.processRefund(id, amount);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payment gateway webhook' })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  async webhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }
}
