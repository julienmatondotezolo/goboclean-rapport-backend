import { IsIn, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PAYMENT_METHODS = ['cash', 'virement', 'virement_instantane', 'autre'] as const;

export class RecordPaymentDto {
  @ApiProperty({ description: 'Payment method', enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS as unknown as string[])
  method: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional({ description: 'Amount received (EUR)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}
