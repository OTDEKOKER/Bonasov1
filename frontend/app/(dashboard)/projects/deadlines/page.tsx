"use client"

import { useState } from "react"
import { Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { mockDeadlines, mockProjects } from "@/lib/mock-data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export default function DeadlinesPage() {
  const [activeTab, setActiveTab] = useState("upcoming")

  const now = new Date()
  
  const upcomingDeadlines = mockDeadlines
    .filter(d => !d.isCompleted && new Date(d.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  
  const overdueDeadlines = mockDeadlines
    .filter(d => !d.isCompleted && new Date(d.dueDate) < now)
  
  const completedDeadlines = mockDeadlines
    .filter(d => d.isCompleted)

  const getDeadlines = () => {
    switch (activeTab) {
      case "upcoming":
        return upcomingDeadlines
      case "overdue":
        return overdueDeadlines
      case "completed":
        return completedDeadlines
      default:
        return mockDeadlines
    }
  }

  const deadlines = getDeadlines()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deadlines"
        description="Track project deadlines and milestones"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          { label: "Deadlines" },
        ]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Deadline
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <p className="text-2xl font-bold text-foreground">{upcomingDeadlines.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-destructive">{overdueDeadlines.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-chart-2/10 p-2">
              <CheckCircle2 className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-chart-2">{completedDeadlines.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {deadlines.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground">No deadlines found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deadlines.map((deadline) => {
                const project = mockProjects.find(p => p.id === deadline.projectId)
                const dueDate = new Date(deadline.dueDate)
                const isPast = dueDate < now && !deadline.isCompleted
                const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

                return (
                  <div
                    key={deadline.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border bg-card p-4 transition-colors",
                      isPast ? "border-destructive/30" : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "rounded-full p-2",
                        deadline.isCompleted ? "bg-chart-2/10 text-chart-2" :
                        isPast ? "bg-destructive/10 text-destructive" :
                        "bg-primary/10 text-primary"
                      )}>
                        {deadline.isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : isPast ? (
                          <AlertCircle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{deadline.title}</p>
                        {deadline.description && (
                          <p className="text-sm text-muted-foreground">{deadline.description}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {project?.name} ({project?.code})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-foreground">
                          {dueDate.toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        {!deadline.isCompleted && (
                          <Badge variant="secondary" className={cn(
                            "mt-1",
                            isPast ? "bg-destructive/10 text-destructive" :
                            daysUntil <= 7 ? "bg-chart-3/10 text-chart-3" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {isPast ? 'Overdue' : 
                             daysUntil === 0 ? 'Due today' :
                             daysUntil === 1 ? 'Due tomorrow' :
                             `${daysUntil} days left`}
                          </Badge>
                        )}
                        {deadline.isCompleted && (
                          <Badge variant="secondary" className="mt-1 bg-chart-2/10 text-chart-2">
                            Completed
                          </Badge>
                        )}
                      </div>
                      {!deadline.isCompleted && (
                        <Button variant="outline" size="sm">
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
