"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Users, Target, CheckCircle2, Clock, Edit, Trash2, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { useAllIndicators, useAllOrganizations, useDeadlines, useProject, useTasks } from "@/lib/hooks/use-api"
import { deadlinesService, projectsService, tasksService } from "@/lib/api"
import type { Task, ProjectDeadline, Organization } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

const statusColors: Record<string, string> = {
  active: "bg-primary/10 text-primary",
  completed: "bg-chart-2/10 text-chart-2",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const projectId = Number(id)
  const { data: project, isLoading, error, mutate: mutateProject } = useProject(Number.isFinite(projectId) ? projectId : null)
  const { data: tasksData, mutate: mutateTasks } = useTasks(Number.isFinite(projectId) ? { project: String(projectId) } : undefined)
  const { data: deadlinesData, mutate: mutateDeadlines } = useDeadlines(Number.isFinite(projectId) ? { project: String(projectId) } : undefined)
  const { data: organizationsData } = useAllOrganizations()
  const { data: indicatorsData } = useAllIndicators()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isTaskOpen, setIsTaskOpen] = useState(false)
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    description: "",
    status: "active",
    start_date: "",
    end_date: "",
  })
  const [taskForm, setTaskForm] = useState({
    name: "",
    description: "",
    due_date: "",
    priority: "medium",
  })
  const [deadlineForm, setDeadlineForm] = useState({
    name: "",
    description: "",
    due_date: "",
  })

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  const orgs = organizationsData || []
  const projectOrgIds = new Set((project.organizations || []).map(String))
  const projectOrgs = orgs.filter((org) => projectOrgIds.has(String(org.id)))
  const rawTasks = tasksData?.results || []
  const orgIndicators = (indicatorsData || []).filter((indicator) => {
    const orgs = (indicator.organizations || []) as Array<string | number | { id?: string | number }>
    if (!orgs.length) return true
    return orgs.some((orgId) => {
      const value =
        typeof orgId === "object" && orgId !== null
          ? (orgId as { id?: string | number }).id
          : orgId
      return value !== undefined && projectOrgIds.has(String(value))
    })
  })
  const indicatorTasks = orgIndicators.map((indicator, index) => ({
    id: `indicator-${indicator.id}-${index}`,
    project: project.id,
    project_name: project.name,
    name: indicator.name,
    description: indicator.description || "",
    status: "pending",
    priority: "medium",
    due_date: project.end_date,
  })) as Task[]
  const projectTasks = indicatorTasks.length ? indicatorTasks : rawTasks
  const projectDeadlines = deadlinesData?.results || []
  const progress = project.progress_percentage ?? 0

  const taskColumns = [
    {
      key: "name",
      label: "Task",
      render: (task: Task) => (
        <div>
          <p className="font-medium text-foreground">{task.name}</p>
          <p className="text-xs text-muted-foreground">{task.project_name || "—"}</p>
        </div>
      )
    },
    {
      key: "priority",
      label: "Priority",
      render: (task: Task) => (
        <Badge variant="secondary" className={
          task.priority === 'urgent' ? 'bg-destructive/10 text-destructive' :
          task.priority === 'high' ? 'bg-chart-3/10 text-chart-3' :
          task.priority === 'medium' ? 'bg-primary/10 text-primary' :
          'bg-muted text-muted-foreground'
        }>
          {task.priority}
        </Badge>
      )
    },
    {
      key: "due_date",
      label: "Due Date",
      render: (task: Task) => (
        <span className="text-sm text-muted-foreground">
          {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (task: Task) => (
        <Badge variant="secondary" className={
          task.status === 'completed' ? 'bg-chart-2/10 text-chart-2' :
          task.status === 'in_progress' ? 'bg-primary/10 text-primary' :
          task.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
          'bg-muted text-muted-foreground'
        }>
          {task.status.replace('_', ' ')}
        </Badge>
      )
    }
  ]

  const openEdit = () => {
    setEditForm({
      name: project.name || "",
      code: project.code || "",
      description: project.description || "",
      status: project.status || "active",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
    })
    setIsEditOpen(true)
  }

  const handleUpdateProject = async () => {
    if (!editForm.name || !editForm.code || !editForm.start_date || !editForm.end_date) {
      toast({
        title: "Validation Error",
        description: "Name, code, and dates are required.",
        variant: "destructive",
      })
      return
    }
    setIsSubmitting(true)
    try {
      await projectsService.update(projectId, {
        name: editForm.name,
        code: editForm.code,
        description: editForm.description || undefined,
        status: editForm.status as "draft" | "active" | "completed" | "archived",
        start_date: editForm.start_date,
        end_date: editForm.end_date,
      })
      toast({ title: "Project updated" })
      setIsEditOpen(false)
      mutateProject()
    } catch (err) {
      console.error("Failed to update project", err)
      toast({
        title: "Update failed",
        description: "Could not update project.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm("Delete this project? This cannot be undone.")) return
    setIsSubmitting(true)
    try {
      await projectsService.delete(projectId)
      toast({ title: "Project deleted" })
      router.push("/projects")
    } catch (err) {
      console.error("Failed to delete project", err)
      toast({
        title: "Delete failed",
        description: "Could not delete project.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateTask = async () => {
    if (!taskForm.name) {
      toast({
        title: "Validation Error",
        description: "Task name is required.",
        variant: "destructive",
      })
      return
    }
    setIsSubmitting(true)
    try {
      await tasksService.create({
        name: taskForm.name,
        description: taskForm.description || undefined,
        project: projectId,
        due_date: taskForm.due_date || project.end_date || undefined,
        priority: taskForm.priority as "low" | "medium" | "high" | "urgent",
      })
      toast({ title: "Task created" })
      setTaskForm({ name: "", description: "", due_date: "", priority: "medium" })
      setIsTaskOpen(false)
      mutateTasks()
    } catch (err) {
      console.error("Failed to create task", err)
      toast({
        title: "Create failed",
        description: "Could not create task.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateDeadline = async () => {
    if (!deadlineForm.name || !deadlineForm.due_date) {
      toast({
        title: "Validation Error",
        description: "Deadline name and due date are required.",
        variant: "destructive",
      })
      return
    }
    setIsSubmitting(true)
    try {
      await deadlinesService.create({
        project: projectId,
        name: deadlineForm.name,
        description: deadlineForm.description || undefined,
        due_date: deadlineForm.due_date,
      })
      toast({ title: "Deadline created" })
      setDeadlineForm({ name: "", description: "", due_date: "" })
      setIsDeadlineOpen(false)
      mutateDeadlines()
    } catch (err) {
      console.error("Failed to create deadline", err)
      toast({
        title: "Create failed",
        description: "Could not create deadline.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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
            <Button variant="outline" size="icon" onClick={openEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:text-destructive bg-transparent"
              onClick={handleDeleteProject}
              disabled={isSubmitting}
            >
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
                {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
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
              <span className="text-2xl font-bold">{project.organizations?.length || 0}</span>
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
            <Button onClick={() => setIsTaskOpen(true)}>
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
              <Card
                key={org.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => router.push(`/organizations/${org.id}`)}
              >
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
            <Button onClick={() => setIsDeadlineOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Deadline
            </Button>
          </div>
          <div className="space-y-3">
            {projectDeadlines.map((deadline: ProjectDeadline) => {
              const dueDate = new Date(deadline.due_date)
              const dueTime = dueDate.getTime()
              const hasDate = Number.isFinite(dueTime)
              const isCompleted = deadline.status === "submitted" || deadline.status === "approved"
              const isPast = hasDate ? dueDate < new Date() && !isCompleted : false
              const daysUntil = hasDate
                ? Math.ceil((dueTime - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null

              return (
                <div
                  key={deadline.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full p-2 ${
                      isCompleted ? 'bg-chart-2/10 text-chart-2' :
                      isPast ? 'bg-destructive/10 text-destructive' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{deadline.name}</p>
                      {deadline.description && (
                        <p className="text-sm text-muted-foreground">{deadline.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {dueDate.toLocaleDateString()}
                    </p>
                    {!isCompleted && (
                      <Badge variant="secondary" className={
                        isPast ? 'bg-destructive/10 text-destructive' :
                        (daysUntil !== null && daysUntil <= 7) ? 'bg-chart-3/10 text-chart-3' :
                        'bg-muted text-muted-foreground'
                      }>
                        {isPast ? 'Overdue' : daysUntil === null ? 'No date' : `${daysUntil} days left`}
                      </Badge>
                    )}
                    {isCompleted && (
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={editForm.start_date}
                onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={editForm.end_date}
                onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProject} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Create a task for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Task Name *</Label>
              <Input value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeadlineOpen} onOpenChange={setIsDeadlineOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Deadline</DialogTitle>
            <DialogDescription>Create a deadline for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Deadline Name *</Label>
              <Input value={deadlineForm.name} onChange={(e) => setDeadlineForm({ ...deadlineForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={deadlineForm.description}
                onChange={(e) => setDeadlineForm({ ...deadlineForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={deadlineForm.due_date}
                onChange={(e) => setDeadlineForm({ ...deadlineForm, due_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeadlineOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDeadline} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create Deadline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
