"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/lib/contexts/auth-context"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isAuthenticated) return
    const shouldShow = sessionStorage.getItem("show_login_disclaimer") === "1"
    if (!shouldShow) return
    setShowDisclaimer(true)
    sessionStorage.removeItem("show_login_disclaimer")
  }, [isAuthenticated])

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
      <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[680px] overflow-hidden rounded-2xl border border-border/70 bg-background p-0 shadow-2xl"
        >
          <DialogClose
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close confidentiality notice"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <DialogHeader className="space-y-4 px-6 pb-0 pt-6 pr-12 sm:px-8 sm:pt-7 sm:pr-14">
            <DialogTitle>Welcome!</DialogTitle>
            <DialogDescription
              asChild
              className="max-w-[62ch] space-y-3 text-sm leading-relaxed text-muted-foreground"
            >
              <div className="space-y-3">
                <p>
                  Welcome to the BONASO data portal. Please note that any information you see in this portal
                  is confidential, and may not be shared or distributed to anyone outside of your organization.
                </p>
                <p className="font-semibold text-foreground">
                  Any violations of client confidentiality are against the law and are punishable by fines and/or jail time.
                </p>
                <p>
                  By entering this portal, you agree to maintain confidentiality of all data you see here and
                  also agree that you will not misuse any information here.
                </p>
                <p>Thank you for all the important work you do in the fight for a healthier Botswana.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end border-t border-border/60 px-6 py-4 sm:px-8 sm:py-5">
            <Button
              onClick={() => setShowDisclaimer(false)}
              className="h-auto w-full whitespace-normal px-4 py-2.5 text-sm leading-5 sm:w-auto sm:max-w-[420px]"
            >
              I understand, and will not misuse any data I access on this portal.
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
          aria-label="Close sidebar"
          title="Close sidebar"
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
