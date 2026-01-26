"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Target, FileText, Hash, ToggleLeft, List, Type, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { useIndicators, useAssessments } from "@/lib/hooks/use-api"
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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

const categoryColors: Record<string, string> = {
  assessment: "bg-primary/10 text-primary",
  social: "bg-chart-2/10 text-chart-2",
  event_count: "bg-chart-3/10 text-chart-3",
  orgs_capacitated: "bg-chart-4/10 text-chart-4",
  misc: "bg-muted text-muted-foreground",
}

const categoryLabels: Record<string, string> = {
  assessment: "Assessment",
  social: "Social",
  event_count: "Event Count",
  orgs_capacitated: "Orgs Capacitated",
  misc: "Misc",
}

const typeIcons: Record<string, typeof Target> = {
  yes_no: ToggleLeft,
  number: Hash,
  open_text: Type,
  multiselect: List,
  single_select: List,
  numbers_by_category: FileText,
}

export default function IndicatorsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: indicatorsData, isLoading, error, mutate } = useIndicators()
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
    isRequired: false,
    allowAggregate: false,
  })

  const indicators = indicatorsData?.results || []
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
      key: "assessmentId",
      label: "Assessment",
      render: (indicator: Indicator) => {
        const assessment = assessments.find(a => a.id === indicator.assessmentId)
        return (
          <span className="text-sm text-muted-foreground">
            {assessment?.name || "—"}
          </span>
        )
      }
    },
    {
      key: "flags",
      label: "Properties",
      render: (indicator: Indicator) => (
        <div className="flex gap-1">
          {indicator.isRequired && (
            <Badge variant="outline" className="text-xs">Required</Badge>
          )}
          {indicator.allowAggregate && (
            <Badge variant="outline" className="text-xs">Aggregate</Badge>
          )}
        </div>
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
        isRequired: formData.isRequired,
        allowAggregate: formData.allowAggregate,
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
        isRequired: false,
        allowAggregate: false,
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
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground">{indicators.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Assessment</p>
          <p className="text-2xl font-bold text-primary">
            {indicators.filter(i => i.category === 'assessment').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Social</p>
          <p className="text-2xl font-bold text-chart-2">
            {indicators.filter(i => i.category === 'social').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Event</p>
          <p className="text-2xl font-bold text-chart-3">
            {indicators.filter(i => i.category === 'event_count').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Assessments</p>
          <p className="text-2xl font-bold text-chart-4">{assessments.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="event_count">Event</TabsTrigger>
          <TabsTrigger value="misc">Misc</TabsTrigger>
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
        <DialogContent className="max-w-lg">
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="event_count">Event Count</SelectItem>
                    <SelectItem value="orgs_capacitated">Orgs Capacitated</SelectItem>
                    <SelectItem value="misc">Misc</SelectItem>
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
                    <SelectItem value="open_text">Open Text</SelectItem>
                    <SelectItem value="single_select">Single Select</SelectItem>
                    <SelectItem value="multiselect">Multiselect</SelectItem>
                    <SelectItem value="numbers_by_category">Numbers by Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label>Required</Label>
                <p className="text-xs text-muted-foreground">This indicator must be answered</p>
              </div>
              <Switch
                checked={formData.isRequired}
                onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label>Allow Aggregate</Label>
                <p className="text-xs text-muted-foreground">Enable aggregate data entry</p>
              </div>
              <Switch
                checked={formData.allowAggregate}
                onCheckedChange={(checked) => setFormData({ ...formData, allowAggregate: checked })}
              />
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
