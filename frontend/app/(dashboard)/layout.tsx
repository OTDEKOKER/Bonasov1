"use client"

import React, { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/lib/contexts/auth-context"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const AppSidebarClient = dynamic(
  () => import("@/components/layout/app-sidebar").then((mod) => mod.AppSidebar),
  { ssr: false },
)
const AppHeaderClient = dynamic(
  () => import("@/components/layout/app-header").then((mod) => mod.AppHeader),
  { ssr: false },
)

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // While the redirect is happening, don't render the dashboard shell.
  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <AppSidebarClient />
        <button
          className="absolute right-2 top-4 rounded-lg p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebarClient />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <AppHeaderClient onMenuClick={() => setSidebarOpen(true)} />
        <main className="h-[calc(100vh-4rem)] overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AuthProvider>
  )
}
