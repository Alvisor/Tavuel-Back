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
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List pending verification requests' })
  @ApiResponse({ status: 200, description: 'List of verification requests' })
  async findAll(@Query() query: any) {
    return this.verificationService.findAll(query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get provider verification details' })
  @ApiResponse({ status: 200, description: 'Verification details' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.verificationService.findOne(id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve provider verification' })
  @ApiResponse({ status: 200, description: 'Verification approved' })
  async approve(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.verificationService.approve(id, reviewerId);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reject provider verification' })
  @ApiResponse({ status: 200, description: 'Verification rejected' })
  async reject(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body('reason') reason: string,
  ) {
    return this.verificationService.reject(id, reviewerId, reason);
  }

  @Get('provider/:providerId/status')
  @ApiOperation({ summary: 'Get verification status for a provider' })
  @ApiResponse({ status: 200, description: 'Verification status' })
  async getStatus(@Param('providerId', ParseUuidPipe) providerId: string) {
    return this.verificationService.getStatusByProvider(providerId);
  }
}
