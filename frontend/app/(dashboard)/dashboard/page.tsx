"use client"

import { useEffect, useMemo, useState } from "react"
import { Users, Activity, FolderKanban, AlertTriangle, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ProgressChart } from "@/components/dashboard/progress-chart"
import { IndicatorProgress } from "@/components/dashboard/indicator-progress"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { useDashboardStats, useProjects, useDeadlines } from "@/lib/hooks/use-api"
import Link from "next/link"

export default function DashboardPage() {
  const [activityTypeFilter, setActivityTypeFilter] = useState("all")
  const [activitySearch, setActivitySearch] = useState("")
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("all")
  const [projectSearch, setProjectSearch] = useState("")
  const [deadlineWindow, setDeadlineWindow] = useState("30")

  const { data: rawStats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: projectsData, isLoading: projectsLoading } = useProjects({ status: 'active' })
  const { data: deadlinesData, isLoading: deadlinesLoading } = useDeadlines({ status: 'pending' })

  const isLoading = statsLoading || projectsLoading || deadlinesLoading
  const activeProjects = projectsData?.results || []
  const pendingDeadlines = deadlinesData?.results || []
  
  // Map API response to expected format
  const stats = rawStats ? {
    totalRespondents: rawStats.total_respondents || 0,
    totalInteractions: rawStats.total_assessments || 0,
    activeProjects: rawStats.active_projects || 0,
    pendingFlags: (rawStats.indicators_behind || 0),
    monthlyTrend: [],
    indicatorProgress: [],
    recentActivity: (rawStats.recent_activity || []).map((a: { type: string; description: string; timestamp: string }, index: number) => ({
      id: `${a.timestamp}-${index}`,
      type: a.type,
      description: a.description,
      user: "System",
      timestamp: a.timestamp,
    })),
  } : null

  const activityTypeOptions = useMemo(() => {
    const values = new Set((stats?.recentActivity || []).map((item) => item.type).filter(Boolean))
    return ["all", ...Array.from(values)]
  }, [stats?.recentActivity])

  const filteredRecentActivity = useMemo(() => {
    return (stats?.recentActivity || []).filter((item) => {
      const typeMatch = activityTypeFilter === "all" || item.type === activityTypeFilter
      const searchMatch = !activitySearch.trim()
        || item.description.toLowerCase().includes(activitySearch.toLowerCase())
        || item.user.toLowerCase().includes(activitySearch.toLowerCase())
      return typeMatch && searchMatch
    })
  }, [stats?.recentActivity, activityTypeFilter, activitySearch])

  const filteredProjects = useMemo(() => {
    return activeProjects.filter((project) => {
      const projectMatch = selectedProjectFilter === "all" || String(project.id) === selectedProjectFilter
      const searchMatch = !projectSearch.trim()
        || project.name.toLowerCase().includes(projectSearch.toLowerCase())
        || (project.code || "").toLowerCase().includes(projectSearch.toLowerCase())
      return projectMatch && searchMatch
    })
  }, [activeProjects, selectedProjectFilter, projectSearch])

  useEffect(() => {
    if (selectedProjectFilter === "all") return

    const projectStillExists = activeProjects.some((project) => String(project.id) === selectedProjectFilter)
    if (!projectStillExists) {
      setSelectedProjectFilter("all")
    }
  }, [activeProjects, selectedProjectFilter])

  const filteredDeadlines = useMemo(() => {
    const now = Date.now()
    const windowDays = Number(deadlineWindow)

    return pendingDeadlines
      .filter((deadline) => {
        const projectId = String(deadline.project ?? deadline.project_id ?? "")
        if (selectedProjectFilter !== "all" && projectId !== selectedProjectFilter) return false

        if (!Number.isFinite(windowDays) || windowDays <= 0) return true
        const dueDateValue = deadline.due_date ?? deadline.dueDate
        const dueMs = new Date(dueDateValue).getTime()
        if (!Number.isFinite(dueMs)) return false
        const diffDays = Math.ceil((dueMs - now) / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= windowDays
      })
      .slice(0, 5)
  }, [pendingDeadlines, deadlineWindow, selectedProjectFilter])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (statsError) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back! Here&apos;s an overview of your data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/reports">View Reports</Link>
          </Button>
          <Button asChild>
            <Link href="/respondents/interactions">New Interaction</Link>
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Respondents"
          value={stats?.totalRespondents?.toLocaleString() || "0"}
          change={{ value: 12.5, label: "from last month" }}
          icon={Users}
        />
        <StatsCard
          title="Total Interactions"
          value={stats?.totalInteractions?.toLocaleString() || "0"}
          change={{ value: 8.2, label: "from last month" }}
          icon={Activity}
        />
        <StatsCard
          title="Active Projects"
          value={stats?.activeProjects || 0}
          icon={FolderKanban}
          iconColor="text-chart-2"
        />
        <StatsCard
          title="Pending Flags"
          value={stats?.pendingFlags || 0}
          icon={AlertTriangle}
          iconColor="text-chart-5"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Quick filters</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setActivityTypeFilter("all")
              setActivitySearch("")
              setSelectedProjectFilter("all")
              setProjectSearch("")
              setDeadlineWindow("30")
            }}
          >
            Reset filters
          </Button>
          <p className="w-full text-xs text-muted-foreground">Refine dashboard lists by project, activity type, keyword, and deadline window.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {activeProjects.map((project) => (
                <SelectItem key={project.id} value={String(project.id)}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All activity types" />
            </SelectTrigger>
            <SelectContent>
              {activityTypeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "all" ? "All activity types" : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Search activity..."
            value={activitySearch}
            onChange={(event) => setActivitySearch(event.target.value)}
          />

          <Input
            placeholder="Search project name/code..."
            value={projectSearch}
            onChange={(event) => setProjectSearch(event.target.value)}
          />

          <Select value={deadlineWindow} onValueChange={setDeadlineWindow}>
            <SelectTrigger>
              <SelectValue placeholder="Deadline window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Deadlines in 7 days</SelectItem>
              <SelectItem value="30">Deadlines in 30 days</SelectItem>
              <SelectItem value="90">Deadlines in 90 days</SelectItem>
              <SelectItem value="0">Any deadline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProgressChart
          data={stats?.monthlyTrend || []}
          title="Monthly Interactions"
        />
        <IndicatorProgress data={stats?.indicatorProgress || []} />
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity feed */}
        <div className="lg:col-span-2">
          <ActivityFeed activities={filteredRecentActivity} />
        </div>

        {/* Upcoming deadlines & Projects */}
        <div className="space-y-6">
          {/* Deadlines */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</h3>
              <Link href="/projects/deadlines" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {filteredDeadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
              ) : (
                filteredDeadlines.map((deadline) => {
                  const dueDateValue = deadline.due_date ?? deadline.dueDate
                  const dueDate = new Date(dueDateValue)
                  const dueTime = dueDate.getTime()
                  const daysUntil = Number.isFinite(dueTime)
                    ? Math.ceil((dueTime - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : null
                  
                  return (
                    <div key={deadline.id} className="flex items-start justify-between gap-2 rounded-lg bg-secondary/50 p-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-card-foreground">
                          {deadline.name ?? deadline.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {deadline.project_name ?? deadline.projectName}
                        </p>
                      </div>
                      <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${
                        daysUntil !== null && daysUntil <= 7 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                      }`}>
                        {daysUntil === null ? 'No date' : `${daysUntil} days`}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Active Projects */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Active Projects</h3>
              <Link href="/projects" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {filteredProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active projects</p>
              ) : (
                filteredProjects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-card-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.code}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
