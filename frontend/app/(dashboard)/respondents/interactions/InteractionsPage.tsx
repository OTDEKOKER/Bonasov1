"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Upload, Download, Calendar, User, FileSpreadsheet, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { interactionsService } from "@/lib/api"
import { useAssessments, useInteractions, useProjects, useRespondents } from "@/lib/hooks/use-api"

export default function InteractionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const { data: interactionsData, isLoading, error, mutate } = useInteractions()
  const { data: respondentsData } = useRespondents()
  const { data: assessmentsData } = useAssessments()
  const { data: projectsData } = useProjects()

  const interactions = interactionsData?.results || []
  const respondents = respondentsData?.results || []
  const assessments = assessmentsData?.results || []
  const projects = projectsData?.results || []

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    respondentId: "",
    assessmentId: "",
    projectId: "",
    date: "",
    notes: "",
  })
  const didPrefill = useRef(false)

  useEffect(() => {
    if (didPrefill.current) return
    const respondentId = searchParams.get("respondentId")
    if (respondentId) {
      setFormData((prev) => ({
        ...prev,
        respondentId,
      }))
      setIsCreateOpen(true)
    }
    didPrefill.current = true
  }, [searchParams])

  const resetDialog = () => {
    setFormData({ respondentId: "", assessmentId: "", projectId: "", date: "", notes: "" })
    setIsCreateOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Failed to load interactions</p>
        <Button onClick={() => mutate()}>Retry</Button>
      </div>
    )
  }

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
            <Button variant="outline" disabled>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button variant="outline" disabled>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Interactions</CardTitle>
          <CardDescription>Latest recorded interactions across all projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {interactions.map((interaction) => {
              const respondent = respondents.find((r) => r.id === interaction.respondent)
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
                      <p className="font-medium text-foreground">
                        {interaction.assessment_name || "Assessment"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>
                          {respondent?.full_name ||
                            `${respondent?.first_name ?? ""} ${respondent?.last_name ?? ""}`}
                        </span>
                        <span>|</span>
                        <span>{interaction.project_name || "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">
                      {interaction.responses_count || interaction.responses?.length || 0} responses
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {interaction.date ? new Date(interaction.date).toLocaleDateString() : "—"}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/respondents/${interaction.respondent}`)}>
                      View
                    </Button>
                  </div>
                </div>
              )
            })}
            {interactions.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                No interactions recorded yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) resetDialog()
          else setIsCreateOpen(true)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Interaction</DialogTitle>
            <DialogDescription>
              Record an interaction for a respondent and assessment.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="interaction-assessment">Assessment *</Label>
              <Select
                value={formData.assessmentId}
                onValueChange={(value) => setFormData({ ...formData, assessmentId: value })}
              >
                <SelectTrigger id="interaction-assessment">
                  <SelectValue placeholder="Select assessment" />
                </SelectTrigger>
                <SelectContent>
                  {assessments.map((assessment) => (
                    <SelectItem key={assessment.id} value={assessment.id.toString()}>
                      {assessment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interaction-respondent">Respondent *</Label>
              <Select
                value={formData.respondentId}
                onValueChange={(value) => setFormData({ ...formData, respondentId: value })}
              >
                <SelectTrigger id="interaction-respondent">
                  <SelectValue placeholder="Select respondent" />
                </SelectTrigger>
                <SelectContent>
                  {respondents.map((resp) => (
                    <SelectItem key={resp.id} value={resp.id.toString()}>
                      {resp.full_name || `${resp.first_name} ${resp.last_name}`} ({resp.unique_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interaction-project">Project (optional)</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
              >
                <SelectTrigger id="interaction-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interaction-date">Date *</Label>
              <Input
                id="interaction-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interaction-notes">Notes</Label>
              <Textarea
                id="interaction-notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Cancel
            </Button>
            <Button
              disabled={
                isSubmitting ||
                !formData.assessmentId ||
                !formData.respondentId ||
                !formData.date
              }
              onClick={async () => {
                setIsSubmitting(true)
                try {
                  const created = await interactionsService.create({
                    respondent: Number(formData.respondentId),
                    assessment: Number(formData.assessmentId),
                    project:
                      formData.projectId && formData.projectId !== "none"
                        ? Number(formData.projectId)
                        : undefined,
                    date: formData.date,
                    notes: formData.notes || undefined,
                  })
                  toast({
                    title: "Saved",
                    description: "Interaction recorded successfully.",
                  })
                  mutate()
                  resetDialog()
                  const assessmentId = created.assessment || formData.assessmentId
                  if (assessmentId) {
                    router.push(`/indicators/assessments/${assessmentId}`)
                  }
                } catch (err) {
                  toast({
                    title: "Error",
                    description: "Failed to save interaction",
                    variant: "destructive",
                  })
                } finally {
                  setIsSubmitting(false)
                }
              }}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Interaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
