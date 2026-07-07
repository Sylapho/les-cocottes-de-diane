import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

export class CreateArticleDto {
  @IsString()
  nom!: string

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number

  @IsOptional()
  @IsString()
  category?: string

  @IsNumber()
  @Min(0)
  prixCents!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  tvaBps?: number

  @IsOptional()
  @IsBoolean()
  online?: boolean

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  ingredients?: string | null

  @IsOptional()
  @IsString()
  allergenes?: string | null

  @IsOptional()
  @IsString()
  imageUrl?: string | null
}
