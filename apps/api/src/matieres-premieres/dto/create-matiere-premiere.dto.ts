import { IsNumber, IsString, Min } from 'class-validator'

export class CreateMatierePremiereDto {
  @IsString()
  nom!: string

  @IsString()
  unite!: string

  @IsNumber()
  @Min(0)
  coutUnitaireCents!: number

  @IsNumber()
  @Min(0)
  seuil!: number

  @IsString()
  conditionnement!: string
}
