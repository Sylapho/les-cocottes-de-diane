import Image from 'next/image'
import Link from 'next/link'
import { shopRoutes } from '@/lib/site-nav'

export default function BrandLogotype() {
  return (
    <Link
      href={shopRoutes.home}
      aria-label="Les Cocottes de Diane, accueil"
      className="flex shrink-0 items-center gap-2 rounded-lg"
    >
      <Image
        src="/logo.svg"
        alt=""
        width={64}
        height={64}
        priority
        className="size-16"
      />
      <span className="flex flex-col whitespace-nowrap text-ink">
        <span className="font-serif text-h3">Les Cocottes</span>
        <span className="text-eyebrow font-bold">DE DIANE</span>
      </span>
    </Link>
  )
}
