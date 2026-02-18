import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { MediaService } from '../media/media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { SetAvailabilityDto } from './dto/create-availability.dto';
import { SearchProvidersDto } from './dto/search-providers.dto';
import { DocumentType } from '@prisma/client';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly mediaService: MediaService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search providers with filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of providers' })
  async searchProviders(@Query() dto: SearchProvidersDto) {
    return this.providersService.searchProviders(dto);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create provider profile' })
  @ApiResponse({ status: 201, description: 'Provider profile created' })
  async createProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProviderDto,
  ) {
    return this.providersService.createProfile(userId, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my provider profile' })
  @ApiResponse({ status: 200, description: 'Provider profile' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    if (!provider) {
      return { hasProfile: false };
    }
    return this.providersService.findOneWithRelations(provider.id);
  }

  @Get('me/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get onboarding status' })
  @ApiResponse({ status: 200, description: 'Onboarding status' })
  async getOnboardingStatus(@CurrentUser('id') userId: string) {
    return this.providersService.getOnboardingStatus(userId);
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update my provider profile' })
  @ApiResponse({ status: 200, description: 'Provider profile updated' })
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProviderDto,
  ) {
    const provider = await this.providersService.findByUserId(userId);
    if (!provider) {
      throw new BadRequestException('No provider profile found');
    }
    return this.providersService.updateProfile(provider.id, dto);
  }

  @Post('me/documents')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload provider document' })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const provider = await this.providersService.findByUserId(userId);
    if (!provider) {
      throw new BadRequestException('No provider profile found');
    }

    const file = await req.file();
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Get the document type from the form field
    const fields = file.fields as Record<string, any>;
    const typeField = fields['type'];
    const documentType = typeField?.value as string;

    if (!documentType || !Object.values(DocumentType).includes(documentType as DocumentType)) {
      throw new BadRequestException(
        `Invalid document type. Must be one of: ${Object.values(DocumentType).join(', ')}`,
      );
    }

    const buffer = await file.toBuffer();
    const { url } = await this.mediaService.uploadFile(
      buffer,
      file.filename,
      file.mimetype,
      'documents',
    );

    return this.providersService.uploadDocument(
      provider.id,
      documentType as DocumentType,
      url,
    );
  }

  @Get('me/documents')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my documents' })
  @ApiResponse({ status: 200, description: 'Documents list' })
  async getMyDocuments(@CurrentUser('id') userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    if (!provider) {
      return [];
    }
    return this.providersService.getDocuments(provider.id);
  }

  @Post('me/bank')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Set bank account' })
  @ApiResponse({ status: 201, description: 'Bank account configured' })
  async setBankAccount(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBankAccountDto,
  ) {
    const provider = await this.providersService.findByUserId(userId);
    if (!provider) {
      throw new BadRequestException('No provider profile found');
    }
    return this.providersService.setBankAccount(provider.id, dto);
  }

  @Get('me/bank')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my bank account' })
  @ApiResponse({ status: 200, description: 'Bank account' })
  async getMyBankAccount(@CurrentUser('id') userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    if (!provider) {
      return null;
    }
    return this.providersService.getBankAccount(provider.id);
  }

  @Put('me/availability')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Set availability' })
  @ApiResponse({ status: 200, description: 'Availability configured' })
  async setAvailability(
    @CurrentUser('id') userId: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    const provider = await this.providersService.findByUserId(userId);
    if (!provider) {
      throw new BadRequestException('No provider profile found');
    }
    return this.providersService.setAvailability(provider.id, dto.slots);
  }

  @Get('me/availability')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my availability' })
  @ApiResponse({ status: 200, description: 'Availability' })
  async getMyAvailability(@CurrentUser('id') userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    if (!provider) {
      return [];
    }
    return this.providersService.getAvailability(provider.id);
  }

  @Post('me/submit')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit for verification' })
  @ApiResponse({ status: 200, description: 'Submitted for verification' })
  async submitForVerification(@CurrentUser('id') userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    if (!provider) {
      throw new BadRequestException('No provider profile found');
    }
    return this.providersService.submitForVerification(provider.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider public profile' })
  @ApiResponse({ status: 200, description: 'Provider public profile' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.providersService.findPublicProfile(id);
  }
}
