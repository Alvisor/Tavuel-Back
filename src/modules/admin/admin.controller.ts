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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ───────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ─── Users ───────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users with pagination and filters' })
  async getUsers(@Query() query: any) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail with related data' })
  async getUserDetail(@Param('id', ParseUuidPipe) id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user status (activate, ban, etc.)' })
  async updateUserStatus(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: { status: string; reason?: string },
  ) {
    return this.adminService.updateUserStatus(id, body.status as any, body.reason);
  }

  // ─── Providers ───────────────────────────────────────────────

  @Get('providers')
  @ApiOperation({ summary: 'List all providers with pagination and filters' })
  async getProviders(@Query() query: any) {
    return this.adminService.getProviders(query);
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Get provider detail with full related data' })
  async getProviderDetail(@Param('id', ParseUuidPipe) id: string) {
    return this.adminService.getProviderDetail(id);
  }

  @Patch('providers/:id/status')
  @ApiOperation({ summary: 'Update provider verification status' })
  async updateProviderStatus(
    @Param('id', ParseUuidPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateProviderStatus(id, status as any);
  }

  // ─── Bookings ────────────────────────────────────────────────

  @Get('bookings')
  @ApiOperation({ summary: 'List all bookings with pagination and filters' })
  async getBookings(@Query() query: any) {
    return this.adminService.getBookings(query);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get booking detail with all related data' })
  async getBookingDetail(@Param('id', ParseUuidPipe) id: string) {
    return this.adminService.getBookingDetail(id);
  }

  @Get('bookings/:id/timeline')
  @ApiOperation({ summary: 'Get booking status history timeline' })
  async getBookingTimeline(@Param('id', ParseUuidPipe) id: string) {
    return this.adminService.getBookingTimeline(id);
  }

  @Get('bookings/:id/evidence')
  @ApiOperation({ summary: 'Get booking evidence grouped by type' })
  async getBookingEvidence(@Param('id', ParseUuidPipe) id: string) {
    return this.adminService.getBookingEvidence(id);
  }

  @Patch('bookings/:id/cancel')
  @ApiOperation({ summary: 'Cancel a booking as admin' })
  async cancelBooking(
    @Param('id', ParseUuidPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.cancelBooking(id, reason, adminId);
  }

  // ─── PQRS ───────────────────────────────────────────────────

  @Get('pqrs')
  @ApiOperation({ summary: 'List all PQRS tickets with pagination and filters' })
  async getPqrs(@Query() query: any) {
    return this.adminService.getPqrs(query);
  }

  @Get('pqrs/:id')
  @ApiOperation({ summary: 'Get PQRS ticket detail with messages and related booking' })
  async getPqrsDetail(@Param('id', ParseUuidPipe) id: string) {
    return this.adminService.getPqrsDetail(id);
  }

  @Patch('pqrs/:id/assign')
  @ApiOperation({ summary: 'Assign PQRS ticket to current admin' })
  async assignPqrs(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.assignPqrs(id, adminId);
  }

  @Post('pqrs/:id/respond')
  @ApiOperation({ summary: 'Send an admin response to a PQRS ticket' })
  async respondPqrs(
    @Param('id', ParseUuidPipe) id: string,
    @Body('content') content: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.respondPqrs(id, content, adminId);
  }

  @Patch('pqrs/:id/resolve')
  @ApiOperation({ summary: 'Resolve a PQRS ticket with resolution details' })
  async resolvePqrs(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: { resolutionType: string; refundAmount?: number; resolution: string },
  ) {
    return this.adminService.resolvePqrs(id, body);
  }

  @Patch('pqrs/:id/escalate')
  @ApiOperation({ summary: 'Escalate a PQRS ticket to high priority' })
  async escalatePqrs(
    @Param('id', ParseUuidPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.escalatePqrs(id, reason);
  }

  // ─── Categories & Services ──────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'Get all service categories with their services' })
  async getCategories() {
    return this.adminService.getCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new service category' })
  async createCategory(
    @Body() body: { name: string; slug: string; description: string },
  ) {
    return this.adminService.createCategory(body);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a service category' })
  async updateCategory(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: any,
  ) {
    return this.adminService.updateCategory(id, body);
  }

  @Patch('categories/:id/toggle')
  @ApiOperation({ summary: 'Toggle category active/inactive' })
  async toggleCategory(@Param('id', ParseUuidPipe) id: string) {
    return this.adminService.toggleCategory(id);
  }

  @Post('categories/:categoryId/services')
  @ApiOperation({ summary: 'Create a new service in a category' })
  async createService(
    @Param('categoryId', ParseUuidPipe) categoryId: string,
    @Body() body: any,
  ) {
    return this.adminService.createService(categoryId, body);
  }

  @Patch('services/:id')
  @ApiOperation({ summary: 'Update a service' })
  async updateService(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: any,
  ) {
    return this.adminService.updateService(id, body);
  }

  // ─── System Config ──────────────────────────────────────────

  @Get('config')
  @ApiOperation({ summary: 'Get system configuration' })
  async getSystemConfig() {
    return this.adminService.getSystemConfig();
  }

  @Patch('config')
  @ApiOperation({ summary: 'Update system configuration' })
  async updateSystemConfig(@Body() body: any) {
    return this.adminService.updateSystemConfig(body);
  }

  // ─── Admin Management ──────────────────────────────────────

  @Post('admins')
  @ApiOperation({ summary: 'Create a new admin user' })
  async createAdmin(
    @Body() body: { email: string; firstName: string; lastName: string; password: string },
  ) {
    return this.adminService.createAdmin(body);
  }

  // ─── Payments ──────────────────────────────────────────────

  @Get('payments')
  @ApiOperation({ summary: 'List all payments with pagination' })
  async getPayments(@Query() query: any) {
    return this.adminService.getPayments(query);
  }

  // ─── Reports ──────────────────────────────────────────────

  @Get('reports/revenue')
  @ApiOperation({ summary: 'Get revenue report for date range' })
  async getRevenueReport(@Query() query: any) {
    return this.adminService.getRevenueReport(query);
  }

  @Get('reports/bookings')
  @ApiOperation({ summary: 'Get bookings report for date range' })
  async getBookingsReport(@Query() query: any) {
    return this.adminService.getBookingsReport(query);
  }

  @Get('reports/providers')
  @ApiOperation({ summary: 'Get providers performance report' })
  async getProvidersReport(@Query() query: any) {
    return this.adminService.getProvidersReport(query);
  }
}
