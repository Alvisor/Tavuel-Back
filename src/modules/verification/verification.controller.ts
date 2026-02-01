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
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post(':providerId/submit')
  @ApiOperation({ summary: 'Submit provider verification documents' })
  @ApiResponse({ status: 201, description: 'Verification submitted' })
  async submit(
    @Param('providerId', ParseUuidPipe) providerId: string,
    @Body() body: any,
  ) {
    return this.verificationService.submitVerification(providerId, body);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all verification requests' })
  @ApiResponse({ status: 200, description: 'List of verification requests' })
  async findAll(@Query() query: any) {
    return this.verificationService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get verification by ID' })
  @ApiResponse({ status: 200, description: 'Verification found' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.verificationService.findOne(id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve verification request' })
  @ApiResponse({ status: 200, description: 'Verification approved' })
  async approve(
    @Param('id', ParseUuidPipe) id: string,
    @Body('reviewerId') reviewerId: string,
  ) {
    return this.verificationService.approve(id, reviewerId);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reject verification request' })
  @ApiResponse({ status: 200, description: 'Verification rejected' })
  async reject(
    @Param('id', ParseUuidPipe) id: string,
    @Body('reviewerId') reviewerId: string,
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
