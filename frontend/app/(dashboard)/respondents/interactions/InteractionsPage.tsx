"use client"

import { useEffect, useState } from "react"
import { Plus, Upload, Download, Calendar, User, FileSpreadsheet } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { respondentsService, interactionsService, tasksService } from "@/lib/api"
import type { Respondent, Interaction, Task, Assessment } from "@/lib/types"

export default function InteractionsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [respondents, setRespondents] = useState<Respondent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedRespondentId, setSelectedRespondentId] = useState<string | null>(null)

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [respData, taskData, interactionData] = await Promise.all([
          respondentsService.list(),
          tasksService.list(),
          interactionsService.list(),
        ])
        setRespondents(respData.results)
        setTasks(taskData.results)
        setInteractions(interactionData.results)

        // Extract assessments from tasks
        const uniqueAssessments = Array.from(
          new Map(taskData.results.map((t: Task) => [t.assessment.id, t.assessment])).values()
        )
        setAssessments(uniqueAssessments)

      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to load interactions data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const resetDialog = () => {
    setStep(1)
    setSelectedTaskId(null)
    setSelectedRespondentId(null)
    setIsCreateOpen(false)
  }

  if (loading) return <p className="p-6">Loading...</p>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interactions"
        description="Record and manage respondent interactions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Respondents", href: "/respondents" },
          { label: "Interactions" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload Data
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Interaction
            </Button>
          </div>
        }
      />

      {/* Interactions list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Interactions</CardTitle>
          <CardDescription>Latest recorded interactions across all projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {interactions.map((interaction) => {
              const respondent = respondents.find(r => r.id === interaction.respondent)
              return (
                <div
                  key={interaction.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{interaction.assessment?.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{respondent?.isAnonymous ? 'Anonymous' : `${respondent?.firstName} ${respondent?.lastName}`}</span>
                        <span>|</span>
                        <span>{interaction.project?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{interaction.responses?.length || 0} responses</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(interaction.date).toLocaleDateString()}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/respondents/${interaction.respondent}`)}>View</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Interaction Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={resetDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {step === 1 ? "Select Task" : step === 2 ? "Select Respondent" : "Record Responses"}
            </DialogTitle>
            <DialogDescription>
              {step === 1 ? "Choose the assessment task for this interaction" : step === 2 ? "Select or register a respondent" : "Answer the assessment questions"}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Select Task */}
          {step === 1 && (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center space-x-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary/50"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <RadioGroupItem value={task.id} id={task.id} />
                  <div>
                    <Label htmlFor={task.id}>{task.assessment?.name}</Label>
                    <p className="text-sm text-muted-foreground">{task.project?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Select Respondent */}
          {step === 2 && (
            <div className="space-y-4">
              <Input placeholder="Search by name or ID..." />
              {respondents.slice(0, 5).map((resp) => (
                <div
                  key={resp.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/50"
                >
                  <div>
                    <p className="font-medium">{resp.isAnonymous ? `Anonymous (${resp.id})` : `${resp.firstName} ${resp.lastName}`}</p>
                    <p className="text-sm text-muted-foreground">{resp.sex}, {resp.ageRange}, {resp.district}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedRespondentId(resp.id); setStep(3); }}>Select</Button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
            <Button variant="outline" onClick={resetDialog}>Cancel</Button>
            {step < 3 ? (
              <Button onClick={() => step === 1 && !selectedTaskId ? null : setStep(step + 1)}>Continue</Button>
            ) : (
              <Button onClick={() => resetDialog()}>Save Interaction</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
