import {
  Controller,
  Post,
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
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
  async upload(
    @Req() req: any,
    @Query('folder') folder?: string,
  ) {
    const file = await req.file();

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const buffer = await file.toBuffer();
    return this.mediaService.uploadFile(
      buffer,
      file.filename,
      file.mimetype,
      folder || 'general',
    );
  }
}
