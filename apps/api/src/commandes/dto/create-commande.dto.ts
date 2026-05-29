import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

class CreateCommandeLineDto {
  @IsInt()
  articleId: number

  @IsInt()
  @Min(1)
  quantite: number
}

export class CreateCommandeDto {
  @IsString()
  nom: string

  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  tel?: string

  @IsString()
  lieu: string

  @IsOptional()
  @IsDateString()
  dateRetrait?: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCommandeLineDto)
  lignes: CreateCommandeLineDto[]
}
