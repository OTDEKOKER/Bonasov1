"use client";

import { useMemo, useState } from "react";
import {
  Download,
  FilePlus2,
  Filter,
  Loader2,
  Eye,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { OrganizationSelect } from "@/components/shared/organization-select";
import { useToast } from "@/hooks/use-toast";
import { reportsService } from "@/lib/api";
import { ReportViewerDialog } from "@/components/shared/report-viewer";
import {
  useAllIndicators,
  useAllOrganizations,
  useProjects,
  useReports,
} from "@/lib/hooks/use-api";

const reportTypeLabels: Record<string, string> = {
  indicator_summary: "Indicator Summary",
  project_progress: "Project Progress",
  respondent_demographics: "Respondent Demographics",
  custom: "Custom",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-success/20 text-success border-success/30">Completed</Badge>;
    case "failed":
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Failed</Badge>;
    case "processing":
      return <Badge className="bg-warning/20 text-warning border-warning/30">Processing</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
};

export default function ReportsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("indicator_summary");
  const [formProject, setFormProject] = useState("all");
  const [formOrg, setFormOrg] = useState("all");
  const [formIndicators, setFormIndicators] = useState<string[]>([]);
  const [formDateFrom, setFormDateFrom] = useState("");
  const [formDateTo, setFormDateTo] = useState("");
  const [formFormat, setFormFormat] = useState<"excel" | "csv">("excel");

  const { data: reportsData, isLoading, error, mutate } = useReports();
  const { data: projectsData } = useProjects();
  const { data: indicatorsData } = useAllIndicators();
  const { data: organizationsData } = useAllOrganizations();

  const reports = reportsData?.results || [];
  const projects = projectsData?.results || [];
  const indicators = indicatorsData || [];
  const organizations = organizationsData?.results || [];

  const filteredReports = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return reports.filter((report) => {
      const matchesSearch =
        report.name.toLowerCase().includes(query) ||
        report.type.toLowerCase().includes(query);
      const matchesType = typeFilter === "all" || report.type === typeFilter;
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [reports, searchQuery, typeFilter, statusFilter]);

  const resetForm = () => {
    setFormName("");
    setFormType("indicator_summary");
    setFormProject("all");
    setFormOrg("all");
    setFormIndicators([]);
    setFormDateFrom("");
    setFormDateTo("");
    setFormFormat("excel");
  };

  const handleCreate = async () => {
    if (!formName || !formType) {
      toast({
        title: "Missing fields",
        description: "Please provide a report name and type.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await reportsService.create({
        name: formName,
        type: formType as "indicator_summary" | "project_progress" | "respondent_demographics" | "custom",
        parameters: {
          project_id: formProject !== "all" ? Number(formProject) : undefined,
          organization_id: formOrg !== "all" ? Number(formOrg) : undefined,
          indicator_ids: formIndicators.length ? formIndicators.map((id) => Number(id)) : undefined,
          date_from: formDateFrom || undefined,
          date_to: formDateTo || undefined,
          format: formFormat,
        },
      });
      // Backend report generation is synchronous right now, so generate immediately.
      await reportsService.generate(created.id);
      toast({
        title: "Report ready",
        description: "Your report has been generated.",
      });
      resetForm();
      setIsDialogOpen(false);
      mutate();
    } catch (err) {
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
      const format: "excel" | "csv" = report?.parameters?.format === "csv" ? "csv" : "excel";
      const blob = await reportsService.download(report.id, format);
      const ext = format === "excel" ? "xlsx" : "csv";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.name || "report"}.${ext}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: "Download failed",
        description: "Unable to download this report.",
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
      mutate();
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
        <p className="text-muted-foreground">Failed to load reports</p>
        <Button onClick={() => mutate()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate, track, and download reports"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Analysis", href: "/analysis" },
          { label: "Reports" },
        ]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FilePlus2 className="mr-2 h-4 w-4" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Report</DialogTitle>
                <DialogDescription>
                  Configure a report and generate it.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input
                    id="report-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Q3 Indicator Summary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select value={formProject} onValueChange={setFormProject}>
                      <SelectTrigger>
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
                                      <Label>Organization</Label>
                  <OrganizationSelect
                    organizations={organizations}
                    value={formOrg}
                    onChange={setFormOrg}
                    includeAll
                    allLabel="All organizations"
                    placeholder="Select organization"
                  /></div>
                </div>

                <div className="space-y-2">
                  <Label>Indicators (optional)</Label>
                  <Select
                    value={formIndicators[0] || "all"}
                    onValueChange={(value) => setFormIndicators(value === "all" ? [] : [value])}
                  >
                    <SelectTrigger>
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
                    <Label>Date From</Label>
                    <Input type="date" value={formDateFrom} onChange={(e) => setFormDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date To</Label>
                    <Input type="date" value={formDateTo} onChange={(e) => setFormDateTo(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={formFormat} onValueChange={(value) => setFormFormat(value as "excel" | "csv")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
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
                <Button onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />{" "}
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="indicator_summary">Indicator Summary</SelectItem>
            <SelectItem value="project_progress">Project Progress</SelectItem>
            <SelectItem value="respondent_demographics">Respondent Demographics</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredReports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No reports available.
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Report</p>
                  <p className="text-base font-semibold">{report.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {reportTypeLabels[report.type] || report.type}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(report.status)}
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
                    disabled={report.status !== "completed"}
                    onClick={() => handleDownload(report)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Created: {new Date(report.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      <ReportViewerDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        report={activeReport}
        onRefresh={refreshActiveReport}
        onDownload={() => (activeReport ? handleDownload(activeReport) : undefined)}
        refreshing={isGenerating}
      />
    </div>
  );
}



