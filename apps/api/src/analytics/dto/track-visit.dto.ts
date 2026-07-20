import { IsUUID } from 'class-validator'

export class TrackVisitDto {
  @IsUUID('4')
  visitorId!: string

  @IsUUID('4')
  sessionId!: string
}
