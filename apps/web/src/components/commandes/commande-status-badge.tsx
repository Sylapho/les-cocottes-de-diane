import { Badge, type badgeVariants } from '@/components/ui/badge'
import type { CommandeStatut } from '@/lib/api'
import type { VariantProps } from 'class-variance-authority'

export const commandeStatusLabels: Record<CommandeStatut, string> = {
  paiement_en_attente: 'Paiement en attente',
  nouvelle: 'Nouvelle',
  preparee: 'Préparée',
  traitee: 'Traitée',
  annulee: 'Annulée',
  paiement_a_verifier: 'Paiement à vérifier',
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

// Tone and glyph per status, from the Figma "Order status" component.
const commandeStatusStyles: Record<
  CommandeStatut,
  { variant: BadgeVariant; glyph: string }
> = {
  paiement_en_attente: { variant: 'neutral', glyph: '◷' },
  nouvelle: { variant: 'warning', glyph: '◷' },
  preparee: { variant: 'info', glyph: '✓' },
  traitee: { variant: 'success', glyph: '✓' },
  annulee: { variant: 'danger', glyph: '×' },
  paiement_a_verifier: { variant: 'primary', glyph: '!' },
}

export default function CommandeStatusBadge({
  statut,
  className,
}: {
  statut: CommandeStatut
  className?: string
}) {
  const { variant, glyph } = commandeStatusStyles[statut]

  return (
    <Badge variant={variant} className={className}>
      <span aria-hidden="true">{glyph}</span>
      {commandeStatusLabels[statut]}
    </Badge>
  )
}
