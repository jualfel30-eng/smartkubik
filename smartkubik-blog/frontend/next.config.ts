import type { NextConfig } from 'next'

const rawBasePath = process.env.NEXT_PUBLIC_BLOG_BASE_PATH ?? '/blog'
const normalizedBasePath =
  rawBasePath === '/' || rawBasePath === ''
    ? ''
    : rawBasePath.startsWith('/')
      ? rawBasePath
      : `/${rawBasePath}`

const nextConfig: NextConfig = {
  basePath: '/blog',
  env: {
    // Matches the behavior of `sanity dev` which sets styled-components to use the fastest way of inserting CSS rules in both dev and production. It's default behavior is to disable it in dev mode.
    SC_DISABLE_SPEEDY: 'false',
  },
}

export default nextConfig
