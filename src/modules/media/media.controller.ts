import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  async upload(@Req() req: any) {
    // TODO: Implement multipart file upload with @fastify/multipart
    return this.mediaService.upload(req, {});
  }

  @Get()
  @ApiOperation({ summary: 'Get all media files' })
  @ApiResponse({ status: 200, description: 'List of media files' })
  async findAll(@Query() query: any) {
    return this.mediaService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media by ID' })
  @ApiResponse({ status: 200, description: 'Media found' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.mediaService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media' })
  @ApiResponse({ status: 200, description: 'Media deleted' })
  async remove(@Param('id', ParseUuidPipe) id: string) {
    return this.mediaService.remove(id);
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Get signed URL for media access' })
  @ApiResponse({ status: 200, description: 'Signed URL generated' })
  async getSignedUrl(@Param('id') id: string) {
    return this.mediaService.getSignedUrl(id);
  }
}
