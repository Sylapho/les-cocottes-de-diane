import type { MetadataRoute } from 'next'
import { getShopArticles } from '@/lib/api'
import {
  getAbsoluteShopUrl,
  getArticlePath,
  publicStaticRoutes,
} from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = publicStaticRoutes.map((route) => ({
    url: getAbsoluteShopUrl(route.path),
    lastModified:
      'lastModified' in route ? new Date(route.lastModified) : undefined,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  try {
    const articles = await getShopArticles()
    const articleEntries = articles.map((article) => ({
      url: getAbsoluteShopUrl(getArticlePath(article)),
      lastModified: article.updatedAt
        ? new Date(article.updatedAt)
        : article.createdAt
          ? new Date(article.createdAt)
          : undefined,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }))

    return [...staticEntries, ...articleEntries]
  } catch {
    return staticEntries
  }
}
