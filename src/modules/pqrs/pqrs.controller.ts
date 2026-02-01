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
import { PqrsService } from './pqrs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('PQRS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pqrs')
export class PqrsController {
  constructor(private readonly pqrsService: PqrsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a PQRS ticket' })
  @ApiResponse({ status: 201, description: 'PQRS ticket created' })
  async create(@Body() body: any) {
    return this.pqrsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all PQRS tickets' })
  @ApiResponse({ status: 200, description: 'List of PQRS tickets' })
  async findAll(@Query() query: any) {
    return this.pqrsService.findAll(query);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user PQRS tickets' })
  @ApiResponse({ status: 200, description: 'User PQRS tickets' })
  async findMyTickets(@CurrentUser('id') userId: string) {
    return this.pqrsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get PQRS ticket by ID' })
  @ApiResponse({ status: 200, description: 'PQRS ticket found' })
  @ApiResponse({ status: 404, description: 'PQRS ticket not found' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.pqrsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update PQRS ticket' })
  @ApiResponse({ status: 200, description: 'PQRS ticket updated' })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: any,
  ) {
    return this.pqrsService.update(id, body);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Add response to PQRS ticket' })
  @ApiResponse({ status: 201, description: 'Response added' })
  async respond(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: any,
  ) {
    return this.pqrsService.addResponse(id, body);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close PQRS ticket' })
  @ApiResponse({ status: 200, description: 'PQRS ticket closed' })
  async close(@Param('id', ParseUuidPipe) id: string) {
    return this.pqrsService.close(id);
  }
}
