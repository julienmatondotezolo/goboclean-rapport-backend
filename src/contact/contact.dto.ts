import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactRequestDto {
  @ApiProperty({ example: 'Marie Dupont' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Syndic Dupont SRL' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @ApiProperty({ example: 'marie@syndic-dupont.be' })
  @IsEmail()
  @MaxLength(160)
  email: string;

  @ApiPropertyOptional({ example: '+32 470 12 34 56' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'graffiti' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  service?: string;

  @ApiProperty({ example: 'Façade de 300 m² à nettoyer, Ixelles.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({ enum: ['fr', 'nl', 'en'] })
  @IsOptional()
  @IsIn(['fr', 'nl', 'en'])
  locale?: string;

  /** Honeypot : champ caché du formulaire, rempli uniquement par les robots. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
