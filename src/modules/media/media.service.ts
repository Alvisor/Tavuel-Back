import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadsDir = join(process.cwd(), 'uploads');
  private readonly s3Client: S3Client | null;
  private readonly s3Bucket: string;
  private readonly r2PublicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const s3Endpoint = this.configService.get<string>('S3_ENDPOINT');

    if (s3Endpoint) {
      this.s3Client = new S3Client({
        region: this.configService.get<string>('S3_REGION', 'auto'),
        endpoint: s3Endpoint,
        credentials: {
          accessKeyId: this.configService.get<string>('S3_ACCESS_KEY', ''),
          secretAccessKey: this.configService.get<string>('S3_SECRET_KEY', ''),
        },
      });
      this.s3Bucket = this.configService.get<string>('S3_BUCKET', 'tavuel-media');
      this.r2PublicUrl = this.configService.get<string>('R2_PUBLIC_URL', '');
      this.logger.log('MediaService using Cloudflare R2');
    } else {
      this.s3Client = null;
      this.s3Bucket = '';
      this.r2PublicUrl = '';
      this.logger.log('MediaService using local filesystem');
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimetype: string,
    folder: string = 'general',
  ): Promise<{ url: string; key: string }> {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (!allowedMimes.includes(mimetype)) {
      throw new BadRequestException(
        `File type ${mimetype} not allowed. Allowed: ${allowedMimes.join(', ')}`,
      );
    }

    const ext = originalFilename.split('.').pop() || 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;

    if (this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: mimetype,
        }),
      );

      const url = `${this.r2PublicUrl}/${key}`;
      return { url, key };
    }

    // Local filesystem fallback
    const folderPath = join(this.uploadsDir, folder);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const filePath = join(this.uploadsDir, key);
    await writeFile(filePath, fileBuffer);

    const url = `/uploads/${key}`;
    return { url, key };
  }

  async removeFile(key: string): Promise<void> {
    if (this.s3Client) {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
        }),
      );
      return;
    }

    // Local filesystem fallback
    const filePath = join(this.uploadsDir, key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}
