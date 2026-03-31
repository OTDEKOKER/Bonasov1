"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { CustomAnalysisState } from "@/components/analysis/custom-analysis-builder";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  dashboardSettingsService,
  type DashboardChartRequest,
  type DashboardSetting,
  type IndicatorChartSetting,
} from "@/lib/api";
import {
  useAllIndicators,
  useAllOrganizations,
  useAllProjects,
  useDashboardMeta,
} from "@/lib/hooks/use-api";
import type { Indicator, Organization, Project } from "@/lib/types";

type AnalysisTemplateMode = "standard" | "custom";
type LegacyChartType = "bar" | "line" | "pie";

type DashboardChartSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboard: DashboardSetting | null;
  existing?: IndicatorChartSetting | null;
  initialCustomAnalysis?: Partial<CustomAnalysisState> | null;
  onSaved: (dashboardId?: number) => Promise<void> | void;
};

type FieldOption = {
  value: string;
  label: string;
};

type SelectOption = {
  value: string;
  label: string;
};

type LegacyIndicatorReference =
  | number
  | string
  | {
      id?: number | string | null;
    };

type DashboardChartSettingDraft = IndicatorChartSetting & {
  template_mode?: AnalysisTemplateMode;
  indicator_ids?: Array<number | string>;
  indicators?: LegacyIndicatorReference[];
  date_from?: string | null;
  date_to?: string | null;
  target?: boolean;
  trendline?: boolean;
  custom_analysis?: Partial<CustomAnalysisState> | Record<string, unknown> | null;
  project_ids?: Array<number | string>;
  organization_ids?: Array<number | string>;
  dashboard_breakdowns?: unknown;
};

type DashboardWithBreakdowns = DashboardSetting & {
  breakdowns?: unknown[];
};

type ExtendedDashboardChartRequest = DashboardChartRequest & {
  template_mode?: AnalysisTemplateMode;
  custom_analysis?: Record<string, unknown>;
  dashboard_breakdowns?: unknown;
  project_ids?: Array<number | string>;
  organization_ids?: Array<number | string>;
  indicator_ids?: number[];
  date_from?: string | null;
  date_to?: string | null;
  target?: boolean;
  trendline?: boolean;
};

const EMPTY_ITEMS: never[] = [];
const DEFAULT_CHART_TYPES: Array<{ value: LegacyChartType; label: string }> = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "pie", label: "Pie" },
];
const DEFAULT_AXES = [
  { value: "quarter", label: "Quarter" },
  { value: "month", label: "Month" },
];

function extractIndicatorReferenceId(indicator: LegacyIndicatorReference): string | number {
  if (typeof indicator === "object" && indicator !== null) {
    return indicator.id ?? "";
  }
  if (typeof indicator === "string" || typeof indicator === "number") {
    return indicator;
  }
  return "";
}

function normalizeNumberArray(values?: Array<string | number> | null): number[] {
  return (values ?? [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function normalizeStringArray(values?: Array<string | number> | null): string[] {
  return (values ?? []).map((value) => String(value)).filter((value) => value.length > 0);
}

function inferExistingMode(
  existing?: IndicatorChartSetting | null,
  initialCustomAnalysis?: Partial<CustomAnalysisState> | null,
): AnalysisTemplateMode {
  if (initialCustomAnalysis) return "custom";
  const explicitMode = (existing as DashboardChartSettingDraft | null | undefined)?.template_mode;
  if (explicitMode === "custom" || explicitMode === "standard") return explicitMode;
  return "standard";
}

function buildExistingCustomState(
  existing?: IndicatorChartSetting | null,
  initialCustomAnalysis?: Partial<CustomAnalysisState> | null,
): Partial<CustomAnalysisState> {
  if (initialCustomAnalysis) {
    return initialCustomAnalysis;
  }

  if (!existing) {
    return {};
  }

  const existingDraft = existing as DashboardChartSettingDraft;

  return {
    indicatorIds: normalizeStringArray(
      existingDraft.indicator_ids ??
        existingDraft.indicators?.map(extractIndicatorReferenceId),
    ),
    dateFrom: existingDraft.date_from ?? "",
    dateTo: existingDraft.date_to ?? "",
  };
}

function buildFieldOptions(
  selectedIndicators: Array<Pick<Indicator, "aggregate_disaggregation_config">>,
): FieldOption[] {
  const seen = new Map<string, string>();

  for (const indicator of selectedIndicators) {
    const dimensions = indicator?.aggregate_disaggregation_config?.dimensions ?? [];
    for (const dimension of dimensions) {
      const key = String(dimension?.key ?? "").trim();
      const label = String(dimension?.label ?? key).trim();
      if (!key || seen.has(key)) continue;
      seen.set(key, label || key);
    }
  }

  return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
}

export function DashboardChartSettingsDialog(
  props: DashboardChartSettingsDialogProps,
) {
  const { open, onOpenChange, dashboard, existing, initialCustomAnalysis, onSaved } = props;
  const { toast } = useToast();
  const existingDraft = existing as DashboardChartSettingDraft | null;
  const dashboardWithBreakdowns = dashboard as DashboardWithBreakdowns | null;

  const { data: indicatorsData } = useAllIndicators();
  const { data: projectsData } = useAllProjects();
  const { data: organizationsData } = useAllOrganizations();
  const { data: dashboardMeta } = useDashboardMeta();
  const dashboardMetaDraft = dashboardMeta as
    | {
        chart_types?: SelectOption[];
        axes?: SelectOption[];
        dashboard_breakdowns?: unknown;
        breakdowns?: unknown;
      }
    | null
    | undefined;

  const indicators: Indicator[] = indicatorsData ?? EMPTY_ITEMS;
  const projects: Project[] = projectsData?.results ?? EMPTY_ITEMS;
  const organizations: Organization[] = organizationsData?.results ?? EMPTY_ITEMS;
  const chartTypes: SelectOption[] = dashboardMetaDraft?.chart_types ?? DEFAULT_CHART_TYPES;
  const axes: SelectOption[] = dashboardMetaDraft?.axes ?? DEFAULT_AXES;
  const dashboardBreakdowns =
    dashboardMetaDraft?.dashboard_breakdowns ??
    dashboardMetaDraft?.breakdowns ??
    dashboardWithBreakdowns?.breakdowns ??
    [];

  const [saving, setSaving] = useState(false);

  const [analysisTemplate, setAnalysisTemplate] = useState<AnalysisTemplateMode>("standard");
  const [name, setName] = useState("");
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<number[]>([]);
  const [chartType, setChartType] = useState<LegacyChartType>("bar");
  const [axis, setAxis] = useState<"quarter" | "month">("quarter");
  const [legend, setLegend] = useState<string | "none">("none");
  const [stack, setStack] = useState<string | "none">("none");
  const [useTarget, setUseTarget] = useState(false);
  const [average, setAverage] = useState(false);
  const [tabular, setTabular] = useState(false);
  const [useTrendLine, setUseTrendLine] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [customJson, setCustomJson] = useState("{}");

  useEffect(() => {
    if (!open) return;

    const mode = inferExistingMode(existing, initialCustomAnalysis);
    const customState = buildExistingCustomState(existing, initialCustomAnalysis);

    setAnalysisTemplate(mode);
    setName(existingDraft?.name ?? "");
    setSelectedIndicatorIds(
      normalizeNumberArray(
        existingDraft?.indicator_ids ??
          existingDraft?.indicators?.map(extractIndicatorReferenceId),
      ),
    );
    setChartType(existingDraft?.chart_type ?? "bar");
    setAxis(existingDraft?.axis ?? "quarter");
    setLegend(existingDraft?.legend ?? "none");
    setStack(existingDraft?.stack ?? "none");
    setUseTarget(Boolean(existingDraft?.target ?? existingDraft?.use_target));
    setAverage(Boolean(existingDraft?.average));
    setTabular(Boolean(existingDraft?.tabular));
    setUseTrendLine(Boolean(existingDraft?.trendline));
    setStart(existingDraft?.date_from ?? existingDraft?.start ?? "");
    setEnd(existingDraft?.date_to ?? existingDraft?.end ?? "");
    setIndicatorSearch("");
    setCustomJson(JSON.stringify(customState, null, 2));
  }, [existing, existingDraft, initialCustomAnalysis, open]);

  const filteredIndicators = useMemo(() => {
    const query = indicatorSearch.trim().toLowerCase();
    if (!query) return indicators;
    return indicators.filter((indicator) =>
      String(indicator?.name ?? "").toLowerCase().includes(query),
    );
  }, [indicatorSearch, indicators]);

  const selectedIndicators = useMemo(
    () =>
      indicators.filter((indicator) =>
        selectedIndicatorIds.includes(Number(indicator?.id)),
      ),
    [indicators, selectedIndicatorIds],
  );

  const fieldOptions = useMemo(
    () => buildFieldOptions(selectedIndicators),
    [selectedIndicators],
  );

  const canAverage =
    selectedIndicatorIds.length === 1 &&
    String(selectedIndicators[0]?.type ?? "").toLowerCase() === "number" &&
    chartType !== "pie";

  const canSetAxis = chartType !== "pie";
  const canUseTargets = chartType !== "pie";
  const legendDisabled = fieldOptions.length === 0;
  const stackDisabled = chartType !== "bar" || fieldOptions.length === 0;

  useEffect(() => {
    const validFields = new Set(fieldOptions.map((field) => field.value));

    if (legend !== "none" && !validFields.has(legend)) {
      setLegend("none");
    }

    if (stack !== "none" && !validFields.has(stack)) {
      setStack("none");
    }

    if (!canAverage && average) {
      setAverage(false);
    }

    if (!canSetAxis && axis !== "quarter") {
      setAxis("quarter");
    }

    if (!canUseTargets && useTarget) {
      setUseTarget(false);
    }

    if (chartType !== "line" && useTrendLine) {
      setUseTrendLine(false);
    }
  }, [
    average,
    axis,
    canAverage,
    canSetAxis,
    canUseTargets,
    chartType,
    fieldOptions,
    legend,
    stack,
    useTarget,
    useTrendLine,
  ]);

  const toggleIndicator = (indicatorId: number) => {
    setSelectedIndicatorIds((current) =>
      current.includes(indicatorId)
        ? current.filter((value) => value !== indicatorId)
        : [...current, indicatorId],
    );
  };

  const persistedIndicatorIds = useMemo(
    () =>
      selectedIndicatorIds.length > 0
        ? selectedIndicatorIds
        : normalizeNumberArray(
            existingDraft?.indicator_ids ??
              existingDraft?.indicators?.map(extractIndicatorReferenceId),
          ),
    [existingDraft?.indicator_ids, existingDraft?.indicators, selectedIndicatorIds],
  );

  const saveDashboardChart = async (payload: ExtendedDashboardChartRequest) => {
    if (!dashboard?.id) return;
    await dashboardSettingsService.saveChart(dashboard.id, {
      ...payload,
      id: existing?.id ?? payload.id,
    } as DashboardChartRequest);
  };

  const handleSave = async () => {
    if (saving || !dashboard?.id) return;

    if (analysisTemplate === "standard" && selectedIndicatorIds.length === 0) {
      toast({
        title: "Indicator required",
        description: "Choose at least one indicator.",
        variant: "destructive",
      });
      return;
    }

    if (
      analysisTemplate === "standard" &&
      chartType === "pie" &&
      selectedIndicatorIds.length === 1 &&
      legend === "none"
    ) {
      toast({
        title: "Legend required",
        description: "Single-indicator pie charts require a legend/disaggregate.",
        variant: "destructive",
      });
      return;
    }

    if (analysisTemplate === "standard" && legend !== "none" && legend === stack) {
      toast({
        title: "Invalid configuration",
        description: "Legend and stacking cannot use the same field.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (analysisTemplate === "custom") {
        let parsedCustomState: Record<string, unknown>;
        try {
          parsedCustomState = JSON.parse(customJson);
        } catch {
          toast({
            title: "Invalid custom JSON",
            description: "Custom analysis JSON is not valid.",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }

        const payload = {
          id: existing?.id,
          name: name.trim() || existingDraft?.name || "Custom analysis",
          indicators: persistedIndicatorIds,
          chart_type: existingDraft?.chart_type ?? "bar",
          axis: existingDraft?.axis ?? null,
          legend: existingDraft?.legend ?? null,
          stack: existingDraft?.stack ?? null,
          use_target: Boolean(existingDraft?.target ?? existingDraft?.use_target),
          average: Boolean(existingDraft?.average),
          tabular: Boolean(existingDraft?.tabular),
          repeat_only: Boolean(existingDraft?.repeat_only),
          repeat_n: existingDraft?.repeat_n ?? null,
          start: existingDraft?.start ?? null,
          end: existingDraft?.end ?? null,
          template_mode: "custom",
          custom_analysis: parsedCustomState,
        } satisfies ExtendedDashboardChartRequest;

        await saveDashboardChart(payload);
      } else {
        const payload = {
          id: existing?.id,
          name: name.trim(),
          indicators: persistedIndicatorIds,
          chart_type: chartType,
          axis: canSetAxis ? axis : null as DashboardChartRequest["axis"],
          legend: legend === "none" ? null : legend as DashboardChartRequest["legend"],
          stack: stack === "none" ? null : stack as DashboardChartRequest["stack"],
          use_target: canUseTargets ? useTarget : false,
          average: canAverage ? average : false,
          tabular,
          trendline: chartType === "line" ? useTrendLine : false,
          date_from: start || null,
          date_to: end || null,
          indicator_ids: selectedIndicatorIds,
          project_ids: projects.map((project) => project.id),
          organization_ids: organizations.map((organization) => organization.id),
          dashboard_breakdowns: dashboardBreakdowns,
          template_mode: "standard",
        } satisfies ExtendedDashboardChartRequest;

        await saveDashboardChart(payload);
      }

      await onSaved(dashboard.id);
      onOpenChange(false);

      toast({
        title: existing?.id ? "Analysis updated" : "Analysis added",
        description:
          analysisTemplate === "custom"
            ? "Custom analysis saved."
            : "Dashboard analysis saved.",
      });
    } catch (error) {
      console.error("Failed to save chart", error);
      toast({
        title: "Save failed",
        description: "Unable to save this analysis.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[60rem]">
        <DialogHeader>
          <DialogTitle>{existing?.id ? "Edit Analysis" : "Add Analysis"}</DialogTitle>
          <DialogDescription>
            Configure a saved analysis for this dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="analysis-name">Analysis name</Label>
            <Input
              id="analysis-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Quarterly HIV prevention coverage"
            />
          </div>

          <Tabs
            value={analysisTemplate}
            onValueChange={(value) => setAnalysisTemplate(value as AnalysisTemplateMode)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="standard">Standard</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="indicator-search">Indicators</Label>
                <Input
                  id="indicator-search"
                  value={indicatorSearch}
                  onChange={(event) => setIndicatorSearch(event.target.value)}
                  placeholder="Search indicators"
                />
                <div className="max-h-56 overflow-auto rounded-xl border p-2">
                  <div className="grid gap-2">
                    {filteredIndicators.map((indicator) => (
                      <label
                        key={indicator.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate">{indicator.name}</span>
                        <input
                          type="checkbox"
                          checked={selectedIndicatorIds.includes(Number(indicator.id))}
                          onChange={() => toggleIndicator(Number(indicator.id))}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Show as</Label>
                  <Select
                    value={chartType}
                    onValueChange={(value) => setChartType(value as LegacyChartType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chart type" />
                    </SelectTrigger>
                    <SelectContent>
                      {chartTypes.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Compare by period</Label>
                  <Select
                    value={axis}
                    onValueChange={(value) => setAxis(value as "quarter" | "month")}
                    disabled={!canSetAxis}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select axis" />
                    </SelectTrigger>
                    <SelectContent>
                      {axes.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Legend disaggregate</Label>
                  <Select
                    value={legend}
                    onValueChange={(value) => setLegend(value)}
                    disabled={legendDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No legend" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {fieldOptions.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Stacking</Label>
                  <Select
                    value={stack}
                    onValueChange={(value) => setStack(value)}
                    disabled={stackDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No stack" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {fieldOptions.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
                  <span>Targets vs achieved</span>
                  <Switch
                    checked={useTarget}
                    onCheckedChange={setUseTarget}
                    disabled={!canUseTargets}
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
                  <span>Use average</span>
                  <Switch
                    checked={average}
                    onCheckedChange={setAverage}
                    disabled={!canAverage}
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
                  <span>Include data table</span>
                  <Switch checked={tabular} onCheckedChange={setTabular} />
                </label>

                <label className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
                  <span>Trend line</span>
                  <Switch
                    checked={useTrendLine}
                    onCheckedChange={setUseTrendLine}
                    disabled={chartType !== "line"}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Start date</Label>
                  <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>End date</Label>
                  <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="custom-analysis-json">Custom analysis JSON</Label>
                <Textarea
                  id="custom-analysis-json"
                  value={customJson}
                  onChange={(event) => setCustomJson(event.target.value)}
                  className="min-h-[22rem] font-mono text-xs"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !dashboard?.id}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
