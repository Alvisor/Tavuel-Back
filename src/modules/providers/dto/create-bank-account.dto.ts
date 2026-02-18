import {
  IsString,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BankAccountType, DocumentIdType } from '@prisma/client';

export class CreateBankAccountDto {
  @ApiProperty({ enum: BankAccountType, example: 'NEQUI' })
  @IsEnum(BankAccountType)
  accountType: BankAccountType;

  @ApiPropertyOptional({ example: 'Bancolombia' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  accountNumber: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  accountHolder: string;

  @ApiProperty({ enum: DocumentIdType, example: 'CC' })
  @IsEnum(DocumentIdType)
  documentType: DocumentIdType;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  documentNumber: string;
}
