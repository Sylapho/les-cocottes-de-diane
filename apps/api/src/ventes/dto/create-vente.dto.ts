import { Type } from 'class-transformer'
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator'

class CreateLigneVenteDto {
  @IsInt()
  articleId!: number

  @IsInt()
  @Min(1)
  quantite!: number
}

// The seller is never part of the client contract: the API derives it from the
// authenticated session, and the global ValidationPipe rejects unknown fields.
export class CreateVenteDto {
  @IsIn(['cb', 'especes', 'cheque'])
  mode!: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  remiseCents?: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLigneVenteDto)
  lignes!: CreateLigneVenteDto[]
}
