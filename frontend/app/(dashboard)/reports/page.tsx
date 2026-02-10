"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Target,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Loader2,
  Plus,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PageHeader } from "@/components/shared/page-header";
import { OrganizationSelect } from "@/components/shared/organization-select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import {
  reportsService,
} from "@/lib/api";
import { ReportViewerDialog } from "@/components/shared/report-viewer";
import {
  useDashboardStats,
  useAllIndicators,
  useAllOrganizations,
  useAllAggregates,
  useProjects,
  useReports,
  useRespondentStats,
  useScheduledReports,
} from "@/lib/hooks/use-api";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  pending: "bg-warning/20 text-warning border-warning/30",
  processing: "bg-info/20 text-info border-info/30",
  completed: "bg-success/20 text-success border-success/30",
  failed: "bg-destructive/20 text-destructive border-destructive/30",
};

const categoryColors: Record<string, string> = {
  hiv_prevention: "hsl(var(--chart-1))",
  ncd: "hsl(var(--chart-3))",
  events: "hsl(var(--chart-4))",
};

const categoryLabels: Record<string, string> = {
  hiv_prevention: "HIV Prevention",
  ncd: "Non-Communicable Diseases",
  events: "Events",
};

const reportChartPalette = [
  "#1CE783",
  "#0EA5E9",
  "#F97316",
  "#A855F7",
  "#EF4444",
  "#14B8A6",
];

const downloadChartSvg = (containerId: string, filename: string) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  const svg = container.querySelector("svg");
  if (!svg) return;

  const cloned = svg.cloneNode(true) as SVGSVGElement;
  if (!cloned.getAttribute("xmlns")) {
    cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  const serializer = new XMLSerializer();
  const svgText = serializer.serializeToString(cloned);
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const SOCIAL_CONTRACTING_INDICATORS = [
  "Total Number of people Reached with HIV TESTING Messages",
  "Total Number of People Reached with PEP Messages",
  "Total Number of people Reached with PREP Messages",
  "Total Number of People Reached with Condom Use Messages",
  "Total Number of People Reached with HIV Treatment Messages",
  "Total Number of People Reached with ARV Based Prevention Messages",
  "Total Number of People Reached with EMTCT Messages",
  "Total Number of People Reached with GBV Messages",
];

const SOCIAL_CONTRACTING_EVENTS = [
  "Number of service providers receiving training",
  "Number of media platforms used per quarter",
  "Number of media engagements conducted",
  "Number of stigma reduction campaigns conducted during the project",
  "Number of target specific demand creation activities conducted",
  "Number of advocacy activities conducted per quarter",
  "Number of community led monitoring conducted for quality of service and human rights",
];

const SOCIAL_CONTRACTING_NCD = [
  "Total number of people reached with NCD prevention and Control messages",
  "Number of people engaged with NCD prevention and control messages through social media",
  "Number of people screened for NCDs behavioural risk factors",
  "Number of people screened for NCDs risk factors",
  "Number of people screened for breast cancer",
  "Number of people screened for prostate cancer",
  "Number of people screened for mental health",
  "Number of people reached with self-breast cancer examination education",
  "Number of people reached with prostate cancer education",
  "Number of people reached with cervical cancer education",
];

const normalizeName = (value: string) => value.trim().toLowerCase();

const extractAggregateTotal = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.total !== undefined) {
      const total = Number(record.total);
      return Number.isNaN(total) ? 0 : total;
    }
    const male = Number(record.male ?? 0);
    const female = Number(record.female ?? 0);
    const sum = male + female;
    return Number.isNaN(sum) ? 0 : sum;
  }
  return 0;
};

export default function ReportsPage() {
  const { toast } = useToast();
  const [projectFilter, setProjectFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("2025");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const [reportName, setReportName] = useState("");
  const [reportType, setReportType] = useState<"indicator_summary" | "project_progress" | "respondent_demographics" | "custom">("indicator_summary");
  const [reportProjectId, setReportProjectId] = useState("all");
  const [reportIndicatorId, setReportIndicatorId] = useState("all");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");
  const [reportFormat, setReportFormat] = useState<"pdf" | "excel" | "csv">("pdf");
  const [scheduleFrequency, setScheduleFrequency] = useState<"daily" | "weekly" | "monthly" | "quarterly">("monthly");
  const [scheduleRecipients, setScheduleRecipients] = useState("");
  const [activeIndicatorIndex, setActiveIndicatorIndex] = useState<number | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportOrgId, setReportOrgId] = useState("all");
  const [reportDateMode, setReportDateMode] = useState<"quarter" | "dates">("quarter");
  const now = new Date();
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;
  const [reportQuarter, setReportQuarter] = useState(currentQuarter);
  const [reportYear, setReportYear] = useState(now.getFullYear().toString());
  const [reportRangeFrom, setReportRangeFrom] = useState("");
  const [reportRangeTo, setReportRangeTo] = useState("");

  const { data: projectsData } = useProjects();
  const { data: indicatorsData } = useAllIndicators();
  const { data: organizationsData } = useAllOrganizations();
  const { data: reportsData, mutate: mutateReports } = useReports();
  const { data: scheduledReportsData, mutate: mutateScheduled } = useScheduledReports();
  const { data: aggregatesData } = useAllAggregates({
    project: projectFilter !== "all" ? projectFilter : undefined,
    organization: reportOrgId !== "all" ? reportOrgId : undefined,
    date_from: reportRangeFrom || undefined,
    date_to: reportRangeTo || undefined,
  });
  const { data: dashboardStats } = useDashboardStats(
    projectFilter === "all" ? undefined : Number(projectFilter),
  );
  const { data: respondentStats } = useRespondentStats();

  const projects = projectsData?.results || [];
  const indicators = indicatorsData || [];
  const organizations = organizationsData || [];
  const reports = reportsData?.results || [];
  const scheduledReports = scheduledReportsData || [];
  const aggregates = aggregatesData || [];

  useEffect(() => {
    if (reportDateMode !== "quarter") return;
    const yearNum = Number(reportYear);
    if (Number.isNaN(yearNum)) return;
    const ranges: Record<string, { start: string; end: string }> = {
      Q1: { start: `${reportYear}-01-01`, end: `${reportYear}-03-31` },
      Q2: { start: `${reportYear}-04-01`, end: `${reportYear}-06-30` },
      Q3: { start: `${reportYear}-07-01`, end: `${reportYear}-09-30` },
      Q4: { start: `${reportYear}-10-01`, end: `${reportYear}-12-31` },
    };
    const range = ranges[reportQuarter] || ranges.Q1;
    setReportRangeFrom(range.start);
    setReportRangeTo(range.end);
  }, [reportDateMode, reportQuarter, reportYear]);

  const indicatorLookup = useMemo(() => {
    return indicators.reduce<Record<string, { id: string; name: string }>>((acc, indicator) => {
      acc[normalizeName(indicator.name)] = { id: indicator.id, name: indicator.name };
      return acc;
    }, {});
  }, [indicators]);

  const totalsByIndicatorId = useMemo(() => {
    const totals = new Map<string, number>();
    aggregates.forEach((agg) => {
      const value = extractAggregateTotal(agg.value);
      totals.set(agg.indicator, (totals.get(agg.indicator) || 0) + value);
    });
    return totals;
  }, [aggregates]);

  const buildSeriesFromNames = (names: string[]) => {
    return names.map((name) => {
      const match = indicatorLookup[normalizeName(name)];
      const indicatorId = match?.id;
      return {
        name,
        indicatorId: indicatorId || "",
        total: indicatorId ? totalsByIndicatorId.get(indicatorId) || 0 : 0,
        missing: !indicatorId,
      };
    });
  };

  const hivPreventionSeries = useMemo(
    () => buildSeriesFromNames(SOCIAL_CONTRACTING_INDICATORS),
    [indicatorLookup, totalsByIndicatorId],
  );
  const eventsSeries = useMemo(
    () => buildSeriesFromNames(SOCIAL_CONTRACTING_EVENTS),
    [indicatorLookup, totalsByIndicatorId],
  );
  const ncdSeries = useMemo(
    () => buildSeriesFromNames(SOCIAL_CONTRACTING_NCD),
    [indicatorLookup, totalsByIndicatorId],
  );

  const hivPieData = useMemo(
    () =>
      hivPreventionSeries.map((item, index) => ({
        name: item.name,
        value: item.total,
        color: reportChartPalette[index % reportChartPalette.length],
      })),
    [hivPreventionSeries],
  );

  const reportStatusCounts = useMemo(() => {
    const statusMap = new Map<string, number>();
    reports.forEach((report) => {
      statusMap.set(report.status, (statusMap.get(report.status) || 0) + 1);
    });
    return Array.from(statusMap.entries()).map(([name, value], index) => ({
      name,
      value,
      color: reportChartPalette[index % reportChartPalette.length],
    }));
  }, [reports]);

  const indicatorBreakdown = useMemo(() => {
    const categories = new Map<string, number>();
    indicators.forEach((indicator) => {
      const category = indicator.category || "hiv_prevention";
      categories.set(category, (categories.get(category) || 0) + 1);
    });
    return Array.from(categories.entries()).map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name] || "hsl(var(--muted))",
      label: categoryLabels[name] || name,
    }));
  }, [indicators]);

  const genderData = useMemo(() => {
    const entries = respondentStats?.by_gender || [];
    return entries.map((entry: { gender: string | null; count: number }, index) => ({
      name: entry.gender || "Unknown",
      value: entry.count,
      color: reportChartPalette[index % reportChartPalette.length],
    }));
  }, [respondentStats]);

  const handleCreateReport = async () => {
    if (!reportName) {
      toast({
        title: "Missing report name",
        description: "Please provide a name for the report.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await reportsService.create({
        name: reportName,
        type: reportType,
        parameters: {
          project_id: reportProjectId !== "all" ? Number(reportProjectId) : undefined,
          indicator_ids: reportIndicatorId !== "all" ? [Number(reportIndicatorId)] : undefined,
          date_from: reportDateFrom || undefined,
          date_to: reportDateTo || undefined,
          format: reportFormat,
        },
      });
      await reportsService.generate(created.id);
      toast({
        title: "Report started",
        description: "Report data has been generated.",
      });
      setIsDialogOpen(false);
      setReportName("");
      setReportType("indicator_summary");
      setReportProjectId("all");
      setReportIndicatorId("all");
      setReportDateFrom("");
      setReportDateTo("");
      setReportFormat("pdf");
      mutateReports();
    } catch (err) {
      console.error("Failed to create report", err);
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (report: any) => {
    try {
      const format = (report?.parameters?.format as "pdf" | "excel" | "csv") || "excel";
      const blob = await reportsService.download(report.id, format);
      const ext = format === "excel" ? "xlsx" : format === "csv" ? "csv" : "csv";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report?.name || `report-${report.id}`}.${ext}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download report", err);
      toast({
        title: "Download failed",
        description: "Unable to download report.",
        variant: "destructive",
      });
    }
  };

  const openViewer = (report: any) => {
    setActiveReport(report);
    setViewOpen(true);
  };

  const refreshActiveReport = async () => {
    if (!activeReport?.id) return;
    setIsGenerating(true);
    try {
      const updated = await reportsService.generate(activeReport.id);
      setActiveReport(updated);
      mutateReports();
    } catch (err) {
      console.error("Failed to generate report", err);
      toast({
        title: "Error",
        description: "Failed to generate report data.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!reportName) {
      toast({
        title: "Missing report name",
        description: "Please provide a name for the scheduled report.",
        variant: "destructive",
      });
      return;
    }
    setIsScheduling(true);
    try {
      const recipients = scheduleRecipients
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      await reportsService.createScheduled({
        report_name: reportName,
        report_type: reportType,
        frequency: scheduleFrequency,
        recipients,
        parameters: {
          project_id: reportProjectId !== "all" ? Number(reportProjectId) : undefined,
          indicator_ids: reportIndicatorId !== "all" ? [Number(reportIndicatorId)] : undefined,
          date_from: reportDateFrom || undefined,
          date_to: reportDateTo || undefined,
          format: reportFormat,
        },
      });
      toast({
        title: "Schedule saved",
        description: "Scheduled report created.",
      });
      setIsScheduleOpen(false);
      setScheduleRecipients("");
      mutateScheduled();
    } catch (err) {
      console.error("Failed to schedule report", err);
      toast({
        title: "Error",
        description: "Failed to create scheduled report.",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports & Analysis"
        description="Generate reports, analyze data, and export insights"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports" },
        ]}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule Report</DialogTitle>
                <DialogDescription>
                  Create a recurring report with the same filters.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-name">Report Name</Label>
                  <Input
                    id="schedule-name"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Monthly Summary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule-type">Type</Label>
                  <Select value={reportType} onValueChange={(value) => setReportType(value as typeof reportType)}>
                    <SelectTrigger id="schedule-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indicator_summary">Indicator Summary</SelectItem>
                      <SelectItem value="project_progress">Project Progress</SelectItem>
                      <SelectItem value="respondent_demographics">Respondent Demographics</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule-frequency">Frequency</Label>
                  <Select value={scheduleFrequency} onValueChange={(value) => setScheduleFrequency(value as typeof scheduleFrequency)}>
                    <SelectTrigger id="schedule-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule-recipients">Recipients (comma separated)</Label>
                  <Input
                    id="schedule-recipients"
                    value={scheduleRecipients}
                    onChange={(e) => setScheduleRecipients(e.target.value)}
                    placeholder="user1@example.com, user2@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSchedule} disabled={isScheduling}>
                  {isScheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Generate Report</DialogTitle>
                <DialogDescription>
                  Create a new report based on current data.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input
                    id="report-name"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Quarterly Summary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-type">Type</Label>
                  <Select value={reportType} onValueChange={(value) => setReportType(value as typeof reportType)}>
                    <SelectTrigger id="report-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indicator_summary">Indicator Summary</SelectItem>
                      <SelectItem value="project_progress">Project Progress</SelectItem>
                      <SelectItem value="respondent_demographics">Respondent Demographics</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-project">Project (optional)</Label>
                  <Select value={reportProjectId} onValueChange={setReportProjectId}>
                    <SelectTrigger id="report-project">
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-indicator">Indicator (optional)</Label>
                  <Select value={reportIndicatorId} onValueChange={setReportIndicatorId}>
                    <SelectTrigger id="report-indicator">
                      <SelectValue placeholder="All indicators" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All indicators</SelectItem>
                      {indicators.map((indicator) => (
                        <SelectItem key={indicator.id} value={String(indicator.id)}>
                          {indicator.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="report-from">From</Label>
                    <Input
                      id="report-from"
                      type="date"
                      value={reportDateFrom}
                      onChange={(e) => setReportDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="report-to">To</Label>
                    <Input
                      id="report-to"
                      type="date"
                      value={reportDateTo}
                      onChange={(e) => setReportDateTo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-format">Format</Label>
                  <Select value={reportFormat} onValueChange={(value) => setReportFormat(value as typeof reportFormat)}>
                    <SelectTrigger id="report-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateReport} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
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
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Respondents</CardDescription>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.total_respondents ?? 0}</div>
            <p className="text-xs text-muted-foreground">Registered respondents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Active Projects</CardDescription>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.active_projects ?? 0}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Indicators</CardDescription>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.total_indicators ?? indicators.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {projects.length} projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Flags Behind</CardDescription>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{dashboardStats?.indicators_behind ?? 0}</div>
            <p className="text-xs text-muted-foreground">Indicators behind target</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">
            <TrendingUp className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="social-contracting">
            <BarChart3 className="mr-2 h-4 w-4" />
            Social Contracting
          </TabsTrigger>
          <TabsTrigger value="indicators">
            <PieChart className="mr-2 h-4 w-4" />
            Indicators
          </TabsTrigger>
          <TabsTrigger value="demographics">
            <Users className="mr-2 h-4 w-4" />
            Demographics
          </TabsTrigger>
          <TabsTrigger value="saved">
            <FileText className="mr-2 h-4 w-4" />
            Saved Reports
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Calendar className="mr-2 h-4 w-4" />
            Scheduled
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Report Status</CardTitle>
                  <CardDescription>Generated reports by status</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadChartSvg("report-status-chart", "report-status")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Chart
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" id="report-status-chart">
                  {reportStatusCounts.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No reports generated yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportStatusCounts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          radius={[4, 4, 0, 0]}
                          fillOpacity={0.85}
                          stroke="rgba(16, 24, 40, 0.2)"
                          strokeWidth={1}
                          barSize={30}
                        >
                          {reportStatusCounts.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest dashboard activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(dashboardStats?.recent_activity || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No recent activity yet.
                  </div>
                ) : (
                  dashboardStats?.recent_activity.map((item, index) => (
                    <div key={`${item.type}-${index}`} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="social-contracting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Contracting Report</CardTitle>
              <CardDescription>
                Auto-populated from aggregate entries for the selected project, organization, and period.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
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
                </div>
                <div className="space-y-2">
                                    <Label>Organization</Label>
                  <OrganizationSelect
                    organizations={organizations}
                    value={formOrg}
                    onChange={setFormOrg}
                    includeAll
                    allLabel="All organizations"
                    placeholder="Select organization"
                  /></div>
                <div className="space-y-2">
                  <Label>Period Mode</Label>
                  <Select value={reportDateMode} onValueChange={(value) => setReportDateMode(value as "quarter" | "dates")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quarter">Quarter</SelectItem>
                      <SelectItem value="dates">Custom dates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {reportDateMode === "quarter" ? (
                  <div className="space-y-2">
                    <Label>Quarter / Year</Label>
                    <div className="flex gap-2">
                      <Select value={reportQuarter} onValueChange={setReportQuarter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Quarter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Q1">Q1</SelectItem>
                          <SelectItem value="Q2">Q2</SelectItem>
                          <SelectItem value="Q3">Q3</SelectItem>
                          <SelectItem value="Q4">Q4</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={reportYear} onChange={(event) => setReportYear(event.target.value)} placeholder="Year" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={reportRangeFrom} onChange={(event) => setReportRangeFrom(event.target.value)} />
                      <Input type="date" value={reportRangeTo} onChange={(event) => setReportRangeTo(event.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>HIV Prevention Messaging</CardTitle>
                  <CardDescription>Totals by message type</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadChartSvg("hiv-prevention-bar", "hiv-prevention-messaging")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Chart
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]" id="hiv-prevention-bar">
                  {hivPreventionSeries.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No aggregate data available.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hivPreventionSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                          {hivPreventionSeries.map((entry, index) => (
                            <Cell key={entry.name} fill={reportChartPalette[index % reportChartPalette.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>HIV Prevention Distribution</CardTitle>
                  <CardDescription>Share by indicator total</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadChartSvg("hiv-prevention-pie", "hiv-prevention-distribution")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Chart
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]" id="hiv-prevention-pie">
                  {hivPieData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No aggregate data available.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={hivPieData} dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={2}>
                          {hivPieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} stroke="hsl(var(--background))" />
                          ))}
                        </Pie>
                        <Tooltip
                          cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Events & Outreach</CardTitle>
                <CardDescription>Activity totals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {eventsSeries.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span className="max-w-[260px] truncate">{item.name}</span>
                    <span className="font-medium">{item.total.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>NCD Prevention</CardTitle>
                <CardDescription>NCD indicator totals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ncdSeries.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span className="max-w-[260px] truncate">{item.name}</span>
                    <span className="font-medium">{item.total.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Indicator Totals</CardTitle>
              <CardDescription>Combined list for the report.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Indicator</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...hivPreventionSeries, ...eventsSeries, ...ncdSeries].map((item) => (
                    <tr key={item.name} className="border-b last:border-0">
                      <td className="py-2 pr-4">{item.name}</td>
                      <td className="py-2 pr-4">
                        {SOCIAL_CONTRACTING_NCD.includes(item.name)
                          ? "NCD"
                          : SOCIAL_CONTRACTING_EVENTS.includes(item.name)
                            ? "Events"
                            : "HIV Prevention"}
                      </td>
                      <td className="py-2 pr-4 text-right">{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicators" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Indicator Distribution</CardTitle>
                  <CardDescription>Breakdown by indicator category</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadChartSvg("indicator-breakdown-pie", "indicator-distribution")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Chart
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" id="indicator-breakdown-pie">
                  {indicatorBreakdown.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No indicators available.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={indicatorBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          activeIndex={activeIndicatorIndex ?? undefined}
                          onMouseEnter={(_, index) => setActiveIndicatorIndex(index)}
                          onMouseLeave={() => setActiveIndicatorIndex(null)}
                        >
                          {indicatorBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" />
                          ))}
                        </Pie>
                        <Tooltip
                          cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {indicatorBreakdown.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.label}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indicators</CardTitle>
                <CardDescription>Active indicator list</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {indicators.slice(0, 8).map((indicator) => (
                  <div key={indicator.id} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[220px]">{indicator.name}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {categoryLabels[indicator.category] || indicator.category}
                    </Badge>
                  </div>
                ))}
                {indicators.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No indicators available.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Respondents by gender</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadChartSvg("gender-distribution-bar", "gender-distribution")}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Chart
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]" id="gender-distribution-bar">
                {genderData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No demographic data available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genderData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                        fillOpacity={0.85}
                        stroke="rgba(16, 24, 40, 0.2)"
                        strokeWidth={1}
                        barSize={30}
                      >
                        {genderData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
              <CardDescription>
                Previously generated reports available for download
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No reports generated yet.
                  </div>
                ) : (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <FileSpreadsheet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{report.name}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className={statusColors[report.status]}>
                              {report.status}
                            </Badge>
                            <span>{(report.type || "custom").replace("_", " ")}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openViewer(report)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(report)}
                          disabled={report.status !== "completed"}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <ReportViewerDialog
          open={viewOpen}
          onOpenChange={setViewOpen}
          report={activeReport}
          onRefresh={refreshActiveReport}
          onDownload={() => {
            if (activeReport) return handleDownload(activeReport);
          }}
          refreshing={isGenerating}
        />


        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Recurring reports created by you or shared.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduledReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scheduled reports yet.</p>
              ) : (
                <div className="space-y-2">
                  {scheduledReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{report.report_name}</span>
                        <span className="text-muted-foreground">
                          {report.report_type.replace("_", " ")} â€¢ {report.frequency}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={report.is_active ? "default" : "secondary"}>
                          {report.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}



