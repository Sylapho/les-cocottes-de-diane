import LegalPage, { LegalSection } from '@/components/shop/legal-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookies',
  description:
    'Informations sur les cookies utilisés par la boutique Les cocottes de Diane.',
  alternates: {
    canonical: '/cookies',
  },
}

export default function CookiesPage() {
  return (
    <LegalPage
      title="Gestion des cookies"
      description="Cette page explique l’utilisation des cookies et traceurs sur la boutique en ligne."
    >
      <LegalSection title="Qu’est-ce qu’un cookie ?">
        <p>
          Un cookie est un petit fichier déposé sur votre appareil lors de votre
          navigation. Il peut permettre au site de fonctionner correctement, de
          mémoriser certaines informations ou de mesurer l’utilisation du site.
        </p>
      </LegalSection>

      <LegalSection title="Cookies nécessaires au fonctionnement du site">
        <p>
          La boutique peut utiliser des cookies strictement nécessaires au bon
          fonctionnement du service, notamment pour gérer le panier, sécuriser la
          navigation, maintenir la session utilisateur et permettre le paiement
          en ligne.
        </p>
        <p>
          Ces cookies sont indispensables à l’utilisation du site et ne peuvent
          pas être désactivés depuis notre interface.
        </p>
      </LegalSection>

      <LegalSection title="Cookies de mesure d’audience ou de personnalisation">
        <p>
          Avec votre accord, la boutique mesure de manière first-party le nombre
          de visites et de commandes. Aucun outil publicitaire tiers n’est
          utilisé pour cette mesure et aucune adresse IP brute n’est conservée.
        </p>
        <p>
          Un identifiant aléatoire est conservé dans le stockage local du
          navigateur pendant au plus 13 mois et pseudonymisé par le serveur. Le
          choix de consentement est renouvelé après six mois. Vous pouvez
          accepter, refuser ou modifier ce choix depuis le bandeau et le lien «
          Gérer mes préférences » en bas de chaque page.
        </p>
      </LegalSection>

      <LegalSection title="Gestion de vos préférences">
        <p>
          Vous pouvez à tout moment configurer votre navigateur pour bloquer ou
          supprimer les cookies. Toutefois, le blocage de certains cookies
          nécessaires peut empêcher le fonctionnement normal du panier ou du
          paiement.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Pour toute question relative aux cookies ou à vos données personnelles,
          vous pouvez contacter <strong>Les cocottes de Diane</strong> à l’adresse
          suivante : <strong>quentin.baudoin27@gmail.com</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
