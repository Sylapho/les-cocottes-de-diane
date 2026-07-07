import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'

export const COMMANDE_REFUND_REASONS = [
  'requested_by_customer',
  'duplicate',
  'fraudulent',
  'other',
] as const

export type CommandeRefundReason = (typeof COMMANDE_REFUND_REASONS)[number]

export class CreateCommandeRefundDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  amountCents?: number

  @IsIn(COMMANDE_REFUND_REASONS)
  reason!: CommandeRefundReason

  @IsOptional()
  @IsString()
  @MaxLength(500)
  internalNote?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[A-Za-z0-9:_-]+$/)
  requestId?: string
}
