"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import { PageHeader } from "@/components/shared/page-header"
import QuarterlyTargetsSection from "@/components/indicators/quarterly-targets-section"

import { indicatorsService } from "@/lib/api"
import { useIndicator } from "@/lib/hooks/use-api"
import type { Indicator } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

const disaggregateGroupOptions = [
  "Sex",
  "Age Range",
  "KP",
  "Family Planning",
  "Community Leaders",
  "Non Traditional Sites",
  "Social Media Platform",
  "NCD Screening",
]

const inferDisaggregateGroups = (subLabels: string[]) => {
  const normalized = subLabels.map((value) => value.toLowerCase().trim())
  const groups = new Set<string>()

  if (normalized.some((value) => value === "female" || value === "male" || value === "sex")) {
    groups.add("Sex")
  }

  if (
    normalized.some(
      (value) =>
        value === "age range" ||
        /^\d{1,2}-\d{1,2}$/.test(value) ||
        value === "65+" ||
        value.includes("ayp"),
    )
  ) {
    groups.add("Age Range")
  }

  if (normalized.some((value) => ["kp", "fsw", "msm", "lgbtqi+", "pwd", "pwids", "pwud" ].includes(value))) {
    groups.add("KP")
  }

  if (normalized.some((value) => value === "family planning")) {
    groups.add("Family Planning")
  }

  if (normalized.some((value) => value === "community leaders")) {
    groups.add("Community Leaders")
  }

  if (normalized.some((value) => value === "non traditional sites")) {
    groups.add("Non Traditional Sites")
  }

  if (normalized.some((value) => value === "social media platform")) {
    groups.add("Social Media Platform")
  }

  if (normalized.some((value) => value === "ncd screening")) {
    groups.add("NCD Screening")
  }

  return Array.from(groups)
}

type FormDataState = {
  name: string
  code: string
  description: string
  category: string
  type: string
  unit: string
  options: string
  sub_labels: string[]
  is_active: boolean
}

const initialFormData: FormDataState = {
  name: "",
  code: "",
  description: "",
  category: "",
  type: "",
  unit: "",
  options: "",
  sub_labels: [],
  is_active: true,
}

export default function IndicatorEditPage() {
  const router = useRouter()
  const { toast } = useToast()
  const params = useParams()

  const rawId = params?.id
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId)
  const isValidId = Number.isFinite(id)

  const { data: indicator, isLoading, error, mutate } = useIndicator(isValidId ? id : null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormDataState>(initialFormData)

  useEffect(() => {
    if (!indicator) return

    setFormData({
      name: indicator.name || "",
      code: indicator.code || "",
      description: indicator.description || "",
      category: indicator.category || "",
      type: indicator.type || "",
      unit: indicator.unit || "",
      options: Array.isArray(indicator.options)
        ? indicator.options
            .map((opt) => (typeof opt === "string" ? opt : opt?.label || opt?.value || ""))
            .filter(Boolean)
            .join(", ")
        : "",
      sub_labels: Array.isArray(indicator.sub_labels)
        ? inferDisaggregateGroups(indicator.sub_labels)
        : [],
      is_active: indicator.is_active ?? true,
    })
  }, [indicator])

  const updateField = <K extends keyof FormDataState>(field: K, value: FormDataState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleDisaggregate = (value: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      sub_labels: checked
        ? Array.from(new Set([...prev.sub_labels, value]))
        : prev.sub_labels.filter((item) => item !== value),
    }))
  }

  const parsedOptions = useMemo(() => {
    return formData.options
      .split(",")
      .map((opt) => opt.trim())
      .filter(Boolean)
  }, [formData.options])

  const requiresOptions = formData.type === "select" || formData.type === "multiselect"

  const handleSave = async () => {
    if (!isValidId) {
      toast({
        title: "Invalid indicator",
        description: "The indicator ID is not valid.",
        variant: "destructive",
      })
      return
    }

    if (!formData.name.trim() || !formData.code.trim() || !formData.category || !formData.type) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (requiresOptions && parsedOptions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide at least one option for the selected response type.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await indicatorsService.update(id, {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category as Indicator["category"],
        type: formData.type as Indicator["type"],
        unit: formData.unit.trim() || undefined,
        options: requiresOptions ? parsedOptions : undefined,
        sub_labels: formData.sub_labels,
        is_active: formData.is_active,
      })

      toast({
        title: "Indicator updated",
        description: "Changes saved successfully.",
      })

      await mutate()
      router.push("/indicators")
    } catch {
      toast({
        title: "Error",
        description: "Failed to update indicator.",
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

  if (error || !indicator || !isValidId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Indicator not found</p>
        <Button onClick={() => router.push("/indicators")}>Back to Indicators</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title={`Edit ${indicator.name}`}
        description="Update indicator details, response structure, and aggregate disaggregates."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Indicators", href: "/indicators" },
          { label: "Edit" },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push("/indicators")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle>Indicator Details</CardTitle>
              <CardDescription>
                Update indicator setup for collection and aggregate reporting.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={formData.is_active ? "default" : "secondary"}>
                {formData.is_active ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">{formData.category || "No category"}</Badge>
              <Badge variant="outline">{formData.type || "No type"}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Indicator Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Enter indicator name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => updateField("code", e.target.value)}
                placeholder="Enter indicator code"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Add a short description for this indicator"
            />
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => updateField("category", value)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hiv_prevention">HIV Prevention</SelectItem>
                  <SelectItem value="ncd">Non-Communicable Diseases</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Response Type *</Label>
              <Select value={formData.type} onValueChange={(value) => updateField("type", value)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes_no">Yes/No</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="select">Single Select</SelectItem>
                  <SelectItem value="multiselect">Multiselect</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="multi_int">Multiple Integers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => updateField("unit", e.target.value)}
                placeholder="e.g. people, %, visits"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="options">
                Options {requiresOptions ? "*" : "(comma-separated)"}
              </Label>
              <Input
                id="options"
                value={formData.options}
                onChange={(e) => updateField("options", e.target.value)}
                placeholder="e.g. Yes, No, Unknown"
              />
              {requiresOptions && (
                <p className="text-xs text-muted-foreground">
                  Required for select and multiselect response types.
                </p>
              )}
            </div>
          </div>

          {parsedOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Parsed Options</Label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-border p-3">
                {parsedOptions.map((option) => (
                  <Badge key={option} variant="secondary">
                    {option}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Disaggregate groups for aggregate data</Label>
              <p className="text-sm text-muted-foreground">
                Select the disaggregate groups used when entering aggregate values.
              </p>
            </div>

            <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
              {disaggregateGroupOptions.map((group) => {
                const htmlId = `disaggregate-group-${group
                  .replace(/[^a-zA-Z0-9]+/g, "-")
                  .toLowerCase()}`
                const checked = formData.sub_labels.includes(group)

                return (
                  <label
                    key={group}
                    htmlFor={htmlId}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent p-2 transition hover:bg-muted/50"
                  >
                    <Checkbox
                      id={htmlId}
                      checked={checked}
                      onCheckedChange={(value) => toggleDisaggregate(group, Boolean(value))}
                    />
                    <span className="text-sm">{group}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">
                Enable or disable this indicator for use in the system.
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => updateField("is_active", checked)}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => router.push("/indicators")} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <QuarterlyTargetsSection
        indicatorId={id}
        projectTargets={indicator.project_targets}
        editable
        onUpdated={() => mutate()}
      />
    </div>
  )
}