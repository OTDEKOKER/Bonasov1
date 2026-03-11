"use client";

import React from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrganizationSelect } from "@/components/shared/organization-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KEY_POPULATIONS,
  MATRIX_AGE_BANDS,
  type MatrixInputValues,
} from "@/lib/aggregates/aggregate-helpers";

type OptionItem = {
  id: string | number;
  name: string;
  code?: string;
};

type AggregateEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  isSubmitting: boolean;
  projects: OptionItem[];
  templates: Array<{ id: string | number; name: string; indicators?: Array<unknown> }>;
  templateIndicatorOptions: OptionItem[];
  writableOrganizations: OptionItem[];
  isOrganizationSelectionLocked: boolean;
  formProject: string;
  setFormProject: (value: string) => void;
  formIndicator: string;
  setFormIndicator: (value: string) => void;
  formOrganization: string;
  setFormOrganization: (value: string) => void;
  formTemplate: string;
  setFormTemplate: (value: string) => void;
  formPeriodStart: string;
  setFormPeriodStart: (value: string) => void;
  formPeriodEnd: string;
  setFormPeriodEnd: (value: string) => void;
  useMatrixEntry: boolean;
  setUseMatrixEntry: (value: boolean) => void;
  matrixToggleDisabled: boolean;
  formPrimaryDisaggregateLabel: string;
  matrixValues: MatrixInputValues;
  onMatrixCellChange: (kp: string, sex: "Male" | "Female", band: string, value: string) => void;
  matrixTotal: number;
  formMale: string;
  setFormMale: (value: string) => void;
  formFemale: string;
  setFormFemale: (value: string) => void;
  computedTotal: number;
  formDataSource: string;
  setFormDataSource: (value: string) => void;
  formNotes: string;
  setFormNotes: (value: string) => void;
};

export function AggregateEntryDialog(props: AggregateEntryDialogProps) {
  const {
    open,
    onOpenChange,
    onSave,
    isSubmitting,
    projects,
    templates,
    templateIndicatorOptions,
    writableOrganizations,
    isOrganizationSelectionLocked,
    formProject,
    setFormProject,
    formIndicator,
    setFormIndicator,
    formOrganization,
    setFormOrganization,
    formTemplate,
    setFormTemplate,
    formPeriodStart,
    setFormPeriodStart,
    formPeriodEnd,
    setFormPeriodEnd,
    useMatrixEntry,
    setUseMatrixEntry,
    matrixToggleDisabled,
    formPrimaryDisaggregateLabel,
    matrixValues,
    onMatrixCellChange,
    matrixTotal,
    formMale,
    setFormMale,
    formFemale,
    setFormFemale,
    computedTotal,
    formDataSource,
    setFormDataSource,
    formNotes,
    setFormNotes,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="fixed inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen overflow-hidden rounded-none p-0">
        <DialogHeader>
          <DialogTitle>Add Aggregate Entry</DialogTitle>
          <DialogDescription>
            Enter aggregate data for an indicator without individual respondent tracking
          </DialogDescription>
        </DialogHeader>

        <div className="grid h-[calc(100vh-140px)] gap-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="agg-project">Project</Label>
            <Select value={formProject} onValueChange={setFormProject}>
              <SelectTrigger id="agg-project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agg-template">Indicator Template</Label>
            <Select
              value={formTemplate}
              onValueChange={(value) => {
                setFormTemplate(value);
                setFormIndicator("");
              }}
            >
              <SelectTrigger id="agg-template">
                <SelectValue placeholder="All indicators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All indicators</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={String(template.id)}>
                    {template.name} ({template.indicators?.length ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agg-indicator">Indicator</Label>
            <Select value={formIndicator} onValueChange={setFormIndicator}>
              <SelectTrigger id="agg-indicator">
                <SelectValue placeholder="Select indicator" />
              </SelectTrigger>
              <SelectContent>
                {templateIndicatorOptions.map((indicator) => (
                  <SelectItem key={indicator.id} value={String(indicator.id)}>
                    {indicator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agg-org">Organization</Label>
            <OrganizationSelect
              organizations={writableOrganizations}
              value={formOrganization}
              onChange={setFormOrganization}
              placeholder="Select organization"
              disabled={isOrganizationSelectionLocked}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agg-period-start">Period Start</Label>
              <Input
                id="agg-period-start"
                type="date"
                value={formPeriodStart}
                onChange={(event) => setFormPeriodStart(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agg-period-end">Period End</Label>
              <Input
                id="agg-period-end"
                type="date"
                value={formPeriodEnd}
                onChange={(event) => setFormPeriodEnd(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Disaggregates</Label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={useMatrixEntry}
                disabled={matrixToggleDisabled}
                onCheckedChange={(checked) => setUseMatrixEntry(Boolean(checked))}
              />
              Use KP x Sex x Age matrix
            </div>
            {matrixToggleDisabled ? (
              <p className="text-xs text-muted-foreground">
                This indicator is configured as total-only. Matrix entry is disabled.
              </p>
            ) : null}
          </div>

          {useMatrixEntry ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Enter values by {formPrimaryDisaggregateLabel}, Sex, and Age band.
              </div>
              <div className="max-h-[55vh] overflow-auto rounded-lg border border-border">
                <table className="min-w-[960px] w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-muted/50">
                    <tr>
                      <th className="p-1.5 text-left">{formPrimaryDisaggregateLabel}</th>
                      <th className="p-1.5 text-left">Sex</th>
                      {MATRIX_AGE_BANDS.map((band) => (
                        <th key={band} className="p-1.5 text-center whitespace-nowrap">
                          {band}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {KEY_POPULATIONS.map((kp) => (
                      <React.Fragment key={kp}>
                        {["Male", "Female"].map((sex) => (
                          <tr key={`${kp}-${sex}`} className="border-t border-border">
                            <td className="p-1.5 font-medium whitespace-nowrap">{kp}</td>
                            <td className="p-1.5 whitespace-nowrap">{sex}</td>
                            {MATRIX_AGE_BANDS.map((band) => (
                              <td key={`${kp}-${sex}-${band}`} className="p-2">
                                <Input
                                  type="number"
                                  className="h-8 min-w-[72px] text-center"
                                  value={matrixValues[kp]?.[sex as "Male" | "Female"]?.[band] ?? ""}
                                  onChange={(event) =>
                                    onMatrixCellChange(
                                      kp,
                                      sex as "Male" | "Female",
                                      band,
                                      event.target.value,
                                    )
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-sm text-muted-foreground">
                Matrix total: <span className="font-semibold text-foreground">{matrixTotal.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="agg-male">Male</Label>
                <Input
                  id="agg-male"
                  type="number"
                  placeholder="0"
                  value={formMale}
                  onChange={(event) => setFormMale(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agg-female">Female</Label>
                <Input
                  id="agg-female"
                  type="number"
                  placeholder="0"
                  value={formFemale}
                  onChange={(event) => setFormFemale(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agg-total">Total</Label>
                <Input id="agg-total" type="number" value={computedTotal} disabled />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="agg-source">Data Source</Label>
            <Input
              id="agg-source"
              placeholder="e.g. DHIS2 report, Excel, routine register"
              value={formDataSource}
              onChange={(event) => setFormDataSource(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agg-notes">Notes</Label>
            <Input
              id="agg-notes"
              placeholder="Optional notes"
              value={formNotes}
              onChange={(event) => setFormNotes(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
