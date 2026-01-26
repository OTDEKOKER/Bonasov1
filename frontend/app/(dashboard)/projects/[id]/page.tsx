"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Users, Target, CheckCircle2, Clock, Edit, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { mockProjects, mockOrganizations, mockTasks, mockIndicators, mockDeadlines } from "@/lib/mock-data"

const statusColors: Record<string, string> = {
  active: "bg-primary/10 text-primary",
  completed: "bg-chart-2/10 text-chart-2",
  draft: "bg-muted text-muted-foreground",
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const project = mockProjects.find(p => p.id === id)

  if (!project) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  const funder = mockOrganizations.find(o => o.id === project.funderId)
  const projectOrgs = mockOrganizations.filter(o => project.organizationIds.includes(o.id))
  const projectTasks = mockTasks.filter(t => t.projectId === project.id)
  const projectDeadlines = mockDeadlines.filter(d => d.projectId === project.id)

  const totalTarget = projectTasks.reduce((sum, t) => sum + (t.target || 0), 0)
  const totalAchieved = projectTasks.reduce((sum, t) => sum + (t.achieved || 0), 0)
  const progress = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0

  const taskColumns = [
    {
      key: "indicator",
      label: "Indicator",
      render: (task: typeof mockTasks[0]) => {
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
      key: "organization",
      label: "Organization",
      render: (task: typeof mockTasks[0]) => {
        const org = mockOrganizations.find(o => o.id === task.organizationId)
        return <span className="text-sm">{org?.name}</span>
      }
    },
    {
      key: "progress",
      label: "Progress",
      render: (task: typeof mockTasks[0]) => {
        const pct = task.target ? Math.round(((task.achieved || 0) / task.target) * 100) : 0
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{task.achieved?.toLocaleString() || 0} / {task.target?.toLocaleString() || 0}</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        )
      }
    },
    {
      key: "status",
      label: "Status",
      render: (task: typeof mockTasks[0]) => (
        <Badge variant="secondary" className={
          task.status === 'completed' ? 'bg-chart-2/10 text-chart-2' :
          task.status === 'in_progress' ? 'bg-primary/10 text-primary' :
          'bg-muted text-muted-foreground'
        }>
          {task.status.replace('_', ' ')}
        </Badge>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="text-destructive hover:text-destructive bg-transparent">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Project overview cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className={statusColors[project.status]}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">{project.code}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Timeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{project.organizationIds.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{progress}%</span>
            </div>
            <Progress value={progress} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList className="bg-secondary">
          <TabsTrigger value="tasks">Tasks ({projectTasks.length})</TabsTrigger>
          <TabsTrigger value="organizations">Organizations ({projectOrgs.length})</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines ({projectDeadlines.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
          <DataTable
            data={projectTasks}
            columns={taskColumns}
            searchPlaceholder="Search tasks..."
          />
        </TabsContent>

        <TabsContent value="organizations" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectOrgs.map((org) => (
              <Card key={org.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">{org.name}</CardTitle>
                  <CardDescription>{org.type}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{org.contactEmail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deadlines" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Deadline
            </Button>
          </div>
          <div className="space-y-3">
            {projectDeadlines.map((deadline) => {
              const dueDate = new Date(deadline.dueDate)
              const isPast = dueDate < new Date()
              const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

              return (
                <div
                  key={deadline.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full p-2 ${
                      deadline.isCompleted ? 'bg-chart-2/10 text-chart-2' :
                      isPast ? 'bg-destructive/10 text-destructive' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {deadline.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{deadline.title}</p>
                      {deadline.description && (
                        <p className="text-sm text-muted-foreground">{deadline.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {dueDate.toLocaleDateString()}
                    </p>
                    {!deadline.isCompleted && (
                      <Badge variant="secondary" className={
                        isPast ? 'bg-destructive/10 text-destructive' :
                        daysUntil <= 7 ? 'bg-chart-3/10 text-chart-3' :
                        'bg-muted text-muted-foreground'
                      }>
                        {isPast ? 'Overdue' : `${daysUntil} days left`}
                      </Badge>
                    )}
                    {deadline.isCompleted && (
                      <Badge variant="secondary" className="bg-chart-2/10 text-chart-2">
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
