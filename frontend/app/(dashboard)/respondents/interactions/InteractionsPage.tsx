"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Upload, Download, Calendar, User, FileSpreadsheet, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { aggregatesService, indicatorsService, interactionsService, type DerivationRule } from "@/lib/api"
import { useAllIndicators, useAssessment, useAssessments, useInteractions, useProjects, useRespondents } from "@/lib/hooks/use-api"
import type { Indicator, IndicatorType } from "@/lib/types"

type IndicatorOption = { label: string; value: string }

function normalizeOptions(options: Indicator["options"]): IndicatorOption[] {
  if (!options || !Array.isArray(options)) return []
  return options
    .map((opt) => {
      if (typeof opt === "string") return { label: opt, value: opt }
      if (opt && typeof opt === "object") {
        const label = typeof opt.label === "string" ? opt.label : ""
        const value = typeof opt.value === "string" ? opt.value : label
        if (!label && !value) return null
        return { label: label || value, value: value || label }
      }
      return null
    })
    .filter((v): v is IndicatorOption => Boolean(v))
}

function isEmptyResponseValue(type: IndicatorType, value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (type === "text") return String(value).trim().length === 0
  if (type === "select" || type === "yes_no" || type === "date") return String(value).trim().length === 0
  if (type === "number" || type === "percentage") return value === "" || Number.isNaN(Number(value))
  if (type === "multiselect") return !Array.isArray(value) || value.length === 0
  if (type === "multi_int") {
    if (typeof value === "number") return Number.isNaN(value)
    if (typeof value === "object") return value === null || Object.keys(value as Record<string, unknown>).length === 0
    return true
  }
  return false
}

export default function InteractionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const { data: interactionsData, isLoading, error, mutate } = useInteractions()
  const { data: respondentsData } = useRespondents()
  const { data: assessmentsData } = useAssessments()
  const { data: projectsData } = useProjects()
  const { data: indicatorsData } = useAllIndicators()

  const interactions = interactionsData?.results || []
  const respondents = respondentsData?.results || []
  const assessments = assessmentsData?.results || []
  const projects = projectsData?.results || []
  const allIndicators = indicatorsData || []

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entryMode, setEntryMode] = useState<"assessment" | "derived">("assessment")
  const [derivedOutputIndicatorId, setDerivedOutputIndicatorId] = useState("")
  const [derivedRule, setDerivedRule] = useState<DerivationRule | null>(null)
  const [formData, setFormData] = useState({
    respondentId: "",
    assessmentId: "",
    projectId: "",
    date: "",
    notes: "",
  })

  const selectedAssessmentId = useMemo(() => {
    const id = Number(formData.assessmentId)
    return Number.isFinite(id) ? id : null
  }, [formData.assessmentId])
  const { data: selectedAssessment } = useAssessment(selectedAssessmentId)

  const screeningItems = useMemo(() => {
    if (entryMode === "assessment") {
      return selectedAssessment?.indicators_detail || []
    }
    if (entryMode === "derived" && derivedRule?.source_indicator) {
      return [
        {
          id: `derived-${derivedRule.source_indicator}`,
          indicator: String(derivedRule.source_indicator),
          indicator_detail: {
            id: String(derivedRule.source_indicator),
            name: derivedRule.source_indicator_name || "Indicator",
            code: derivedRule.source_indicator_code || "",
            type: "text",
            category: "other",
          },
          order: 1,
          is_required: true,
        },
      ]
    }
    return []
  }, [derivedRule, entryMode, selectedAssessment?.indicators_detail])

  const [answersByIndicatorId, setAnswersByIndicatorId] = useState<Record<string, unknown>>({})
  const [indicatorDetailsById, setIndicatorDetailsById] = useState<Record<string, Indicator>>({})
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

  useEffect(() => {
    let cancelled = false

    const loadRule = async () => {
      if (entryMode !== "derived" || !derivedOutputIndicatorId) {
        setDerivedRule(null)
        return
      }

      try {
        const data = await aggregatesService.listDerivationRules({
          output_indicator: derivedOutputIndicatorId,
          is_active: "true",
          page_size: "1",
        })
        if (cancelled) return
        setDerivedRule((data.results || [])[0] || null)
      } catch {
        if (cancelled) return
        setDerivedRule(null)
      }
    }

    loadRule()
    return () => {
      cancelled = true
    }
  }, [derivedOutputIndicatorId, entryMode])

  useEffect(() => {
    let cancelled = false

    const loadIndicatorDetails = async () => {
      const assessmentItems = selectedAssessment?.indicators_detail || []
      const indicatorIds = assessmentItems.map((i) => String(i.indicator)).filter(Boolean)
      if (entryMode === "derived" && derivedRule?.source_indicator) {
        indicatorIds.push(String(derivedRule.source_indicator))
      }
      const uniqueIds = Array.from(new Set(indicatorIds))
      const missingIds = uniqueIds.filter((id) => !indicatorDetailsById[id])
      if (missingIds.length === 0) return

      try {
        const results = await Promise.all(
          missingIds.map(async (id) => {
            try {
              const indicator = await indicatorsService.get(Number(id))
              return [id, indicator] as const
            } catch {
              return null
            }
          }),
        )
        if (cancelled) return

        const next: Record<string, Indicator> = {}
        for (const r of results) {
          if (!r) continue
          next[r[0]] = r[1]
        }
        if (Object.keys(next).length > 0) {
          setIndicatorDetailsById((prev) => ({ ...prev, ...next }))
        }
      } catch {
        // ignore
      }
    }

    loadIndicatorDetails()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssessmentId, selectedAssessment?.indicators_detail, derivedRule?.source_indicator, entryMode])

  const resetDialog = () => {
    setFormData({ respondentId: "", assessmentId: "", projectId: "", date: "", notes: "" })
    setEntryMode("assessment")
    setDerivedOutputIndicatorId("")
    setDerivedRule(null)
    setAnswersByIndicatorId({})
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
              <Label htmlFor="interaction-entry-mode">Entry Type *</Label>
              <Select
                value={entryMode}
                onValueChange={(value) => {
                  const mode = value as "assessment" | "derived"
                  setEntryMode(mode)
                  setAnswersByIndicatorId({})
                  if (mode === "assessment") {
                    setDerivedOutputIndicatorId("")
                    setDerivedRule(null)
                  } else {
                    setFormData((prev) => ({ ...prev, assessmentId: "" }))
                  }
                }}
              >
                <SelectTrigger id="interaction-entry-mode">
                  <SelectValue placeholder="Select entry type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assessment">Assessment (indicator set)</SelectItem>
                  <SelectItem value="derived">Derived Indicator (linked screening)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {entryMode === "assessment" ? (
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
            ) : (
              <div className="space-y-2">
                <Label htmlFor="interaction-derived-output">Derived Output Indicator *</Label>
                <Select value={derivedOutputIndicatorId} onValueChange={setDerivedOutputIndicatorId}>
                  <SelectTrigger id="interaction-derived-output">
                    <SelectValue placeholder="Select output indicator" />
                  </SelectTrigger>
                  <SelectContent>
                    {allIndicators
                      .filter((i) => i.type === "number" || i.type === "percentage")
                      .map((indicator) => (
                        <SelectItem key={indicator.id} value={String(indicator.id)}>
                          {indicator.name} ({indicator.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {derivedOutputIndicatorId ? (
                  <p className="text-xs text-muted-foreground">
                    {derivedRule
                      ? `Linked screening indicator: ${derivedRule.source_indicator_name || derivedRule.source_indicator_code || derivedRule.source_indicator}`
                      : "No derivation rule found for this indicator yet. Create one in Aggregates → Auto-calculate."}
                  </p>
                ) : null}
              </div>
            )}

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

            {screeningItems.length ? (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Screening Indicators</p>
                  <p className="text-xs text-muted-foreground">
                    Responses will be saved and linked to indicators.
                  </p>
                </div>

                <div className="space-y-4">
                  {screeningItems
                    .slice()
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((item) => {
                      const indicatorId = String(item.indicator)
                      const indicator =
                        indicatorDetailsById[indicatorId] ||
                        (item.indicator_detail as unknown as Indicator | undefined)

                      const type = (indicator?.type || item.indicator_detail?.type || "text") as IndicatorType
                      const labelText = indicator?.name || item.indicator_detail?.name || "Question"
                      const codeText = indicator?.code || item.indicator_detail?.code || ""
                      const options = normalizeOptions(indicator?.options)
                      const subLabels = Array.isArray(indicator?.sub_labels) ? indicator?.sub_labels : []
                      const currentValue = answersByIndicatorId[indicatorId]

                      return (
                        <div key={item.id || indicatorId} className="space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-0.5">
                              <Label className="text-sm">
                                {labelText}
                                {item.is_required ? " *" : ""}
                              </Label>
                              {codeText ? (
                                <p className="text-xs text-muted-foreground">{codeText}</p>
                              ) : null}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {type.replace(/_/g, " ")}
                            </Badge>
                          </div>

                          {type === "yes_no" ? (
                            <Select
                              value={typeof currentValue === "string" ? currentValue : ""}
                              onValueChange={(v) =>
                                setAnswersByIndicatorId((prev) => ({ ...prev, [indicatorId]: v }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : null}

                          {type === "number" || type === "percentage" ? (
                            <Input
                              type="number"
                              value={
                                typeof currentValue === "number" || typeof currentValue === "string"
                                  ? String(currentValue)
                                  : ""
                              }
                              onChange={(e) =>
                                setAnswersByIndicatorId((prev) => ({
                                  ...prev,
                                  [indicatorId]: e.target.value === "" ? "" : Number(e.target.value),
                                }))
                              }
                            />
                          ) : null}

                          {type === "date" ? (
                            <Input
                              type="date"
                              value={typeof currentValue === "string" ? currentValue : ""}
                              onChange={(e) =>
                                setAnswersByIndicatorId((prev) => ({ ...prev, [indicatorId]: e.target.value }))
                              }
                            />
                          ) : null}

                          {type === "text" ? (
                            <Textarea
                              rows={2}
                              value={typeof currentValue === "string" ? currentValue : ""}
                              onChange={(e) =>
                                setAnswersByIndicatorId((prev) => ({ ...prev, [indicatorId]: e.target.value }))
                              }
                            />
                          ) : null}

                          {type === "select" ? (
                            <Select
                              value={typeof currentValue === "string" ? currentValue : ""}
                              onValueChange={(v) =>
                                setAnswersByIndicatorId((prev) => ({ ...prev, [indicatorId]: v }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {options.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null}

                          {type === "multiselect" ? (
                            <div className="space-y-2">
                              {options.map((opt) => {
                                const selected = Array.isArray(currentValue)
                                  ? (currentValue as string[]).includes(opt.value)
                                  : false
                                return (
                                  <div key={opt.value} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={selected}
                                      onCheckedChange={(checked) => {
                                        setAnswersByIndicatorId((prev) => {
                                          const existing = Array.isArray(prev[indicatorId])
                                            ? (prev[indicatorId] as string[])
                                            : []
                                          const next = checked
                                            ? Array.from(new Set([...existing, opt.value]))
                                            : existing.filter((v) => v !== opt.value)
                                          return { ...prev, [indicatorId]: next }
                                        })
                                      }}
                                    />
                                    <span className="text-sm">{opt.label}</span>
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}

                          {type === "multi_int" ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {(subLabels.length ? subLabels : ["Value"]).map((subLabel) => {
                                const current =
                                  typeof currentValue === "object" && currentValue !== null
                                    ? (currentValue as Record<string, unknown>)[subLabel]
                                    : undefined
                                return (
                                  <div key={subLabel} className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">{subLabel}</Label>
                                    <Input
                                      type="number"
                                      value={
                                        typeof current === "number" || typeof current === "string"
                                          ? String(current)
                                          : ""
                                      }
                                      onChange={(e) =>
                                        setAnswersByIndicatorId((prev) => {
                                          const existing =
                                            typeof prev[indicatorId] === "object" &&
                                            prev[indicatorId] !== null
                                              ? (prev[indicatorId] as Record<string, unknown>)
                                              : {}
                                          const next = {
                                            ...existing,
                                            [subLabel]: e.target.value === "" ? "" : Number(e.target.value),
                                          }
                                          return { ...prev, [indicatorId]: next }
                                        })
                                      }
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Cancel
            </Button>
            <Button
              disabled={
                isSubmitting ||
                (entryMode === "assessment"
                  ? !formData.assessmentId
                  : !derivedOutputIndicatorId || !derivedRule) ||
                (entryMode === "derived" &&
                  (!formData.projectId || formData.projectId === "none")) ||
                !formData.respondentId ||
                !formData.date
              }
              onClick={async () => {
                setIsSubmitting(true)
                try {
                  if (entryMode === "derived" && (!formData.projectId || formData.projectId === "none")) {
                    toast({
                      title: "Validation Error",
                      description: "Project is required for derived indicators.",
                      variant: "destructive",
                    })
                    setIsSubmitting(false)
                    return
                  }

                  const questions = screeningItems
                  const missingRequired = questions.find((q) => {
                    if (!q.is_required) return false
                    const indicatorId = String(q.indicator)
                    const indicator =
                      indicatorDetailsById[indicatorId] ||
                      (q.indicator_detail as unknown as Indicator | undefined)
                    const type = (indicator?.type || q.indicator_detail?.type || "text") as IndicatorType
                    const value = answersByIndicatorId[indicatorId]
                    return isEmptyResponseValue(type, value)
                  })

                  if (missingRequired) {
                    toast({
                      title: "Validation Error",
                      description: "Please answer all required screening questions.",
                      variant: "destructive",
                    })
                    setIsSubmitting(false)
                    return
                  }

                  const responses = questions
                    .map((q) => {
                      const indicatorId = String(q.indicator)
                      const indicator =
                        indicatorDetailsById[indicatorId] ||
                        (q.indicator_detail as unknown as Indicator | undefined)
                      const type = (indicator?.type || q.indicator_detail?.type || "text") as IndicatorType
                      const value = answersByIndicatorId[indicatorId]
                      if (isEmptyResponseValue(type, value)) return null
                      return { indicator: Number(indicatorId), value }
                    })
                    .filter(Boolean) as Array<{ indicator: number; value: unknown }>

                  await interactionsService.create({
                    respondent: Number(formData.respondentId),
                    assessment: entryMode === "assessment" && formData.assessmentId ? Number(formData.assessmentId) : undefined,
                    project:
                      formData.projectId && formData.projectId !== "none"
                        ? Number(formData.projectId)
                        : undefined,
                    date: formData.date,
                    notes: formData.notes || undefined,
                    responses,
                  })
                  toast({
                    title: "Saved",
                    description: "Interaction recorded successfully.",
                  })
                  mutate()
                  resetDialog()
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
