import { Injectable, BadRequestException } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaService {
  private readonly uploadsDir = join(process.cwd(), 'uploads');

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

    const folderPath = join(this.uploadsDir, folder);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const ext = originalFilename.split('.').pop() || 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;
    const filePath = join(this.uploadsDir, key);

    await writeFile(filePath, fileBuffer);

    const url = `/uploads/${key}`;
    return { url, key };
  }

  async removeFile(key: string): Promise<void> {
    const filePath = join(this.uploadsDir, key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}
