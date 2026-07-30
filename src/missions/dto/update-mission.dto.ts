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
  IsUUID,
  IsIn,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MissionType, MissionSubtype } from './create-mission.dto';
import { EQUIPMENT_IDS } from '../equipment.catalog';

export class UpdateMissionDto {
  @ApiPropertyOptional({
    description: 'Mission status',
    enum: ['assigned', 'in_progress', 'waiting_completion', 'completed', 'cancelled'],
  })
  @IsOptional()
  @IsIn(['assigned', 'in_progress', 'waiting_completion', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Assigned worker UUIDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigned_workers?: string[];
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

  @ApiPropertyOptional({
    description: 'Equipment ids (gros_dibo, petit_dibo, machine_peinture, camionnette)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsIn(EQUIPMENT_IDS, { each: true })
  equipment?: string[];

  @ApiPropertyOptional({ description: 'Property features' })
  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;
}
