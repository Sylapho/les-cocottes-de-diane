import Link from 'next/link'

const legalLinks = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/cgv', label: 'CGV' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/click-and-collect', label: 'Click & Collect' },
]

export default function ShopFooter() {
  return (
    <footer className="border-t border-[#eee2e7] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-[#7a6d73] sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-[#181014]">
          © {new Date().getFullYear()} Les cocottes de Diane
        </p>

        <nav
          aria-label="Liens légaux"
          className="flex flex-wrap gap-x-3 gap-y-1"
        >
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-semibold hover:text-[#b5006e]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
