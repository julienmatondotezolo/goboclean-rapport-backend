import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  IsEnum,
  IsArray,
  IsNumber,
  IsInt,
  IsObject,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MissionType {
  ROOF = 'roof',
}

export enum MissionSubtype {
  CLEANING = 'cleaning',
  COATING = 'coating',
}

export class CreateMissionDto {
  @ApiProperty({ description: 'Client first name' })
  @IsString()
  @IsNotEmpty()
  client_first_name: string;

  @ApiProperty({ description: 'Client last name' })
  @IsString()
  @IsNotEmpty()
  client_last_name: string;

  @ApiProperty({ description: 'Client phone number' })
  @IsString()
  @IsNotEmpty()
  client_phone: string;

  @ApiPropertyOptional({ description: 'Client email address' })
  @IsOptional()
  @IsEmail()
  client_email?: string;

  @ApiProperty({ description: 'Client address' })
  @IsString()
  @IsNotEmpty()
  client_address: string;

  @ApiPropertyOptional({ description: 'Client latitude' })
  @IsOptional()
  @IsNumber()
  client_latitude?: number;

  @ApiPropertyOptional({ description: 'Client longitude' })
  @IsOptional()
  @IsNumber()
  client_longitude?: number;

  @ApiProperty({ description: 'Appointment date/time (ISO 8601)' })
  @IsDateString()
  appointment_time: string;

  @ApiPropertyOptional({ enum: MissionType, default: MissionType.ROOF })
  @IsOptional()
  @IsEnum(MissionType)
  mission_type?: MissionType;

  @ApiProperty({ description: 'Mission subtypes', enum: MissionSubtype, isArray: true })
  @IsArray()
  @IsEnum(MissionSubtype, { each: true })
  mission_subtypes: MissionSubtype[];

  @ApiPropertyOptional({ description: 'Surface area in m²' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  surface_area?: number;

  @ApiPropertyOptional({ description: 'Number of facades', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  facade_count?: number;

  @ApiPropertyOptional({ description: 'Additional info / notes' })
  @IsOptional()
  @IsString()
  additional_info?: string;

  @ApiPropertyOptional({ description: 'Property features (frontParking, garden, solarPanels, etc.)' })
  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Worker UUIDs to assign immediately', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigned_workers?: string[];
}
