"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Target, FileText, Hash, ToggleLeft, List, Type, Loader2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { useAllIndicators, useAssessments } from "@/lib/hooks/use-api"
import { indicatorsService } from "@/lib/api"
import type { Indicator } from "@/lib/types"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

const categoryColors: Record<string, string> = {
  hiv_prevention: "bg-primary/10 text-primary",
  ncd: "bg-chart-3/10 text-chart-3",
  events: "bg-chart-4/10 text-chart-4",
}

const categoryLabels: Record<string, string> = {
  hiv_prevention: "HIV Prevention",
  ncd: "Non-Communicable Diseases",
  events: "Events",
}

const typeIcons: Record<string, typeof Target> = {
  yes_no: ToggleLeft,
  number: Hash,
  percentage: Hash,
  text: Type,
  select: List,
  multiselect: List,
  date: Calendar,
  multi_int: FileText,
}

export default function IndicatorsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: indicatorsData, isLoading, error, mutate } = useAllIndicators()
  const { data: assessmentsData } = useAssessments()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    category: "",
    type: "",
    unit: "",
    options: "",
  })

  const indicators = indicatorsData || []
  const assessments = assessmentsData?.results || []

  const filteredIndicators = activeTab === "all"
    ? indicators
    : indicators.filter(i => i.category === activeTab)

  const columns = [
    {
      key: "name",
      label: "Indicator",
      sortable: true,
      render: (indicator: Indicator) => {
        const TypeIcon = typeIcons[indicator.type] || Target
        return (
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary p-2">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">{indicator.name}</p>
              <p className="text-xs text-muted-foreground">{indicator.code}</p>
            </div>
          </div>
        )
      }
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (indicator: Indicator) => (
        <Badge variant="secondary" className={categoryColors[indicator.category] || ""}>
          {categoryLabels[indicator.category] || indicator.category}
        </Badge>
      )
    },
    {
      key: "type",
      label: "Type",
      render: (indicator: Indicator) => (
        <span className="text-sm text-muted-foreground capitalize">
          {indicator.type.replace(/_/g, ' ')}
        </span>
      )
    },
    {
      key: "unit",
      label: "Unit",
      render: (indicator: Indicator) => (
        <span className="text-sm text-muted-foreground">
          {indicator.unit || "—"}
        </span>
      )
    },
    {
      key: "is_active",
      label: "Status",
      render: (indicator: Indicator) => (
        <Badge
          variant="secondary"
          className={indicator.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}
        >
          {indicator.is_active ? "Active" : "Inactive"}
        </Badge>
      )
    }
  ]

  const handleCreate = async () => {
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
      await indicatorsService.create({
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        category: formData.category as Indicator["category"],
        type: formData.type as Indicator["type"],
        unit: formData.unit || undefined,
        options: formData.options
          ? formData.options.split(",").map((opt) => opt.trim()).filter(Boolean)
          : undefined,
      })
      toast({
        title: "Success",
        description: "Indicator created successfully",
      })
      setIsCreateOpen(false)
      setFormData({
        name: "",
        code: "",
        description: "",
        category: "",
        type: "",
        unit: "",
        options: "",
      })
      mutate()
    } catch {
      toast({
        title: "Error",
        description: "Failed to create indicator",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (indicator: Indicator) => {
    if (!confirm(`Are you sure you want to delete "${indicator.name}"?`)) return

    try {
      await indicatorsService.delete(indicator.id)
      toast({
        title: "Success",
        description: "Indicator deleted successfully",
      })
      mutate()
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete indicator",
        variant: "destructive",
      })
    }
  }

  const actions = (indicator: Indicator) => [
    { label: "View Details", onClick: () => router.push(`/indicators/${indicator.id}`) },
    { label: "Edit", onClick: () => router.push(`/indicators/${indicator.id}/edit`) },
    { label: "Delete", onClick: () => handleDelete(indicator), destructive: true },
  ]

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
        <p className="text-muted-foreground">Failed to load indicators</p>
        <Button onClick={() => mutate()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indicators"
        description="Define and manage indicators for data collection"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Indicators" },
        ]}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Indicator
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground">{indicators.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">HIV Prevention</p>
          <p className="text-2xl font-bold text-primary">
            {indicators.filter(i => i.category === 'hiv_prevention').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Non-Communicable Diseases</p>
          <p className="text-2xl font-bold text-chart-3">
            {indicators.filter(i => i.category === 'ncd').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Events</p>
          <p className="text-2xl font-bold text-chart-4">
            {indicators.filter(i => i.category === 'events').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Assessments</p>
          <p className="text-2xl font-bold text-muted-foreground">{assessments.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="hiv_prevention">HIV Prevention</TabsTrigger>
          <TabsTrigger value="ncd">Non-Communicable Diseases</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <DataTable
            data={filteredIndicators}
            columns={columns}
            searchPlaceholder="Search indicators..."
            searchKey="name"
            actions={actions}
          />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Indicator</DialogTitle>
            <DialogDescription>
              Define a new indicator for data collection
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleCreate()
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Indicator Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter indicator name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., HIV_TEST"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the indicator"
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
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                  placeholder="e.g., people, sessions"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="options">Options (comma-separated)</Label>
                <Input
                  id="options"
                  placeholder="Option A, Option B"
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Indicator
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
