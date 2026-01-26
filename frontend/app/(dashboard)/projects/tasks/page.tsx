"use client"

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { mockTasks, mockProjects, mockOrganizations, mockIndicators } from "@/lib/mock-data"
import type { Task } from "@/lib/types"

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-chart-2/10 text-chart-2",
}

export default function TasksPage() {
  const router = useRouter()

  const columns = [
    {
      key: "indicator",
      label: "Indicator",
      sortable: true,
      render: (task: Task) => {
        const indicator = mockIndicators.find(i => i.id === task.indicatorId)
        return (
          <div>
            <p className="font-medium text-foreground">{indicator?.name}</p>
            <p className="text-xs text-muted-foreground">{indicator?.code}</p>
          </div>
        )
      }
    },
    {
      key: "project",
      label: "Project",
      render: (task: Task) => {
        const project = mockProjects.find(p => p.id === task.projectId)
        return (
          <div>
            <p className="text-sm text-foreground">{project?.name}</p>
            <p className="text-xs text-muted-foreground">{project?.code}</p>
          </div>
        )
      }
    },
    {
      key: "organization",
      label: "Organization",
      render: (task: Task) => {
        const org = mockOrganizations.find(o => o.id === task.organizationId)
        return <span className="text-sm">{org?.name}</span>
      }
    },
    {
      key: "progress",
      label: "Progress",
      render: (task: Task) => {
        const pct = task.target ? Math.round(((task.achieved || 0) / task.target) * 100) : 0
        return (
          <div className="w-32 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>{(task.achieved || 0).toLocaleString()}</span>
              <span>{(task.target || 0).toLocaleString()}</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        )
      }
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (task: Task) => (
        <Badge variant="secondary" className={statusColors[task.status]}>
          {task.status.replace('_', ' ')}
        </Badge>
      )
    }
  ]

  const actions = (task: Task) => [
    { label: "View Details", onClick: () => router.push(`/projects/${task.projectId}`) },
    { label: "Edit Target", onClick: () => console.log("Edit", task.id) },
    { label: "Record Progress", onClick: () => console.log("Record", task.id) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="View and manage all tasks across projects"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          { label: "Tasks" },
        ]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Batch Create Tasks
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Tasks</p>
          <p className="text-2xl font-bold text-foreground">{mockTasks.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">In Progress</p>
          <p className="text-2xl font-bold text-primary">
            {mockTasks.filter(t => t.status === 'in_progress').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-chart-2">
            {mockTasks.filter(t => t.status === 'completed').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-muted-foreground">
            {mockTasks.filter(t => t.status === 'pending').length}
          </p>
        </div>
      </div>

      <DataTable
        data={mockTasks}
        columns={columns}
        searchPlaceholder="Search tasks..."
        actions={actions}
      />
    </div>
  )
}
