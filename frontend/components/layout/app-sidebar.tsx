"use client"

import React, { useEffect } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Building2,
  Users,
  FolderKanban,
  Target,
  UserSquare2,
  CalendarDays,
  Share2,
  FileBarChart,
  AlertTriangle,
  Settings,
  LogOut,
  ChevronDown,
  Upload,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useState } from "react"

interface NavItemProps {
  title: string
  href: string
  icon: React.ReactNode
  badge?: number
  isActive: boolean
  children?: { title: string; href: string }[]
}

function NavItem({ title, href, icon, badge, isActive, children }: NavItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const safePathname = mounted ? pathname : ""

  if (children) {
    const hasActiveChild = children.some(child => safePathname === child.href)
    
    return (
      <Collapsible open={isOpen || hasActiveChild} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          hasActiveChild
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}>
          <span className="flex items-center gap-3">
            {icon}
            <span>{title}</span>
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-9 pt-1">
          {children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                safePathname === child.href
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {child.title}
            </Link>
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      {icon}
      <span className="flex-1">{title}</span>
      {badge && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
          {badge}
        </span>
      )}
    </Link>
  )
}

const navigation = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { title: "Organizations", href: "/organizations", icon: <Building2 className="h-4 w-4" /> },
  { title: "Users", href: "/users", icon: <Users className="h-4 w-4" /> },
  {
    title: "Projects",
    href: "/projects",
    icon: <FolderKanban className="h-4 w-4" />,
    children: [
      { title: "All Projects", href: "/projects" },
      { title: "Tasks", href: "/projects/tasks" },
      { title: "Deadlines", href: "/projects/deadlines" },
    ],
  },
  {
    title: "Indicators",
    href: "/indicators",
    icon: <Target className="h-4 w-4" />,
    children: [
      { title: "All Indicators", href: "/indicators" },
      { title: "Assessments", href: "/indicators/assessments" },
    ],
  },
  {
    title: "Respondents",
    href: "/respondents",
    icon: <UserSquare2 className="h-4 w-4" />,
    children: [
      { title: "All Respondents", href: "/respondents" },
      { title: "Interactions", href: "/respondents/interactions" },
      { title: "Aggregates", href: "/aggregates" },
    ],
  },
  { title: "Events", href: "/events", icon: <CalendarDays className="h-4 w-4" /> },
  { title: "Social Media", href: "/social", icon: <Share2 className="h-4 w-4" /> },
  { title: "Uploads", href: "/uploads", icon: <Upload className="h-4 w-4" /> },
  {
    title: "Analysis",
    href: "/analysis",
    icon: <FileBarChart className="h-4 w-4" />,
    children: [
      { title: "Reports", href: "/analysis/reports" },
      { title: "Dashboards", href: "/analysis/dashboards" },
      { title: "Export", href: "/analysis/export" },
    ],
  },
  { title: "Flags", href: "/flags", icon: <AlertTriangle className="h-4 w-4" />, badge: 2 },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
          <img
            src="/favicon.ico"
            alt="BONASO"
            className="h-6 w-6"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground">BONASO</span>
          <span className="text-xs text-sidebar-foreground/60">Data Portal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => (
          <NavItem
            key={item.href}
            title={item.title}
            href={item.href}
            icon={item.icon}
            badge={item.badge}
            isActive={pathname === item.href}
            children={item.children}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3">
        <NavItem
          title="Settings"
          href="/settings"
          icon={<Settings className="h-4 w-4" />}
          isActive={pathname === "/settings"}
        />
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
