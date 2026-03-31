"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { DashboardAnalyticsSurface } from "@/components/analysis/dashboard-analytics-surface";
import { DashboardChartCard } from "@/components/analysis/dashboard-chart-card";
import { DashboardChartSettingsDialog } from "@/components/analysis/dashboard-chart-settings-dialog";
import type { CustomAnalysisState } from "@/components/analysis/custom-analysis-builder";
import { DashboardSettingsDialog } from "@/components/analysis/dashboard-settings-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AnalyticsFiltersProvider,
  defaultAnalyticsFilters,
  type AnalyticsFilterState,
} from "@/hooks/use-analytics-filters";
import {
  dashboardSettingsService,
  type DashboardSetting,
  type IndicatorChartSetting,
} from "@/lib/api";
import { useDashboardSetting, useDashboardSettings } from "@/lib/hooks/use-api";

const EMPTY_DASHBOARDS: DashboardSetting[] = [];

function buildInitialAnalyticsState(
  dashboard: DashboardSetting | null,
): Partial<AnalyticsFilterState> {
  if (!dashboard) {
    return defaultAnalyticsFilters;
  }

  const dashboardOrgId = dashboard.organization ? String(dashboard.organization) : "";

  return {
    ...defaultAnalyticsFilters,
    projectId: dashboard.project ? String(dashboard.project) : "all",
    scopeMode: dashboardOrgId
      ? dashboard.cascade_organization
        ? "parent_org"
        : "selected_orgs"
      : "all_orgs",
    parentOrgId: dashboard.cascade_organization ? dashboardOrgId : "",
    selectedOrgIds:
      dashboard.cascade_organization || !dashboardOrgId ? [] : [dashboardOrgId],
    cascadeOrganization: Boolean(dashboard.cascade_organization),
  };
}

export function DashboardWorkspace() {
  const { toast } = useToast();

  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [page, setPage] = useState(1);

  const [activeDashboardId, setActiveDashboardId] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<IndicatorChartSetting | null>(null);
  const [chartDraft, setChartDraft] = useState<Partial<CustomAnalysisState> | null>(null);

  const [deletingDashboard, setDeletingDashboard] = useState(false);
  const [deletingChartId, setDeletingChartId] = useState<number | null>(null);

  const {
    data: dashboardSettingsData,
    mutate: mutateDashboardSettings,
    isLoading: dashboardsLoading,
  } = useDashboardSettings({
    search: dashboardSearch || undefined,
    page,
  });

  const dashboards = dashboardSettingsData?.results ?? EMPTY_DASHBOARDS;
  const totalCount = dashboardSettingsData?.count ?? 0;
  const hasNextPage = Boolean(dashboardSettingsData?.next);
  const hasPrevPage = Boolean(dashboardSettingsData?.previous);

  const {
    data: selectedDashboardDetail,
    mutate: mutateSelectedDashboard,
    isLoading: detailLoading,
  } = useDashboardSetting(activeDashboardId);

  useEffect(() => {
    if (dashboards.length === 0) {
      setActiveDashboardId(null);
      return;
    }

    if (
      activeDashboardId === null ||
      !dashboards.some((dashboard) => dashboard.id === activeDashboardId)
    ) {
      setActiveDashboardId(dashboards[0].id);
    }
  }, [activeDashboardId, dashboards]);

  const currentDashboard = useMemo<DashboardSetting | null>(() => {
    if (selectedDashboardDetail?.id) {
      return selectedDashboardDetail;
    }
    return dashboards.find((dashboard) => dashboard.id === activeDashboardId) ?? null;
  }, [activeDashboardId, dashboards, selectedDashboardDetail]);

  const analyticsInitialState = useMemo(
    () => buildInitialAnalyticsState(currentDashboard),
    [currentDashboard],
  );

  const refreshDashboards = useCallback(
    async (dashboardId?: number | null) => {
      if (dashboardId !== undefined) {
        setActiveDashboardId(dashboardId ?? null);
      }

      await mutateDashboardSettings();

      if (dashboardId !== null && dashboardId !== undefined) {
        await mutateSelectedDashboard();
      }
    },
    [mutateDashboardSettings, mutateSelectedDashboard],
  );

  const openAddChart = useCallback(() => {
    setEditingChart(null);
    setChartDraft(null);
    setChartDialogOpen(true);
  }, []);

  const openEditChart = useCallback((chart: IndicatorChartSetting) => {
    setEditingChart(chart);
    setChartDraft(null);
    setChartDialogOpen(true);
  }, []);

  const openCustomDraft = useCallback((draft: Partial<CustomAnalysisState>) => {
    setEditingChart(null);
    setChartDraft(draft);
    setChartDialogOpen(true);
  }, []);

  const handleDeleteDashboard = useCallback(async () => {
    if (!currentDashboard?.id || deletingDashboard) return;

    setDeletingDashboard(true);
    try {
      const deletedId = currentDashboard.id;
      await dashboardSettingsService.delete(deletedId);

      const remainingDashboards = dashboards.filter(
        (dashboard) => dashboard.id !== deletedId,
      );
      const nextDashboardId = remainingDashboards[0]?.id ?? null;

      setActiveDashboardId(nextDashboardId);
      await mutateDashboardSettings();

      if (nextDashboardId) {
        await mutateSelectedDashboard();
      }

      toast({
        title: "Dashboard deleted",
        description: "The dashboard and its saved analyses have been removed.",
      });
    } catch (error) {
      console.error("Failed to delete dashboard", error);
      toast({
        title: "Delete failed",
        description: "Unable to delete this dashboard.",
        variant: "destructive",
      });
    } finally {
      setDeletingDashboard(false);
    }
  }, [
    currentDashboard,
    dashboards,
    deletingDashboard,
    mutateDashboardSettings,
    mutateSelectedDashboard,
    toast,
  ]);

  const handleDeleteChart = useCallback(
    async (chart: IndicatorChartSetting) => {
      if (!currentDashboard?.id || !chart.id || deletingChartId === chart.id) return;

      setDeletingChartId(chart.id);
      try {
        await dashboardSettingsService.removeChart(currentDashboard.id, chart.id);
        await refreshDashboards(currentDashboard.id);
        toast({
          title: "Analysis removed",
          description: "The analysis has been removed from the dashboard.",
        });
      } catch (error) {
        console.error("Failed to delete chart", error);
        toast({
          title: "Remove failed",
          description: "Unable to remove this analysis.",
          variant: "destructive",
        });
      } finally {
        setDeletingChartId(null);
      }
    },
    [currentDashboard, deletingChartId, refreshDashboards, toast],
  );

  const chartCount = currentDashboard?.charts?.length ?? 0;

  return (
    <>
      <PageHeader
        title="Dashboard Workspace"
        description="Create dashboard definitions, attach analyses, and review saved analytics views."
      />

      <div className="grid min-h-[calc(100vh-9rem)] grid-cols-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {!sidebarHidden ? (
          <aside className="rounded-[1.4rem] border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-[var(--green-primary)]" />
                <div>
                  <div className="text-sm font-semibold">Dashboards</div>
                  <div className="text-xs text-muted-foreground">{totalCount} total</div>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSidebarHidden(true)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={dashboardSearch}
                  onChange={(event) => {
                    setDashboardSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search dashboards"
                  className="pl-9"
                />
              </div>

              <Button className="w-full" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Dashboard
              </Button>
            </div>

            <Separator />

            <ScrollArea className="h-[calc(100vh-22rem)]">
              <div className="space-y-2 p-3">
                {dashboardsLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : dashboards.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    No dashboards found.
                  </div>
                ) : (
                  dashboards.map((dashboard) => {
                    const isActive = dashboard.id === activeDashboardId;
                    return (
                      <button
                        key={dashboard.id}
                        type="button"
                        onClick={() => setActiveDashboardId(dashboard.id)}
                        className={[
                          "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                          isActive
                            ? "border-[var(--green-primary)] bg-[var(--green-primary)]/5"
                            : "border-border bg-background hover:bg-muted/50",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {dashboard.name}
                            </div>
                            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {dashboard.description || "Configured analytics dashboard"}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {dashboard.charts?.length ?? 0}
                          </Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-3">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrevPage}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Prev
              </Button>
              <div className="text-xs text-muted-foreground">Page {page}</div>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </aside>
        ) : (
          <div className="lg:hidden" />
        )}

        <main className="min-w-0">
          {sidebarHidden ? (
            <div className="mb-4">
              <Button variant="outline" onClick={() => setSidebarHidden(false)}>
                <ChevronRight className="mr-2 h-4 w-4" />
                Show dashboards
              </Button>
            </div>
          ) : null}

          {!currentDashboard ? (
            <div className="rounded-[1.4rem] border border-dashed border-border bg-card px-6 py-10 text-center text-muted-foreground">
              Select or create a dashboard to begin.
            </div>
          ) : (
            <AnalyticsFiltersProvider
              key={`dashboard-filters-${currentDashboard.id}`}
              dashboardId={currentDashboard.id}
              initialState={analyticsInitialState}
            >
              <div className="space-y-4">
                <section className="rounded-[1.35rem] border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">
                        {currentDashboard.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {currentDashboard.description || "Configured analytics dashboard"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" onClick={() => setEditOpen(true)}>
                        Dashboard Settings
                      </Button>
                      <Button variant="outline" onClick={openAddChart}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Analysis
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={handleDeleteDashboard}
                        disabled={deletingDashboard}
                      >
                        {deletingDashboard ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete Dashboard
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      <BarChart3 className="mr-1 h-3.5 w-3.5" />
                      {chartCount} {chartCount === 1 ? "analysis" : "analyses"}
                    </Badge>

                    {currentDashboard.project_name || currentDashboard.project ? (
                      <Badge variant="outline">
                        Project: {currentDashboard.project_name || currentDashboard.project}
                      </Badge>
                    ) : null}

                    {currentDashboard.organization_name || currentDashboard.organization ? (
                      <Badge variant="outline">
                        Organization:{" "}
                        {currentDashboard.organization_name || currentDashboard.organization}
                        {currentDashboard.cascade_organization ? " + subgrantees" : ""}
                      </Badge>
                    ) : null}
                  </div>
                </section>

                {detailLoading && !selectedDashboardDetail ? (
                  <div className="flex min-h-[10rem] items-center justify-center rounded-[1.35rem] border border-border bg-card">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--green-primary)]" />
                  </div>
                ) : (
                  <>
                    {currentDashboard.charts?.length ? (
                      <section className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {currentDashboard.charts.map((chart) => (
                            <DashboardChartCard
                              key={chart.id}
                              chart={chart}
                              dashboard={currentDashboard}
                              onEdit={() => openEditChart(chart)}
                              onDelete={() => handleDeleteChart(chart)}
                              deleteDisabled={deletingChartId === chart.id}
                            />
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <DashboardAnalyticsSurface
                      dashboard={currentDashboard}
                      onEditChart={openCustomDraft}
                    />
                  </>
                )}
              </div>
            </AnalyticsFiltersProvider>
          )}
        </main>
      </div>

      <DashboardSettingsDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={refreshDashboards}
      />

      <DashboardSettingsDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        existing={currentDashboard}
        onSaved={refreshDashboards}
      />

      <DashboardChartSettingsDialog
        open={chartDialogOpen}
        onOpenChange={(open) => {
          setChartDialogOpen(open);
          if (!open) {
            setEditingChart(null);
            setChartDraft(null);
          }
        }}
        dashboard={currentDashboard}
        existing={editingChart}
        initialCustomAnalysis={chartDraft}
        onSaved={refreshDashboards}
      />
    </>
  );
}
