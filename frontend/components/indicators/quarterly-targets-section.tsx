"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { projectsService } from "@/lib/api"
import { useAllOrganizations, useAllProjects } from "@/lib/hooks/use-api"
import type { ProjectIndicatorTarget } from "@/lib/types"

type QuarterlyTargetsSectionProps = {
  indicatorId: number
  projectTargets?: ProjectIndicatorTarget[]
  editable?: boolean
  onUpdated?: () => Promise<void> | void
}

const fiscalQuarters = [
  { key: "q1_target", label: "Q1", range: "1 Apr – 30 Jun" },
  { key: "q2_target", label: "Q2", range: "1 Jul – 30 Sep" },
  { key: "q3_target", label: "Q3", range: "1 Oct – 31 Dec" },
  { key: "q4_target", label: "Q4", range: "1 Jan – 31 Mar (following year)" },
] as const

type TargetFormState = {
  projectId: string
  organizationId: string
  baselineValue: string
  q1_target: string
  q2_target: string
  q3_target: string
  q4_target: string
}

const emptyForm: TargetFormState = {
  projectId: "",
  organizationId: "",
  baselineValue: "",
  q1_target: "",
  q2_target: "",
  q3_target: "",
  q4_target: "",
}

function formatNumber(value: unknown): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "—"
  return numeric.toLocaleString()
}

export function QuarterlyTargetsSection({
  indicatorId,
  projectTargets = [],
  editable = false,
  onUpdated,
}: QuarterlyTargetsSectionProps) {
  const { toast } = useToast()
  const { data: projectsData } = useAllProjects()
  const { data: organizationsData } = useAllOrganizations()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingTarget, setEditingTarget] = useState<ProjectIndicatorTarget | null>(null)
  const [form, setForm] = useState<TargetFormState>(emptyForm)

  const projects = projectsData?.results || []
  const organizations = organizationsData?.results || []

  const sortedTargets = useMemo(
    () =>
      [...projectTargets].sort((left, right) =>
        `${left.project_name || ""} ${left.organization_name || ""}`.localeCompare(
          `${right.project_name || ""} ${right.organization_name || ""}`,
        ),
      ),
    [projectTargets],
  )

  const availableProjects = useMemo(
    () =>
      [...projects].sort((left, right) =>
        String(left.name || "").localeCompare(String(right.name || "")),
      ),
    [projects],
  )

  const selectedProject = useMemo(
    () => availableProjects.find((project) => String(project.id) === form.projectId),
    [availableProjects, form.projectId],
  )

  const availableOrganizations = useMemo(() => {
    if (!selectedProject) return []
    const allowed = new Set((selectedProject.organizations || []).map((value) => String(value)))
    return organizations
      .filter((organization) => allowed.has(String(organization.id)))
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")))
  }, [organizations, selectedProject])

  useEffect(() => {
    if (editingTarget || !form.projectId || form.organizationId || availableOrganizations.length !== 1) {
      return
    }
    const onlyOrganization = availableOrganizations[0]
    if (!onlyOrganization) return
    setForm((prev) => ({ ...prev, organizationId: String(onlyOrganization.id) }))
  }, [availableOrganizations, editingTarget, form.organizationId, form.projectId])

  const openCreateDialog = () => {
    setEditingTarget(null)
    setForm(emptyForm)
    setIsDialogOpen(true)
  }

  const openEditDialog = (target: ProjectIndicatorTarget) => {
    setEditingTarget(target)
    setForm({
      projectId: String(target.project),
      organizationId: String(target.organization),
      baselineValue:
        target.baseline_value === undefined || target.baseline_value === null
          ? ""
          : String(target.baseline_value),
      q1_target: target.q1_target === undefined || target.q1_target === null ? "" : String(target.q1_target),
      q2_target: target.q2_target === undefined || target.q2_target === null ? "" : String(target.q2_target),
      q3_target: target.q3_target === undefined || target.q3_target === null ? "" : String(target.q3_target),
      q4_target: target.q4_target === undefined || target.q4_target === null ? "" : String(target.q4_target),
    })
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    if (isSaving) return
    setIsDialogOpen(false)
    setEditingTarget(null)
    setForm(emptyForm)
  }

  const handleSave = async () => {
    if (!form.projectId) {
      toast({
        title: "Validation Error",
        description: "Please select a project.",
        variant: "destructive",
      })
      return
    }

    if (!form.organizationId) {
      toast({
        title: "Validation Error",
        description: "Please select an organization.",
        variant: "destructive",
      })
      return
    }

    for (const quarter of fiscalQuarters) {
      if (form[quarter.key].trim() === "") {
        toast({
          title: "Validation Error",
          description: `Please enter a target for ${quarter.label}.`,
          variant: "destructive",
        })
        return
      }
    }

    setIsSaving(true)
    try {
      await projectsService.setTarget(Number(form.projectId), {
        indicator_id: indicatorId,
        organization_id: Number(form.organizationId),
        q1_target: Number(form.q1_target),
        q2_target: Number(form.q2_target),
        q3_target: Number(form.q3_target),
        q4_target: Number(form.q4_target),
        baseline_value: form.baselineValue.trim() === "" ? 0 : Number(form.baselineValue),
      })

      toast({
        title: "Targets saved",
        description: "Quarterly targets updated successfully.",
      })

      await onUpdated?.()
      closeDialog()
    } catch (error) {
      const description =
        error instanceof Error && error.message
          ? error.message
          : "Failed to save quarterly targets."

      toast({
        title: "Error",
        description,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Organization Quarterly Targets</CardTitle>
          <CardDescription>
            Each organization has its own financial-year target for this indicator, even when the indicator is shared.
          </CardDescription>
        </div>
        {editable ? (
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Organization Target
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {fiscalQuarters.map((quarter) => (
            <div key={quarter.key} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium">{quarter.label}</p>
              <p className="text-xs text-muted-foreground">{quarter.range}</p>
            </div>
          ))}
        </div>

        {sortedTargets.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Q1</TableHead>
                  <TableHead>Q2</TableHead>
                  <TableHead>Q3</TableHead>
                  <TableHead>Q4</TableHead>
                  <TableHead>Annual Total</TableHead>
                  <TableHead>Progress</TableHead>
                  {editable ? <TableHead className="text-right">Action</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTargets.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{target.project_name || "Project"}</p>
                        <p className="text-xs text-muted-foreground">{target.project_code || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{target.organization_name || "Organization"}</p>
                        <p className="text-xs text-muted-foreground">{target.organization_code || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatNumber(target.q1_target)}</TableCell>
                    <TableCell>{formatNumber(target.q2_target)}</TableCell>
                    <TableCell>{formatNumber(target.q3_target)}</TableCell>
                    <TableCell>{formatNumber(target.q4_target)}</TableCell>
                    <TableCell className="font-medium">{formatNumber(target.target_value)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{`${target.progress || 0}%`}</Badge>
                    </TableCell>
                    {editable ? (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(target)}>
                          Edit
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No quarterly targets have been set for this indicator yet.
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTarget ? "Edit Quarterly Targets" : "Add Quarterly Targets"}</DialogTitle>
            <DialogDescription>
              Enter all four quarter targets for one organization using the April to March financial year.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select
                value={form.projectId}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    projectId: value,
                    organizationId: editingTarget ? prev.organizationId : "",
                  }))
                }
                disabled={Boolean(editingTarget)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Organization *</Label>
              <Select
                value={form.organizationId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, organizationId: value }))}
                disabled={!form.projectId || Boolean(editingTarget)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.projectId ? "Select organization" : "Select project first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableOrganizations.map((organization) => (
                    <SelectItem key={organization.id} value={String(organization.id)}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {fiscalQuarters.map((quarter) => (
                <div key={quarter.key} className="space-y-2">
                  <Label htmlFor={quarter.key}>{`${quarter.label} *`}</Label>
                  <Input
                    id={quarter.key}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form[quarter.key]}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        [quarter.key]: event.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">{quarter.range}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="baselineValue">Baseline Value</Label>
              <Input
                id="baselineValue"
                type="number"
                min="0"
                step="0.01"
                value={form.baselineValue}
                onChange={(event) => setForm((prev) => ({ ...prev, baselineValue: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Targets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default QuarterlyTargetsSection
