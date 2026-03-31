"use client";

import type { ReactNode } from "react";
import { type LucideIcon, ArrowRight, Clock3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Project, ProjectDeadline } from "@/lib/types";
import { cn } from "@/lib/utils";

type UpdatesTab = "activity" | "deadlines" | "projects";

type SummaryCard = {
  id: string;
  label: string;
  value: number;
  note: string;
  icon: LucideIcon;
};

type QuickLink = {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type ActivityItem = {
  type: string;
  description: string;
  timestamp: string;
};

export type ScreeningDashboardInsights = {
  isLoading: boolean;
  hasError: boolean;
  totalScreeningValue: number;
  indicatorCount: number;
  reportingOrganizationsCount: number;
  activeProjectsCount: number;
  topIndicators: Array<{ label: string; percentage: number; target: number; value: number }>;
  organizations: Array<{ label: string; percentage: number; target: number; value: number }>;
  projects: Array<{ label: string; percentage: number; target: number; value: number }>;
  stages: Array<{ color: string; label: string; value: number }>;
  hivTestingComparison: Array<{ label: string; actual: number; target: number }>;
  trend: Array<Record<string, number | string>>;
  trendSeries: Array<{ color: string; key: string; label: string }>;
};

export type DashboardChartPreferences = {
  pathwayStyle: "donut" | "pie";
  showTrendLegend: boolean;
  trendLayout: "grouped" | "stacked";
  trendSeriesLimit: 1 | 2 | 3 | 4 | 5;
};

interface DashboardExecutiveBoardProps {
  activeProjects: Project[];
  activeUpdatesTab: UpdatesTab;
  chartPreferences: DashboardChartPreferences;
  recentActivity: ActivityItem[];
  deadlines: ProjectDeadline[];
  screeningInsights: ScreeningDashboardInsights;
  showFavoritesPanel: boolean;
  showSpotlightPanel: boolean;
  showSummaryStrip: boolean;
  showUpdatesBoard: boolean;
  visibleQuickLinks: QuickLink[];
  visibleSummaryCards: SummaryCard[];
  onActiveUpdatesTabChange: (tab: UpdatesTab) => void;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const wholeNumberFormatter = new Intl.NumberFormat("en");
const percentFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});

const deadlineSliceCount = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatCompactNumber(value: number) {
  return compactNumberFormatter.format(value);
}

function formatWholeNumber(value: number) {
  return wholeNumberFormatter.format(value);
}

function formatPercent(value: number) {
  return percentFormatter.format(value);
}

function shortenLabel(name: string, code?: string | null) {
  if (code?.trim()) return code.trim();
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.join(" ");
}

function formatMonthDay(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatFullDate(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No timestamp";

  const diffInHours = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffInHours < 1) return "Less than 1 hour";
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.round(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return formatMonthDay(value);
}

function getDaysUntil(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / MS_PER_DAY);
}

function getProjectMetrics(project: Project) {
  const explicitProgress =
    typeof project.progress_percentage === "number" && Number.isFinite(project.progress_percentage)
      ? clamp(project.progress_percentage, 0, 100)
      : null;

  const startTime = new Date(project.start_date).getTime();
  const endTime = new Date(project.end_date).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return {
      daysRemaining: null as number | null,
      durationDays: null as number | null,
      scheduleProgress: explicitProgress ?? 0,
    };
  }

  const durationDays = Math.max(1, Math.ceil((endTime - startTime) / MS_PER_DAY));
  const elapsedDays = clamp(Math.ceil((Date.now() - startTime) / MS_PER_DAY), 0, durationDays);
  const derivedProgress = Math.round((elapsedDays / durationDays) * 100);
  const daysRemaining = Math.ceil((endTime - Date.now()) / MS_PER_DAY);

  return {
    daysRemaining,
    durationDays,
    scheduleProgress: explicitProgress ?? clamp(derivedProgress, 0, 100),
  };
}

function getDeadlineBadgeClass(daysUntil: number | null) {
  if (daysUntil === null) return "border border-border bg-card text-muted-foreground";
  if (daysUntil < 0) return "border border-border bg-card text-muted-foreground";
  if (daysUntil <= 7) return "border border-border bg-card text-muted-foreground";
  return "border border-border bg-card text-muted-foreground";
}

function DashboardPanel({
  children,
  className,
  eyebrow,
  title,
}: {
  children: ReactNode;
  className?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className={cn("rounded-[1.5rem] border border-border bg-card p-4 text-foreground", className)}>
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MetricBarsPanel({
  eyebrow = "Campaign View",
  emptyCopy,
  items,
  title,
  valueSuffix = "",
  className,
}: {
  eyebrow?: string;
  emptyCopy: string;
  items: Array<{ label: string; percentage: number; target: number; value: number }>;
  title: string;
  valueSuffix?: string;
  className?: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <DashboardPanel className={cn("min-h-[180px]", className)} eyebrow={eyebrow} title={title}>
      {items.length === 0 ? (
        <div className="rounded-[1.1rem] border border-dashed border-border bg-card px-4 py-8 text-sm text-muted-foreground">
          {emptyCopy}
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item) => {
            const targetPercent = item.target > 0 ? (item.value / item.target) * 100 : 0;
            const width =
              item.target > 0
                ? clamp(Math.round(targetPercent), 0, 100)
                : item.value <= 0
                  ? 6
                  : Math.max(10, Math.round((item.value / maxValue) * 100));
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-foreground">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">
                    {formatPercent(item.percentage)}%
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Achieved {formatWholeNumber(item.value)}{valueSuffix} / Target {formatWholeNumber(item.target)}
                  {valueSuffix}
                </p>
                <div className="h-4 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardPanel>
  );
}

export function DashboardExecutiveBoard({
  activeProjects,
  activeUpdatesTab,
  chartPreferences,
  deadlines,
  onActiveUpdatesTabChange,
  recentActivity,
  screeningInsights,
  showFavoritesPanel,
  showSpotlightPanel,
  showSummaryStrip,
  showUpdatesBoard,
  visibleQuickLinks,
  visibleSummaryCards,
}: DashboardExecutiveBoardProps) {
  const navigateHref = (href: string) => href;
  const upcomingDeadlines = deadlines.slice(0, deadlineSliceCount);
  const projectOverview = activeProjects.slice(0, 5).map((project) => {
    const metrics = getProjectMetrics(project);
    return {
      code: project.code,
      daysRemaining: metrics.daysRemaining,
      durationDays: metrics.durationDays,
      endDate: project.end_date,
      id: project.id,
      indicatorsCount: project.indicators_count ?? 0,
      label: shortenLabel(project.name, project.code),
      name: project.name,
      scheduleProgress: metrics.scheduleProgress,
      startDate: project.start_date,
      tasksCount: project.tasks_count ?? 0,
    };
  });

  const boardMetrics = [
    ...visibleSummaryCards.map((card) => ({
      icon: card.icon,
      id: card.id,
      label: card.label,
      note: card.note,
      value: card.value,
    })),
    {
      icon: Clock3,
      id: "deadline-window",
      label: "Upcoming deadlines",
      note: "reporting items due soon",
      value: deadlines.length,
    },
  ].slice(0, 5);

  const updateCounts: Record<UpdatesTab, number> = {
    activity: recentActivity.length,
    deadlines: deadlines.length,
    projects: activeProjects.length,
  };

  const showRightRail = (showFavoritesPanel && visibleQuickLinks.length > 0) || showSpotlightPanel;
  const showBoard =
    (showSummaryStrip && boardMetrics.length > 0) || showUpdatesBoard || showRightRail;
  const hasHivTestingComparisonData = screeningInsights.hivTestingComparison.some(
    (entry) => entry.actual > 0 || entry.target > 0,
  );

  if (!showBoard) {
    return (
      <div className="rounded-[2rem] border-2 border-dashed border-border bg-card px-6 py-14 text-center shadow-sm">
        <h2 className="text-2xl font-semibold text-foreground">Your dashboard is currently empty</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Open Customize Dashboard to turn sections back on and build the dashboard layout you want to see first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {showBoard ? (
        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-4 text-foreground shadow-sm sm:p-5">
          <div
            className={cn(
              "relative grid gap-4",
              showRightRail ? "xl:grid-cols-[minmax(0,1fr)_220px]" : "xl:grid-cols-[minmax(0,1fr)]",
            )}
          >
            <div className="space-y-4">
              {showSummaryStrip && boardMetrics.length > 0 ? (
                <section
                  className={cn(
                    "grid gap-px overflow-hidden rounded-[1.5rem] border border-border bg-card",
                    boardMetrics.length >= 5
                      ? "lg:grid-cols-5"
                      : boardMetrics.length === 4
                        ? "lg:grid-cols-4"
                        : boardMetrics.length === 3
                          ? "lg:grid-cols-3"
                          : "lg:grid-cols-2",
                  )}
                >
                  {boardMetrics.map((metric) => (
                    <div key={metric.id} className="bg-card px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {metric.label}
                          </p>
                          <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                            {formatCompactNumber(metric.value)}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">{metric.note}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-3 text-muted-foreground">
                          <metric.icon className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </section>
              ) : null}

              {showUpdatesBoard ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <DashboardPanel eyebrow="HIV Testing" title="HIV testing actual vs target">
                      {screeningInsights.isLoading ? (
                        <div className="rounded-[1.1rem] border border-dashed border-border bg-card px-4 py-10 text-sm text-muted-foreground">
                          Loading HIV testing comparison totals.
                        </div>
                      ) : screeningInsights.hasError ? (
                        <div className="rounded-[1.1rem] border border-dashed border-border bg-card px-4 py-10 text-sm text-muted-foreground">
                          HIV testing comparison is temporarily unavailable.
                        </div>
                      ) : !hasHivTestingComparisonData ? (
                        <div className="rounded-[1.1rem] border border-dashed border-border bg-card px-4 py-10 text-sm text-muted-foreground">
                          HIV testing actual and target bars will appear once matching indicator data is available.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="h-[240px] md:h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={screeningInsights.hivTestingComparison}
                              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                              barCategoryGap="22%"
                            >
                              <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.65)" />
                              <XAxis
                                axisLine={false}
                                dataKey="label"
                                interval={0}
                                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                tickLine={false}
                              />
                              <YAxis
                                axisLine={false}
                                tickFormatter={(value: number) => formatWholeNumber(value)}
                                width={110}
                                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                tickLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "16px",
                                  color: "hsl(var(--foreground))",
                                }}
                                cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                                formatter={(value: number, name: string) => [
                                  formatWholeNumber(value),
                                  name === "actual" ? "Actual" : "Target",
                                ]}
                              />
                              <Bar dataKey="actual" fill="#0EA5E9" name="actual" radius={[8, 8, 0, 0]} minPointSize={6} />
                              <Bar dataKey="target" fill="#F59E0B" name="target" radius={[8, 8, 0, 0]} minPointSize={6} />
                            </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#0EA5E9]" />
                              <span>Actual</span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                              <span>Target</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </DashboardPanel>

                    <DashboardPanel eyebrow="Pathway" title="Screening pathway mix">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px]">
                        {screeningInsights.isLoading ? (
                          <div className="rounded-[1.1rem] border border-dashed border-border bg-card px-4 py-10 text-sm text-muted-foreground lg:col-span-2">
                            Loading pathway totals from screening aggregates.
                          </div>
                        ) : screeningInsights.hasError ? (
                          <div className="rounded-[1.1rem] border border-dashed border-border bg-card px-4 py-10 text-sm text-muted-foreground lg:col-span-2">
                            Screening pathway totals are temporarily unavailable.
                          </div>
                        ) : screeningInsights.stages.every((item) => item.value === 0) ? (
                          <div className="rounded-[1.1rem] border border-dashed border-border bg-card px-4 py-10 text-sm text-muted-foreground lg:col-span-2">
                            Screening stages will appear here once screened, eligible, referred, or linked indicators are reported.
                          </div>
                        ) : (
                          <>
                            <div className="h-[180px] md:h-[200px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    cx="50%"
                                    cy="50%"
                                    data={screeningInsights.stages}
                                    dataKey="value"
                                    innerRadius={chartPreferences.pathwayStyle === "donut" ? 54 : 0}
                                    outerRadius={78}
                                    paddingAngle={2}
                                  >
                                    {screeningInsights.stages.map((entry) => (
                                      <Cell key={entry.label} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "hsl(var(--card))",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "16px",
                                      color: "hsl(var(--foreground))",
                                    }}
                                    formatter={(value: number) => [formatWholeNumber(value), "Reported total"]}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>

                            <div className="max-h-[170px] space-y-1.5 overflow-y-auto pr-1">
                              {screeningInsights.stages.map((item) => (
                                <div key={item.label} className="rounded-md border border-border bg-card px-2 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <div className="flex-1">
                                      <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                        {item.label}
                                      </p>
                                      <p className="mt-0.5 text-base font-semibold leading-tight text-foreground">
                                        {formatWholeNumber(item.value)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </DashboardPanel>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-4">
                    <MetricBarsPanel
                      className="xl:col-span-2"
                      eyebrow="Screening Breakdown"
                      emptyCopy="Screening indicator totals will appear here as aggregate reports come in."
                      items={screeningInsights.topIndicators}
                      title="Top screening indicators"
                    />
                    <MetricBarsPanel
                      eyebrow="Coverage"
                      emptyCopy="Organizations with screening reports will appear here once data is submitted."
                      items={screeningInsights.organizations}
                      title="Reporting organizations"
                    />
                    <MetricBarsPanel
                      eyebrow="Project Scope"
                      emptyCopy="Projects contributing screening totals will be listed once active-project reporting is available."
                      items={screeningInsights.projects}
                      title="Projects with screening totals"
                    />
                  </div>

                  <Tabs value={activeUpdatesTab} onValueChange={(value) => onActiveUpdatesTabChange(value as UpdatesTab)}>
                    <DashboardPanel eyebrow="Details" title="Operations matrix">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {screeningInsights.isLoading ? (
                            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                              Loading screening summary...
                            </div>
                          ) : (
                            <>
                              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                                Screening total: {formatWholeNumber(screeningInsights.totalScreeningValue)}
                              </div>
                              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                                Indicators: {formatWholeNumber(screeningInsights.indicatorCount)}
                              </div>
                              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                                Orgs reporting: {formatWholeNumber(screeningInsights.reportingOrganizationsCount)}
                              </div>
                            </>
                          )}
                        </div>

                        <TabsList className="h-auto flex-wrap justify-start rounded-full border border-border bg-card p-1">
                          {(["activity", "deadlines", "projects"] as UpdatesTab[]).map((tab) => (
                            <TabsTrigger
                              key={tab}
                              value={tab}
                              className="rounded-full px-4 py-2 text-sm capitalize text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground"
                            >
                              {tab}
                              <span className="ml-2 rounded-full bg-muted/50 px-2 py-0.5 text-[11px] data-[state=active]:bg-muted">
                                {updateCounts[tab]}
                              </span>
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>

                      <div className="mt-4 overflow-x-auto rounded-[1.1rem] border border-border bg-card">
                        <TabsContent value="activity" className="m-0">
                          <table className="min-w-full text-sm">
                            <thead className="bg-card text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              <tr>
                                <th className="px-4 py-3">Activity</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Logged</th>
                                <th className="px-4 py-3">Freshness</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {recentActivity.length === 0 ? (
                                <tr>
                                  <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                                    No recent activity is available yet.
                                  </td>
                                </tr>
                              ) : (
                                recentActivity.slice(0, 6).map((item, index) => (
                                  <tr key={`${item.timestamp}-${index}`} className="text-foreground">
                                    <td className="px-4 py-3">
                                      <div className="max-w-[28rem] font-medium">{item.description}</div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{item.type || "system"}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{formatFullDate(item.timestamp)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{formatRelativeDate(item.timestamp)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </TabsContent>

                        <TabsContent value="deadlines" className="m-0">
                          <table className="min-w-full text-sm">
                            <thead className="bg-card text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              <tr>
                                <th className="px-4 py-3">Deadline</th>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Due</th>
                                <th className="px-4 py-3">Window</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {upcomingDeadlines.length === 0 ? (
                                <tr>
                                  <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                                    No deadline records are currently queued.
                                  </td>
                                </tr>
                              ) : (
                                upcomingDeadlines.map((deadline) => {
                                  const daysUntil = getDaysUntil(deadline.due_date);
                                  return (
                                    <tr key={deadline.id} className="text-foreground">
                                      <td className="px-4 py-3 font-medium">{deadline.name}</td>
                                      <td className="px-4 py-3 text-muted-foreground">
                                        {deadline.project_name || "Project not specified"}
                                      </td>
                                      <td className="px-4 py-3 text-muted-foreground">{formatFullDate(deadline.due_date)}</td>
                                      <td className="px-4 py-3">
                                        <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", getDeadlineBadgeClass(daysUntil))}>
                                          {daysUntil === null
                                            ? "No date"
                                            : daysUntil < 0
                                              ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"} overdue`
                                              : `${daysUntil} day${daysUntil === 1 ? "" : "s"} left`}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </TabsContent>

                        <TabsContent value="projects" className="m-0">
                          <table className="min-w-full text-sm">
                            <thead className="bg-card text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              <tr>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Dates</th>
                                <th className="px-4 py-3">Indicators</th>
                                <th className="px-4 py-3">Schedule</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {projectOverview.length === 0 ? (
                                <tr>
                                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                                    No active projects are available for this account yet.
                                  </td>
                                </tr>
                              ) : (
                                projectOverview.map((project) => (
                                  <tr key={project.id} className="text-foreground">
                                    <td className="px-4 py-3 font-medium">{project.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{project.code || "No code"}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                      {formatMonthDay(project.startDate)} - {formatMonthDay(project.endDate)}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{formatWholeNumber(project.indicatorsCount)}</td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-3">
                                        <div className="h-2.5 w-24 rounded-full bg-muted">
                                          <div
                                            className="h-full rounded-full bg-primary/70"
                                            style={{ width: `${project.scheduleProgress}%` }}
                                          />
                                        </div>
                                        <span className="text-muted-foreground">{project.scheduleProgress}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </TabsContent>
                      </div>
                    </DashboardPanel>
                  </Tabs>
                </>
              ) : (
                <DashboardPanel eyebrow="Overview" title="Executive summary">
                  <div className="rounded-[1.1rem] border border-dashed border-border bg-card px-4 py-10 text-sm text-muted-foreground">
                    Turn on the Updates Board in Customize Dashboard to restore charts and the operations matrix.
                  </div>
                </DashboardPanel>
              )}
            </div>

            {showRightRail ? (
              <aside className="space-y-4">
                {showFavoritesPanel ? (
                  <DashboardPanel eyebrow="Shortcuts" title="Favorites">
                    {visibleQuickLinks.length === 0 ? (
                      <div className="rounded-[1.1rem] border border-dashed border-border bg-card px-4 py-8 text-sm text-muted-foreground">
                        No quick links are selected right now.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {visibleQuickLinks.map((link) => (
                          <a
                            key={link.id}
                            href={navigateHref(link.href)}
                            className="flex items-start justify-between gap-3 rounded-[1.1rem] border border-border bg-card px-4 py-4 transition-colors hover:bg-muted"
                          >
                            <div className="flex items-start gap-3">
                              <div className="rounded-2xl border border-border bg-card p-2.5 text-muted-foreground">
                                <link.icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{link.label}</p>
                                <p className="mt-1 text-sm leading-5 text-muted-foreground">{link.description}</p>
                              </div>
                            </div>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    )}
                  </DashboardPanel>
                ) : null}

                {showSpotlightPanel ? (
                  <DashboardPanel eyebrow="Spotlight" title="Current focus">
                    {activeProjects.length === 0 ? (
                      <div className="rounded-[1.1rem] border border-dashed border-border bg-card px-4 py-8 text-sm text-muted-foreground">
                        No active project spotlight is available right now.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeProjects.slice(0, 4).map((project) => {
                          const metrics = getProjectMetrics(project);
                          return (
                            <a
                              key={project.id}
                              href={navigateHref(`/projects/${project.id}`)}
                              className="block rounded-[1.1rem] border border-border bg-card px-4 py-4 transition-colors hover:bg-muted"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-foreground">{project.name}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {project.code || "No project code"} - {formatMonthDay(project.end_date)}
                                  </p>
                                </div>
                                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                              </div>
                              <div className="mt-4 flex items-center gap-3">
                                <div className="h-2.5 flex-1 rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-primary/70"
                                    style={{ width: `${metrics.scheduleProgress}%` }}
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground">{metrics.scheduleProgress}%</span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </DashboardPanel>
                ) : null}
              </aside>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}




