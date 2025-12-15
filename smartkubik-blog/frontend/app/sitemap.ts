import {MetadataRoute} from 'next'
import {sanityFetch} from '@/sanity/lib/live'
import {sitemapData} from '@/sanity/lib/queries'

/**
 * This file creates a sitemap (sitemap.xml) for the application. Learn more about sitemaps in Next.js here: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 * Be sure to update the `changeFrequency` and `priority` values to match your application's content.
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allPostsAndPages = await sanityFetch({
    query: sitemapData,
  })
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://smartkubik.com').replace(/\/$/, '')
  const blogBasePath = (process.env.NEXT_PUBLIC_BLOG_BASE_PATH || '/blog').replace(/\/$/, '')
  const blogBaseUrl = `${siteUrl}${blogBasePath === '/' ? '' : blogBasePath || ''}`
  const sitemap: MetadataRoute.Sitemap = [
    {
      url: blogBaseUrl,
      lastModified: new Date(),
      priority: 1,
      changeFrequency: 'daily',
    },
  ]

  if (allPostsAndPages != null && allPostsAndPages.data.length != 0) {
    let priority: number
    let changeFrequency:
      | 'monthly'
      | 'always'
      | 'hourly'
      | 'daily'
      | 'weekly'
      | 'yearly'
      | 'never'
      | undefined
    let url: string

    for (const p of allPostsAndPages.data) {
      switch (p._type) {
        case 'page':
          priority = 0.8
          changeFrequency = 'monthly'
          url = `${blogBaseUrl}/${p.slug}`
          break
        case 'post':
          priority = 0.5
          changeFrequency = 'never'
          url = `${blogBaseUrl}/posts/${p.slug}`
          break
      }
      sitemap.push({
        lastModified: p._updatedAt || new Date(),
        priority,
        changeFrequency,
        url,
      })
    }
  }

  return sitemap
}
