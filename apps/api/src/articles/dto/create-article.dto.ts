import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateArticleDto {
  @IsString()
  nom: string

  @IsNumber()
  @Min(0)
  prix: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  tva?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number

  @IsOptional()
  @IsBoolean()
  online?: boolean

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  imageUrl?: string | null
}
