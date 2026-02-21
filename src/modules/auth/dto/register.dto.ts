import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'usuario@email.com' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({ example: 'MiPassword123!' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(64)
  @Matches(/(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'La contraseña debe incluir al menos una mayúscula y un número',
  })
  password: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: '+573001234567' })
  @IsString()
  @Matches(/^\+57[0-9]{10}$/, {
    message: 'Phone must be a valid Colombian number (+57XXXXXXXXXX)',
  })
  phone: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  wantsToBeProvider?: boolean;
}
