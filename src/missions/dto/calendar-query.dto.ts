import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalendarQueryDto {
  @ApiProperty({ description: 'Start date (ISO 8601)', example: '2025-01-01' })
  @IsDateString()
  start: string;

  @ApiProperty({ description: 'End date (ISO 8601)', example: '2025-01-31' })
  @IsDateString()
  end: string;
}
