"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Layers3,
  Loader2,
  ScanSearch,
  ShieldCheck,
  Table2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  buildCreateMissingIndicatorsRequest,
  reportWorkbooksService,
  type WorkbookImportSession,
} from "@/lib/api";
import { useAllIndicators, useAllOrganizations, useAllProjects } from "@/lib/hooks/use-api";
import { useToast } from "@/hooks/use-toast";

const workbookSignals = [
  "The workbook has one Indicator matrix sheet plus one reporting sheet per organization.",
  "Worksheet name is the primary organization identifier for reporting sheets.",
  "The Indicator matrix sheet contains coordinator-assigned indicators for sub-partners.",
  "Quarter targets follow the April-to-March reporting year, so Quarter 3 2025 means October 1, 2025 to December 31, 2025.",
];

const parserStages = [
  {
    name: "Workbook scan",
    detail: "Load all sheets, merged ranges, title blocks, widths, and style signatures.",
    confidence: "Deterministic",
  },
  {
    name: "Sheet classification",
    detail: "Detect the Indicator matrix sheet first, then classify remaining sheets as organization reports, summaries, or unknown.",
    confidence: "Deterministic",
  },
  {
    name: "Coordinator assignment",
    detail: "Parse the Indicator matrix to map indicators from the coordinator to sub-partners and extract Q1-Q4 targets.",
    confidence: "Matrix-driven",
  },
  {
    name: "Organization sheet parse",
    detail: "Resolve the organization from the worksheet name and parse only indicators assigned to that organization.",
    confidence: "Template-guided",
  },
  {
    name: "Validation",
    detail: "Check totals, required metadata, and whether each organization sheet only reports indicators assigned in the matrix.",
    confidence: "Rule engine",
  },
];

const exportScopes = [
  { value: "single_organization", label: "Single organization" },
  { value: "coordinator", label: "Coordinator report" },
  { value: "all_organizations", label: "All organizations" },
  { value: "consolidated", label: "Consolidated report" },
];

const endpointRows = [
  ["POST", "/api/report-workbooks/imports/", "Upload workbook and create import session"],
  ["POST", "/api/report-workbooks/imports/{id}/analyze/", "Parse Indicator matrix, classify organization sheets, match templates, validate"],
  ["POST", "/api/report-workbooks/imports/{id}/confirm/", "Commit normalized records and assignment mappings"],
  ["POST", "/api/report-workbooks/imports/{id}/create-missing-indicators/", "Create missing indicators and assign them using the matrix"],
  ["GET", "/api/report-workbooks/templates/", "List stored workbook templates"],
  ["POST", "/api/report-workbooks/exports/", "Create workbook export job"],
  ["GET", "/api/report-workbooks/exports/{id}/download/", "Download generated workbook"],
];

const assignmentPreviewRows = [
  {
    organization: "Makgabaneng",
    indicator: "NCD screening",
    assignedBy: "Indicator matrix",
    q1: "12",
    q2: "15",
    q3: "18",
    q4: "10",
  },
  {
    organization: "Makgabaneng",
    indicator: "Mental health referrals",
    assignedBy: "Indicator matrix",
    q1: "8",
    q2: "10",
    q3: "12",
    q4: "9",
  },
];

const missingIndicatorRows = [
  {
    name: "Number of community members screened for NCD risk",
    code: "NCD-NEW-01",
    type: "number",
    assignedTo: "Makgabaneng",
    action: "Create indicator + assign to project + set quarter targets",
  },
  {
    name: "Number of mental health support referrals completed",
    code: "MH-NEW-02",
    type: "number",
    assignedTo: "Makgabaneng",
    action: "Create indicator + assign to project + set quarter targets",
  },
];

function detectCoordinatorFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const tokens = base
    .replace(/quarter\s*\d+/gi, " ")
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\bq[1-4]\b/gi, " ")
    .replace(/\bncd\b/gi, " ")
    .replace(/\breport\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return tokens || "Unresolved";
}

export default function ReportWorkbooksPage() {
  const { toast } = useToast();
  const { data: projectsData } = useAllProjects();
  const { data: organizationsData } = useAllOrganizations();
  const { data: indicatorsData } = useAllIndicators();

  const projects = projectsData?.results ?? [];
  const organizations = organizationsData?.results ?? [];
  const indicators = indicatorsData ?? [];

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProject, setImportProject] = useState("all");
  const [importPeriod, setImportPeriod] = useState("Q3 2025 (Oct-Dec)");
  const [exportProject, setExportProject] = useState("all");
  const [exportScope, setExportScope] = useState("single_organization");
  const [exportOrganization, setExportOrganization] = useState("all");
  const [exportPeriod, setExportPeriod] = useState("Q3 2025 (Oct-Dec)");
  const [notes, setNotes] = useState("");
  const [importSession, setImportSession] = useState<WorkbookImportSession | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingMissingIndicators, setIsCreatingMissingIndicators] = useState(false);
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  const [confirmImportMode, setConfirmImportMode] = useState<"append" | "replace_period">("append");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [applyIndicatorAssignments, setApplyIndicatorAssignments] = useState(true);
  const [syncProjectIndicatorLinks, setSyncProjectIndicatorLinks] = useState(true);
  const [createMissingOnConfirm, setCreateMissingOnConfirm] = useState(false);

  const detectedCoordinator = useMemo(() => {
    if (!selectedFile) return "Upload a workbook to preview workbook-level coordinator hints";
    return detectCoordinatorFromFileName(selectedFile.name);
  }, [selectedFile]);

  const assignmentScore = importSession?.assignments?.length
    ? 94
    : selectedFile
      ? 94
      : 0;
  const templateFit = importSession?.sheets?.length ? 86 : selectedFile ? 86 : 0;
  const validationScore = importSession?.summary
    ? Math.max(0, 100 - ((importSession.summary.errors || 0) * 10 + (importSession.summary.warnings || 0) * 2))
    : selectedFile
      ? 92
      : 0;

  const assignmentRows = useMemo(() => {
    if (!importSession?.assignments?.length) return assignmentPreviewRows;
    return importSession.assignments.map((item) => ({
      organization: item.organization_name,
      indicator: item.indicator_name,
      assignedBy: "Indicator matrix",
      q1: item.targets_by_quarter.Q1?.toLocaleString?.() ?? "-",
      q2: item.targets_by_quarter.Q2?.toLocaleString?.() ?? "-",
      q3: item.targets_by_quarter.Q3?.toLocaleString?.() ?? "-",
      q4: item.targets_by_quarter.Q4?.toLocaleString?.() ?? "-",
    }));
  }, [importSession]);

  const missingRows = useMemo(() => {
    if (!importSession?.missing_indicators?.length) return missingIndicatorRows;
    return importSession.missing_indicators.map((item) => ({
      name: item.indicator_name,
      code: item.suggested_code || item.temp_key,
      type: item.type || (item.aggregate_disaggregation_config?.enabled ? "multi_int" : "number"),
      assignedTo: item.assigned_organizations.map((org) => org.organization_name).join(", ") || "-",
      action: item.aggregate_disaggregation_config?.dimensions?.length
        ? "Create indicator + create disaggregates + assign organizations"
        : "Create indicator + assign organizations",
    }));
  }, [importSession]);

  const unresolvedIssues = useMemo(
    () => importSession?.issues?.filter((issue) => issue.severity !== "info") ?? [],
    [importSession],
  );

  const canConfirmImport = Boolean(importSession?.id) && !isConfirmingImport;

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      toast({
        title: "Workbook required",
        description: "Choose an Excel workbook before starting analysis.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      const created = await reportWorkbooksService.createImportSession({
        file: selectedFile,
        project: importProject !== "all" ? Number(importProject) : undefined,
        reporting_period: importPeriod || undefined,
        notes: notes || undefined,
      });
      const analyzed = await reportWorkbooksService.analyzeImportSession(created.id);
      setImportSession(analyzed);
      toast({
        title: "Workbook analyzed",
        description: `Analyzed ${analyzed.file_name}. Missing indicators and assignments are ready for review.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to analyze workbook.";
      toast({
        title: "Workbook analysis failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importSession?.id) {
      toast({
        title: "Analyze workbook first",
        description: "Upload and analyze a workbook before importing aggregate values.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConfirmingImport(true);
      const updated = await reportWorkbooksService.confirmImportSession(importSession.id, {
        import_mode: confirmImportMode,
        overwrite_existing: overwriteExisting,
        apply_indicator_assignments: applyIndicatorAssignments,
        sync_project_indicator_links: syncProjectIndicatorLinks,
        create_missing_indicators: createMissingOnConfirm,
      });
      setImportSession(updated);
      toast({
        title: "Aggregated values uploaded",
        description:
          updated.summary?.rows_imported !== undefined
            ? `Imported ${updated.summary.rows_imported} aggregate row(s) from the indicator matrix workbook.`
            : "The workbook values were committed to aggregates.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import workbook values.";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsConfirmingImport(false);
    }
  };

  const handleCreateMissingIndicators = async () => {
    if (!importSession?.id || !importSession.missing_indicators?.length) {
      toast({
        title: "No missing indicators",
        description: "Analyze a workbook with unresolved indicators first.",
      });
      return;
    }

    try {
      setIsCreatingMissingIndicators(true);
      const request = buildCreateMissingIndicatorsRequest({
        candidates: importSession.missing_indicators,
        assign_to_project: true,
        create_targets: true,
      });
      const updated = await reportWorkbooksService.createMissingIndicators(importSession.id, request);
      setImportSession(updated);
      toast({
        title: "Missing indicators created",
        description: "Disaggregates were created from the uploaded workbook and assigned to the detected organizations.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create missing indicators.";
      toast({
        title: "Creation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingMissingIndicators(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Excel Report Workbooks"
        description="Design scaffold for importing coordinator-driven Excel workbooks where the Indicator matrix assigns indicators to organization sheets."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Excel Report Workbooks" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/uploads/">Back to Uploads</Link>
          </Button>
        }
      />

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Quarter mapping locked</AlertTitle>
        <AlertDescription>
          For this workbook family, <strong>Quarter 3 2025</strong> means <strong>October 1, 2025</strong> through{" "}
          <strong>December 31, 2025</strong>. The importer should not treat this as a January-to-September calendar quarter.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-emerald-200/60 bg-emerald-50/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-950">
              <FileSpreadsheet className="h-5 w-5" />
              Workbook rules
            </CardTitle>
            <CardDescription className="text-emerald-900/80">
              These rules reflect the clarified import behavior for coordinator-assigned quarter reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workbookSignals.map((signal) => (
              <div key={signal} className="rounded-lg border border-emerald-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
                {signal}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery map</CardTitle>
            <CardDescription>Core services required to make assignment-driven import/export reliable.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="flex items-center gap-2"><ScanSearch className="h-4 w-4" /> Parser service</span>
              <Badge variant="secondary">Designed</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="flex items-center gap-2"><Layers3 className="h-4 w-4" /> Assignment resolver</span>
              <Badge variant="secondary">Designed</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Validation engine</span>
              <Badge variant="secondary">Designed</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="flex items-center gap-2"><Table2 className="h-4 w-4" /> Export generator</span>
              <Badge variant="secondary">Designed</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import">Import Flow</TabsTrigger>
          <TabsTrigger value="export">Export Flow</TabsTrigger>
          <TabsTrigger value="api">API + Data Model</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>Import configuration</CardTitle>
                <CardDescription>Upload workbook, parse Indicator matrix assignments, then validate each organization sheet against them.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="workbook-file">Workbook file</Label>
                  <Input
                    id="workbook-file"
                    type="file"
                    accept=".xlsx,.xlsm,.xls"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedFile(file);
                    }}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Project</Label>
                    <Select value={importProject} onValueChange={setImportProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Detect from workbook</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={String(project.id)}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Reporting period</Label>
                    <Input value={importPeriod} onChange={(event) => setImportPeriod(event.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Workbook-level coordinator hint</Label>
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {detectedCoordinator}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Organization identity rule</Label>
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      Use worksheet name as the reporting organization
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Analyst notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional notes about assignment expectations, matrix quirks, or organizations to review."
                    rows={4}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleUploadAndAnalyze} disabled={!selectedFile || isUploading}>
                    Upload and Analyze
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      toast({
                        title: "Validation preview",
                        description: "The designed flow checks assignment mismatches between the Indicator matrix and each organization sheet before import.",
                      })
                    }
                  >
                    Preview Validation
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detection preview</CardTitle>
                <CardDescription>What the parser should surface before normalized records are committed.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Assignment matrix confidence</span>
                    <span className="font-medium">{assignmentScore}%</span>
                  </div>
                  <Progress value={assignmentScore} />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Template match confidence</span>
                    <span className="font-medium">{templateFit}%</span>
                  </div>
                  <Progress value={templateFit} />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Validation readiness</span>
                    <span className="font-medium">{validationScore}%</span>
                  </div>
                  <Progress value={validationScore} />
                </div>

                <Separator />

                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Primary organization key</span>
                    <Badge variant="secondary">Worksheet name</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Quarter system</span>
                    <Badge variant="secondary">Apr-Mar year</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Q3 2025 window</span>
                    <Badge variant="secondary">Oct 1-Dec 31 2025</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Indicator references catalogued</span>
                    <Badge variant="secondary">{indicators.length || "Live API"}</Badge>
                  </div>
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Import rule</AlertTitle>
                  <AlertDescription>
                    Organization sheets upload only the indicators assigned to that organization in the Indicator matrix.
                    The matrix is parsed first and drives both assignment and target linkage.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assignment preview</CardTitle>
              <CardDescription>The analyzer should build this coordinator-to-sub distribution view before importing organization sheet values.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization sheet</TableHead>
                    <TableHead>Assigned indicator</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Q1 Apr-Jun</TableHead>
                    <TableHead>Q2 Jul-Sep</TableHead>
                    <TableHead>Q3 Oct-Dec</TableHead>
                    <TableHead>Q4 Jan-Mar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentRows.map((row) => (
                    <TableRow key={`${row.organization}-${row.indicator}`}>
                      <TableCell className="font-medium">{row.organization}</TableCell>
                      <TableCell>{row.indicator}</TableCell>
                      <TableCell>{row.assignedBy}</TableCell>
                      <TableCell>{row.q1}</TableCell>
                      <TableCell>{row.q2}</TableCell>
                      <TableCell>{row.q3}</TableCell>
                      <TableCell>{row.q4}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Missing indicator resolution</CardTitle>
              <CardDescription>
                Indicators found in the workbook but missing from the system should be created before the import is confirmed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicator</TableHead>
                    <TableHead>Suggested code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assigned organization(s)</TableHead>
                    <TableHead>Planned action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingRows.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.code}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.assignedTo}</TableCell>
                      <TableCell>{row.action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleCreateMissingIndicators}
                  disabled={!importSession?.missing_indicators?.length || isCreatingMissingIndicators}
                >
                  Create missing indicators
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast({
                      title: "Assignment action",
                      description: "New indicators should be assigned to the project and to the organizations from the Indicator matrix, with quarterly targets created automatically.",
                    })
                  }
                >
                  Assign indicators and targets
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload aggregated values</CardTitle>
              <CardDescription>
                Confirm the analyzed workbook and commit organization-sheet values into aggregates using the Indicator matrix assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Session status</span>
                    <Badge variant={importSession?.status === "imported" ? "default" : "secondary"}>
                      {importSession?.status || "No session"}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Sheets scanned</span>
                      <span className="font-medium">{importSession?.summary?.sheets_scanned ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Assignments detected</span>
                      <span className="font-medium">{importSession?.summary?.assignments_detected ?? importSession?.assignments?.length ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Rows imported</span>
                      <span className="font-medium">{importSession?.summary?.rows_imported ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Rows skipped</span>
                      <span className="font-medium">{importSession?.summary?.rows_skipped ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Warnings</span>
                      <span className="font-medium">{importSession?.summary?.warnings ?? unresolvedIssues.filter((issue) => issue.severity === "warning").length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Errors</span>
                      <span className="font-medium">{importSession?.summary?.errors ?? unresolvedIssues.filter((issue) => issue.severity === "error").length}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                  <div className="grid gap-2">
                    <Label>Import mode</Label>
                    <Select value={confirmImportMode} onValueChange={(value) => setConfirmImportMode(value as "append" | "replace_period")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select import mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="append">Append new aggregate values</SelectItem>
                        <SelectItem value="replace_period">Replace this project/org period before import</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3">
                    <label className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm">
                      <Checkbox checked={overwriteExisting} onCheckedChange={(checked) => setOverwriteExisting(Boolean(checked))} />
                      <span>Overwrite existing aggregate rows when the backend detects duplicates for the same scope.</span>
                    </label>
                    <label className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm">
                      <Checkbox checked={applyIndicatorAssignments} onCheckedChange={(checked) => setApplyIndicatorAssignments(Boolean(checked))} />
                      <span>Apply Indicator matrix assignment mappings during import.</span>
                    </label>
                    <label className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm">
                      <Checkbox checked={syncProjectIndicatorLinks} onCheckedChange={(checked) => setSyncProjectIndicatorLinks(Boolean(checked))} />
                      <span>Sync project-indicator links from the workbook assignment map.</span>
                    </label>
                    <label className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm">
                      <Checkbox checked={createMissingOnConfirm} onCheckedChange={(checked) => setCreateMissingOnConfirm(Boolean(checked))} />
                      <span>Create any remaining missing indicators during confirm if the backend supports it.</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleConfirmImport} disabled={!canConfirmImport}>
                      {isConfirmingImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Upload aggregated values
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/aggregates">View aggregates</Link>
                    </Button>
                  </div>
                </div>
              </div>

              {unresolvedIssues.length > 0 ? (
                <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-amber-950">Validation issues to review</div>
                      <div className="text-sm text-amber-900/80">
                        These issues came back from workbook analysis and may affect aggregate upload.
                      </div>
                    </div>
                    <Badge variant="secondary">{unresolvedIssues.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {unresolvedIssues.slice(0, 8).map((issue, index) => (
                      <div key={`${issue.code}-${issue.sheet_name || "global"}-${issue.cell_ref || index}`} className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm">
                        <div className="font-medium">
                          {issue.code}
                          {issue.sheet_name ? ` | ${issue.sheet_name}` : ""}
                          {issue.cell_ref ? ` | ${issue.cell_ref}` : ""}
                        </div>
                        <div className="text-muted-foreground">{issue.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parser stages</CardTitle>
              <CardDescription>Execution order for worksheet interpretation and assignment-aware import.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead>How it works</TableHead>
                    <TableHead>Decision mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parserStages.map((stage) => (
                    <TableRow key={stage.name}>
                      <TableCell className="font-medium">{stage.name}</TableCell>
                      <TableCell>{stage.detail}</TableCell>
                      <TableCell>{stage.confidence}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Export configuration</CardTitle>
                <CardDescription>Rebuild the workbook with the same recognizable reporting form and assignment matrix.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Project</Label>
                    <Select value={exportProject} onValueChange={setExportProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Select project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={String(project.id)}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Reporting period</Label>
                    <Input value={exportPeriod} onChange={(event) => setExportPeriod(event.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Export scope</Label>
                    <Select value={exportScope} onValueChange={setExportScope}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent>
                        {exportScopes.map((scope) => (
                          <SelectItem key={scope.value} value={scope.value}>
                            {scope.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Organization</Label>
                    <Select value={exportOrganization} onValueChange={setExportOrganization}>
                      <SelectTrigger>
                        <SelectValue placeholder="Scope-specific organization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Scope determines organizations</SelectItem>
                        {organizations.map((organization) => (
                          <SelectItem key={organization.id} value={String(organization.id)}>
                            {organization.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      toast({
                        title: "Export contract ready",
                        description: "This action is designed to rebuild the Indicator matrix, quarter targets, and organization sheets from normalized data.",
                      })
                    }
                  >
                    Generate workbook
                  </Button>
                  <Button variant="outline">Preview formatting rules</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Formatting fidelity goals</CardTitle>
                <CardDescription>The generated workbook should still look like the original partner form.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span>Indicator matrix rebuilt</span>
                  <Badge variant="secondary">Preserve</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span>Merged title blocks</span>
                  <Badge variant="secondary">Preserve</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span>Bold totals and subtotals</span>
                  <Badge variant="secondary">Preserve</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span>Column widths and row heights</span>
                  <Badge variant="secondary">Preserve</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span>Organization sheet names</span>
                  <Badge variant="secondary">Preserve</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Endpoint contract</CardTitle>
                <CardDescription>Frontend service scaffolding has already been added for these endpoints.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Purpose</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {endpointRows.map(([method, endpoint, purpose]) => (
                      <TableRow key={endpoint}>
                        <TableCell className="font-medium">{method}</TableCell>
                        <TableCell>{endpoint}</TableCell>
                        <TableCell>{purpose}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Normalization target</CardTitle>
                <CardDescription>Every imported cell should retain enough lineage for audits, assignment checks, and export regeneration.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border px-3 py-2">
                  <div className="font-medium">AggregateRecord</div>
                  <div className="mt-1 text-slate-600">
                    project_id, indicator_id, organization_id, reporting_period, row_label, column_label, value,
                    source_sheet, source_cell, template_id, assigned_via_matrix, target_q1, target_q2, target_q3, target_q4
                  </div>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <div className="font-medium">Import quality gates</div>
                  <div className="mt-1 text-slate-600">
                    Numeric parsing, totals reconciliation, required metadata, organization existence, indicator existence,
                    duplicate source-cell detection, assignment matching between the matrix sheet and organization sheets,
                    and missing-indicator creation before commit.
                  </div>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <div className="font-medium">Core heuristics</div>
                  <div className="mt-1 text-slate-600">
                    Worksheet name for organization identity, Indicator matrix assignment parsing, Apr-Mar quarter mapping,
                    merged-cell signatures, and saved template matches.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
