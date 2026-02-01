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
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new service listing' })
  @ApiResponse({ status: 201, description: 'Service created' })
  async create(@Body() body: any) {
    return this.servicesService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiResponse({ status: 200, description: 'List of services' })
  async findAll(@Query() query: any) {
    return this.servicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiResponse({ status: 200, description: 'Service found' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update service' })
  @ApiResponse({ status: 200, description: 'Service updated' })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: any,
  ) {
    return this.servicesService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete service' })
  @ApiResponse({ status: 200, description: 'Service deleted' })
  async remove(@Param('id', ParseUuidPipe) id: string) {
    return this.servicesService.remove(id);
  }

  @Get('provider/:providerId')
  @ApiOperation({ summary: 'Get services by provider' })
  @ApiResponse({ status: 200, description: 'Provider services' })
  async findByProvider(@Param('providerId', ParseUuidPipe) providerId: string) {
    return this.servicesService.findByProvider(providerId);
  }
}
