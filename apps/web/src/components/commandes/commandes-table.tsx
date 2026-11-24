import CommandeStatusBadge from '@/components/commandes/commande-status-badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Commande } from '@/lib/api'
import { formatOrderDateTime } from '@/lib/commande-list'
import { formatCurrencyFromCents } from '@/lib/money'
import Link from 'next/link'

function formatPickupDay(value?: string | null) {
  if (!value) {
    return 'date non précisée'
  }

  return `le ${new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))}`
}

// Figma "Orders table" on desktop/tablet, stacked order cards on mobile.
export default function CommandesTable({
  commandes,
}: {
  commandes: Commande[]
}) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Créée le</TableHead>
              <TableHead>Retrait</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commandes.map((commande) => (
              <TableRow key={commande.id} className="relative">
                <TableCell className="font-medium">
                  {/* Stretched link: the whole row opens the order. */}
                  <Link
                    href={`/commandes/${commande.id}`}
                    className="rounded-sm after:absolute after:inset-0"
                    aria-label={`Commande #${commande.id}, ${commande.nom}`}
                  >
                    #{commande.id}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {commande.nom}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatOrderDateTime(commande.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {commande.lieu}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatCurrencyFromCents(commande.totalTtcCents)}
                </TableCell>
                <TableCell>
                  <CommandeStatusBadge
                    statut={commande.statut}
                    className="min-w-[174px] justify-center"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-6 md:hidden">
        {commandes.map((commande) => (
          <li
            key={commande.id}
            className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
          >
            <h3 className="text-lg leading-[26px] font-semibold">
              #{commande.id} · {commande.nom}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <CommandeStatusBadge statut={commande.statut} />
              <span className="text-sm leading-5">
                {formatCurrencyFromCents(commande.totalTtcCents)}
              </span>
            </div>
            <p className="text-sm leading-5 text-muted-foreground">
              {commande.lieu} · Retrait {formatPickupDay(commande.dateRetrait)}
            </p>
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/commandes/${commande.id}`}>Voir la commande</Link>
            </Button>
          </li>
        ))}
      </ul>
    </>
  )
}
