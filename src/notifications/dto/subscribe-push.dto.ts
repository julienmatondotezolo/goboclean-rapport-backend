import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PushKeysDto {
  @ApiProperty({ description: 'p256dh key for push encryption' })
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @ApiProperty({ description: 'Auth secret for push encryption' })
  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class SubscribePushDto {
  @ApiProperty({ description: 'Push subscription endpoint URL' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ description: 'Push encryption keys', type: PushKeysDto })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}
