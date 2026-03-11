"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, Download, Filter, Loader2, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/contexts/auth-context";
import { getUserOrganizationId } from "@/lib/utils/organization";
import { isPlatformAdmin } from "@/lib/permissions";
import { aggregatesService } from "@/lib/api";
import {
  useAggregates,
  useAggregateTemplates,
  useAllOrganizations,
  useIndicators,
  useProjects,
} from "@/lib/hooks/use-api";
import {
  buildChartData,
  buildEmptyMatrix,
  buildMatrixPayload,
  calculateAggregateTotals,
  computeMatrixTotal,
  getPeriodLabel,
  getPrimaryDisaggregateLabel,
  groupAggregatesByIndicator,
  indicatorUsesMatrixEntry,
  parseNumberInput,
  resolveParentOrganizationId,
  type AggregateValue,
} from "@/lib/aggregates/aggregate-helpers";
import {
  buildImportPayloadsFromFile,
  groupImportPayloadsByScope,
} from "@/lib/aggregates/aggregate-import";
import { AggregateEntryDialog } from "@/components/aggregates/AggregateEntryDialog";
import { AggregateAutoCalcDialog } from "@/components/aggregates/AggregateAutoCalcDialog";
import { AggregateChartDialog } from "@/components/aggregates/AggregateChartDialog";
import { AggregateMatrixTable } from "@/components/aggregates/AggregateMatrixTable";

type OrganizationWithParent = {
  id: string | number;
  name?: string;
  parentId?: string | number | null;
  parent?: string | number | null;
};

function AggregatesPageContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [parentOrgFilter, setParentOrgFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isAutoCalcOpen, setIsAutoCalcOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoCalcSubmitting, setIsAutoCalcSubmitting] = useState(false);

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [formProject, setFormProject] = useState("");
  const [formIndicator, setFormIndicator] = useState("");
  const [formOrganization, setFormOrganization] = useState("");
  const [formTemplate, setFormTemplate] = useState("all");
  const [formPeriodStart, setFormPeriodStart] = useState("");
  const [formPeriodEnd, setFormPeriodEnd] = useState("");
  const [useMatrixEntry, setUseMatrixEntry] = useState(true);
  const [formMale, setFormMale] = useState("");
  const [formFemale, setFormFemale] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formDataSource, setFormDataSource] = useState("");
  const [matrixValues, setMatrixValues] = useState(buildEmptyMatrix);

  const [autoOutputIndicator, setAutoOutputIndicator] = useState("");
  const [autoSourceIndicator, setAutoSourceIndicator] = useState("");
  const [autoOperator, setAutoOperator] = useState<"equals" | "not_equals" | "contains">("equals");
  const [autoMatchValue, setAutoMatchValue] = useState("yes");
  const [autoCountDistinct, setAutoCountDistinct] = useState<"respondent" | "interaction">("respondent");
  const [autoProject, setAutoProject] = useState("");
  const [autoOrganization, setAutoOrganization] = useState("");
  const [autoPeriodStart, setAutoPeriodStart] = useState("");
  const [autoPeriodEnd, setAutoPeriodEnd] = useState("");
  const [autoSaveRule, setAutoSaveRule] = useState(true);
  const [autoSaveAggregate, setAutoSaveAggregate] = useState(true);
  const [autoComputed, setAutoComputed] = useState<number | null>(null);

  const { data: aggregatesData, isLoading, error, mutate } = useAggregates();
  const { data: projectsData } = useProjects();
  const { data: indicatorsData } = useIndicators();
  const { data: organizationsData } = useAllOrganizations();
  const { data: templatesData } = useAggregateTemplates({
    project: formProject || undefined,
    organization: formOrganization || undefined,
  });

  const aggregates = aggregatesData?.results || [];
  const projects = projectsData?.results || [];
  const indicators = indicatorsData?.results || [];
  const organizations = organizationsData?.results || [];
  const templates = templatesData || [];

  const userOrganizationId = useMemo(() => getUserOrganizationId(user), [user]);
  const canReportAcrossOrganizations = useMemo(() => isPlatformAdmin(user), [user]);

  const indicatorById = useMemo(
    () => new Map(indicators.map((indicator) => [String(indicator.id), indicator])),
    [indicators],
  );
  const indicatorNameById = useMemo(
    () => new Map(indicators.map((indicator) => [String(indicator.id), indicator.name])),
    [indicators],
  );
  const indicatorCodeById = useMemo(
    () => new Map(indicators.map((indicator) => [String(indicator.id), indicator.code])),
    [indicators],
  );
  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [String(project.id), project.name])),
    [projects],
  );

  const parentOrganizations = useMemo(
    () =>
      organizations
        .filter(
          (organization) =>
            !resolveParentOrganizationId(organization as unknown as OrganizationWithParent),
        )
        .slice()
        .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""))),
    [organizations],
  );

  const scopedOrganizations = useMemo(() => {
    const scoped =
      parentOrgFilter === "all"
        ? organizations
        : organizations.filter((organization) => {
            const organizationId = String(organization.id);
            const parentId = resolveParentOrganizationId(
              organization as unknown as OrganizationWithParent,
            );
            return organizationId === parentOrgFilter || parentId === parentOrgFilter;
          });

    return scoped
      .slice()
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  }, [organizations, parentOrgFilter]);

  const scopedOrganizationIds = useMemo(
    () => new Set(scopedOrganizations.map((organization) => String(organization.id))),
    [scopedOrganizations],
  );

  const selectedOrganizationIds = useMemo(() => {
    if (orgFilter === "all") {
      return scopedOrganizationIds;
    }

    return new Set(
      orgFilter
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && scopedOrganizationIds.has(value)),
    );
  }, [orgFilter, scopedOrganizationIds]);

  const writableOrganizations = useMemo(() => {
    if (canReportAcrossOrganizations) return organizations;
    const ownOrganizationId = userOrganizationId ? String(userOrganizationId) : "";
    if (!ownOrganizationId) return [];
    return organizations.filter((organization) => String(organization.id) === ownOrganizationId);
  }, [canReportAcrossOrganizations, organizations, userOrganizationId]);

  const writableOrganizationIds = useMemo(
    () => new Set(writableOrganizations.map((organization) => String(organization.id))),
    [writableOrganizations],
  );

  const isOrganizationSelectionLocked = !canReportAcrossOrganizations;
  const defaultOwnOrganizationValue = userOrganizationId ? String(userOrganizationId) : "";

  const selectedFormIndicator = useMemo(
    () => indicatorById.get(formIndicator),
    [formIndicator, indicatorById],
  );
  const selectedFormIndicatorUsesMatrix = useMemo(
    () => indicatorUsesMatrixEntry(selectedFormIndicator?.sub_labels),
    [selectedFormIndicator],
  );
  const formPrimaryDisaggregateLabel = useMemo(
    () => getPrimaryDisaggregateLabel(selectedFormIndicator?.sub_labels),
    [selectedFormIndicator],
  );

  const matrixToggleDisabled = Boolean(formIndicator) && !selectedFormIndicatorUsesMatrix;
  const sidebarOrgId = searchParams.get("orgId");

  useEffect(() => {
    if (!formIndicator) return;
    if (selectedFormIndicatorUsesMatrix && !useMatrixEntry) {
      setUseMatrixEntry(true);
      return;
    }
    if (!selectedFormIndicatorUsesMatrix && useMatrixEntry) {
      setUseMatrixEntry(false);
    }
  }, [formIndicator, selectedFormIndicatorUsesMatrix, useMatrixEntry]);

  useEffect(() => {
    if (!sidebarOrgId) return;

    const matchedCoordinator = parentOrganizations.find(
      (organization) => String(organization.id) === sidebarOrgId,
    );
    if (matchedCoordinator) {
      setParentOrgFilter(sidebarOrgId);
      setOrgFilter("all");
      return;
    }

    const matchedOrganization = organizations.find(
      (organization) => String(organization.id) === sidebarOrgId,
    );
    if (!matchedOrganization) return;

    const parentId = resolveParentOrganizationId(
      matchedOrganization as unknown as OrganizationWithParent,
    );
    setParentOrgFilter(parentId || String(matchedOrganization.id));
    setOrgFilter("all");
  }, [organizations, parentOrganizations, sidebarOrgId]);

  useEffect(() => {
    if (!isDialogOpen || !isOrganizationSelectionLocked) return;
    if (!userOrganizationId) return;
    setFormOrganization(String(userOrganizationId));
  }, [isDialogOpen, isOrganizationSelectionLocked, userOrganizationId]);

  useEffect(() => {
    if (!isAutoCalcOpen || !isOrganizationSelectionLocked) return;
    if (!userOrganizationId) return;
    setAutoOrganization(String(userOrganizationId));
  }, [isAutoCalcOpen, isOrganizationSelectionLocked, userOrganizationId]);

  const periods = useMemo(
    () => Array.from(new Set(aggregates.map(getPeriodLabel))),
    [aggregates],
  );

  const filteredAggregates = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return aggregates.filter((aggregate) => {
      const aggregateOrganizationId = String(aggregate.organization);
      if (!selectedOrganizationIds.has(aggregateOrganizationId)) return false;

      const matchesProject =
        projectFilter === "all" || String(aggregate.project) === projectFilter;
      if (!matchesProject) return false;

      const matchesPeriod = periodFilter === "all" || getPeriodLabel(aggregate) === periodFilter;
      if (!matchesPeriod) return false;

      const indicatorName =
        aggregate.indicator_name || indicatorNameById.get(String(aggregate.indicator)) || "";
      return query.length === 0 || indicatorName.toLowerCase().includes(query);
    });
  }, [
    aggregates,
    indicatorNameById,
    periodFilter,
    projectFilter,
    searchQuery,
    selectedOrganizationIds,
  ]);

  const aggregateGroups = useMemo(
    () => groupAggregatesByIndicator(filteredAggregates, indicatorNameById, indicatorCodeById),
    [filteredAggregates, indicatorCodeById, indicatorNameById],
  );

  const totals = useMemo(() => calculateAggregateTotals(filteredAggregates), [filteredAggregates]);

  const chartData = useMemo(
    () => buildChartData(filteredAggregates, indicatorNameById),
    [filteredAggregates, indicatorNameById],
  );

  const templateIndicatorOptions = useMemo(() => {
    if (formTemplate === "all") return indicators;
    const selectedTemplate = templates.find(
      (template) => String(template.id) === formTemplate,
    );
    if (!selectedTemplate) return indicators;
    return selectedTemplate.indicators.map((indicator) => ({
      id: indicator.id,
      name: indicator.name,
      code: indicator.code,
    }));
  }, [formTemplate, indicators, templates]);

  const computedTotal = useMemo(() => {
    if (useMatrixEntry) return 0;
    const male = parseNumberInput(formMale) ?? 0;
    const female = parseNumberInput(formFemale) ?? 0;
    return male + female;
  }, [formFemale, formMale, useMatrixEntry]);

  const matrixTotal = useMemo(
    () => (useMatrixEntry ? computeMatrixTotal(matrixValues) : 0),
    [matrixValues, useMatrixEntry],
  );

  const resetForm = () => {
    setFormProject("");
    setFormIndicator("");
    setFormOrganization(defaultOwnOrganizationValue);
    setFormTemplate("all");
    setFormPeriodStart("");
    setFormPeriodEnd("");
    setUseMatrixEntry(true);
    setFormMale("");
    setFormFemale("");
    setFormNotes("");
    setFormDataSource("");
    setMatrixValues(buildEmptyMatrix());
  };

  const resetAutoCalcForm = () => {
    setAutoOutputIndicator("");
    setAutoSourceIndicator("");
    setAutoOperator("equals");
    setAutoMatchValue("yes");
    setAutoCountDistinct("respondent");
    setAutoProject("");
    setAutoOrganization("");
    setAutoPeriodStart("");
    setAutoPeriodEnd("");
    setAutoSaveRule(true);
    setAutoSaveAggregate(true);
    setAutoComputed(null);
  };

  const getPeriodBounds = (label: string) => {
    const match = aggregates.find((aggregate) => getPeriodLabel(aggregate) === label);
    if (!match) return null;
    return { from: match.period_start, to: match.period_end };
  };

  const handleExport = async () => {
    try {
      const periodBounds = periodFilter !== "all" ? getPeriodBounds(periodFilter) : null;
      const blob = await aggregatesService.export({
        format: "excel",
        project: projectFilter !== "all" ? projectFilter : undefined,
        organization: orgFilter !== "all" ? orgFilter : undefined,
        date_from: periodBounds?.from,
        date_to: periodBounds?.to,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `aggregates_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export aggregates", err);
      toast({
        title: "Export failed",
        description: "Unable to export aggregates.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (file: File) => {
    try {
      const { payloads, failedCount: parseFailedCount } = await buildImportPayloadsFromFile({
        file,
        organizations,
        projects,
        indicators,
        templates,
        canReportAcrossOrganizations,
        writableOrganizationIds,
      });

      if (payloads.length === 0) {
        toast({
          title: "Invalid file",
          description: "No rows found.",
          variant: "destructive",
        });
        return;
      }

      const grouped = groupImportPayloadsByScope(payloads);
      let success = 0;
      let failed = parseFailedCount;

      for (const group of grouped) {
        try {
          const result = await aggregatesService.bulkCreate(group);
          success += result.length;
        } catch {
          failed += group.data.length;
        }
      }

      await mutate();
      toast({
        title: "Import complete",
        description: `Imported ${success} rows. ${failed} failed.`,
        variant: failed ? "destructive" : "default",
      });
    } catch (err) {
      console.error("Failed to import aggregates", err);
      toast({
        title: "Import failed",
        description: "Unable to import aggregate file.",
        variant: "destructive",
      });
    }
  };

  const handleMatrixCellChange = (
    kp: string,
    sex: "Male" | "Female",
    band: string,
    value: string,
  ) => {
    setMatrixValues((previous) => ({
      ...previous,
      [kp]: {
        ...previous[kp],
        [sex]: {
          ...previous[kp]?.[sex],
          [band]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!formProject || !formIndicator || !formOrganization || !formPeriodStart || !formPeriodEnd) {
      toast({
        title: "Missing required fields",
        description: "Project, indicator, organization, and period dates are required.",
        variant: "destructive",
      });
      return;
    }

    const male = !useMatrixEntry ? parseNumberInput(formMale) : undefined;
    const female = !useMatrixEntry ? parseNumberInput(formFemale) : undefined;

    if (useMatrixEntry && matrixTotal === 0) {
      toast({
        title: "Missing value",
        description: "Enter at least one value in the disaggregate matrix.",
        variant: "destructive",
      });
      return;
    }

    if (!useMatrixEntry && male === undefined && female === undefined) {
      toast({
        title: "Missing value",
        description: "Provide at least one of male or female values.",
        variant: "destructive",
      });
      return;
    }

    if (!canReportAcrossOrganizations && !writableOrganizationIds.has(formOrganization)) {
      toast({
        title: "Organization restricted",
        description: "You can only submit aggregate data for your own organization.",
        variant: "destructive",
      });
      return;
    }

    const valuePayload: AggregateValue = {
      total: useMatrixEntry ? matrixTotal : (male ?? 0) + (female ?? 0),
    };

    if (!useMatrixEntry && male !== undefined) valuePayload.male = male;
    if (!useMatrixEntry && female !== undefined) valuePayload.female = female;

    if (useMatrixEntry) {
      valuePayload.disaggregates = buildMatrixPayload(matrixValues);
    }

    setIsSubmitting(true);
    try {
      const combinedNotes = [
        formNotes.trim(),
        formDataSource.trim() ? `Data source: ${formDataSource.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      await aggregatesService.create({
        indicator: Number(formIndicator),
        project: Number(formProject),
        organization: Number(formOrganization),
        period_start: formPeriodStart,
        period_end: formPeriodEnd,
        value: valuePayload,
        notes: combinedNotes || undefined,
      });

      toast({
        title: "Aggregate saved",
        description: "Aggregate entry created successfully.",
      });

      await mutate();
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Failed to create aggregate", err);
      toast({
        title: "Error",
        description: "Failed to create aggregate entry.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoCalculate = async () => {
    if (
      !autoOutputIndicator ||
      !autoSourceIndicator ||
      !autoProject ||
      !autoOrganization ||
      !autoPeriodStart ||
      !autoPeriodEnd
    ) {
      toast({
        title: "Missing required fields",
        description: "Output, source, project, organization, and period dates are required.",
        variant: "destructive",
      });
      return;
    }

    if (
      autoSaveAggregate &&
      !canReportAcrossOrganizations &&
      !writableOrganizationIds.has(autoOrganization)
    ) {
      toast({
        title: "Organization restricted",
        description: "You can only save aggregates for your own organization.",
        variant: "destructive",
      });
      return;
    }

    setIsAutoCalcSubmitting(true);
    try {
      const result = await aggregatesService.generateFromInteractions({
        output_indicator: Number(autoOutputIndicator),
        source_indicator: Number(autoSourceIndicator),
        operator: autoOperator,
        match_value: autoMatchValue,
        count_distinct: autoCountDistinct,
        project: Number(autoProject),
        organization: Number(autoOrganization),
        period_start: autoPeriodStart,
        period_end: autoPeriodEnd,
        save_rule: autoSaveRule,
        save_aggregate: autoSaveAggregate,
      });

      setAutoComputed(result.computed);
      if (autoSaveAggregate) {
        await mutate();
      }

      toast({
        title: "Auto-calculation complete",
        description: `Computed value: ${result.computed}`,
      });
    } catch (err) {
      console.error("Failed to auto-calculate aggregate", err);
      toast({
        title: "Error",
        description: "Failed to auto-calculate from interactions.",
        variant: "destructive",
      });
    } finally {
      setIsAutoCalcSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Failed to load aggregates</p>
        <Button onClick={() => mutate()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Aggregates"
        description="Enter and manage aggregate data without individual respondent tracking"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Aggregates" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => importInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>

            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImport(file);
                }
                if (importInputRef.current) {
                  importInputRef.current.value = "";
                }
              }}
            />

            <AggregateAutoCalcDialog
              open={isAutoCalcOpen}
              onOpenChange={(open) => {
                setIsAutoCalcOpen(open);
                if (!open) resetAutoCalcForm();
              }}
              onCalculate={handleAutoCalculate}
              isSubmitting={isAutoCalcSubmitting}
              computedValue={autoComputed}
              projects={projects}
              organizations={writableOrganizations}
              indicators={indicators}
              isOrganizationSelectionLocked={isOrganizationSelectionLocked}
              autoProject={autoProject}
              setAutoProject={setAutoProject}
              autoOrganization={autoOrganization}
              setAutoOrganization={setAutoOrganization}
              autoOutputIndicator={autoOutputIndicator}
              setAutoOutputIndicator={setAutoOutputIndicator}
              autoSourceIndicator={autoSourceIndicator}
              setAutoSourceIndicator={setAutoSourceIndicator}
              autoOperator={autoOperator}
              setAutoOperator={setAutoOperator}
              autoMatchValue={autoMatchValue}
              setAutoMatchValue={setAutoMatchValue}
              autoCountDistinct={autoCountDistinct}
              setAutoCountDistinct={setAutoCountDistinct}
              autoPeriodStart={autoPeriodStart}
              setAutoPeriodStart={setAutoPeriodStart}
              autoPeriodEnd={autoPeriodEnd}
              setAutoPeriodEnd={setAutoPeriodEnd}
              autoSaveRule={autoSaveRule}
              setAutoSaveRule={setAutoSaveRule}
              autoSaveAggregate={autoSaveAggregate}
              setAutoSaveAggregate={setAutoSaveAggregate}
            />

            <AggregateEntryDialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}
              onSave={handleSave}
              isSubmitting={isSubmitting}
              projects={projects}
              templates={templates}
              templateIndicatorOptions={templateIndicatorOptions}
              writableOrganizations={writableOrganizations}
              isOrganizationSelectionLocked={isOrganizationSelectionLocked}
              formProject={formProject}
              setFormProject={setFormProject}
              formIndicator={formIndicator}
              setFormIndicator={setFormIndicator}
              formOrganization={formOrganization}
              setFormOrganization={setFormOrganization}
              formTemplate={formTemplate}
              setFormTemplate={setFormTemplate}
              formPeriodStart={formPeriodStart}
              setFormPeriodStart={setFormPeriodStart}
              formPeriodEnd={formPeriodEnd}
              setFormPeriodEnd={setFormPeriodEnd}
              useMatrixEntry={useMatrixEntry}
              setUseMatrixEntry={setUseMatrixEntry}
              matrixToggleDisabled={matrixToggleDisabled}
              formPrimaryDisaggregateLabel={formPrimaryDisaggregateLabel}
              matrixValues={matrixValues}
              onMatrixCellChange={handleMatrixCellChange}
              matrixTotal={matrixTotal}
              formMale={formMale}
              setFormMale={setFormMale}
              formFemale={formFemale}
              setFormFemale={setFormFemale}
              computedTotal={computedTotal}
              formDataSource={formDataSource}
              setFormDataSource={setFormDataSource}
              formNotes={formNotes}
              setFormNotes={setFormNotes}
            />
          </div>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search indicators..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={String(project.id)}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={parentOrgFilter}
            onValueChange={(value) => {
              setParentOrgFilter(value);
              setOrgFilter("all");
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Coordinator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Coordinators</SelectItem>
              {parentOrganizations.map((organization) => (
                <SelectItem key={organization.id} value={String(organization.id)}>
                  {organization.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {scopedOrganizations.map((organization) => (
                <SelectItem key={organization.id} value={String(organization.id)}>
                  {organization.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              {periods.map((period) => (
                <SelectItem key={period} value={period}>
                  {period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Entries</CardDescription>
            <CardTitle className="text-2xl">{filteredAggregates.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Male Total</CardDescription>
            <CardTitle className="text-2xl text-chart-2">{totals.male.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Female Total</CardDescription>
            <CardTitle className="text-2xl text-chart-5">{totals.female.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Grand Total</CardDescription>
            <CardTitle className="text-2xl text-primary">{totals.total.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <AggregateMatrixTable
        aggregateGroups={aggregateGroups}
        projectNameById={projectNameById}
        indicatorById={indicatorById}
        onViewChart={() => setIsChartOpen(true)}
      />

      <AggregateChartDialog
        open={isChartOpen}
        onOpenChange={setIsChartOpen}
        data={chartData}
      />
    </div>
  );
}

export default function AggregatesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AggregatesPageContent />
    </Suspense>
  );
}
