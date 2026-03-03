"use client"

import { useEffect, useState } from "react"
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
import { PageHeader } from "@/components/shared/page-header"
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

  if (normalized.some((value) => ["kp", "fsw", "msm", "lgbtqi+", "pwd", "pwids"].includes(value))) {
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

export default function IndicatorEditPage() {
  const router = useRouter()
  const { toast } = useToast()
  const params = useParams()
  const id = Number(params?.id)

  const { data: indicator, isLoading, error, mutate } = useIndicator(Number.isFinite(id) ? id : null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    category: "",
    type: "",
    unit: "",
    options: "",
    sub_labels: [] as string[],
    is_active: true,
  })

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

  const toggleDisaggregate = (value: string, checked: boolean) => {
    setFormData((prev) => {
      const next = checked
        ? Array.from(new Set([...prev.sub_labels, value]))
        : prev.sub_labels.filter((item) => item !== value)

      return {
        ...prev,
        sub_labels: next,
      }
    })
  }

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.category || !formData.type) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await indicatorsService.update(id, {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        category: formData.category as Indicator["category"],
        type: formData.type as Indicator["type"],
        unit: formData.unit || undefined,
        options: formData.options
          ? formData.options.split(",").map((opt) => opt.trim()).filter(Boolean)
          : undefined,
        sub_labels: formData.sub_labels,
        is_active: formData.is_active,
      })

      toast({
        title: "Indicator updated",
        description: "Changes saved successfully",
      })
      mutate()
      router.push("/indicators")
    } catch {
      toast({
        title: "Error",
        description: "Failed to update indicator",
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

  if (error || !indicator) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Indicator not found</p>
        <Button onClick={() => router.push("/indicators")}>Back to Indicators</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${indicator.name}`}
        description="Update indicator details and disaggregates"
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

      <Card>
        <CardHeader>
          <CardTitle>Indicator Details</CardTitle>
          <CardDescription>Update indicator setup for collection and aggregate reporting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Indicator Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
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
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="options">Options (comma-separated)</Label>
              <Input
                id="options"
                value={formData.options}
                onChange={(e) => setFormData({ ...formData, options: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Disaggregate groups for aggregate data</Label>
            <div className="grid max-h-44 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
              {disaggregateGroupOptions.map((group) => {
                const htmlId = `disaggregate-group-${group.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`
                const checked = formData.sub_labels.includes(group)
                return (
                  <div key={group} className="flex items-center gap-2">
                    <Checkbox
                      id={htmlId}
                      checked={checked}
                      onCheckedChange={(value) => toggleDisaggregate(group, Boolean(value))}
                    />
                    <Label htmlFor={htmlId} className="text-sm font-normal">
                      {group}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">Enable or disable this indicator</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/indicators")}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
