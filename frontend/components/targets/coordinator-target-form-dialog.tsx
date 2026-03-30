"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import type { CoordinatorTarget, CoordinatorTargetQuarter } from "@/lib/api";
import { getCurrentFiscalYear } from "@/components/targets/coordinator-targets-utils";
import type { NamedOption } from "@/components/targets/coordinator-targets-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type CoordinatorTargetFormValue = {
  project_id: number;
  coordinator_id: number;
  indicator_id: number;
  year: number;
  quarter: CoordinatorTargetQuarter;
  target_value: number;
  notes?: string;
  is_active: boolean;
};

type CoordinatorTargetFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting?: boolean;
  existing?: CoordinatorTarget | null;
  projects: NamedOption[];
  coordinators: NamedOption[];
  indicators: NamedOption[];
  onSubmit: (value: CoordinatorTargetFormValue) => Promise<void> | void;
};

type FormState = {
  projectId: string;
  coordinatorId: string;
  indicatorId: string;
  year: string;
  quarter: CoordinatorTargetQuarter;
  targetValue: string;
  notes: string;
  isActive: boolean;
};

const DEFAULT_FORM: FormState = {
  projectId: "",
  coordinatorId: "",
  indicatorId: "",
  year: String(getCurrentFiscalYear()),
  quarter: "Q1",
  targetValue: "",
  notes: "",
  isActive: true,
};

function toFormState(existing?: CoordinatorTarget | null): FormState {
  if (!existing) return DEFAULT_FORM;
  return {
    projectId: String(existing.project_id),
    coordinatorId: String(existing.coordinator_id),
    indicatorId: String(existing.indicator_id),
    year: String(existing.year),
    quarter: existing.quarter,
    targetValue: String(existing.target_value ?? ""),
    notes: existing.notes || "",
    isActive: existing.is_active !== false,
  };
}

export function CoordinatorTargetFormDialog(props: CoordinatorTargetFormDialogProps) {
  const { open, onOpenChange, submitting = false, existing, projects, coordinators, indicators, onSubmit } = props;
  const [form, setForm] = useState<FormState>(() => toFormState(existing));
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = Boolean(
    form.projectId &&
      form.coordinatorId &&
      form.indicatorId &&
      form.year &&
      form.quarter &&
      form.targetValue.trim(),
  );

  const submit = async () => {
    setErrorMessage("");
    const parsedTargetValue = Number(form.targetValue);
    const parsedYear = Number(form.year);

    if (!Number.isFinite(parsedTargetValue)) {
      setErrorMessage("Target value must be a valid number.");
      return;
    }
    if (!Number.isFinite(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      setErrorMessage("Year must be a valid fiscal year.");
      return;
    }

    await onSubmit({
      project_id: Number(form.projectId),
      coordinator_id: Number(form.coordinatorId),
      indicator_id: Number(form.indicatorId),
      year: parsedYear,
      quarter: form.quarter,
      target_value: parsedTargetValue,
      notes: form.notes.trim() || undefined,
      is_active: form.isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Coordinator Target" : "New Coordinator Target"}</DialogTitle>
          <DialogDescription>
            Targets are unique per project, coordinator, indicator, fiscal year, and quarter.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Project</Label>
              <Select value={form.projectId} onValueChange={(value) => setForm((current) => ({ ...current, projectId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.value} value={project.value}>
                      {project.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Coordinator</Label>
              <Select
                value={form.coordinatorId}
                onValueChange={(value) => setForm((current) => ({ ...current, coordinatorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select coordinator" />
                </SelectTrigger>
                <SelectContent>
                  {coordinators.map((coordinator) => (
                    <SelectItem key={coordinator.value} value={coordinator.value}>
                      {coordinator.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <div className="grid gap-2 md:col-span-2">
              <Label>Indicator</Label>
              <Select
                value={form.indicatorId}
                onValueChange={(value) => setForm((current) => ({ ...current, indicatorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select indicator" />
                </SelectTrigger>
                <SelectContent>
                  {indicators.map((indicator) => (
                    <SelectItem key={indicator.value} value={indicator.value}>
                      {indicator.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Target Value</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.targetValue}
                onChange={(event) => setForm((current) => ({ ...current, targetValue: event.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Fiscal Year</Label>
              <Input
                type="number"
                value={form.year}
                onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Quarter</Label>
              <Select
                value={form.quarter}
                onValueChange={(value) => setForm((current) => ({ ...current, quarter: value as CoordinatorTargetQuarter }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Optional implementation notes"
            />
          </div>

          <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <span className="text-sm">Active target</span>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked === true }))}
            />
          </label>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={submitting || !canSubmit}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {existing ? "Save Changes" : "Create Target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
