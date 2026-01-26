"use client"

import React from "react"
import { useState } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        <AppSidebar />
        <button
          className="absolute right-2 top-4 rounded-lg p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">{children}</main>
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
