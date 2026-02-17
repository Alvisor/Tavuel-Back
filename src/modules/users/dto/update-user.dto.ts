import {
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  IsUrl,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+57[0-9]{10}$/, {
    message: 'Phone must be a valid Colombian number (+57XXXXXXXXXX)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://storage.tavuel.com/avatars/user.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
