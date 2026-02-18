import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me/toggle-mode')
  @ApiOperation({ summary: 'Toggle between client/provider mode' })
  @ApiResponse({ status: 200, description: 'Mode toggled' })
  async toggleMode(@CurrentUser('id') userId: string) {
    return this.usersService.toggleMode(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto, userId, userRole);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID (owner or admin)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto, requesterId, requesterRole);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate user account (owner or admin)' })
  @ApiResponse({ status: 200, description: 'Account deactivated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.usersService.remove(id, requesterId, requesterRole);
  }
}
