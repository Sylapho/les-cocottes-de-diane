import Link from 'next/link'
import type { SVGProps } from 'react'
import { getSocialLinks } from '@/lib/social-links'

const legalLinks = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/cgv', label: 'CGV' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/click-and-collect', label: 'Click & Collect' },
]

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
    <footer className="mt-auto border-t border-[#eee2e7] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-xs text-[#7a6d73] sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-[#181014]">
          © {new Date().getFullYear()} Les cocottes de Diane
        </p>

        <div className="flex flex-col gap-3 sm:items-end">
          {configuredSocialLinks.length > 0 ? (
            <nav aria-label="Réseaux sociaux" className="flex flex-wrap gap-2">
              {configuredSocialLinks.map(({ href, label, shortLabel, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#eee2e7] px-3 py-1.5 font-semibold text-[#4a3d43] transition hover:border-[#b5006e] hover:text-[#b5006e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b5006e]"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  <span>{shortLabel}</span>
                </a>
              ))}
            </nav>
          ) : null}

          <nav
            aria-label="Liens légaux"
            className="flex flex-wrap gap-x-3 gap-y-1"
          >
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-sm font-semibold hover:text-[#b5006e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b5006e]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
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
