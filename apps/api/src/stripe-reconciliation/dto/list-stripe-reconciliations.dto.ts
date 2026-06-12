import { IsIn, IsOptional, IsString } from 'class-validator'

const statuses = ['pending', 'manual_review', 'resolved', 'failed'] as const

const operations = [
  'expire_checkout_session',
  'review_paid_pending_checkout',
  'review_paid_cancelled_checkout',
  'review_checkout_payment_mismatch',
  'review_checkout_attachment_conflict',
  'review_missing_checkout_session',
  'review_unmatched_checkout_session',
] as const

export class ListStripeReconciliationsDto {
  @IsOptional()
  @IsIn(statuses)
  status?: string

  @IsOptional()
  @IsIn(operations)
  operation?: string

  @IsOptional()
  @IsString()
  commandeId?: string

  @IsOptional()
  @IsString()
  stripeSessionId?: string

  @IsOptional()
  @IsString()
  page?: string

  @IsOptional()
  @IsString()
  pageSize?: string
}
