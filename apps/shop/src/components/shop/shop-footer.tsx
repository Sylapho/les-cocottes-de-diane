import Image from 'next/image'
import Link from 'next/link'
import type { SVGProps } from 'react'
import { getSocialLinks } from '@/lib/social-links'
import { contactEmail, shopRoutes } from '@/lib/site-nav'
import AnalyticsPreferencesButton from '@/components/analytics/analytics-preferences-button'

const practicalLinks = [
  { href: shopRoutes.catalogue, label: 'La boutique' },
  { href: shopRoutes.pickup, label: 'Commande & retrait' },
  { href: shopRoutes.tracking, label: 'Suivre ma commande' },
]

const legalLinks = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/cgv', label: 'Conditions générales de vente' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/cookies', label: 'Cookies' },
]

const linkClassName = 'rounded-sm underline-offset-4 hover:underline'

export default function ShopFooter() {
  const socialLinks = getSocialLinks()
  const configuredSocialLinks = [
    {
      href: socialLinks.facebook,
      label: 'Facebook des Cocottes de Diane',
      shortLabel: 'Facebook',
      Icon: FacebookIcon,
    },
    {
      href: socialLinks.instagram,
      label: 'Instagram des Cocottes de Diane',
      shortLabel: 'Instagram',
      Icon: InstagramIcon,
    },
  ].filter((link): link is typeof link & { href: string } => Boolean(link.href))

  return (
    <footer className="mt-auto bg-ink text-cream [&_:focus-visible]:outline-cream">
      <div className="mx-auto flex max-w-360 flex-col gap-8 px-5 py-10 lg:p-20">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          <div className="flex flex-col gap-4 lg:w-120">
            <Image
              src="/logo.svg"
              alt=""
              width={112}
              height={112}
              className="size-28 bg-paper"
            />
            <p className="font-serif text-h2">
              Les Cocottes
              <br />
              de Diane
            </p>
            <p className="text-body">Le goût des choses simples.</p>
            <a href={`mailto:${contactEmail}`} className={`w-fit text-small ${linkClassName}`}>
              {contactEmail}
            </a>
          </div>

          <nav aria-label="Informations pratiques" className="lg:w-65">
            <ul className="flex flex-col gap-4 text-body">
              {practicalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-6">
            <nav aria-label="Liens légaux">
              <ul className="flex flex-col gap-4 text-small">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClassName}>
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <AnalyticsPreferencesButton />
                </li>
              </ul>
            </nav>

            {configuredSocialLinks.length > 0 ? (
              <nav aria-label="Réseaux sociaux">
                <ul className="flex flex-wrap gap-4 text-small">
                  {configuredSocialLinks.map(({ href, label, shortLabel, Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        aria-label={label}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 ${linkClassName}`}
                      >
                        <Icon aria-hidden="true" className="size-5" />
                        <span>{shortLabel}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
        </div>

        <hr className="border-line" />

        <p className="text-small">
          © {new Date().getFullYear()} Les Cocottes de Diane · Clef Vallée d’Eure
        </p>
      </div>
    </footer>
  )
}

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2V8.6h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.77l-.44 2.91h-2.33V22C18.34 21.25 22 17.08 22 12.06Z" />
    </svg>
  )
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
