"use client"

import { Users, Activity, FolderKanban, AlertTriangle, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ProgressChart } from "@/components/dashboard/progress-chart"
import { IndicatorProgress } from "@/components/dashboard/indicator-progress"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { useDashboardStats, useProjects, useDeadlines } from "@/lib/hooks/use-api"
import Link from "next/link"

export default function DashboardPage() {
  const { data: rawStats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: projectsData, isLoading: projectsLoading } = useProjects({ status: 'active' })
  const { data: deadlinesData, isLoading: deadlinesLoading } = useDeadlines({ status: 'pending' })

  const isLoading = statsLoading || projectsLoading || deadlinesLoading
  const activeProjects = projectsData?.results || []
  const upcomingDeadlines = (deadlinesData?.results || []).slice(0, 3)
  
  // Map API response to expected format
  const stats = rawStats ? {
    totalRespondents: rawStats.total_respondents || 0,
    totalInteractions: rawStats.total_assessments || 0,
    activeProjects: rawStats.active_projects || 0,
    pendingFlags: (rawStats.indicators_behind || 0),
    monthlyTrend: [],
    indicatorProgress: [],
    recentActivity: (rawStats.recent_activity || []).map((a: { type: string; description: string; timestamp: string }) => ({
      id: Math.random().toString(),
      type: a.type,
      description: a.description,
      user: "System",
      timestamp: a.timestamp,
    })),
  } : null

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
          <ActivityFeed activities={stats?.recentActivity || []} />
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
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
              ) : (
                upcomingDeadlines.map((deadline) => {
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
              {activeProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active projects</p>
              ) : (
                activeProjects.slice(0, 5).map((project) => (
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
