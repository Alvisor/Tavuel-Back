import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users (admin)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getUsers(@Query() query: any) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user status' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  async updateUserStatus(
    @Param('id', ParseUuidPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateUserStatus(id, status);
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get all providers (admin)' })
  @ApiResponse({ status: 200, description: 'List of providers' })
  async getProviders(@Query() query: any) {
    return this.adminService.getProviders(query);
  }

  @Patch('providers/:id/status')
  @ApiOperation({ summary: 'Update provider status' })
  @ApiResponse({ status: 200, description: 'Provider status updated' })
  async updateProviderStatus(
    @Param('id', ParseUuidPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateProviderStatus(id, status);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get system configuration' })
  @ApiResponse({ status: 200, description: 'System configuration' })
  async getSystemConfig() {
    return this.adminService.getSystemConfig();
  }

  @Patch('config')
  @ApiOperation({ summary: 'Update system configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateSystemConfig(@Body() body: any) {
    return this.adminService.updateSystemConfig(body);
  }
}
