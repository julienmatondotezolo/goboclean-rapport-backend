import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  IsEnum,
  IsArray,
  IsIn,
  IsNumber,
  IsInt,
  IsObject,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EQUIPMENT_IDS } from '../equipment.catalog';

export enum MissionType {
  ROOF = 'roof',
}

export enum MissionSubtype {
  // Legacy values (missions created before the service catalog)
  CLEANING = 'cleaning',
  COATING = 'coating',
  // Roof Revive service catalog (Quote-Agent-Knowledge-Base/services.json)
  DEMOUSSAGE = 'demoussage',
  GOUTTIERES = 'gouttieres',
  HYDROFUGE_WAX = 'hydrofuge_wax',
  DEPLACEMENT = 'deplacement',
  PEINTURE_TOITURE = 'peinture_toiture',
  FACADE = 'facade',
  PANNEAUX_SOLAIRES = 'panneaux_solaires',
  NACELLE = 'nacelle',
  TERRASSE = 'terrasse',
  MUR = 'mur',
  CHEMINEE = 'cheminee',
  PILIERS = 'piliers',
  VELUX = 'velux',
  DRIVEWAY = 'driveway',
  ESCALIER = 'escalier',
  EVAC_MOUSSE = 'evac_mousse',
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

  @ApiPropertyOptional({ description: 'Client language (fr, nl, en)', default: 'fr' })
  @IsOptional()
  @IsIn(['fr', 'nl', 'en'])
  client_language?: string;

  @ApiPropertyOptional({
    description: 'Equipment ids (gros_dibo, petit_dibo, machine_peinture, camionnette, hilux)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsIn(EQUIPMENT_IDS, { each: true })
  equipment?: string[];
}
