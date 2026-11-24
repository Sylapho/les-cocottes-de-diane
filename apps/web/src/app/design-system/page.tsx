import { notFound } from 'next/navigation'
import DesignSystemShowcase from './showcase'

export const metadata = {
  title: 'Design system · Les cocottes de Diane',
  robots: { index: false, follow: false },
}

// Development-only page: the component gallery is never served in production.
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <DesignSystemShowcase />
}
