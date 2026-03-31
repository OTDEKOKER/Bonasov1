"use client"

import React, { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
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

function DashboardShell({
  children,
  sidebarOpen,
  setSidebarOpen,
  desktopSidebarOpen,
  setDesktopSidebarOpen,
}: {
  children: React.ReactNode
  sidebarOpen: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  desktopSidebarOpen: boolean
  setDesktopSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const pathname = usePathname()
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const shouldShowFromLogin = sessionStorage.getItem("show_login_disclaimer") === "1"
    const isDashboardHome = pathname === "/dashboard"

    if (shouldShowFromLogin) {
      sessionStorage.removeItem("show_login_disclaimer")
    }

    setShowDisclaimer(shouldShowFromLogin || isDashboardHome)
  }, [pathname])

  return (
    <div className="min-h-screen bg-background">
      <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <DialogContent
          showCloseButton={false}
          className="top-1/2 w-[calc(100vw-1rem)] max-w-[76rem] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:w-[min(calc(100vw-2rem),76rem)]"
        >
          <DialogClose
            className="absolute right-5 top-5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close confidentiality notice"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <div className="w-full rounded-none border-[10px] border-border bg-card px-6 py-5 text-foreground shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:border-[12px] sm:px-12 sm:py-7 md:px-16 md:py-8">
          <DialogHeader className="mx-auto flex w-full max-w-[68rem] items-center space-y-3 text-center sm:space-y-4">
            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Welcome!
            </DialogTitle>
            <DialogDescription asChild className="text-muted-foreground">
              <div className="mx-auto flex w-full max-w-[62rem] flex-col items-center space-y-5 text-foreground">
                <p className="w-full text-justify text-sm leading-6 [text-wrap:pretty] sm:text-base">
                  Welcome to the BONASO data portal. Please note that any information you see in this portal
                  is confidential, and may not be shared or distributed to anyone outside of your organization.
                  <strong className="font-bold text-foreground">
                    {" "}Any violations of client confidentiality is against the law and is punishable by fines
                    and/or jail time.
                  </strong>{" "}
                  By entering this portal, you agree to maintain confidentiality of all data you see here and also
                  agree that you will not misuse any information here.
                </p>
                <p className="w-full text-justify text-sm leading-6 [text-wrap:pretty] sm:text-base">
                  Thank you for all the important work you do in the fight for a healthier Botswana!
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="mx-auto mt-5 flex w-full max-w-[62rem] justify-center">
            <Button
              onClick={() => setShowDisclaimer(false)}
              className="min-h-11 w-full whitespace-normal rounded-none bg-primary px-5 py-2.5 text-center text-sm font-semibold leading-5 text-primary-foreground shadow-none hover:bg-primary/90"
            >
              I understand, and will not misuse any data I access on this portal.
            </Button>
          </div>
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
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-all duration-200 ease-in-out lg:block",
          desktopSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none",
        )}
      >
        <AppSidebar />
      </div>

      {/* Main content */}
      <div className={cn("transition-[padding] duration-200 ease-in-out", desktopSidebarOpen ? "lg:pl-64" : "lg:pl-0")}>
        <AppHeader
          onMenuClick={() => {
            if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
              setDesktopSidebarOpen((value) => !value)
              return
            }
            setSidebarOpen(true)
          }}
        />
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)

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
    <DashboardShell
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      desktopSidebarOpen={desktopSidebarOpen}
      setDesktopSidebarOpen={setDesktopSidebarOpen}
    >
      {children}
    </DashboardShell>
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
