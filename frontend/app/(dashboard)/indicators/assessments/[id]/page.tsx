"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/shared/page-header"
import { assessmentsService } from "@/lib/api"
import { useAssessment, useIndicators } from "@/lib/hooks/use-api"
import { useToast } from "@/hooks/use-toast"

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

export default function AssessmentDetailPage() {
  const router = useRouter()
  const { toast } = useToast()
  const params = useParams()
  const id = Number(params?.id)

  const { data: assessment, isLoading, error, mutate } = useAssessment(
    Number.isFinite(id) ? id : null,
  )
  const { data: indicatorsData } = useIndicators()

  const indicators = indicatorsData?.results || []
  const indicatorOptions = useMemo(
    () => indicators.filter((indicator) => indicator.is_active),
    [indicators],
  )

  const [formState, setFormState] = useState({
    name: "",
    description: "",
  })
  const [selectedIndicator, setSelectedIndicator] = useState("")
  const [orderValue, setOrderValue] = useState("")
  const [isRequired, setIsRequired] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const indicatorsDetail = assessment?.indicators_detail || []

  useMemo(() => {
    if (assessment) {
      setFormState({
        name: assessment.name || "",
        description: assessment.description || "",
      })
    }
  }, [assessment])

  const handleSave = async () => {
    if (!assessment) return
    if (!formState.name) {
      toast({
        title: "Assessment name required",
        description: "Please provide a name for the assessment.",
        variant: "destructive",
      })
      return
    }
    setIsSubmitting(true)
    try {
      await assessmentsService.update(Number(assessment.id), {
        name: formState.name,
        description: formState.description || undefined,
      })
      toast({ title: "Saved", description: "Assessment updated." })
      mutate()
    } catch (err) {
      console.error("Failed to update assessment", err)
      toast({
        title: "Error",
        description: "Failed to update assessment.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddIndicator = async () => {
    if (!assessment || !selectedIndicator) return
    const order = orderValue ? Number(orderValue) : indicatorsDetail.length + 1
    setIsSubmitting(true)
    try {
      await assessmentsService.addIndicator(Number(assessment.id), Number(selectedIndicator), order, isRequired)
      toast({ title: "Added", description: "Indicator added to assessment." })
      setSelectedIndicator("")
      setOrderValue("")
      setIsRequired(true)
      mutate()
    } catch (err) {
      console.error("Failed to add indicator", err)
      toast({
        title: "Error",
        description: "Failed to add indicator.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveIndicator = async (indicatorId: string) => {
    if (!assessment) return
    if (!confirm("Remove this indicator from the assessment?")) return
    setIsSubmitting(true)
    try {
      await assessmentsService.removeIndicator(Number(assessment.id), Number(indicatorId))
      toast({ title: "Removed", description: "Indicator removed." })
      mutate()
    } catch (err) {
      console.error("Failed to remove indicator", err)
      toast({
        title: "Error",
        description: "Failed to remove indicator.",
        variant: "destructive",
      })
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

  if (error || !assessment) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Assessment not found</p>
        <Button onClick={() => router.push("/indicators/assessments")}>
          Back to Assessments
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={assessment.name}
        description="Manage indicators and settings for this assessment"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Indicators", href: "/indicators" },
          { label: "Assessments", href: "/indicators/assessments" },
          { label: assessment.name },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push("/indicators/assessments")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Indicators</CardTitle>
            <CardDescription>Questions included in this assessment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {indicatorsDetail.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                No indicators added yet.
              </div>
            )}
            {indicatorsDetail.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{item.indicator_detail?.name || "Indicator"}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.indicator_detail?.code || "—"} ·{" "}
                    {typeLabels[item.indicator_detail?.type || ""] || item.indicator_detail?.type || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {item.is_required && (
                    <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                      Required
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">Order {item.order}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveIndicator(item.indicator)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
              <CardDescription>Edit assessment metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assessment-name">Name</Label>
                <Input
                  id="assessment-name"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessment-description">Description</Label>
                <Textarea
                  id="assessment-description"
                  rows={3}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                />
              </div>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Indicator</CardTitle>
              <CardDescription>Attach a new indicator to this assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="indicator-select">Indicator</Label>
                <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
                  <SelectTrigger id="indicator-select">
                    <SelectValue placeholder="Select indicator" />
                  </SelectTrigger>
                  <SelectContent>
                    {indicatorOptions.map((indicator) => (
                      <SelectItem key={indicator.id} value={String(indicator.id)}>
                        {indicator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="indicator-order">Order (optional)</Label>
                <Input
                  id="indicator-order"
                  type="number"
                  placeholder={`${indicatorsDetail.length + 1}`}
                  value={orderValue}
                  onChange={(e) => setOrderValue(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isRequired}
                  onCheckedChange={(value) => setIsRequired(value === true)}
                />
                <Label>Required</Label>
              </div>
              <Button onClick={handleAddIndicator} disabled={!selectedIndicator || isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                Add Indicator
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
