"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Save, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrganizationSelect } from "@/components/shared/organization-select";
import { Switch } from "@/components/ui/switch";
import {
  useAllIndicators,
  useAllOrganizations,
  useDashboardCharts,
  useIndicatorTrendsBulk,
  useAllProjects,
} from "@/lib/hooks/use-api";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { dashboardChartsService } from "@/lib/api";

export default function DashboardsPage() {
  const { data: indicatorsData } = useAllIndicators();
  const { data: organizationsData } = useAllOrganizations();
  const { data: projectsData } = useAllProjects();
  const indicators = indicatorsData || [];
  const organizations = organizationsData?.results || [];
  const projects = projectsData?.results || [];
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<number[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("all");
  const [dateMode, setDateMode] = useState<"quarter" | "dates">("quarter");
  const now = new Date();
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;
  const [quarter, setQuarter] = useState(currentQuarter);
  const [year, setYear] = useState(now.getFullYear().toString());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [chartType, setChartType] = useState<"line" | "bar" | "area" | "pie">("line");
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const { data: savedChartsData, mutate: mutateSavedCharts } = useDashboardCharts();
  const savedCharts = savedChartsData?.results || [];
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveShared, setSaveShared] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedIndicatorIds.length === 0 && indicators.length > 0) {
      setSelectedIndicatorIds([indicators[0].id]);
    }
  }, [indicators, selectedIndicatorIds.length]);

  const { data: trendsBulk, isLoading, error } = useIndicatorTrendsBulk(selectedIndicatorIds, {
    months: 12,
    organizationId: organizationId !== "all" ? Number(organizationId) : null,
    projectId: projectId !== "all" ? Number(projectId) : null,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  useEffect(() => {
    if (dateMode !== "quarter") return;
    const yearNum = Number(year);
    if (Number.isNaN(yearNum)) return;
    const ranges: Record<string, { start: string; end: string }> = {
      Q1: { start: `${year}-01-01`, end: `${year}-03-31` },
      Q2: { start: `${year}-04-01`, end: `${year}-06-30` },
      Q3: { start: `${year}-07-01`, end: `${year}-09-30` },
      Q4: { start: `${year}-10-01`, end: `${year}-12-31` },
    };
    const range = ranges[quarter] || ranges.Q1;
    setDateFrom(range.start);
    setDateTo(range.end);
  }, [dateMode, quarter, year]);

  const chartSeries = trendsBulk?.series || [];

  const chartData = useMemo(() => {
    if (chartSeries.length === 0) return [];
    const months = chartSeries[0]?.data?.map((item) => item.month) || [];
    return months.map((month, index) => {
      const row: Record<string, string | number> = { period: month };
      chartSeries.forEach((series) => {
        const key = `indicator_${series.indicator_id}`;
        row[key] = series.data[index]?.value ?? 0;
      });
      return row;
    });
  }, [chartSeries]);

  const downloadChartSvg = () => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName =
      selectedIndicatorsLabel.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60) || "chart";
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
            return `"${text.replace(/\"/g, '""')}"`;
          })
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName =
      selectedIndicatorsLabel.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60) || "chart";
    link.href = url;
    link.download = `${safeName}-${chartType}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const chartConfig = useMemo(() => {
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
    return chartSeries.reduce<Record<string, { label: string; color: string }>>((acc, series, idx) => {
      acc[`indicator_${series.indicator_id}`] = {
        label: series.indicator_name,
        color: palette[idx % palette.length],
      };
      return acc;
    }, {});
  }, [chartSeries]);

  const pieData = useMemo(() => {
    return chartSeries.map((series) => ({
      name: series.indicator_name,
      value: series.data.reduce((sum, item) => sum + (item.value || 0), 0),
      key: `indicator_${series.indicator_id}`,
    }));
  }, [chartSeries]);

  const filteredIndicators = useMemo(() => {
    const term = indicatorSearch.trim().toLowerCase();
    if (!term) return indicators;
    return indicators.filter((indicator) => indicator.name.toLowerCase().includes(term));
  }, [indicators, indicatorSearch]);

  const selectedIndicatorsLabel = useMemo(() => {
    if (selectedIndicatorIds.length === 0) return "Select indicators";
    if (selectedIndicatorIds.length === indicators.length) return "All indicators";
    if (selectedIndicatorIds.length === 1) {
      const match = indicators.find((indicator) => indicator.id === selectedIndicatorIds[0]);
      return match ? match.name : "Selected indicators";
    }
    return `${selectedIndicatorIds.length} indicators selected`;
  }, [indicators, selectedIndicatorIds]);

  const toggleIndicator = (indicatorIdValue: number) => {
    setSelectedIndicatorIds((prev) => {
      if (prev.includes(indicatorIdValue)) {
        return prev.filter((id) => id !== indicatorIdValue);
      }
      return [...prev, indicatorIdValue];
    });
  };

  const toggleAllIndicators = () => {
    if (selectedIndicatorIds.length === indicators.length) {
      setSelectedIndicatorIds([]);
      return;
    }
    setSelectedIndicatorIds(indicators.map((indicator) => indicator.id));
  };

  const handleSaveChart = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      await dashboardChartsService.create({
        name: saveName.trim(),
        description: `Saved dashboard chart for ${selectedIndicatorsLabel}`,
        organization: organizationId !== "all" ? Number(organizationId) : null,
        is_public: saveShared,
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
      await mutateSavedCharts();
      setSaveDialogOpen(false);
      setSaveName("");
      setSaveShared(false);
    } finally {
      setSaving(false);
    }
  };

  const loadChart = (chart: typeof savedCharts[number]) => {
    const params = (chart.parameters || {}) as Record<string, any>;
    const indicatorIds = Array.isArray(params.indicator_ids) ? params.indicator_ids : [];
    setSelectedIndicatorIds(indicatorIds.length ? indicatorIds : selectedIndicatorIds);
    setOrganizationId(params.organization_id ? String(params.organization_id) : "all");
    setProjectId(params.project_id ? String(params.project_id) : "all");
    setDateMode(params.date_mode === "dates" ? "dates" : "quarter");
    if (params.quarter) setQuarter(params.quarter);
    if (params.year) setYear(String(params.year));
    if (params.date_from) setDateFrom(params.date_from);
    if (params.date_to) setDateTo(params.date_to);
    if (params.chart_type) setChartType(params.chart_type);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboards"
        description="Indicator trends across recent periods"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Analysis", href: "/analysis" },
          { label: "Dashboards" },
        ]}
      />

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
                  <CommandItem
                    onSelect={toggleAllIndicators}
                    className="flex items-center justify-between"
                  >
                    <span>All indicators</span>
                    <Checkbox checked={selectedIndicatorIds.length === indicators.length && indicators.length > 0} />
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

        <div className="flex items-end gap-2">
          <Select value={chartType} onValueChange={(value) => setChartType(value as typeof chartType)}>
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
          <Select value={dateMode} onValueChange={(value) => setDateMode(value as "quarter" | "dates")}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Date mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="dates">Dates</SelectItem>
            </SelectContent>
          </Select>

          {dateMode === "quarter" ? (
            <>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Quarter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                </SelectContent>
              </Select>

              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 4 }).map((_, idx) => {
                    const y = (new Date().getFullYear() - idx).toString();
                    return (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    );
                  })}
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={downloadChartSvg}
            disabled={!chartData.length && !pieData.length}
          >
            <Download className="h-4 w-4" />
            Download SVG
          </Button>
          <Button
            variant="outline"
            onClick={downloadChartCsv}
            disabled={!chartData.length && !pieData.length}
          >
            Download CSV
          </Button>
          <Button onClick={() => setSaveDialogOpen(true)} disabled={selectedIndicatorIds.length === 0}>
            <Save className="h-4 w-4" />
            Save chart
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trend (Last 12 Months)</CardTitle>
          <CardDescription>Value vs target</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {!isLoading && error && (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              Unable to load trends.
            </div>
          )}
          {!isLoading && !error && chartData.length === 0 && (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No trend data available.
            </div>
          )}
          {!isLoading && !error && chartData.length > 0 && chartType !== "pie" && (
            <div ref={chartRef}>
              <ChartContainer config={chartConfig} className="h-[360px]">
              {chartType === "line" && (
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
              )}
              {chartType === "area" && (
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
              )}
              {chartType === "bar" && (
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
              )}
              </ChartContainer>
            </div>
          )}
          {!isLoading && !error && chartType === "pie" && pieData.length > 0 && (
            <div ref={chartRef}>
              <ChartContainer config={chartConfig} className="h-[360px]">
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
                    <Cell key={entry.key} fill={`var(--color-${entry.key})`} stroke="hsl(var(--background))" />
                  ))}
                </Pie>
              </PieChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Totals</CardTitle>
          <CardDescription>Bar view of values</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>Saved Charts</CardTitle>
          <CardDescription>Load or share saved indicator charts</CardDescription>
        </CardHeader>
        <CardContent>
          {savedCharts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No saved charts yet.</div>
          ) : (
            <div className="space-y-2">
              {savedCharts.map((chart) => (
                <div
                  key={chart.id}
                  className="flex flex-col gap-3 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{chart.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {chart.created_by_name ? `By ${chart.created_by_name}` : "Saved chart"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span>Shared</span>
                      <Switch
                        checked={chart.is_public}
                        onCheckedChange={async (value) => {
                          await dashboardChartsService.update(chart.id, { is_public: value });
                          await mutateSavedCharts();
                        }}
                      />
                    </div>
                    <Button variant="outline" onClick={() => loadChart(chart)}>
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await dashboardChartsService.delete(chart.id);
                        await mutateSavedCharts();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Save Chart</DialogTitle>
            <DialogDescription>Save this chart configuration for reuse.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Chart name</label>
              <Input value={saveName} onChange={(event) => setSaveName(event.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <div className="text-sm font-medium">Share with others</div>
                <div className="text-xs text-muted-foreground">Allow all users to load this chart.</div>
              </div>
              <Switch checked={saveShared} onCheckedChange={setSaveShared} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveChart} disabled={saving || !saveName.trim()}>
                {saving ? "Saving..." : "Save chart"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



