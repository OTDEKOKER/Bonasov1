"use client"

import React, { useState } from "react"
import Image from "next/image"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAllOrganizations } from "@/lib/hooks/use-api"
import {
  LayoutDashboard,
  Building2,
  Users,
  FolderKanban,
  Target,
  UserSquare2,
  Table2,
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

interface NavItemProps {
  title: string
  href: string
  icon: React.ReactNode
  badge?: number
  isActive: boolean
  subItems?: SidebarSubItem[]
}

interface SidebarSubItem {
  title: string
  href: string
  subItems?: SidebarSubItem[]
}

const hasActiveDescendant = (
  item: SidebarSubItem,
  isChildActive: (childHref: string) => boolean,
): boolean => {
  if (isChildActive(item.href)) return true
  if (!item.subItems?.length) return false
  return item.subItems.some((child) => hasActiveDescendant(child, isChildActive))
}

interface NestedSubItemProps {
  item: SidebarSubItem
  isChildActive: (childHref: string) => boolean
  level?: number
}

function NestedSubItem({ item, isChildActive, level = 1 }: NestedSubItemProps) {
  const hasChildren = !!item.subItems?.length
  const isItemActive = isChildActive(item.href)
  const hasActiveChild = hasChildren && item.subItems!.some((child) => hasActiveDescendant(child, isChildActive))
  const [isOpen, setIsOpen] = useState(hasActiveChild)

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        className={cn(
          "block rounded-lg px-3 py-2 text-sm transition-colors",
          level === 1 ? "ml-0" : "ml-4",
          isItemActive
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        {item.title}
      </Link>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("flex items-center gap-1", level > 1 && "ml-4")}>
        <Link
          href={item.href}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm transition-colors",
            isItemActive
              ? "bg-primary/10 text-primary"
              : hasActiveChild
                ? "text-sidebar-accent-foreground"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          {item.title}
        </Link>
        <CollapsibleTrigger className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="space-y-1 pl-4 pt-1">
        {item.subItems!.map((child) => (
          <NestedSubItem key={`${child.href}-${child.title}`} item={child} isChildActive={isChildActive} level={level + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function NavItem({ title, href, icon, badge, isActive, subItems }: NavItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const safePathname = pathname || ""
  const currentQuery = searchParams.toString()
  const currentFullPath = `${safePathname}${currentQuery ? `?${currentQuery}` : ""}`
  const isChildActive = (childHref: string) => {
    if (childHref.includes("?")) {
      return currentFullPath === childHref
    }
    return safePathname === childHref && !currentQuery
  }
  const hasActiveChild = !!subItems?.some((child) => isChildActive(child.href))

  if (subItems) {

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
          {subItems.map((child) => (
            <NestedSubItem key={`${child.href}-${child.title}`} item={child} isChildActive={isChildActive} />
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

const baseNavigation = [
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
    ],
  },
  {
    title: "Aggregates",
    href: "/aggregates",
    icon: <Table2 className="h-4 w-4" />,
    children: [{ title: "All Aggregates", href: "/aggregates" }],
  },
  { title: "Events", href: "/events", icon: <CalendarDays className="h-4 w-4" /> },
  { title: "Social Media", href: "/social", icon: <Share2 className="h-4 w-4" /> },
  {
    title: "Uploads",
    href: "/uploads",
    icon: <Upload className="h-4 w-4" />,
    children: [
      { title: "All Uploads", href: "/uploads" },
      { title: "All Imports", href: "/uploads/imports" },
    ],
  },
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
  const { data: organizationsData } = useAllOrganizations()

  const organizations = organizationsData?.results ?? []
  const parentOrganizations = organizations
    .filter((org) => {
      const parentId = (org as { parentId?: string | number | null; parent?: string | number | null }).parentId
        ?? (org as { parent?: string | number | null }).parent
      return !String(parentId ?? "")
    })
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")))

  const aggregateChildren: SidebarSubItem[] = [
    { title: "All Aggregates", href: "/aggregates" },
    ...parentOrganizations.map((parent) => ({
      title: String(parent.name || "Parent"),
      href: `/aggregates?orgId=${encodeURIComponent(String(parent.id))}`,
    })),
  ]

  const navigation = baseNavigation.map((item) =>
    item.title === "Aggregates"
      ? { ...item, children: aggregateChildren }
      : item,
  )

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
          <Image
            src="/favicon.ico"
            alt="BONASO"
            width={24}
            height={24}
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
            subItems={item.children}
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
