import type { NextConfig } from 'next'
import WebpackObfuscator from 'webpack-obfuscator'

const isProd = process.env.NODE_ENV === 'production'

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://image.tmdb.org https://*.tmdb.org https://s4.anilist.co https://*.anilist.co https://cdn.myanimelist.net https://*.myanimelist.net https://rickandmortyapi.com https://static.wikia.nocookie.net",
      "font-src 'self' data:",
      "connect-src 'self' https://api.themoviedb.org https://graphql.anilist.co https://api.jikan.moe https://arm.haglund.dev https://rickandmortyapi.com https://api.disneyapi.dev",
      "frame-src 'self' https://vidcore.io https://cinesrc.st https://tryembed.us.cc https://www.youtube.com https://www.youtube-nocookie.com",
      "media-src 'self' blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
]

const adminPath = (
  process.env.ADMIN_PATH ||
  process.env.NEXT_PUBLIC_ADMIN_PATH ||
  ''
).replace(/^\/+|\/+$/g, '')

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compress: true,
  serverExternalPackages: [
    '@prisma/client',
    '.prisma/client',
    '@prisma/adapter-pg',
    'pg',
    'pg-cloudflare',
  ],
  // nft only traces pg-cloudflare's empty.js; OpenNext/workerd needs dist + esm
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/pg-cloudflare/dist/**',
      './node_modules/pg-cloudflare/esm/**',
    ],
  },
  // Next 16 defaults to Turbopack; empty config allows webpack() for secure builds.
  turbopack: {},
  compiler: {
    removeConsole: isProd ? { exclude: ['error', 'warn'] } : false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
        pathname: '/file/anilistcdn/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'rickandmortyapi.com',
        pathname: '/api/character/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'static.wikia.nocookie.net',
        pathname: '/disney/images/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/admin',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, private',
          },
        ],
      },
      {
        source: '/api/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, private',
          },
        ],
      },
    ]
  },
  async rewrites() {
    if (!adminPath || adminPath === 'admin') return []
    return [
      { source: `/${adminPath}`, destination: '/admin' },
      { source: `/${adminPath}/:path*`, destination: '/admin/:path*' },
    ]
  },
  // Used when building with `next build --webpack` + ENABLE_JS_OBFUSCATION=1
  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer && process.env.ENABLE_JS_OBFUSCATION === '1') {
      config.plugins = config.plugins || []
      config.plugins.push(
        new WebpackObfuscator(
          {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.35,
            deadCodeInjection: false,
            debugProtection: false,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            renameGlobals: false,
            rotateStringArray: true,
            selfDefending: false,
            stringArray: true,
            stringArrayEncoding: ['base64'],
            stringArrayThreshold: 0.5,
            splitStrings: true,
            splitStringsChunkLength: 8,
            transformObjectKeys: false,
            unicodeEscapeSequence: false,
          },
          [
            '**/node_modules/**',
            '**/webpack-runtime*',
            '**/main-app*',
            '**/framework*',
            '**/polyfills*',
          ]
        )
      )
    }
    return config
  },
}

export default nextConfig

if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
  import('@opennextjs/cloudflare')
    .then((m) => m.initOpenNextCloudflareForDev())
    .catch(() => {})
}
