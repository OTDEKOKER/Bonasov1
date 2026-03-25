"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  FolderKanban,
  Loader2,
  RotateCcw,
  Users,
} from "lucide-react";
import {
  DashboardExecutiveBoard,
  type DashboardChartPreferences,
  type ScreeningDashboardInsights,
} from "@/components/dashboard/executive-dashboard-board";
import { OrganizationSelect } from "@/components/shared/organization-select";
import { getAggregateTotal, toSafeNumber } from "@/lib/aggregates/aggregate-helpers";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  useAllIndicators,
  useAggregates,
  useDashboardStats,
  useDeadlines,
  useOrganizations,
  useProjects,
} from "@/lib/hooks/use-api";
import { getIndicatorChartLabel } from "@/lib/indicators/display-name";
import { isReadOnlyClient } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const HOME_DASHBOARD_STORAGE_KEY = "bonaso-home-dashboard-preferences";
const screeningSeriesColors = [
  "#22C55E",
  "#0EA5E9",
  "#F59E0B",
];
const hivTestingComparisonDefinitions = [
  { id: "tested-total", label: "People tested for HIV" },
  { id: "tested-positive", label: "People tested HIV positive" },
] as const;

type HivTestingComparisonKey = (typeof hivTestingComparisonDefinitions)[number]["id"];
type ScreeningStageDefinition = {
  id: string;
  label: string;
  color: string;
  anyPatterns?: string[];
  allPatterns?: string[];
  excludePatterns?: string[];
};

const screeningStageDefinitions = [
  { id: "screened", label: "Screened", anyPatterns: ["screened", "screening"], color: "#22C55E" },
  { id: "eligible", label: "Eligible", anyPatterns: ["eligible"], color: "#0EA5E9" },
  { id: "referred", label: "Referred", anyPatterns: ["referred", "referral"], color: "#F59E0B" },
  {
    id: "linked-hiv",
    label: "Linked HIV care",
    anyPatterns: ["linked", "linkage"],
    allPatterns: ["hiv"],
    color: "#A855F7",
  },
  {
    id: "linked-prep",
    label: "Linked PrEP",
    anyPatterns: ["linked", "linkage"],
    allPatterns: ["prep"],
    color: "#14B8A6",
  },
  {
    id: "linked-pep",
    label: "Linked PEP",
    anyPatterns: ["linked", "linkage"],
    allPatterns: ["pep"],
    color: "#F97316",
  },
  {
    id: "linked-other",
    label: "Linked (Other)",
    anyPatterns: ["linked", "linkage"],
    excludePatterns: ["hiv", "prep", "pep"],
    color: "#64748B",
  },
] as const satisfies readonly ScreeningStageDefinition[];

const dashboardQuickLinks = [
  {
    id: "respondents",
    href: "/respondents",
    label: "Respondents",
    description: "Open tracked people and their interaction history.",
    icon: Users,
    readOnlyHidden: true,
  },
  {
    id: "aggregates",
    href: "/aggregates",
    label: "Aggregates",
    description: "Review reported totals and auto-calculated indicators.",
    icon: BarChart3,
    readOnlyHidden: true,
  },
  {
    id: "projects",
    href: "/projects",
    label: "Projects",
    description: "Jump into active grants, deadlines, and targets.",
    icon: FolderKanban,
    readOnlyHidden: false,
  },
  {
    id: "reports",
    href: "/reports",
    label: "Reports",
    description: "Open reporting views, exports, and summaries.",
    icon: FileText,
    readOnlyHidden: false,
  },
];

const summaryCardDefinitions = [
  {
    id: "respondents",
    label: "Respondents",
    note: "people recorded in the portal",
    icon: Users,
  },
  {
    id: "interactions",
    label: "Interactions",
    note: "assessments and service touchpoints",
    icon: Activity,
  },
  {
    id: "active-projects",
    label: "Active Projects",
    note: "currently running delivery streams",
    icon: FolderKanban,
  },
  {
    id: "flags-behind",
    label: "Flags Behind",
    note: "indicator areas needing attention",
    icon: AlertTriangle,
  },
] as const;

const heroActionDefinitions = [
  {
    id: "new-interaction",
    label: "New Interaction",
    href: "/respondents/interactions",
    readOnlyHidden: true,
  },
  {
    id: "view-reports",
    label: "View Reports",
    href: "/reports",
    readOnlyHidden: false,
  },
] as const;

type UpdatesTab = "activity" | "deadlines" | "projects";
type HomeDashboardFilters = {
  projectId: string;
  organizationId: string;
  dateFrom: string;
  dateTo: string;
};

type HomeDashboardPreferences = {
  showWelcomeBanner: boolean;
  showSummaryStrip: boolean;
  showUpdatesBoard: boolean;
  showFavoritesPanel: boolean;
  showSpotlightPanel: boolean;
  defaultUpdatesTab: UpdatesTab;
  heroActions: Record<string, boolean>;
  summaryCards: Record<string, boolean>;
  quickLinks: Record<string, boolean>;
  chartPreferences: DashboardChartPreferences;
};

const defaultDashboardChartPreferences: DashboardChartPreferences = {
  pathwayStyle: "donut",
  showTrendLegend: true,
  trendLayout: "grouped",
  trendSeriesLimit: 3,
};

const defaultHomeDashboardPreferences: HomeDashboardPreferences = {
  showWelcomeBanner: true,
  showSummaryStrip: true,
  showUpdatesBoard: true,
  showFavoritesPanel: true,
  showSpotlightPanel: true,
  defaultUpdatesTab: "activity",
  heroActions: {
    "new-interaction": true,
    "view-reports": true,
  },
  summaryCards: {
    respondents: true,
    interactions: true,
    "active-projects": true,
    "flags-behind": true,
  },
  quickLinks: {
    respondents: true,
    aggregates: true,
    projects: true,
    reports: true,
  },
  chartPreferences: defaultDashboardChartPreferences,
};

const defaultHomeDashboardFilters: HomeDashboardFilters = {
  projectId: "all",
  organizationId: "all",
  dateFrom: "",
  dateTo: "",
};

function normalizeDashboardText(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getMonthBucket(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthBucket(bucket: string) {
  const [year, month] = bucket.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return bucket;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(date);
}

function fallsWithinDateRange(value?: string | null, fromDate?: string, toDate?: string) {
  if (!fromDate && !toDate) return true;
  if (!value) return false;

  const valueTime = new Date(value).getTime();
  if (Number.isNaN(valueTime)) return false;

  if (fromDate) {
    const fromTime = new Date(fromDate).getTime();
    if (!Number.isNaN(fromTime) && valueTime < fromTime) return false;
  }

  if (toDate) {
    const toTime = new Date(`${toDate}T23:59:59.999`).getTime();
    if (!Number.isNaN(toTime) && valueTime > toTime) return false;
  }

  return true;
}

function matchesScreeningStage(matchText: string, stage: ScreeningStageDefinition) {
  const hasAny =
    !stage.anyPatterns || stage.anyPatterns.length === 0
      ? true
      : stage.anyPatterns.some((pattern) => matchText.includes(pattern));
  const hasAll =
    !stage.allPatterns || stage.allPatterns.length === 0
      ? true
      : stage.allPatterns.every((pattern) => matchText.includes(pattern));
  const hasExcluded =
    !!stage.excludePatterns && stage.excludePatterns.some((pattern) => matchText.includes(pattern));

  return hasAny && hasAll && !hasExcluded;
}

function getHivTestingComparisonKey(matchText: string): HivTestingComparisonKey | null {
  const hasHiv = matchText.includes("hiv");
  const hasTesting = matchText.includes("test");
  if (!hasHiv || !hasTesting) return null;

  const hasPositive = matchText.includes("positive");
  return hasPositive ? "tested-positive" : "tested-total";
}

function buildEmptyScreeningInsights(isLoading: boolean, hasError: boolean): ScreeningDashboardInsights {
  return {
    isLoading,
    hasError,
    totalScreeningValue: 0,
    indicatorCount: 0,
    reportingOrganizationsCount: 0,
    activeProjectsCount: 0,
    topIndicators: [],
    organizations: [],
    projects: [],
    stages: screeningStageDefinitions.map((stage) => ({
      color: stage.color,
      label: stage.label,
      value: 0,
    })),
    hivTestingComparison: hivTestingComparisonDefinitions.map((definition) => ({
      actual: 0,
      label: definition.label,
      target: 0,
    })),
    trend: [],
    trendSeries: [],
  };
}

function getHomeDashboardStorageKey(userKey: string) {
  return `${HOME_DASHBOARD_STORAGE_KEY}:${userKey}`;
}

function readHomeDashboardPreferences(storageKey: string): HomeDashboardPreferences {
  if (typeof window === "undefined") return defaultHomeDashboardPreferences;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultHomeDashboardPreferences;

    const parsed = JSON.parse(raw) as Partial<HomeDashboardPreferences>;

    const parsedTrendSeriesLimit =
      typeof parsed.chartPreferences?.trendSeriesLimit === "number"
        ? parsed.chartPreferences.trendSeriesLimit
        : defaultDashboardChartPreferences.trendSeriesLimit;
    const trendSeriesLimit = [1, 2, 3, 4, 5].includes(parsedTrendSeriesLimit)
      ? parsedTrendSeriesLimit
      : defaultDashboardChartPreferences.trendSeriesLimit;

    return {
      ...defaultHomeDashboardPreferences,
      ...parsed,
      defaultUpdatesTab:
        parsed.defaultUpdatesTab === "deadlines" || parsed.defaultUpdatesTab === "projects"
          ? parsed.defaultUpdatesTab
          : "activity",
      heroActions: {
        ...defaultHomeDashboardPreferences.heroActions,
        ...(parsed.heroActions ?? {}),
      },
      summaryCards: {
        ...defaultHomeDashboardPreferences.summaryCards,
        ...(parsed.summaryCards ?? {}),
      },
      quickLinks: {
        ...defaultHomeDashboardPreferences.quickLinks,
        ...(parsed.quickLinks ?? {}),
      },
      chartPreferences: {
        ...defaultDashboardChartPreferences,
        ...(parsed.chartPreferences ?? {}),
        pathwayStyle:
          parsed.chartPreferences?.pathwayStyle === "pie" ? "pie" : defaultDashboardChartPreferences.pathwayStyle,
        showTrendLegend:
          typeof parsed.chartPreferences?.showTrendLegend === "boolean"
            ? parsed.chartPreferences.showTrendLegend
            : defaultDashboardChartPreferences.showTrendLegend,
        trendLayout:
          parsed.chartPreferences?.trendLayout === "stacked" ? "stacked" : defaultDashboardChartPreferences.trendLayout,
        trendSeriesLimit,
      },
    };
  } catch (error) {
    console.error("Failed to read home dashboard preferences", error);
    return defaultHomeDashboardPreferences;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const storageKey = useMemo(() => {
    const userKey = String(user?.email || user?.id || "default");
    return getHomeDashboardStorageKey(userKey);
  }, [user]);

  if (!hydrated) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <DashboardPageContent key={storageKey} storageKey={storageKey} user={user} />;
}

function DashboardPageContent({
  storageKey,
  user,
}: {
  storageKey: string;
  user: ReturnType<typeof useAuth>["user"];
}) {
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [dashboardFilters, setDashboardFilters] = useState<HomeDashboardFilters>(
    defaultHomeDashboardFilters,
  );
  const [dashboardPreferences, setDashboardPreferences] = useState<HomeDashboardPreferences>(() =>
    readHomeDashboardPreferences(storageKey),
  );
  const [activeUpdatesTab, setActiveUpdatesTab] = useState<UpdatesTab>(() =>
    readHomeDashboardPreferences(storageKey).defaultUpdatesTab,
  );
  const selectedProjectId =
    dashboardFilters.projectId !== "all" ? dashboardFilters.projectId : undefined;
  const selectedOrganizationId =
    dashboardFilters.organizationId !== "all" ? dashboardFilters.organizationId : undefined;
  const selectedProjectNumericId = useMemo(() => {
    if (!selectedProjectId) return undefined;
    const parsed = Number(selectedProjectId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [selectedProjectId]);
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useDashboardStats(
    selectedProjectNumericId,
  );
  const { data: organizationsData } = useOrganizations({
    page_size: "200",
  });
  const { data: projectsData, isLoading: projectsLoading } = useProjects({
    status: "active",
    organization: selectedOrganizationId,
  });
  const { data: deadlinesData, isLoading: deadlinesLoading } = useDeadlines({
    upcoming: "true",
    project: selectedProjectId,
  });
  const { data: aggregatesData, isLoading: aggregatesLoading, error: aggregatesError } = useAggregates({
    project: selectedProjectId,
    organization: selectedOrganizationId,
    date_from: dashboardFilters.dateFrom || undefined,
    date_to: dashboardFilters.dateTo || undefined,
    page_size: "300",
  });
  const { data: indicatorsData, isLoading: indicatorsLoading } = useAllIndicators();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(dashboardPreferences));
  }, [dashboardPreferences, storageKey]);

  useEffect(() => {
    const handleOpenCustomize = () => setPreferencesOpen(true);
    window.addEventListener("bonaso:open-dashboard-customize", handleOpenCustomize);
    return () => {
      window.removeEventListener("bonaso:open-dashboard-customize", handleOpenCustomize);
    };
  }, []);

  const organizations = useMemo(() => organizationsData?.results || [], [organizationsData]);
  const activeProjects = useMemo(() => {
    const items = projectsData?.results || [];
    if (!selectedProjectId) return items;
    return items.filter((project) => String(project.id) === selectedProjectId);
  }, [projectsData, selectedProjectId]);
  const allUpcomingDeadlines = useMemo(() => {
    const items = deadlinesData?.results || [];
    if (!dashboardFilters.dateFrom && !dashboardFilters.dateTo) return items;
    return items.filter((deadline) =>
      fallsWithinDateRange(deadline.due_date, dashboardFilters.dateFrom, dashboardFilters.dateTo),
    );
  }, [dashboardFilters.dateFrom, dashboardFilters.dateTo, deadlinesData]);
  const recentActivity = useMemo(() => {
    const items = dashboardStats?.recent_activity || [];
    if (!dashboardFilters.dateFrom && !dashboardFilters.dateTo) return items;
    return items.filter((item) =>
      fallsWithinDateRange(item.timestamp, dashboardFilters.dateFrom, dashboardFilters.dateTo),
    );
  }, [dashboardFilters.dateFrom, dashboardFilters.dateTo, dashboardStats]);
  const screeningInsights = useMemo<ScreeningDashboardInsights>(() => {
    if (!aggregatesData?.results) {
      return buildEmptyScreeningInsights(aggregatesLoading || indicatorsLoading, Boolean(aggregatesError));
    }
    const aggregateRows = aggregatesData.results;

    const indicatorMetaById = new Map<string, { code?: string; name: string; short_name?: string }>(
      (indicatorsData ?? []).map((indicator) => [
        String(indicator.id),
        { code: indicator.code, name: indicator.name, short_name: indicator.short_name },
      ]),
    );
    const organizationNameById = new Map(
      organizations.map((organization) => [String(organization.id), organization.name || "Unassigned org"]),
    );
    const projectNameById = new Map(
      activeProjects.map((project) => [String(project.id), project.name || project.code || "Unassigned project"]),
    );
    const activeProjectIds = new Set(activeProjects.map((project) => String(project.id)));
    const scopedAggregates = aggregateRows.filter(
      (aggregate) => activeProjectIds.size === 0 || activeProjectIds.has(String(aggregate.project)),
    );
    const screeningIndicatorTotals = new Map<string, { indicatorId: string; label: string; target: number; total: number }>();
    const trendIndicatorTotals = new Map<string, { label: string; total: number }>();
    const organizationTotals = new Map<string, { label: string; target: number; total: number }>();
    const projectTotals = new Map<string, { label: string; target: number; total: number }>();
    const stageTotals = new Map(screeningStageDefinitions.map((stage) => [stage.id, 0]));
    const hivTestingTotals = new Map<string, { actual: number; label: string; target: number }>(
      hivTestingComparisonDefinitions.map((definition) => [
        definition.id,
        { actual: 0, label: definition.label, target: 0 },
      ]),
    );
    const screeningPeriodTotals = new Map<string, Map<string, number>>();
    const trendPeriodTotals = new Map<string, Map<string, number>>();
    let totalScreeningValue = 0;

    for (const aggregate of scopedAggregates) {
      const indicatorId = String(aggregate.indicator || "");
      const indicatorMeta = indicatorMetaById.get(indicatorId);
      const indicatorName = aggregate.indicator_name || indicatorMeta?.name || "Indicator";
      const indicatorCode = aggregate.indicator_code || indicatorMeta?.code || "";
      const indicatorLabel = getIndicatorChartLabel(
        {
          code: indicatorCode,
          name: indicatorName,
          short_name: indicatorMeta?.short_name,
        },
        "Indicator",
      );
      const matchText = normalizeDashboardText(`${indicatorCode} ${indicatorName}`);
      const matchedStage = screeningStageDefinitions.find((stage) =>
        matchesScreeningStage(matchText, stage),
      );
      const total = getAggregateTotal(aggregate);
      if (total <= 0) continue;

      const hivTestingKey = getHivTestingComparisonKey(matchText);
      if (hivTestingKey) {
        const hivTestingEntry = hivTestingTotals.get(hivTestingKey);
        if (hivTestingEntry) {
          hivTestingEntry.actual += total;
          hivTestingTotals.set(hivTestingKey, hivTestingEntry);
        }
      }

      if (!matchedStage) continue;

      const indicatorKey = indicatorCode.trim() || indicatorName.trim() || indicatorId;
      const trendEntry = trendIndicatorTotals.get(indicatorKey) ?? {
        label: indicatorLabel,
        total: 0,
      };
      trendEntry.total += total;
      trendIndicatorTotals.set(indicatorKey, trendEntry);

      const periodBucket = getMonthBucket(aggregate.period_end || aggregate.period_start);
      if (periodBucket) {
        if (!trendPeriodTotals.has(periodBucket)) {
          trendPeriodTotals.set(periodBucket, new Map<string, number>());
        }
        const periodEntry = trendPeriodTotals.get(periodBucket);
        if (periodEntry) {
          periodEntry.set(indicatorKey, (periodEntry.get(indicatorKey) || 0) + total);
        }
      }

      if (!matchedStage) continue;

      totalScreeningValue += total;
      const screeningEntry = screeningIndicatorTotals.get(indicatorKey) ?? {
        indicatorId,
        label: indicatorLabel,
        target: 0,
        total: 0,
      };
      screeningEntry.total += total;
      screeningIndicatorTotals.set(indicatorKey, screeningEntry);

      const organizationId = String(aggregate.organization || "");
      const organizationKey = organizationId || `name:${String(aggregate.organization_name || "Unassigned org")}`;
      const organizationLabel =
        aggregate.organization_name || organizationNameById.get(organizationId) || "Unassigned org";
      const organizationEntry = organizationTotals.get(organizationKey) ?? {
        label: organizationLabel,
        target: 0,
        total: 0,
      };
      organizationEntry.total += total;
      organizationTotals.set(organizationKey, organizationEntry);

      const projectId = String(aggregate.project || "");
      const projectKey = projectId || `name:${String(aggregate.project_name || "Unassigned project")}`;
      const projectLabel = aggregate.project_name || projectNameById.get(projectId) || "Unassigned project";
      const projectEntry = projectTotals.get(projectKey) ?? {
        label: projectLabel,
        target: 0,
        total: 0,
      };
      projectEntry.total += total;
      projectTotals.set(projectKey, projectEntry);

      stageTotals.set(matchedStage.id, (stageTotals.get(matchedStage.id) || 0) + total);

      if (!periodBucket) continue;
      if (!screeningPeriodTotals.has(periodBucket)) {
        screeningPeriodTotals.set(periodBucket, new Map<string, number>());
      }
      const screeningPeriodEntry = screeningPeriodTotals.get(periodBucket);
      if (!screeningPeriodEntry) continue;
      screeningPeriodEntry.set(indicatorKey, (screeningPeriodEntry.get(indicatorKey) || 0) + total);
    }

    for (const indicator of indicatorsData ?? []) {
      const indicatorId = String(indicator.id);
      const indicatorCode = indicator.code || "";
      const indicatorName = indicator.name || "Indicator";
      const matchText = normalizeDashboardText(`${indicatorCode} ${indicatorName}`);
      const matchedStage = screeningStageDefinitions.find((stage) => matchesScreeningStage(matchText, stage));
      const hivTestingKey = getHivTestingComparisonKey(matchText);
      const indicatorKey = indicatorCode.trim() || indicatorName.trim() || indicatorId;
      for (const targetRow of indicator.project_targets || []) {
        const targetProjectId = String(targetRow.project || "");
        if (activeProjectIds.size > 0 && !activeProjectIds.has(targetProjectId)) continue;

        const targetOrganizationId = String(targetRow.organization || "");
        if (selectedOrganizationId && targetOrganizationId && targetOrganizationId !== selectedOrganizationId) {
          continue;
        }

        const targetValue = toSafeNumber(targetRow.target_value);
        if (targetValue <= 0) continue;

        if (hivTestingKey) {
          const hivTestingEntry = hivTestingTotals.get(hivTestingKey);
          if (hivTestingEntry) {
            hivTestingEntry.target += targetValue;
            hivTestingTotals.set(hivTestingKey, hivTestingEntry);
          }
        }

        if (!matchedStage) continue;

        const indicatorEntry = screeningIndicatorTotals.get(indicatorKey);
        if (indicatorEntry) {
          indicatorEntry.target += targetValue;
          screeningIndicatorTotals.set(indicatorKey, indicatorEntry);
        }

        const organizationKey = targetOrganizationId || `name:${String(targetRow.organization_name || "Unassigned org")}`;
        const organizationEntry = organizationTotals.get(organizationKey) ?? {
          label:
            targetRow.organization_name ||
            organizationNameById.get(targetOrganizationId) ||
            "Unassigned org",
          target: 0,
          total: 0,
        };
        organizationEntry.target += targetValue;
        organizationTotals.set(organizationKey, organizationEntry);

        const projectKey = targetProjectId || `name:${String(targetRow.project_name || "Unassigned project")}`;
        const projectEntry = projectTotals.get(projectKey) ?? {
          label: targetRow.project_name || projectNameById.get(targetProjectId) || "Unassigned project",
          target: 0,
          total: 0,
        };
        projectEntry.target += targetValue;
        projectTotals.set(projectKey, projectEntry);
      }
    }

    const topIndicators = Array.from(screeningIndicatorTotals.values())
      .sort((left, right) => right.total - left.total)
      .slice(0, 5)
      .map((entry) => ({
        label: entry.label,
        percentage: entry.target > 0 ? (entry.total / entry.target) * 100 : 0,
        target: entry.target,
        value: entry.total,
      }));

    const useTrendFallback =
      screeningIndicatorTotals.size <= 1 && trendIndicatorTotals.size > 1;
    const selectedTrendTotals = useTrendFallback ? trendIndicatorTotals : screeningIndicatorTotals;
    const selectedTrendPeriods = useTrendFallback ? trendPeriodTotals : screeningPeriodTotals;

    const trendKeys = Array.from(selectedTrendTotals.entries())
      .sort((left, right) => right[1].total - left[1].total)
      .slice(0, 5)
      .map(([key]) => key);

    const trendSeries = trendKeys.map((key, index) => ({
      color: screeningSeriesColors[index % screeningSeriesColors.length],
      key,
      label: selectedTrendTotals.get(key)?.label || key,
    }));

    const trend = Array.from(selectedTrendPeriods.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-6)
      .map(([bucket, totals]) => {
        const row: Record<string, number | string> = {
          period: formatMonthBucket(bucket),
        };
        for (const series of trendSeries) {
          row[series.key] = totals.get(series.key) || 0;
        }
        return row;
      });

    return {
      isLoading: aggregatesLoading || indicatorsLoading,
      hasError: Boolean(aggregatesError),
      totalScreeningValue,
      indicatorCount: screeningIndicatorTotals.size,
      reportingOrganizationsCount: Array.from(organizationTotals.values()).filter((entry) => entry.total > 0).length,
      activeProjectsCount: Array.from(projectTotals.values()).filter((entry) => entry.total > 0).length,
      topIndicators,
      organizations: Array.from(organizationTotals.values())
        .sort((left, right) => right.total - left.total)
        .slice(0, 5)
        .map((entry) => ({
          label: entry.label,
          percentage: entry.target > 0 ? (entry.total / entry.target) * 100 : 0,
          target: entry.target,
          value: entry.total,
        })),
      projects: Array.from(projectTotals.values())
        .sort((left, right) => right.total - left.total)
        .slice(0, 5)
        .map((entry) => ({
          label: entry.label,
          percentage: entry.target > 0 ? (entry.total / entry.target) * 100 : 0,
          target: entry.target,
          value: entry.total,
        })),
      stages: screeningStageDefinitions.map((stage) => ({
        color: stage.color,
        label: stage.label,
        value: stageTotals.get(stage.id) || 0,
      })),
      hivTestingComparison: hivTestingComparisonDefinitions.map((definition) => {
        const entry = hivTestingTotals.get(definition.id);
        return {
          actual: entry?.actual || 0,
          label: definition.label,
          target: entry?.target || 0,
        };
      }),
      trend,
      trendSeries,
    };
  }, [
    activeProjects,
    aggregatesData,
    aggregatesError,
    aggregatesLoading,
    indicatorsData,
    indicatorsLoading,
    organizations,
    selectedOrganizationId,
  ]);

  const isReadOnlyUser = isReadOnlyClient(user);

  const setSectionPreference = (
    key:
      | "showWelcomeBanner"
      | "showSummaryStrip"
      | "showUpdatesBoard"
      | "showFavoritesPanel"
      | "showSpotlightPanel",
    checked: boolean,
  ) => {
    setDashboardPreferences((current) => ({
      ...current,
      [key]: checked,
    }));
  };

  const setSummaryCardPreference = (cardId: string, checked: boolean) => {
    setDashboardPreferences((current) => ({
      ...current,
      summaryCards: {
        ...current.summaryCards,
        [cardId]: checked,
      },
    }));
  };

  const setHeroActionPreference = (actionId: string, checked: boolean) => {
    setDashboardPreferences((current) => ({
      ...current,
      heroActions: {
        ...current.heroActions,
        [actionId]: checked,
      },
    }));
  };

  const setQuickLinkPreference = (linkId: string, checked: boolean) => {
    setDashboardPreferences((current) => ({
      ...current,
      quickLinks: {
        ...current.quickLinks,
        [linkId]: checked,
      },
    }));
  };

  const setChartPreference = <K extends keyof DashboardChartPreferences>(
    key: K,
    value: DashboardChartPreferences[K],
  ) => {
    setDashboardPreferences((current) => ({
      ...current,
      chartPreferences: {
        ...current.chartPreferences,
        [key]: value,
      },
    }));
  };

  const setDefaultUpdatesTab = (tab: UpdatesTab) => {
    setDashboardPreferences((current) => ({
      ...current,
      defaultUpdatesTab: tab,
    }));
    setActiveUpdatesTab(tab);
  };

  const resetDashboardPreferences = () => {
    setDashboardPreferences(defaultHomeDashboardPreferences);
    setActiveUpdatesTab(defaultHomeDashboardPreferences.defaultUpdatesTab);
  };

  const clearDashboardFilters = () => {
    setDashboardFilters(defaultHomeDashboardFilters);
  };

  const summaryCards = [
    {
      id: "respondents",
      label: "Respondents",
      value: dashboardStats?.total_respondents ?? 0,
      note: "people recorded in the portal",
      icon: Users,
    },
    {
      id: "interactions",
      label: "Interactions",
      value: dashboardStats?.total_assessments ?? 0,
      note: "assessments and service touchpoints",
      icon: Activity,
    },
    {
      id: "active-projects",
      label: "Active Projects",
      value: dashboardStats?.active_projects ?? activeProjects.length,
      note: "currently running delivery streams",
      icon: FolderKanban,
    },
    {
      id: "flags-behind",
      label: "Flags Behind",
      value: dashboardStats?.indicators_behind ?? 0,
      note: "indicator areas needing attention",
      icon: AlertTriangle,
    },
  ];

  const visibleSummaryCards = summaryCards.filter(
    (card) => dashboardPreferences.summaryCards[card.id] !== false,
  );
  const visibleQuickLinks = dashboardQuickLinks.filter((link) => {
    if (isReadOnlyUser && (link.id === "respondents" || link.id === "aggregates")) return false;
    return dashboardPreferences.quickLinks[link.id] !== false;
  });
  const configurableHeroActions = heroActionDefinitions.filter(
    (action) => !(isReadOnlyUser && action.readOnlyHidden),
  );
  const configurableQuickLinks = dashboardQuickLinks.filter(
    (link) => !(isReadOnlyUser && link.readOnlyHidden),
  );

  return (
    <div className="space-y-8 pb-8">
      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize Home Dashboard</DialogTitle>
            <DialogDescription>
              Pick which sections, summary cards, and shortcut links you want to see on your home dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-border bg-transparent p-4">
              <div>
                <h3 className="font-semibold text-foreground">Sections</h3>
                <p className="text-sm text-muted-foreground">
                  Control the major panels that appear on the page.
                </p>
              </div>

              {[
                ["showWelcomeBanner", "Welcome banner", "The greeting, quick actions, and intro copy."],
                ["showSummaryStrip", "Summary strip", "The four KPI cards below the hero."],
                ["showUpdatesBoard", "Updates board", "The activity, deadlines, and projects board."],
                ["showFavoritesPanel", "Favorites panel", "Your quick-access shortcut cards."],
                ["showSpotlightPanel", "Project spotlight", "The current-focus projects panel."],
              ].map(([key, title, description]) => (
                <label
                  key={key}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">{title}</div>
                    <div className="text-sm text-muted-foreground">{description}</div>
                  </div>
                  <Switch
                    checked={
                      dashboardPreferences[
                        key as keyof Pick<
                          HomeDashboardPreferences,
                          | "showWelcomeBanner"
                          | "showSummaryStrip"
                          | "showUpdatesBoard"
                          | "showFavoritesPanel"
                          | "showSpotlightPanel"
                        >
                      ]
                    }
                    onCheckedChange={(checked) =>
                      setSectionPreference(
                        key as
                          | "showWelcomeBanner"
                          | "showSummaryStrip"
                          | "showUpdatesBoard"
                          | "showFavoritesPanel"
                          | "showSpotlightPanel",
                        checked,
                      )
                    }
                  />
                </label>
              ))}
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-transparent p-4">
              <div>
                <h3 className="font-semibold text-foreground">Widgets</h3>
                <p className="text-sm text-muted-foreground">
                  Fine-tune the cards and shortcuts inside the dashboard.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">Summary cards</div>
                {summaryCardDefinitions.map((card) => (
                  <label
                    key={card.id}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{card.label}</div>
                      <div className="text-sm text-muted-foreground">{card.note}</div>
                    </div>
                    <Switch
                      checked={dashboardPreferences.summaryCards[card.id] !== false}
                      onCheckedChange={(checked) => setSummaryCardPreference(card.id, checked)}
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">Hero action buttons</div>
                {configurableHeroActions.map((action) => (
                  <label
                    key={action.id}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{action.label}</div>
                      <div className="text-sm text-muted-foreground">Show this shortcut in the welcome banner.</div>
                    </div>
                    <Switch
                      checked={dashboardPreferences.heroActions[action.id] !== false}
                      onCheckedChange={(checked) => setHeroActionPreference(action.id, checked)}
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">Quick links</div>
                {configurableQuickLinks.map((link) => (
                  <label
                    key={link.id}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{link.label}</div>
                      <div className="text-sm text-muted-foreground">{link.description}</div>
                    </div>
                    <Switch
                      checked={dashboardPreferences.quickLinks[link.id] !== false}
                      onCheckedChange={(checked) => setQuickLinkPreference(link.id, checked)}
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-background px-4 py-3">
                <div>
                  <div className="font-medium text-foreground">Default board tab</div>
                  <div className="text-sm text-muted-foreground">
                    Choose which tab opens first in the updates board.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["activity", "deadlines", "projects"] as UpdatesTab[]).map((tab) => (
                    <Button
                      key={tab}
                      type="button"
                      variant={dashboardPreferences.defaultUpdatesTab === tab ? "default" : "outline"}
                      className={cn(
                        "capitalize",
                        dashboardPreferences.defaultUpdatesTab !== tab &&
                          "border-border bg-background text-foreground hover:bg-muted",
                      )}
                      onClick={() => setDefaultUpdatesTab(tab)}
                    >
                      {tab}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-background px-4 py-3">
                <div>
                  <div className="font-medium text-foreground">Charts</div>
                  <div className="text-sm text-muted-foreground">
                    Control how dashboard charts are rendered.
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trend-layout-select">Trend layout</Label>
                  <Select
                    value={dashboardPreferences.chartPreferences.trendLayout}
                    onValueChange={(value) =>
                      setChartPreference("trendLayout", value === "stacked" ? "stacked" : "grouped")
                    }
                  >
                    <SelectTrigger id="trend-layout-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grouped">Grouped bars</SelectItem>
                      <SelectItem value="stacked">Stacked bars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trend-series-limit-select">Visible trend series</Label>
                  <Select
                    value={String(dashboardPreferences.chartPreferences.trendSeriesLimit)}
                    onValueChange={(value) => {
                      const parsed = Number(value);
                      const seriesLimit = [1, 2, 3, 4, 5].includes(parsed) ? parsed : 3;
                      setChartPreference("trendSeriesLimit", seriesLimit as 1 | 2 | 3 | 4 | 5);
                    }}
                  >
                    <SelectTrigger id="trend-series-limit-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 series</SelectItem>
                      <SelectItem value="2">2 series</SelectItem>
                      <SelectItem value="3">3 series</SelectItem>
                      <SelectItem value="4">4 series</SelectItem>
                      <SelectItem value="5">5 series</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pathway-style-select">Pathway chart style</Label>
                  <Select
                    value={dashboardPreferences.chartPreferences.pathwayStyle}
                    onValueChange={(value) =>
                      setChartPreference("pathwayStyle", value === "pie" ? "pie" : "donut")
                    }
                  >
                    <SelectTrigger id="pathway-style-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="donut">Donut</SelectItem>
                      <SelectItem value="pie">Pie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3">
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">Trend legend</div>
                    <div className="text-sm text-muted-foreground">Show color labels below the monthly chart.</div>
                  </div>
                  <Switch
                    checked={dashboardPreferences.chartPreferences.showTrendLegend}
                    onCheckedChange={(checked) => setChartPreference("showTrendLegend", checked)}
                  />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-border bg-background text-foreground hover:bg-muted"
              onClick={resetDashboardPreferences}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Defaults
            </Button>
            <Button type="button" onClick={() => setPreferencesOpen(false)}>
              Save Layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="rounded-2xl border border-border bg-transparent p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Dashboard Filters
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter the home dashboard by project, organization, and reporting period.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-border bg-background text-foreground hover:bg-muted"
            onClick={clearDashboardFilters}
          >
            Clear Filters
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="home-dashboard-project-filter">Project</Label>
            <Select
              value={dashboardFilters.projectId}
              onValueChange={(value) =>
                setDashboardFilters((current) => ({
                  ...current,
                  projectId: value,
                }))
              }
            >
              <SelectTrigger id="home-dashboard-project-filter">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {(projectsData?.results || []).map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.code ? `${project.code} - ${project.name}` : project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="home-dashboard-organization-filter">Organization</Label>
            <OrganizationSelect
              organizations={organizations}
              value={dashboardFilters.organizationId}
              onChange={(value) =>
                setDashboardFilters((current) => ({
                  ...current,
                  organizationId: value,
                  projectId: "all",
                }))
              }
              includeAll
              allLabel="All organizations"
              placeholder="All organizations"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="home-dashboard-date-from">Date from</Label>
            <Input
              id="home-dashboard-date-from"
              type="date"
              value={dashboardFilters.dateFrom}
              onChange={(event) =>
                setDashboardFilters((current) => ({
                  ...current,
                  dateFrom: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="home-dashboard-date-to">Date to</Label>
            <Input
              id="home-dashboard-date-to"
              type="date"
              value={dashboardFilters.dateTo}
              onChange={(event) =>
                setDashboardFilters((current) => ({
                  ...current,
                  dateTo: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </section>

      {statsError ? (
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Dashboard stats failed to load. Core panels are still available.
        </section>
      ) : null}

      {statsLoading || projectsLoading || deadlinesLoading ? (
        <section className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          Refreshing dashboard data...
        </section>
      ) : null}

      <DashboardExecutiveBoard
        activeProjects={activeProjects}
        activeUpdatesTab={activeUpdatesTab}
        chartPreferences={dashboardPreferences.chartPreferences}
        deadlines={allUpcomingDeadlines}
        recentActivity={recentActivity}
        screeningInsights={screeningInsights}
        showFavoritesPanel={dashboardPreferences.showFavoritesPanel}
        showSpotlightPanel={dashboardPreferences.showSpotlightPanel}
        showSummaryStrip={dashboardPreferences.showSummaryStrip}
        showUpdatesBoard={dashboardPreferences.showUpdatesBoard}
        visibleQuickLinks={visibleQuickLinks}
        visibleSummaryCards={visibleSummaryCards}
        onActiveUpdatesTabChange={setActiveUpdatesTab}
      />
    </div>
  );
}
