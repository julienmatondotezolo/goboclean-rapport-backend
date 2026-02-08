import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleMissionDto {
  @ApiProperty({ description: 'New appointment date/time (ISO 8601)' })
  @IsDateString()
  appointment_time: string;
}
