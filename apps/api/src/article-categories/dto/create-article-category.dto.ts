import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value
}

function emptyStringToUndefined(value: unknown) {
  const trimmed = trimString(value)
  return trimmed === '' ? undefined : trimmed
}

export class CreateArticleCategoryDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @MaxLength(120)
  slug?: string

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
