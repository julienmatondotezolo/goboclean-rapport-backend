import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsEnum,
  IsArray,
  IsNumber,
  IsInt,
  IsObject,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MissionType, MissionSubtype } from './create-mission.dto';

export class UpdateMissionDto {
  @ApiPropertyOptional({ description: 'Client first name' })
  @IsOptional()
  @IsString()
  client_first_name?: string;

  @ApiPropertyOptional({ description: 'Client last name' })
  @IsOptional()
  @IsString()
  client_last_name?: string;

  @ApiPropertyOptional({ description: 'Client phone number' })
  @IsOptional()
  @IsString()
  client_phone?: string;

  @ApiPropertyOptional({ description: 'Client email address' })
  @IsOptional()
  @IsEmail()
  client_email?: string;

  @ApiPropertyOptional({ description: 'Client address' })
  @IsOptional()
  @IsString()
  client_address?: string;

  @ApiPropertyOptional({ description: 'Client latitude' })
  @IsOptional()
  @IsNumber()
  client_latitude?: number;

  @ApiPropertyOptional({ description: 'Client longitude' })
  @IsOptional()
  @IsNumber()
  client_longitude?: number;

  @ApiPropertyOptional({ description: 'Appointment date/time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  appointment_time?: string;

  @ApiPropertyOptional({ enum: MissionType })
  @IsOptional()
  @IsEnum(MissionType)
  mission_type?: MissionType;

  @ApiPropertyOptional({ description: 'Mission subtypes', enum: MissionSubtype, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(MissionSubtype, { each: true })
  mission_subtypes?: MissionSubtype[];

  @ApiPropertyOptional({ description: 'Surface area in m²' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  surface_area?: number;

  @ApiPropertyOptional({ description: 'Number of facades' })
  @IsOptional()
  @IsInt()
  @Min(1)
  facade_count?: number;

  @ApiPropertyOptional({ description: 'Additional info / notes' })
  @IsOptional()
  @IsString()
  additional_info?: string;

  @ApiPropertyOptional({ description: 'Property features' })
  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;
}
