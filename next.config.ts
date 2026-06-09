import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

const isDevelopment = process.env.NODE_ENV === 'development';
const imageRemotePatterns = [
  { protocol: 'https' as const, hostname: 'photos.hotelbeds.com' },
  { protocol: 'https' as const, hostname: '**.hotelbeds.com' },
  { protocol: 'https' as const, hostname: 'api.tbotechnology.in' },
  { protocol: 'https' as const, hostname: '**.tbotechnology.in' },
  { protocol: 'https' as const, hostname: '**.travellanda.com' },
  { protocol: 'https' as const, hostname: 'images.unsplash.com' },
  { protocol: 'https' as const, hostname: 'plus.unsplash.com' },
  { protocol: 'https' as const, hostname: 'res.cloudinary.com' },
];

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageRemotePatterns,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    const apiOrigin =
      process.env.NEXT_PUBLIC_APP_URL || (isDevelopment ? 'http://localhost:3000' : 'null');
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://checkout.stripe.com"), browsing-topics=()' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: apiOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

// Apply next-intl first, then PWA
export default withNextIntl(withPWA(nextConfig));
