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
import { ProvidersService } from './providers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a provider profile' })
  @ApiResponse({ status: 201, description: 'Provider created' })
  async create(@Body() body: any) {
    return this.providersService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all providers' })
  @ApiResponse({ status: 200, description: 'List of providers' })
  async findAll(@Query() query: any) {
    return this.providersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider found' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.providersService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update provider' })
  @ApiResponse({ status: 200, description: 'Provider updated' })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: any,
  ) {
    return this.providersService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete provider' })
  @ApiResponse({ status: 200, description: 'Provider deleted' })
  async remove(@Param('id', ParseUuidPipe) id: string) {
    return this.providersService.remove(id);
  }
}
