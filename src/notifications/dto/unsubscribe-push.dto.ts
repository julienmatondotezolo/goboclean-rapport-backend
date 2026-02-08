import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnsubscribePushDto {
  @ApiProperty({ description: 'Push subscription endpoint URL to remove' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;
}
