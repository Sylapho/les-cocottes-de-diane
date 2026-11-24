import {
  PageContainer,
  PageHeading,
  Panel,
} from '@/components/layout/page-layout'
import {
  PickupPointActiveButton,
  PickupPointSheet,
} from '@/components/pickup-points/pickup-point-sheet'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getPickupPoints, type PickupPoint } from '@/lib/api'
import { weekdays } from '@/lib/pickup-points'
import { requireUiPermission } from '@/lib/auth-session'
import {
  canManagePickupPoints,
  canViewPickupPoints,
} from '@/lib/permissions'
import { cn } from '@/lib/utils'

const linkButtonClassName =
  'h-auto rounded-sm p-0 font-normal whitespace-nowrap text-muted-foreground hover:bg-transparent hover:text-foreground hover:underline'

function formatWeekdays(pickupPoint: PickupPoint) {
  const days = weekdays
    .filter((weekday) => pickupPoint.allowedWeekdays.includes(weekday.value))
    .map((weekday) => weekday.label)
    .join(', ')

  return pickupPoint.alternatingWeekAnchorDate
    ? `${days} · une semaine sur deux`
    : days
}

function PickupPointAction({ pickupPoint }: { pickupPoint: PickupPoint }) {
  if (!pickupPoint.active) {
    return (
      <PickupPointActiveButton
        pickupPoint={pickupPoint}
        variant="ghost"
        className={linkButtonClassName}
      >
        Réactiver <span aria-hidden="true">→</span>
      </PickupPointActiveButton>
    )
  }

  return (
    <PickupPointSheet
      pickupPoint={pickupPoint}
      trigger={
        <button
          type="button"
          className="rounded-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:underline"
          aria-label={`Modifier ${pickupPoint.label}`}
        >
          Modifier <span aria-hidden="true">→</span>
        </button>
      }
    />
  )
}

export default async function AdminPickupPointsPage() {
  const session = await requireUiPermission(canViewPickupPoints)
  const userCanManagePickupPoints = canManagePickupPoints(session.user)
  const pickupPoints = await getPickupPoints()

  return (
    <PageContainer>
      <PageHeading
        context="Points de retrait"
        title="Points de retrait"
        description="Adresses, jours autorisés et informations transmises aux clients."
      />

      {userCanManagePickupPoints ? (
        <div>
          <PickupPointSheet
            trigger={
              <Button className="w-full sm:w-64">Créer un point de retrait</Button>
            }
          />
        </div>
      ) : null}

      {pickupPoints.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucun point de retrait</EmptyTitle>
            <EmptyDescription>
              Les points actifs sont proposés aux clients lors de la commande.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Point</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Retrait</TableHead>
                  <TableHead>Jours</TableHead>
                  <TableHead>État</TableHead>
                  {userCanManagePickupPoints ? <TableHead>Action</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pickupPoints.map((pickupPoint) => (
                  <TableRow key={pickupPoint.id}>
                    <TableCell className="font-medium">
                      {pickupPoint.label}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {pickupPoint.address}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {pickupPoint.schedule}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatWeekdays(pickupPoint)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        pickupPoint.active ? 'text-muted-foreground' : 'text-warning',
                      )}
                    >
                      {pickupPoint.active ? 'Actif' : 'Inactif'}
                    </TableCell>
                    {userCanManagePickupPoints ? (
                      <TableCell>
                        <PickupPointAction pickupPoint={pickupPoint} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-6 md:hidden">
            {pickupPoints.map((pickupPoint) => (
              <li
                key={pickupPoint.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6"
              >
                <h3 className="text-lg leading-[26px] font-semibold">
                  {pickupPoint.label}
                </h3>
                <p className="text-sm leading-5 text-muted-foreground">
                  {pickupPoint.address}
                </p>
                <p className="text-sm leading-5">
                  {pickupPoint.schedule} · {formatWeekdays(pickupPoint)} ·{' '}
                  <span className={cn(!pickupPoint.active && 'text-warning')}>
                    {pickupPoint.active ? 'Actif' : 'Inactif'}
                  </span>
                </p>
                {userCanManagePickupPoints ? (
                  pickupPoint.active ? (
                    <PickupPointSheet
                      pickupPoint={pickupPoint}
                      trigger={
                        <Button variant="secondary" className="w-full">
                          Modifier
                        </Button>
                      }
                    />
                  ) : (
                    <PickupPointActiveButton
                      pickupPoint={pickupPoint}
                      className="w-full"
                    >
                      Réactiver
                    </PickupPointActiveButton>
                  )
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <Panel
        title="Règles de retrait"
        footer="Pas de calendrier de capacité, de créneaux réservables ou de tournée."
      >
        <p className="text-sm leading-5">
          Les clients choisissent une date parmi les jours autorisés de chaque
          point actif. L’alternance une semaine sur deux est prise en charge
          via l’ancrage.
        </p>
      </Panel>
    </PageContainer>
  )
}
