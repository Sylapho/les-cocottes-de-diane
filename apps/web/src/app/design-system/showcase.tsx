'use client'

import { InboxIcon } from 'lucide-react'
import { toast } from 'sonner'
import CommandeStatusBadge from '@/components/commandes/commande-status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationSummary,
} from '@/components/ui/pagination'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { CommandeStatut } from '@/lib/api'

const statuses: CommandeStatut[] = [
  'nouvelle',
  'preparee',
  'traitee',
  'annulee',
  'paiement_en_attente',
  'paiement_a_verifier',
]

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg leading-[26px] font-semibold">{title}</h2>
      {children}
    </section>
  )
}

// Development-only gallery of the redesign base components (Figma "Design System" page).
export default function DesignSystemShowcase() {
  return (
    <TooltipProvider>
      <div className="mx-auto flex max-w-5xl flex-col gap-10 p-6">
        <header className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Gestion</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Design system</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl leading-[42px] font-semibold">
            Composants de base
          </h1>
          <p className="text-muted-foreground">
            Page de développement, absente en production.
          </p>
        </header>

        <Section title="Boutons">
          <div className="flex flex-wrap gap-3">
            <Button>Enregistrer</Button>
            <Button variant="secondary">Annuler</Button>
            <Button variant="destructive">Supprimer</Button>
            <Button variant="ghost">Fantôme</Button>
            <Button variant="link">Lien</Button>
            <Button disabled>Désactivé</Button>
            <Button variant="secondary" disabled>
              Désactivé
            </Button>
            <Button variant="secondary" size="icon" aria-label="Fermer">
              ×
            </Button>
          </div>
        </Section>

        <Section title="Statuts de commande">
          <div className="flex flex-wrap gap-3">
            {statuses.map((statut) => (
              <CommandeStatusBadge key={statut} statut={statut} />
            ))}
            <Badge variant="danger">Indisponible</Badge>
          </div>
        </Section>

        <Section title="Champs">
          <FieldGroup className="grid gap-6 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="ds-name">Nom *</FieldLabel>
              <Input id="ds-name" defaultValue="Velouté de potimarron" />
            </Field>
            <Field>
              <FieldLabel htmlFor="ds-price">Prix TTC (€) *</FieldLabel>
              <Input id="ds-price" defaultValue="abc" aria-invalid="true" />
              <FieldError>Saisissez un prix valide.</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="ds-disabled">Prix (gérant)</FieldLabel>
              <Input id="ds-disabled" defaultValue="7,50" disabled />
              <FieldDescription>
                Seul un administrateur peut modifier les prix.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="ds-category">Catégorie</FieldLabel>
              <Select defaultValue="soupes">
                <SelectTrigger id="ds-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soupes">Soupes et entrées</SelectItem>
                  <SelectItem value="plats">Plats</SelectItem>
                  <SelectItem value="desserts">Desserts</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="ds-description">Description</FieldLabel>
              <Textarea
                id="ds-description"
                defaultValue="Potimarron, oignon, crème."
              />
            </Field>
          </FieldGroup>
        </Section>

        <Section title="Choix">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Checkbox id="ds-check" defaultChecked />
              <Label htmlFor="ds-check">Sélectionner cette commande</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="ds-switch" defaultChecked />
              <Label htmlFor="ds-switch">Visible sur la boutique</Label>
            </div>
            <RadioGroup defaultValue="full">
              <div className="flex items-center gap-3">
                <RadioGroupItem id="ds-full" value="full" />
                <Label htmlFor="ds-full">Remboursement intégral</Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem id="ds-partial" value="partial" />
                <Label htmlFor="ds-partial">Remboursement partiel</Label>
              </div>
            </RadioGroup>
          </div>
        </Section>

        <Section title="Tableau et pagination">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">#1048</TableCell>
                <TableCell className="text-muted-foreground">
                  Camille Martin
                </TableCell>
                <TableCell className="text-muted-foreground">32,50 €</TableCell>
                <TableCell>
                  <CommandeStatusBadge statut="nouvelle" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">#1046</TableCell>
                <TableCell className="text-muted-foreground">Léa Petit</TableCell>
                <TableCell className="text-muted-foreground">24,00 €</TableCell>
                <TableCell>
                  <CommandeStatusBadge statut="preparee" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Pagination>
            <PaginationSummary>1–20 sur 48 résultats</PaginationSummary>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </Section>

        <Section title="Onglets, carte, état vide, chargement">
          <Tabs defaultValue="todo">
            <TabsList>
              <TabsTrigger value="todo">À préparer</TabsTrigger>
              <TabsTrigger value="ready">Prêtes</TabsTrigger>
            </TabsList>
            <TabsContent value="todo">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Catalogue à surveiller</CardTitle>
                    <CardDescription>Stock d’articles uniquement.</CardDescription>
                  </CardHeader>
                  <CardContent>Velouté de potimarron · 3 unités</CardContent>
                </Card>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia>
                      <InboxIcon />
                    </EmptyMedia>
                    <EmptyTitle>Aucune commande à préparer</EmptyTitle>
                    <EmptyDescription>
                      Les nouvelles commandes apparaîtront ici.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="secondary">Voir toutes les commandes</Button>
                  </EmptyContent>
                </Empty>
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
                  <Skeleton className="h-5 w-2/5" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-4/5" />
                  <p className="text-xs text-muted-foreground">
                    Chargement des commandes…
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="ready">Aucune commande prête.</TabsContent>
          </Tabs>
        </Section>

        <Section title="Superpositions">
          <div className="flex flex-wrap gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Désactiver le point</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Désactiver ce point de retrait ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Il ne sera plus proposé pour les nouvelles commandes.
                    Vérifiez les retraits déjà prévus.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Conserver le point</AlertDialogCancel>
                  <AlertDialogAction variant="destructive">
                    Désactiver le point
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary">Modifier la catégorie</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Modifier la catégorie</SheetTitle>
                  <SheetDescription>Nom et ordre d’affichage.</SheetDescription>
                </SheetHeader>
                <FieldGroup className="px-6">
                  <Field>
                    <FieldLabel htmlFor="ds-cat-name">Nom</FieldLabel>
                    <Input id="ds-cat-name" defaultValue="Soupes et entrées" />
                  </Field>
                </FieldGroup>
                <SheetFooter>
                  <Button>Enregistrer</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Voir la commande</DropdownMenuItem>
                <DropdownMenuItem>Imprimer</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  Rembourser…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary">Infobulle</Button>
              </TooltipTrigger>
              <TooltipContent>
                Seul un administrateur peut modifier les prix.
              </TooltipContent>
            </Tooltip>

            <Button
              variant="secondary"
              onClick={() =>
                toast.success('Modifications enregistrées', {
                  description: 'Le catalogue est à jour.',
                })
              }
            >
              Toast succès
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.error('Échec de la sauvegarde', {
                  description: 'Vos saisies sont conservées. Réessayez.',
                })
              }
            >
              Toast erreur
            </Button>
          </div>
        </Section>
      </div>
    </TooltipProvider>
  )
}
