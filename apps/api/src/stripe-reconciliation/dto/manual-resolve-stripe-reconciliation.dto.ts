import { IsString, MinLength } from 'class-validator'

export class ManualResolveStripeReconciliationDto {
  @IsString()
  @MinLength(10)
  justification!: string
}
