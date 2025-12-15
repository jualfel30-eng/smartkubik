import {MetadataRoute} from 'next'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://smartkubik.com').replace(/\/$/, '')
const blogBasePath = (process.env.NEXT_PUBLIC_BLOG_BASE_PATH || '/blog').replace(/\/$/, '')
const blogBaseUrl = `${siteUrl}${blogBasePath === '/' ? '' : blogBasePath || ''}`
const sitemapUrl = `${blogBaseUrl}/sitemap.xml`

export default function robots(): MetadataRoute.Robots {
  const host = (() => {
    try {
      return new URL(siteUrl).host
    } catch {
      return siteUrl
    }
  })()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: [sitemapUrl],
    host,
  }
}
