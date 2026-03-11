"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { OrganizationSelect } from "@/components/shared/organization-select";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { dashboardChartsService } from "@/lib/api";
import {
  useAllIndicators,
  useAllOrganizations,
  useAllProjects,
  useDashboardCharts,
  useIndicatorTrendsBulk,
} from "@/lib/hooks/use-api";

type TrendSeries = {
  indicator_id: number;
  indicator_name: string;
  data: Array<{ month: string; value: number; target: number }>;
};

type DashboardChartType = "line" | "bar" | "area" | "pie";
type DateMode = "quarter" | "dates";

const getCurrentFiscalSelection = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month >= 4 && month <= 6) return { quarter: "Q1", fiscalYearStart: year };
  if (month >= 7 && month <= 9) return { quarter: "Q2", fiscalYearStart: year };
  if (month >= 10 && month <= 12) return { quarter: "Q3", fiscalYearStart: year };
  return { quarter: "Q4", fiscalYearStart: year - 1 };
};

const getFiscalQuarterRange = (fiscalYearStart: number, quarter: string) => {
  const nextYear = fiscalYearStart + 1;

  switch (quarter) {
    case "Q1":
      return { start: `${fiscalYearStart}-04-01`, end: `${fiscalYearStart}-06-30` };
    case "Q2":
      return { start: `${fiscalYearStart}-07-01`, end: `${fiscalYearStart}-09-30` };
    case "Q3":
      return { start: `${fiscalYearStart}-10-01`, end: `${fiscalYearStart}-12-31` };
    case "Q4":
    default:
      return { start: `${nextYear}-01-01`, end: `${nextYear}-03-31` };
  }
};

const formatFiscalYearLabel = (fiscalYearStart: string) => {
  const start = Number(fiscalYearStart);
  if (Number.isNaN(start)) return fiscalYearStart;
  return `FY ${start}/${String(start + 1).slice(-2)}`;
};

const toNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
};

const palette = [
  "#1CE783",
  "#0EA5E9",
  "#F97316",
  "#A855F7",
  "#14B8A6",
  "#EF4444",
  "#84CC16",
  "#FACC15",
];

export function DashboardWorkspace() {
  const initialFiscal = useMemo(() => getCurrentFiscalSelection(), []);
  const { toast } = useToast();
  const chartRef = useRef<HTMLDivElement | null>(null);

  const { data: indicatorsData } = useAllIndicators();
  const { data: organizationsData } = useAllOrganizations();
  const { data: projectsData } = useAllProjects();
  const { data: savedChartsData, mutate: mutateSavedCharts } = useDashboardCharts();

  const indicators = useMemo(() => indicatorsData ?? [], [indicatorsData]);
  const organizations = organizationsData?.results || [];
  const projects = projectsData?.results || [];
  const savedCharts = savedChartsData?.results || [];

  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [dashboardName, setDashboardName] = useState("");
  const [dashboardShared, setDashboardShared] = useState(false);
  const [activeDashboardId, setActiveDashboardId] = useState<number | null>(null);
  const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<number[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("all");
  const [dateMode, setDateMode] = useState<DateMode>("quarter");
  const [quarter, setQuarter] = useState(initialFiscal.quarter);
  const [year, setYear] = useState(String(initialFiscal.fiscalYearStart));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [chartType, setChartType] = useState<DashboardChartType>("line");
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasInitializedIndicators, setHasInitializedIndicators] = useState(false);

  const selectedDashboard = useMemo(
    () => savedCharts.find((chart) => chart.id === activeDashboardId) ?? null,
    [activeDashboardId, savedCharts],
  );

  useEffect(() => {
    if (savedCharts.length === 0) {
      setCreating(true);
    }
  }, [savedCharts.length]);

  useEffect(() => {
    if (hasInitializedIndicators) return;
    if (indicators.length === 0) return;

    setSelectedIndicatorIds([indicators[0].id]);
    setHasInitializedIndicators(true);
  }, [hasInitializedIndicators, indicators]);

  useEffect(() => {
    if (dateMode !== "quarter") return;
    const fiscalYearStart = Number(year);
    if (Number.isNaN(fiscalYearStart)) return;

    const range = getFiscalQuarterRange(fiscalYearStart, quarter);
    setDateFrom(range.start);
    setDateTo(range.end);
  }, [dateMode, quarter, year]);

  const resetWorkspace = () => {
    const range = getFiscalQuarterRange(initialFiscal.fiscalYearStart, initialFiscal.quarter);

    setCreating(true);
    setActiveDashboardId(null);
    setDashboardName("");
    setDashboardShared(false);
    setDashboardSearch("");
    setIndicatorSearch("");
    setOrganizationId("all");
    setProjectId("all");
    setDateMode("quarter");
    setQuarter(initialFiscal.quarter);
    setYear(String(initialFiscal.fiscalYearStart));
    setDateFrom(range.start);
    setDateTo(range.end);
    setChartType("line");
    setActivePieIndex(null);
    setSelectedIndicatorIds(indicators[0] ? [indicators[0].id] : []);
  };

  const applyChartParameters = (params: Record<string, unknown>) => {
    const indicatorIds = toNumberArray(params.indicator_ids);

    setSelectedIndicatorIds(indicatorIds);
    setOrganizationId(
      params.organization_id !== null && params.organization_id !== undefined
        ? String(params.organization_id)
        : "all",
    );
    setProjectId(
      params.project_id !== null && params.project_id !== undefined
        ? String(params.project_id)
        : "all",
    );
    setDateMode(params.date_mode === "dates" ? "dates" : "quarter");

    if (typeof params.quarter === "string") setQuarter(params.quarter);
    if (params.year !== null && params.year !== undefined) setYear(String(params.year));
    if (typeof params.date_from === "string") setDateFrom(params.date_from);
    if (typeof params.date_to === "string") setDateTo(params.date_to);

    if (
      params.chart_type === "line" ||
      params.chart_type === "bar" ||
      params.chart_type === "area" ||
      params.chart_type === "pie"
    ) {
      setChartType(params.chart_type);
    }
  };

  useEffect(() => {
    if (!selectedDashboard) return;

    setDashboardName(selectedDashboard.name);
    setDashboardShared(Boolean(selectedDashboard.is_public));
    applyChartParameters((selectedDashboard.parameters || {}) as Record<string, unknown>);
    setCreating(false);
  }, [selectedDashboard]);

  const startNewDashboard = () => {
    resetWorkspace();
  };

  const visibleDashboards = useMemo(() => {
    const query = dashboardSearch.trim().toLowerCase();
    if (!query) return savedCharts;

    return savedCharts.filter((chart) => {
      const haystack = `${chart.name} ${chart.description || ""} ${chart.created_by_name || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [dashboardSearch, savedCharts]);

  const filteredIndicators = useMemo(() => {
    const term = indicatorSearch.trim().toLowerCase();
    if (!term) return indicators;
    return indicators.filter((indicator) => indicator.name.toLowerCase().includes(term));
  }, [indicatorSearch, indicators]);

  const selectedIndicatorsLabel = useMemo(() => {
    if (selectedIndicatorIds.length === 0) return "Select indicators";
    if (selectedIndicatorIds.length === indicators.length && indicators.length > 0) return "All indicators";
    if (selectedIndicatorIds.length === 1) {
      const match = indicators.find((indicator) => indicator.id === selectedIndicatorIds[0]);
      return match ? match.name : "Selected indicators";
    }
    return `${selectedIndicatorIds.length} indicators selected`;
  }, [indicators, selectedIndicatorIds]);

  const previewTitle = dashboardName.trim() || `Tracking ${selectedIndicatorsLabel}`;

  const { data: trendsBulk, isLoading, error } = useIndicatorTrendsBulk(selectedIndicatorIds, {
    months: 12,
    organizationId: organizationId !== "all" ? Number(organizationId) : null,
    projectId: projectId !== "all" ? Number(projectId) : null,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const chartSeries = useMemo<TrendSeries[]>(
    () => (trendsBulk?.series ?? []) as TrendSeries[],
    [trendsBulk?.series],
  );

  const chartData = useMemo(() => {
    if (chartSeries.length === 0) return [];

    const allPeriods = Array.from(
      new Set(chartSeries.flatMap((series) => series.data.map((item) => item.month))),
    );

    return allPeriods.map((month) => {
      const row: Record<string, string | number> = { period: month };

      chartSeries.forEach((series) => {
        const point = series.data.find((item) => item.month === month);
        row[`indicator_${series.indicator_id}`] = point?.value ?? 0;
      });

      return row;
    });
  }, [chartSeries]);

  const pieData = useMemo(() => {
    return chartSeries.map((series) => ({
      name: series.indicator_name,
      value: series.data.reduce((sum, item) => sum + (item.value || 0), 0),
      key: `indicator_${series.indicator_id}`,
    }));
  }, [chartSeries]);

  const chartConfig = useMemo<ChartConfig>(() => {
    return chartSeries.reduce<Record<string, { label: string; color: string }>>((acc, series, index) => {
      acc[`indicator_${series.indicator_id}`] = {
        label: series.indicator_name,
        color: palette[index % palette.length],
      };
      return acc;
    }, {});
  }, [chartSeries]);

  const toggleIndicator = (indicatorIdValue: number) => {
    setSelectedIndicatorIds((previous) => {
      if (previous.includes(indicatorIdValue)) {
        return previous.filter((id) => id !== indicatorIdValue);
      }
      return [...previous, indicatorIdValue];
    });
  };

  const toggleAllIndicators = () => {
    if (selectedIndicatorIds.length === indicators.length) {
      setSelectedIndicatorIds([]);
      return;
    }
    setSelectedIndicatorIds(indicators.map((indicator) => indicator.id));
  };

  const buildPayload = () => ({
    name: dashboardName.trim(),
    description: `Saved dashboard for ${selectedIndicatorsLabel}`,
    organization: organizationId !== "all" ? Number(organizationId) : null,
    is_public: dashboardShared,
    parameters: {
      indicator_ids: selectedIndicatorIds,
      organization_id: organizationId !== "all" ? Number(organizationId) : null,
      project_id: projectId !== "all" ? Number(projectId) : null,
      date_mode: dateMode,
      quarter,
      year,
      date_from: dateFrom || null,
      date_to: dateTo || null,
      chart_type: chartType,
    },
  });

  const handleSaveDashboard = async () => {
    if (!dashboardName.trim()) {
      toast({
        title: "Dashboard name required",
        description: "Add a dashboard name before saving.",
        variant: "destructive",
      });
      return;
    }

    if (selectedIndicatorIds.length === 0) {
      toast({
        title: "Select at least one indicator",
        description: "Dashboards need indicator data to display.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const saved = activeDashboardId
        ? await dashboardChartsService.update(activeDashboardId, payload)
        : await dashboardChartsService.create(payload);

      await mutateSavedCharts();
      setActiveDashboardId(saved.id);
      setDashboardName(saved.name);
      setDashboardShared(Boolean(saved.is_public));
      setCreating(false);

      toast({
        title: activeDashboardId ? "Dashboard updated" : "Dashboard saved",
        description: saved.name,
      });
    } catch (saveError) {
      console.error("Failed to save dashboard", saveError);
      toast({
        title: "Save failed",
        description: "Unable to save this dashboard.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDashboard = async () => {
    if (!activeDashboardId) return;

    setDeleting(true);
    try {
      await dashboardChartsService.delete(activeDashboardId);
      await mutateSavedCharts();
      resetWorkspace();

      toast({
        title: "Dashboard deleted",
        description: "The saved dashboard has been removed.",
      });
    } catch (deleteError) {
      console.error("Failed to delete dashboard", deleteError);
      toast({
        title: "Delete failed",
        description: "Unable to delete this dashboard.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const downloadChartSvg = () => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return;

    if (!svg.getAttribute("xmlns")) {
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    const safeName = previewTitle.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60) || "dashboard";
    link.href = url;
    link.download = `${safeName}-${chartType}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadChartCsv = () => {
    const rows = chartType === "pie" ? pieData : chartData;
    if (!rows.length) return;

    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((key) => {
            const value = (row as Record<string, unknown>)[key];
            const text = value === null || value === undefined ? "" : String(value);
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    const safeName = previewTitle.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60) || "dashboard";
    link.href = url;
    link.download = `${safeName}-${chartType}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const fiscalYears = Array.from({ length: 4 }, (_, index) => String(initialFiscal.fiscalYearStart - index));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Create, load, and review saved dashboards like the legacy analytics workspace"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Analysis" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSidebarHidden((value) => !value)}>
              {sidebarHidden ? <ChevronRight className="mr-2 h-4 w-4" /> : <ChevronLeft className="mr-2 h-4 w-4" />}
              {sidebarHidden ? "Show Dashboards" : "Hide Dashboards"}
            </Button>
            <Button onClick={startNewDashboard}>
              <Plus className="mr-2 h-4 w-4" />
              New Dashboard
            </Button>
          </div>
        }
      />

      <div className={`grid gap-6 ${sidebarHidden ? "xl:grid-cols-1" : "xl:grid-cols-[320px_minmax(0,1fr)]"}`}>
        {!sidebarHidden && (
          <Card className="h-fit">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Your Dashboards</CardTitle>
                  <CardDescription>Saved analysis views</CardDescription>
                </div>
                <Badge variant="outline">{savedCharts.length}</Badge>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={dashboardSearch}
                  onChange={(event) => setDashboardSearch(event.target.value)}
                  placeholder="Search dashboards..."
                  className="pl-9"
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-2">
              {visibleDashboards.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No dashboards found.
                </div>
              ) : (
                visibleDashboards.map((chart) => {
                  const active = chart.id === activeDashboardId;

                  return (
                    <button
                      key={chart.id}
                      type="button"
                      onClick={() => setActiveDashboardId(chart.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{chart.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {chart.created_by_name ? `By ${chart.created_by_name}` : "Saved dashboard"}
                          </div>
                        </div>
                        {chart.is_public ? <Badge variant="secondary">Shared</Badge> : null}
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-6 min-w-0">
          {!creating && !selectedDashboard && savedCharts.length > 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                <div className="text-lg font-semibold">Select or create a dashboard to begin.</div>
                <p className="max-w-xl text-sm text-muted-foreground">
                  This matches the old analytics flow: use the sidebar to open a saved dashboard, or start a new one.
                </p>
                <Button onClick={startNewDashboard}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{creating ? "New Dashboard" : dashboardName || "Dashboard"}</CardTitle>
                  <CardDescription>
                    {creating
                      ? "Configure indicators, filters, and save this dashboard."
                      : "Update the selected dashboard and save your changes."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Dashboard name</label>
                      <Input
                        value={dashboardName}
                        onChange={(event) => setDashboardName(event.target.value)}
                        placeholder="New Dashboard"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                      <div>
                        <div className="text-sm font-medium">Shared dashboard</div>
                        <div className="text-xs text-muted-foreground">Available to other users</div>
                      </div>
                      <Switch checked={dashboardShared} onCheckedChange={setDashboardShared} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSaveDashboard} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : activeDashboardId ? "Update Dashboard" : "Save Dashboard"}
                    </Button>

                    <Button variant="outline" onClick={downloadChartSvg} disabled={!chartData.length && !pieData.length}>
                      <Download className="mr-2 h-4 w-4" />
                      Download SVG
                    </Button>

                    <Button variant="outline" onClick={downloadChartCsv} disabled={!chartData.length && !pieData.length}>
                      <Download className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>

                    {activeDashboardId ? (
                      <Button variant="ghost" onClick={handleDeleteDashboard} disabled={deleting}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deleting ? "Deleting..." : "Delete Dashboard"}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dashboard Filters</CardTitle>
                  <CardDescription>Pick indicators, scope, and fiscal quarter filters</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between sm:w-[320px]">
                          <span className="truncate">{selectedIndicatorsLabel}</span>
                          <span className="text-xs text-muted-foreground">{selectedIndicatorIds.length}</span>
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent align="start" className="w-[calc(100vw-2rem)] p-0 sm:w-[320px]">
                        <Command>
                          <CommandInput
                            placeholder="Search indicators..."
                            value={indicatorSearch}
                            onValueChange={setIndicatorSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No indicators found.</CommandEmpty>
                            <CommandGroup heading="Indicators">
                              <CommandItem onSelect={toggleAllIndicators} className="flex items-center justify-between">
                                <span>All indicators</span>
                                <Checkbox
                                  checked={selectedIndicatorIds.length === indicators.length && indicators.length > 0}
                                />
                              </CommandItem>

                              {filteredIndicators.map((indicator) => (
                                <CommandItem
                                  key={indicator.id}
                                  onSelect={() => toggleIndicator(indicator.id)}
                                  className="flex items-center justify-between"
                                >
                                  <span className="truncate">{indicator.name}</span>
                                  <Checkbox checked={selectedIndicatorIds.includes(indicator.id)} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    <OrganizationSelect
                      organizations={organizations}
                      value={organizationId}
                      onChange={setOrganizationId}
                      includeAll
                      allLabel="All organizations"
                      placeholder="Organization"
                      className="w-full sm:w-[240px]"
                    />

                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder="All projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All projects</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={String(project.id)}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={chartType} onValueChange={(value) => setChartType(value as DashboardChartType)}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Chart type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">Line</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="area">Area</SelectItem>
                        <SelectItem value="pie">Pie</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={dateMode} onValueChange={(value) => setDateMode(value as DateMode)}>
                      <SelectTrigger className="w-full sm:w-[170px]">
                        <SelectValue placeholder="Date mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quarter">Fiscal quarter</SelectItem>
                        <SelectItem value="dates">Custom dates</SelectItem>
                      </SelectContent>
                    </Select>

                    {dateMode === "quarter" ? (
                      <>
                        <Select value={quarter} onValueChange={setQuarter}>
                          <SelectTrigger className="w-full sm:w-[140px]">
                            <SelectValue placeholder="Quarter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Q1">Q1 · Apr-Jun</SelectItem>
                            <SelectItem value="Q2">Q2 · Jul-Sep</SelectItem>
                            <SelectItem value="Q3">Q3 · Oct-Dec</SelectItem>
                            <SelectItem value="Q4">Q4 · Jan-Mar</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={year} onValueChange={setYear}>
                          <SelectTrigger className="w-full sm:w-[140px]">
                            <SelectValue placeholder="Fiscal year" />
                          </SelectTrigger>
                          <SelectContent>
                            {fiscalYears.map((fiscalYear) => (
                              <SelectItem key={fiscalYear} value={fiscalYear}>
                                {formatFiscalYearLabel(fiscalYear)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">From</span>
                          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">To</span>
                          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                        </div>
                      </>
                    )}
                  </div>

                  {dateMode === "quarter" ? (
                    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                      {quarter} covers {dateFrom} to {dateTo}. Q1 starts on April 1 and Q4 ends the following March.
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{previewTitle}</CardTitle>
                  <CardDescription>Trend view for the selected dashboard</CardDescription>
                </CardHeader>

                <CardContent>
                  {isLoading ? (
                    <div className="flex h-[320px] items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : null}

                  {!isLoading && error ? (
                    <div className="flex h-[320px] items-center justify-center text-muted-foreground">
                      Unable to load trends.
                    </div>
                  ) : null}

                  {!isLoading && !error && chartData.length === 0 && pieData.length === 0 ? (
                    <div className="flex h-[320px] items-center justify-center text-muted-foreground">
                      No charts yet. Add filters and save the dashboard.
                    </div>
                  ) : null}

                  {!isLoading && !error && chartData.length > 0 && chartType !== "pie" ? (
                    <div ref={chartRef} className="min-w-0">
                      <ChartContainer config={chartConfig} className="h-[360px] w-full">
                        {chartType === "line" ? (
                          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="period" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} />
                            <ChartTooltip
                              cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                              content={<ChartTooltipContent indicator="dot" />}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                            {chartSeries.map((series) => (
                              <Line
                                key={series.indicator_id}
                                type="monotone"
                                dataKey={`indicator_${series.indicator_id}`}
                                stroke={`var(--color-indicator_${series.indicator_id})`}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                dot={{ r: 2 }}
                                activeDot={{ r: 5 }}
                              />
                            ))}
                          </LineChart>
                        ) : null}

                        {chartType === "area" ? (
                          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="period" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} />
                            <ChartTooltip
                              cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                              content={<ChartTooltipContent indicator="dot" />}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                            {chartSeries.map((series) => (
                              <Area
                                key={series.indicator_id}
                                type="monotone"
                                dataKey={`indicator_${series.indicator_id}`}
                                stroke={`var(--color-indicator_${series.indicator_id})`}
                                fill={`var(--color-indicator_${series.indicator_id})`}
                                fillOpacity={0.25}
                                strokeWidth={2}
                                activeDot={{ r: 4 }}
                              />
                            ))}
                          </AreaChart>
                        ) : null}

                        {chartType === "bar" ? (
                          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="period" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} />
                            <ChartTooltip
                              cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                              content={<ChartTooltipContent indicator="dot" />}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                            {chartSeries.map((series) => (
                              <Bar
                                key={series.indicator_id}
                                dataKey={`indicator_${series.indicator_id}`}
                                fill={`var(--color-indicator_${series.indicator_id})`}
                                fillOpacity={0.85}
                                stroke="rgba(16, 24, 40, 0.2)"
                                strokeWidth={1}
                                barSize={24}
                                radius={[4, 4, 0, 0]}
                              />
                            ))}
                          </BarChart>
                        ) : null}
                      </ChartContainer>
                    </div>
                  ) : null}

                  {!isLoading && !error && chartType === "pie" && pieData.length > 0 ? (
                    <div ref={chartRef} className="min-w-0">
                      <ChartContainer config={chartConfig} className="h-[360px] w-full">
                        <PieChart>
                          <ChartTooltip
                            cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                            content={<ChartTooltipContent indicator="dot" />}
                          />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={110}
                            paddingAngle={2}
                            activeIndex={activePieIndex ?? undefined}
                            onMouseEnter={(_, index) => setActivePieIndex(index)}
                            onMouseLeave={() => setActivePieIndex(null)}
                          >
                            {pieData.map((entry) => (
                              <Cell
                                key={entry.key}
                                fill={`var(--color-${entry.key})`}
                                stroke="hsl(var(--background))"
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Totals</CardTitle>
                  <CardDescription>Secondary comparison view for the same dashboard filters</CardDescription>
                </CardHeader>
                <CardContent>
                  {!isLoading && !error && chartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[320px]">
                      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="period" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip
                          cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                          content={<ChartTooltipContent indicator="dot" />}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        {chartSeries.map((series) => (
                          <Bar
                            key={series.indicator_id}
                            dataKey={`indicator_${series.indicator_id}`}
                            fill={`var(--color-indicator_${series.indicator_id})`}
                            fillOpacity={0.85}
                            stroke="rgba(16, 24, 40, 0.2)"
                            strokeWidth={1}
                            barSize={24}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      No data available.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}