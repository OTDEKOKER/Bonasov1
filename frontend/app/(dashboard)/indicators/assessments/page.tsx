"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, ClipboardList, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { useAssessments } from "@/lib/hooks/use-api"
import { assessmentsService, indicatorsService } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"
import type { CreateIndicatorRequest } from "@/lib/api"

const typeLabels: Record<string, string> = {
  yes_no: "Yes/No",
  number: "Number",
  percentage: "Percentage",
  text: "Text",
  select: "Single Select",
  multiselect: "Multiselect",
  date: "Date",
  multi_int: "Numbers",
}

export default function AssessmentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data, isLoading, error, mutate } = useAssessments()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTemplateSubmitting, setIsTemplateSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  const assessments = data?.results || []

  const ensureIndicator = async (request: CreateIndicatorRequest): Promise<number> => {
    const list = await indicatorsService.list({
      search: request.code,
      page_size: "100",
    })
    const exactMatch = (list.results || []).find((i) => i.code === request.code)
    if (exactMatch?.id) return Number(exactMatch.id)

    try {
      const created = await indicatorsService.create(request)
      return Number(created.id)
    } catch {
      const retry = await indicatorsService.list({
        search: request.code,
        page_size: "100",
      })
      const retryMatch = (retry.results || []).find((i) => i.code === request.code)
      if (retryMatch?.id) return Number(retryMatch.id)

      const all = await indicatorsService.listAll()
      const allMatch = all.find((i) => i.code === request.code)
      if (allMatch?.id) return Number(allMatch.id)
      throw new Error(`Failed to create indicator: ${request.code}`)
    }
  }

  const createHivPreventionMessagesTemplate = async (): Promise<void> => {
    setIsTemplateSubmitting(true)
    try {
      const assessment = await assessmentsService.create({
        name: "HIV Prevention Messages Assessment",
        description:
          "Starter template (v1) for HIV prevention and control messages, screening, and linkage to care.",
      })

      const category = "hiv_prevention"
      const indicators: Array<{
        request: CreateIndicatorRequest
        order: number
        required: boolean
      }> = [
        {
          order: 1,
          required: true,
          request: {
            name: "Client ID",
            code: "HIVPM_CLIENT_ID",
            description: "Unique client identifier (avoid collecting names).",
            type: "text",
            category,
            is_active: true,
          },
        },
        {
          order: 2,
          required: true,
          request: {
            name: "Date of interaction",
            code: "HIVPM_INTERACTION_DATE",
            type: "date",
            category,
            is_active: true,
          },
        },
        {
          order: 3,
          required: true,
          request: {
            name: "Location of interaction",
            code: "HIVPM_INTERACTION_LOCATION",
            description: "Facility/site name (and plot/address if applicable).",
            type: "text",
            category,
            is_active: true,
          },
        },
        {
          order: 4,
          required: true,
          request: {
            name: "Reached with HIV prevention and control messages",
            code: "HIVPM_MESSAGES_REACHED",
            description: "Select all that apply.",
            type: "multiselect",
            category,
            is_active: true,
            options: [
              { label: "HIV testing messages", value: "hiv_testing" },
              { label: "PEP messages", value: "pep" },
              { label: "PrEP messages", value: "prep" },
              { label: "GBV messages", value: "gbv" },
              { label: "Condom use messages", value: "condom_use" },
              { label: "HIV treatment messages", value: "hiv_treatment" },
              { label: "ARV based messages", value: "arv_based" },
              { label: "EMTCT messages", value: "emtct" },
              { label: "Stigma reduction messages", value: "stigma_reduction" },
              { label: "None of the above", value: "none" },
            ],
          },
        },
        {
          order: 5,
          required: true,
          request: {
            name: "Screened for HIV",
            code: "HIVPM_HIV_SCREENED",
            type: "yes_no",
            category,
            is_active: true,
          },
        },
        {
          order: 6,
          required: false,
          request: {
            name: "Tested for HIV",
            code: "HIVPM_HIV_TESTED",
            type: "select",
            category,
            is_active: true,
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
              { label: "Known positive", value: "known_positive" },
            ],
          },
        },
        {
          order: 7,
          required: true,
          request: {
            name: "Screened for TB",
            code: "HIVPM_TB_SCREENED",
            type: "yes_no",
            category,
            is_active: true,
          },
        },
        {
          order: 8,
          required: false,
          request: {
            name: "Linked to care",
            code: "HIVPM_LINKED_TO_CARE",
            type: "yes_no",
            category,
            is_active: true,
          },
        },
        {
          order: 9,
          required: false,
          request: {
            name: "Eligible for PrEP",
            code: "HIVPM_PREP_ELIGIBLE",
            type: "yes_no",
            category,
            is_active: true,
          },
        },
        {
          order: 10,
          required: false,
          request: {
            name: "Eligible for PEP",
            code: "HIVPM_PEP_ELIGIBLE",
            type: "yes_no",
            category,
            is_active: true,
          },
        },
      ]

      for (const item of indicators) {
        const indicatorId = await ensureIndicator(item.request)
        await assessmentsService.addIndicator(Number(assessment.id), indicatorId, item.order, item.required)
      }

      toast({
        title: "Template created",
        description: "HIV Prevention Messages Assessment created with starter questions.",
      })
      setIsTemplatesOpen(false)
      mutate()
      router.push(`/indicators/assessments/${assessment.id}`)
    } catch (err) {
      console.error("Failed to create template assessment", err)
      toast({
        title: "Error",
        description: "Failed to create template assessment.",
        variant: "destructive",
      })
    } finally {
      setIsTemplateSubmitting(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Assessment name is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await assessmentsService.create({
        name: formData.name,
        description: formData.description || undefined,
      })
      toast({ title: "Success", description: "Assessment created successfully" })
      setIsCreateOpen(false)
      setFormData({ name: "", description: "" })
      mutate()
    } catch {
      toast({ title: "Error", description: "Failed to create assessment", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
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
        <p className="text-muted-foreground">Failed to load assessments</p>
        <Button onClick={() => mutate()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="Manage assessment forms and their indicators"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Indicators", href: "/indicators" },
          { label: "Assessments" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsTemplatesOpen(true)}>
              Templates
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Assessment
            </Button>
          </div>
        }
      />

      {/* Assessment cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {assessments.map((assessment) => {
          const indicators = assessment.indicators_detail || []
          
          return (
            <Card key={assessment.id} className="overflow-hidden">
              <CardHeader className="bg-secondary/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{assessment.name}</CardTitle>
                      <CardDescription>{assessment.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {assessment.indicators_count ?? indicators.length} indicators
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="indicators" className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <span className="text-sm text-muted-foreground">
                        View Indicators
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="space-y-2">
                        {indicators.map((indicator, index) => (
                          <div
                            key={indicator.id}
                            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {indicator.indicator_detail?.name || "Indicator"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {indicator.indicator_detail?.code || "—"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {typeLabels[indicator.indicator_detail?.type || ""] || indicator.indicator_detail?.type || "—"}
                              </Badge>
                              {indicator.is_required && (
                                <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <div className="flex items-center justify-between border-t border-border px-6 py-3">
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(assessment.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/indicators/assessments/${assessment.id}`)}
                  >
                    Edit Assessment
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {assessments.length === 0 && (
          <div className="col-span-2 flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
            <div className="text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No assessments yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 bg-transparent"
                onClick={() => setIsCreateOpen(true)}
              >
                Create your first assessment
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assessment</DialogTitle>
            <DialogDescription>
              Create a new assessment form to group indicators
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Assessment Name</Label>
              <Input
                id="name"
                placeholder="e.g., HIV Testing Assessment"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the assessment"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assessment Templates</DialogTitle>
            <DialogDescription>
              Create a starter assessment with pre-filled questions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">HIV Prevention Messages Assessment</p>
                  <p className="text-xs text-muted-foreground">
                    Date/location, prevention messages, HIV/TB screening, linkage to care, PrEP/PEP eligibility.
                  </p>
                </div>
                <Button onClick={createHivPreventionMessagesTemplate} disabled={isTemplateSubmitting}>
                  {isTemplateSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplatesOpen(false)} disabled={isTemplateSubmitting}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
