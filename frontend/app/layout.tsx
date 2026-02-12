import React from "react"
import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from "@/components/ui/toaster"
import { ServiceWorkerRegister } from "@/components/pwa/register-sw"
import { NetworkStatus } from "@/components/pwa/network-status"
import { SyncStatus } from "@/components/pwa/sync-status"
import './globals.css'

const _inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'BONASO Data Portal',
  description: 'Enterprise data management system for health indicators, projects, and analytics',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
}

const isVercelDeployment = process.env.VERCEL === '1'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <ServiceWorkerRegister />
        <NetworkStatus />
        <SyncStatus />
        {children}
        <Toaster />
        {isVercelDeployment ? <Analytics debug={false} /> : null}
      </body>
    </html>
  )
}
