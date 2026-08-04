import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/dashboard', '/cart', '/checkout'],
    },
    sitemap: 'http://159.203.1.187/sitemap.xml',
  }
}