diff --git a/frontend/app/(dashboard)/aggregates/AggregatesPage.tsx b/frontend/app/(dashboard)/aggregates/AggregatesPage.tsx
index 9086b18aba83b49d4385c222e19dc0687cefe248..3e4eba14b88d92752419e21e65d3c51154276bac 100644
--- a/frontend/app/(dashboard)/aggregates/AggregatesPage.tsx
+++ b/frontend/app/(dashboard)/aggregates/AggregatesPage.tsx
@@ -1,29 +1,29 @@
 ﻿"use client";
 
 import React, { useMemo, useRef, useState, Suspense } from "react";
-import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
+import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
 import * as XLSX from "xlsx";
 import {
   Plus,
   Search,
   Filter,
   Download,
   Upload,
   Table2,
   BarChart3,
   Calendar,
   Calculator,
   Loader2,
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Badge } from "@/components/ui/badge";
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card";
 import {
   Dialog,
@@ -69,62 +69,95 @@ type AggregateValue = {
   female?: number;
   total?: number;
   age_range?: string;
   key_population?: string;
   disaggregates?: Record<
     string,
     Record<string, Record<string, number | undefined>>
   >;
 };
 
 const ageRanges = [
   "10-14",
   "15-19",
   "20-24",
   "25-29",
   "30-34",
   "35-39",
   "40-44",
   "45-49",
   "50-54",
   "55-59",
   "60-64",
   "65+",
 ];
 
+const familyPlanningKeyPopulations = [
+  "IUD",
+  "Emergency contraceptive",
+  "Implant 3 years",
+  "Implant 5 years",
+  "Contraceptive pill",
+  "Injectables",
+  "Non traditional site",
+];
+
+const communityLeadersKeyPopulations = [
+  "Traditional leaders (chiefs, headmen/women)",
+  "Political leaders (councillors, MPs, local authorities)",
+  "Youth leaders (student representatives, youth movement leaders)",
+  "Women leaders (from women's groups, associations)",
+  "Community-based organization (CBO/CSO) leaders",
+];
+
 const keyPopulations = [
   "MSM",
   "FSW",
   "PWD",
   "PWID",
   "LGBTQI+",
   "GENERAL POP.",
+  ...familyPlanningKeyPopulations,
+  ...communityLeadersKeyPopulations,
 ];
 const matrixAgeBands = [...ageRanges, "AYP (10-24)"];
 const matrixAgeBandCore = ageRanges;
 
-const pieColors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"];
+const chartColors = [
+  "#2563eb",
+  "#16a34a",
+  "#f59e0b",
+  "#ef4444",
+  "#9333ea",
+  "#0891b2",
+  "#f97316",
+  "#14b8a6",
+  "#e11d48",
+  "#84cc16",
+  "#6366f1",
+  "#d946ef",
+];
 
 const formatDate = (value?: string) => {
   if (!value) return "â€”";
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return "â€”";
   return date.toLocaleDateString();
 };
 
 const getPeriodLabel = (aggregate: Aggregate) =>
   `${formatDate(aggregate.period_start)} - ${formatDate(aggregate.period_end)}`;
 
 const parseAggregateValue = (value: unknown): AggregateValue => {
   if (typeof value === "number") {
     return { total: value };
   }
   if (value && typeof value === "object") {
     return value as AggregateValue;
   }
   return {};
 };
 
 const getDisaggregates = (value: unknown) => {
   const parsed = parseAggregateValue(value);
   return parsed.disaggregates || null;
 };
@@ -144,90 +177,98 @@ const getAllKeyPopulations = (
 const sumBands = (values: Record<string, number | undefined>) =>
   matrixAgeBandCore.reduce((acc, band) => acc + (values[band] || 0), 0);
 
 const computeAYP = (values: Record<string, number | undefined>) =>
   (values["AYP (10-24)"] || 0) ||
   (values["10-14"] || 0) + (values["15-19"] || 0) + (values["20-24"] || 0);
 
 const parseNumber = (value: string) => {
   if (value === "") return undefined;
   const parsed = Number(value);
   return Number.isNaN(parsed) ? undefined : parsed;
 };
 
 const buildEmptyMatrix = () => {
   const matrix: Record<string, Record<string, Record<string, string>>> = {};
   for (const kp of keyPopulations) {
     matrix[kp] = { Male: {}, Female: {} };
     for (const band of matrixAgeBands) {
       matrix[kp].Male[band] = "";
       matrix[kp].Female[band] = "";
     }
   }
   return matrix;
 };
 
+const sanitizeSheetName = (value: string) =>
+  value.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || "Sheet";
+
 export default function AggregatesPage() {
   const { toast } = useToast();
   const [searchQuery, setSearchQuery] = useState("");
   const [projectFilter, setProjectFilter] = useState("all");
   const [periodFilter, setPeriodFilter] = useState("all");
   const [parentOrgFilter, setParentOrgFilter] = useState("all");
   const [orgFilter, setOrgFilter] = useState("all");
+  const [keyPopulationFilter, setKeyPopulationFilter] = useState("all");
+  const [ageFilter, setAgeFilter] = useState<"all" | "ayp" | "older">("all");
+  const [ageRangeFilter, setAgeRangeFilter] = useState("all");
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
+  const [selectedDisaggregates, setSelectedDisaggregates] = useState<string[]>(() => [...keyPopulations]);
   const chartRef = useRef<HTMLDivElement | null>(null);
 
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
+  const [groupChartsOpen, setGroupChartsOpen] = useState<Record<string, boolean>>({});
 
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
 
   const resetAutoCalcForm = () => {
     setAutoOutputIndicator("");
     setAutoSourceIndicator("");
     setAutoOperator("equals");
     setAutoMatchValue("yes");
     setAutoCountDistinct("respondent");
     setAutoProject("");
     setAutoOrganization("");
     setAutoPeriodStart("");
@@ -251,72 +292,124 @@ export default function AggregatesPage() {
     () =>
       new Map(projects.map((project) => [String(project.id), project.name])),
     [projects],
   );
   const orgParentById = useMemo(
     () =>
       new Map(organizations.map((org: { id: number; parent?: number | null }) => [String(org.id), org.parent ?? null])),
     [organizations],
   );
   const parentOrganizations = useMemo(
     () => organizations.filter((org: { parent?: number | null }) => !org.parent),
     [organizations],
   );
   const childOrganizations = useMemo(() => {
     if (parentOrgFilter === "all") return organizations;
     return organizations.filter((org: { parent?: number | null }) =>
       String(org.parent ?? "") === parentOrgFilter || String(org.id) === parentOrgFilter
     );
   }, [organizations, parentOrgFilter]);
 
   const periods = useMemo(
     () => Array.from(new Set(aggregates.map(getPeriodLabel))),
     [aggregates],
   );
 
+  const availableKeyPopulations = useMemo(() => {
+    const set = new Set<string>(keyPopulations);
+    aggregates.forEach((agg) => {
+      const disaggregates = getDisaggregates(agg.value);
+      if (!disaggregates) return;
+      Object.keys(disaggregates).forEach((kp) => set.add(kp));
+    });
+    return Array.from(set);
+  }, [aggregates]);
+
+  const ageBandsForFilter = useMemo(() => {
+    if (ageFilter === "all") return [...matrixAgeBands];
+    if (ageFilter === "ayp") return ["10-14", "15-19", "20-24", "AYP (10-24)"];
+    return ["25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65+"];
+  }, [ageFilter]);
+
   const filteredAggregates = useMemo(() => {
     const query = searchQuery.toLowerCase();
     return aggregates.filter((agg) => {
       const indicatorName =
         agg.indicator_name ||
         indicatorNameById.get(String(agg.indicator)) ||
         "";
       const matchesSearch =
         query.length === 0 || indicatorName.toLowerCase().includes(query);
       const matchesProject =
         projectFilter === "all" || String(agg.project) === projectFilter;
       const matchesPeriod =
         periodFilter === "all" || getPeriodLabel(agg) === periodFilter;
       const matchesOrg =
         orgFilter === "all" || String(agg.organization) === orgFilter;
       const matchesParent =
         parentOrgFilter === "all" ||
         String(orgParentById.get(String(agg.organization)) ?? "") === parentOrgFilter ||
         String(agg.organization) === parentOrgFilter;
-      return matchesSearch && matchesProject && matchesPeriod && matchesParent && matchesOrg;
+
+      const hasDisaggregateFilter =
+        keyPopulationFilter !== "all" || ageFilter !== "all" || ageRangeFilter !== "all";
+      let matchesDisaggregate = true;
+      if (hasDisaggregateFilter) {
+        const disaggregates = getDisaggregates(agg.value);
+        matchesDisaggregate = false;
+        if (disaggregates) {
+          const kpKeys = keyPopulationFilter === "all" ? Object.keys(disaggregates) : [keyPopulationFilter];
+          for (const kp of kpKeys) {
+            const kpData = disaggregates[kp];
+            if (!kpData) continue;
+            for (const sex of ["Male", "Female"] as const) {
+              const values = kpData[sex] || {};
+              if (ageRangeFilter !== "all") {
+                const value = Number(values[ageRangeFilter] || 0);
+                if (value > 0 && ageBandsForFilter.includes(ageRangeFilter)) {
+                  matchesDisaggregate = true;
+                  break;
+                }
+                continue;
+              }
+              const totalForAgeBands = ageBandsForFilter.reduce(
+                (sum, band) => sum + (Number(values[band]) || 0),
+                0,
+              );
+              if (totalForAgeBands > 0) {
+                matchesDisaggregate = true;
+                break;
+              }
+            }
+            if (matchesDisaggregate) break;
+          }
+        }
+      }
+
+      return matchesSearch && matchesProject && matchesPeriod && matchesParent && matchesOrg && matchesDisaggregate;
     });
-  }, [aggregates, indicatorNameById, orgFilter, orgParentById, parentOrgFilter, periodFilter, projectFilter, searchQuery]);
+  }, [ageBandsForFilter, ageFilter, ageRangeFilter, aggregates, indicatorNameById, keyPopulationFilter, orgFilter, orgParentById, parentOrgFilter, periodFilter, projectFilter, searchQuery]);
 
   const aggregateGroups = useMemo(() => {
     const groups = new Map<string, Aggregate[]>();
     for (const agg of filteredAggregates) {
       const indicatorName =
         agg.indicator_name ||
         indicatorNameById.get(String(agg.indicator)) ||
         "Indicator";
       const orgName = agg.organization_name || "";
       const key = `${indicatorName}||${orgName}`;
       if (!groups.has(key)) {
         groups.set(key, []);
       }
       groups.get(key)!.push(agg);
     }
     const parseCode = (code?: string | null) => {
       if (!code) return { num: Number.POSITIVE_INFINITY, suffix: "" };
       const match = code.match(/(\\d+)([a-zA-Z])?/);
       if (!match) return { num: Number.POSITIVE_INFINITY, suffix: code };
       return { num: Number(match[1]), suffix: (match[2] || "").toLowerCase() };
     };
     const entries = Array.from(groups.entries()).map(([key, items]) => {
       const indicatorName = key.split("||")[0];
       const organizationName = key.split("||")[1];
       const first = items[0];
@@ -577,50 +670,130 @@ export default function AggregatesPage() {
     }
 
     for (const group of grouped.values()) {
       try {
         const result = await aggregatesService.bulkCreate({
           project: group.project,
           organization: group.organization,
           period_start: group.period_start,
           period_end: group.period_end,
           data: group.data,
         });
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
   };
 
+  const buildDisaggregateSeed = () => {
+    const disaggregates: Record<string, Record<string, Record<string, number>>> = {};
+    for (const kp of keyPopulations) {
+      disaggregates[kp] = { Male: {}, Female: {} };
+      for (const ageBand of matrixAgeBands) {
+        disaggregates[kp].Male[ageBand] = 0;
+        disaggregates[kp].Female[ageBand] = 0;
+      }
+    }
+    return disaggregates;
+  };
+
+  const handleDownloadMakgabanengTemplate = () => {
+    const normalize = (value: string) => value.trim().toLowerCase();
+    const makgabaneng = organizations.find((org: any) =>
+      normalize(org.name).includes("makgabaneng"),
+    );
+
+    if (!makgabaneng) {
+      toast({
+        title: "Makgabaneng not found",
+        description: "No organization named Makgabaneng is available in this environment.",
+        variant: "destructive",
+      });
+      return;
+    }
+
+    const subGrantees = organizations.filter(
+      (org: any) => Number(org.parent) === Number(makgabaneng.id),
+    );
+    const targetOrgs = [makgabaneng, ...subGrantees];
+    const workbook = XLSX.utils.book_new();
+
+    const project = projects[0];
+    const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
+      .toISOString()
+      .slice(0, 10);
+    const periodEnd = new Date().toISOString().slice(0, 10);
+    const disaggregateTemplate = buildDisaggregateSeed();
+    const selectedTemplate = templates.find(
+      (template) => Number(template.organization) === Number(makgabaneng.id),
+    );
+    const indicatorRows =
+      selectedTemplate?.indicators?.length
+        ? selectedTemplate.indicators
+        : indicators.map((indicator) => ({
+            id: indicator.id,
+            name: indicator.name,
+            code: indicator.code,
+          }));
+
+    for (const org of targetOrgs) {
+      const rows = indicatorRows.map((indicator) => ({
+        project_id: project?.id || "",
+        project_name: project?.name || "",
+        indicator_id: indicator.id,
+        indicator_code: indicator.code || "",
+        indicator_name: indicator.name,
+        organization_id: org.id,
+        organization_name: org.name,
+        period_start: periodStart,
+        period_end: periodEnd,
+        key_populations: keyPopulations.join(" | "),
+        age_ranges: matrixAgeBands.join(" | "),
+        value_json: JSON.stringify({ disaggregates: disaggregateTemplate }),
+        notes: "",
+      }));
+
+      const sheet = XLSX.utils.json_to_sheet(rows);
+      XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(org.name));
+    }
+
+    const fileName = `makgabaneng_aggregate_template_${new Date().toISOString().slice(0, 10)}.xlsx`;
+    XLSX.writeFile(workbook, fileName);
+    toast({
+      title: "Template ready",
+      description: `Created workbook with ${targetOrgs.length} sheet(s) for Makgabaneng and sub-grantees.`,
+    });
+  };
+
   const chartData = useMemo(() => {
     const totalsByIndicator = new Map<string, number>();
     for (const agg of filteredAggregates) {
       const value = parseAggregateValue(agg.value);
       const male = Number(value.male) || 0;
       const female = Number(value.female) || 0;
       const total =
         value.total !== undefined
           ? Number(value.total) || 0
           : male + female;
       const indicatorName =
         agg.indicator_name ||
         indicatorNameById.get(String(agg.indicator)) ||
         "Indicator";
       totalsByIndicator.set(
         indicatorName,
         (totalsByIndicator.get(indicatorName) || 0) + total,
       );
     }
     return Array.from(totalsByIndicator.entries()).map(([name, total]) => ({
       name,
       total,
     }));
   }, [filteredAggregates, indicatorNameById]);
 
@@ -663,102 +836,111 @@ export default function AggregatesPage() {
   };
 
   const templateIndicatorOptions = useMemo(() => {
     if (formTemplate === "all") return indicators;
     const selected = templates.find((template) => String(template.id) === formTemplate);
     if (!selected) return indicators;
     return selected.indicators.map((indicator) => ({
       id: indicator.id,
       name: indicator.name,
       code: indicator.code,
     }));
   }, [formTemplate, indicators, templates]);
 
   const computedTotal = useMemo(() => {
     if (useMatrixEntry) {
       return 0;
     }
     const male = parseNumber(formMale) ?? 0;
     const female = parseNumber(formFemale) ?? 0;
     return male + female;
   }, [formFemale, formMale, useMatrixEntry]);
 
   const matrixTotal = useMemo(() => {
     if (!useMatrixEntry) return 0;
     let total = 0;
-    for (const kp of keyPopulations) {
+    for (const kp of selectedDisaggregates) {
       for (const sex of ["Male", "Female"]) {
         for (const band of matrixAgeBands) {
           const value = parseNumber(matrixValues[kp]?.[sex]?.[band] ?? "");
           if (value !== undefined) total += value;
         }
       }
     }
     return total;
-  }, [matrixValues, useMatrixEntry]);
+  }, [matrixValues, selectedDisaggregates, useMatrixEntry]);
 
   const handleSave = async () => {
     if (!formProject || !formIndicator || !formOrganization || !formPeriodStart || !formPeriodEnd) {
       toast({
         title: "Missing required fields",
         description: "Project, indicator, organization, and period dates are required.",
         variant: "destructive",
       });
       return;
     }
 
     const male = !useMatrixEntry ? parseNumber(formMale) : undefined;
     const female = !useMatrixEntry ? parseNumber(formFemale) : undefined;
 
+    if (useMatrixEntry && selectedDisaggregates.length === 0) {
+      toast({
+        title: "Missing disaggregate selection",
+        description: "Select at least one disaggregate category.",
+        variant: "destructive",
+      });
+      return;
+    }
+
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
 
     const valuePayload: AggregateValue = {
       total: useMatrixEntry
         ? matrixTotal
         : (male ?? 0) + (female ?? 0),
     };
     if (!useMatrixEntry && male !== undefined) valuePayload.male = male;
     if (!useMatrixEntry && female !== undefined) valuePayload.female = female;
     if (useMatrixEntry) {
       const matrixPayload: Record<string, Record<string, Record<string, number | undefined>>> = {};
-      for (const kp of keyPopulations) {
+      for (const kp of selectedDisaggregates) {
         matrixPayload[kp] = { Male: {}, Female: {} };
         for (const band of matrixAgeBands) {
           matrixPayload[kp].Male[band] = parseNumber(matrixValues[kp]?.Male?.[band] ?? "");
           matrixPayload[kp].Female[band] = parseNumber(matrixValues[kp]?.Female?.[band] ?? "");
         }
       }
       valuePayload.disaggregates = matrixPayload;
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
@@ -851,50 +1033,53 @@ export default function AggregatesPage() {
       </div>
     );
   }
 
   return (
     <Suspense fallback={<Loading />}>
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
               <Button
                 variant="outline"
                 onClick={() => importInputRef.current?.click()}
               >
                 <Upload className="mr-2 h-4 w-4" /> Import
               </Button>
               <Button variant="outline" onClick={handleExport}>
                 <Download className="mr-2 h-4 w-4" /> Export
               </Button>
+              <Button variant="outline" onClick={handleDownloadMakgabanengTemplate}>
+                <Table2 className="mr-2 h-4 w-4" /> Makgabaneng Template
+              </Button>
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
 
               <Dialog
                 open={isAutoCalcOpen}
                 onOpenChange={(open) => {
                   setIsAutoCalcOpen(open);
                   if (!open) resetAutoCalcForm();
                 }}
               >
                 <DialogTrigger asChild>
                   <Button variant="outline">
@@ -1194,68 +1379,102 @@ export default function AggregatesPage() {
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="agg-period-end">Period End</Label>
                         <Input
                           id="agg-period-end"
                           type="date"
                           value={formPeriodEnd}
                           onChange={(event) => setFormPeriodEnd(event.target.value)}
                         />
                       </div>
                     </div>
 
                     <div className="space-y-2">
                       <Label>Disaggregates</Label>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Checkbox
                           checked={useMatrixEntry}
                           onCheckedChange={(checked) => setUseMatrixEntry(Boolean(checked))}
                         />
                         Use KP x Sex x Age matrix
                       </div>
                     </div>
 
                     {useMatrixEntry ? (
                       <div className="space-y-3">
+                        <div className="rounded-lg border border-border p-3">
+                          <div className="mb-2 flex items-center justify-between gap-2">
+                            <p className="text-sm font-medium">Select disaggregate categories</p>
+                            <div className="flex gap-2">
+                              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDisaggregates([...keyPopulations])}>
+                                Select all
+                              </Button>
+                              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDisaggregates([])}>
+                                Clear
+                              </Button>
+                            </div>
+                          </div>
+                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
+                            {keyPopulations.map((kp) => {
+                              const checked = selectedDisaggregates.includes(kp);
+                              return (
+                                <label key={`disagg-option-${kp}`} className="flex items-center gap-2 text-xs">
+                                  <Checkbox
+                                    checked={checked}
+                                    onCheckedChange={(value) => {
+                                      const nextChecked = Boolean(value);
+                                      setSelectedDisaggregates((prev) =>
+                                        nextChecked
+                                          ? (prev.includes(kp) ? prev : [...prev, kp])
+                                          : prev.filter((item) => item !== kp),
+                                      );
+                                    }}
+                                  />
+                                  <span>{kp}</span>
+                                </label>
+                              );
+                            })}
+                          </div>
+                        </div>
                         <div className="text-sm text-muted-foreground">
-                          Enter values by Key Population, Sex, and Age band.
+                          Enter values by selected disaggregate, sex, and age band.
                         </div>
                         <div className="overflow-auto rounded-lg border border-border max-h-[55vh]">
                           <table className="min-w-[960px] w-full border-collapse text-xs [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border">
                             <thead className="bg-muted/50 sticky top-0 z-10">
                               <tr>
                                 <th className="p-1.5 text-left">Key Population</th>
                                 <th className="p-1.5 text-left">Sex</th>
                                 {matrixAgeBands.map((band) => (
                                   <th key={band} className="p-1.5 text-center whitespace-nowrap">
                                     {band}
                                   </th>
                                 ))}
                               </tr>
                             </thead>
                             <tbody>
-                              {keyPopulations.map((kp) => (
+                              {selectedDisaggregates.map((kp) => (
                                 <React.Fragment key={kp}>
                                   {["Male", "Female"].map((sex) => (
                                     <tr key={`${kp}-${sex}`} className="border-t border-border">
                                       <td className="p-1.5 font-medium whitespace-nowrap">{kp}</td>
                                       <td className="p-1.5 whitespace-nowrap">{sex}</td>
                                       {matrixAgeBands.map((band) => (
                                         <td key={`${kp}-${sex}-${band}`} className="p-2">
                                           <Input
                                             type="number"
                                             className="h-8 text-center min-w-[72px]"
                                             value={matrixValues[kp]?.[sex]?.[band] ?? ""}
                                             onChange={(event) => {
                                               const value = event.target.value;
                                               setMatrixValues((prev) => ({
                                                 ...prev,
                                                 [kp]: {
                                                   ...prev[kp],
                                                   [sex]: {
                                                     ...prev[kp]?.[sex],
                                                     [band]: value,
                                                   },
                                                 },
                                               }));
                                             }}
                                           />
@@ -1395,50 +1614,89 @@ export default function AggregatesPage() {
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Organizations</SelectItem>
                 {childOrganizations.map((org) => (
                   <SelectItem key={org.id} value={String(org.id)}>
                     {org.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
 
             <Select value={periodFilter} onValueChange={setPeriodFilter}>
               <SelectTrigger className="w-full sm:w-[200px]">
                 <Calendar className="mr-2 h-4 w-4" />{" "}
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
+
+            <Select value={keyPopulationFilter} onValueChange={setKeyPopulationFilter}>
+              <SelectTrigger className="w-full sm:w-[220px]">
+                <SelectValue placeholder="Key Population" />
+              </SelectTrigger>
+              <SelectContent>
+                <SelectItem value="all">All Key Populations</SelectItem>
+                {availableKeyPopulations.map((kp) => (
+                  <SelectItem key={kp} value={kp}>
+                    {kp}
+                  </SelectItem>
+                ))}
+              </SelectContent>
+            </Select>
+
+            <Select value={ageFilter} onValueChange={(value) => setAgeFilter(value as "all" | "ayp" | "older")}>
+              <SelectTrigger className="w-full sm:w-[170px]">
+                <SelectValue placeholder="Age" />
+              </SelectTrigger>
+              <SelectContent>
+                <SelectItem value="all">All Ages</SelectItem>
+                <SelectItem value="ayp">AYP (10-24)</SelectItem>
+                <SelectItem value="older">25+ Years</SelectItem>
+              </SelectContent>
+            </Select>
+
+            <Select value={ageRangeFilter} onValueChange={setAgeRangeFilter}>
+              <SelectTrigger className="w-full sm:w-[170px]">
+                <SelectValue placeholder="Age Range" />
+              </SelectTrigger>
+              <SelectContent>
+                <SelectItem value="all">All Age Ranges</SelectItem>
+                {matrixAgeBands.map((band) => (
+                  <SelectItem key={band} value={band}>
+                    {band}
+                  </SelectItem>
+                ))}
+              </SelectContent>
+            </Select>
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
               <CardTitle className="text-2xl text-chart-2">
                 {totals.male.toLocaleString()}
               </CardTitle>
             </CardHeader>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Female Total</CardDescription>
               <CardTitle className="text-2xl text-chart-5">
                 {totals.female.toLocaleString()}
               </CardTitle>
             </CardHeader>
@@ -1527,74 +1785,100 @@ export default function AggregatesPage() {
                 }
                 sexTotals.Male["AYP (10-24)"] = 0;
                 sexTotals.Female["AYP (10-24)"] = 0;
 
                 keyPops.forEach((kp) => {
                   const kpData = disaggregates[kp] || { Male: {}, Female: {} };
                   (["Male", "Female"] as const).forEach((sex) => {
                     const values = kpData[sex] || {};
                     matrixAgeBandCore.forEach((band) => {
                       sexTotals[sex][band] += values[band] || 0;
                     });
                     sexTotals[sex]["AYP (10-24)"] += computeAYP(values);
                   });
                 });
 
                 const combinedTotals: Record<string, number> = {};
                 matrixAgeBandCore.forEach((band) => {
                   combinedTotals[band] = (sexTotals.Male[band] || 0) + (sexTotals.Female[band] || 0);
                 });
                 combinedTotals["AYP (10-24)"] =
                   (sexTotals.Male["AYP (10-24)"] || 0) + (sexTotals.Female["AYP (10-24)"] || 0);
                 const combinedSubTotal = sumBands(combinedTotals);
                 const combinedTotal = combinedSubTotal;
                 const rowSpan = keyPops.length * 2 + 3;
 
-                const sexChartData = (["Male", "Female"] as const).map((sex) => ({
-                  name: sex,
-                  value: sumBands(sexTotals[sex]),
-                }));
-                const ageDistributionData = matrixAgeBandCore.map((band) => ({
-                  name: band,
-                  total: combinedTotals[band] || 0,
-                }));
+                const chartSeries = keyPops.flatMap((kp) =>
+                  (["Male", "Female"] as const).map((sex) => ({
+                    key: `${kp}__${sex}`,
+                    label: `${kp} ${sex}`,
+                  })),
+                );
+
+                const ageDistributionData = matrixAgeBandCore.map((band) => {
+                  const row: Record<string, string | number> = { name: band };
+                  keyPops.forEach((kp) => {
+                    const kpData = disaggregates[kp] || { Male: {}, Female: {} };
+                    row[`${kp}__Male`] = kpData.Male?.[band] || 0;
+                    row[`${kp}__Female`] = kpData.Female?.[band] || 0;
+                  });
+                  return row;
+                });
+
+                const isGroupChartOpen = groupChartsOpen[group.key] || false;
 
                 return (
                   <div key={group.key} className="rounded-lg border border-border p-4">
                     <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                       <div>
                         <p className="text-sm text-muted-foreground">Indicator</p>
                         <p className="text-base font-semibold">
                           {indicatorCode ? `${indicatorCode} â€” ` : ""}{group.indicatorName}
                         </p>
                         <p className="text-sm text-muted-foreground">
                           {group.organizationName} ? {projectName} ? {periodLabel}
                         </p>
                       </div>
                       <Badge variant="outline">Total {Number(totalValue).toLocaleString()}</Badge>
                     </div>
 
+                    <div className="mb-3 flex justify-end">
+                      <Button
+                        variant="outline"
+                        size="sm"
+                        onClick={() =>
+                          setGroupChartsOpen((prev) => ({
+                            ...prev,
+                            [group.key]: !prev[group.key],
+                          }))
+                        }
+                      >
+                        <BarChart3 className="mr-2 h-4 w-4" />
+                        {isGroupChartOpen ? "Hide graph" : "Create KP/Sex/Age graph"}
+                      </Button>
+                    </div>
+
                     <div className="overflow-auto rounded-lg border border-border">
                       <table className="min-w-[960px] w-full border-collapse text-xs [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border">
                         <thead className="bg-muted/50">
                           <tr>
                             <th className="p-1.5 text-left">Indicator</th>
                             <th className="p-1.5 text-left">Key Population</th>
                             <th className="p-1.5 text-left">Age/Sex</th>
                             {matrixAgeBandCore.map((band) => (
                               <th key={band} className="p-1.5 text-center whitespace-nowrap">
                                 {band}
                               </th>
                             ))}
                             <th className="p-1.5 text-center whitespace-nowrap">Sub-total</th>
                             <th className="p-1.5 text-center whitespace-nowrap">TOTAL</th>
                             <th className="p-1.5 text-center whitespace-nowrap">AYP (10-24)</th>
                           </tr>
                         </thead>
                         <tbody>
                           {keyPops.map((kp, kpIndex) => {
                             const kpData = disaggregates[kp] || { Male: {}, Female: {} };
                             return (
                               <React.Fragment key={kp}>
                                 {(["Male", "Female"] as const).map((sex) => {
                                   const values = kpData[sex] || {};
                                   const subTotal = sumBands(values);
@@ -1645,90 +1929,90 @@ export default function AggregatesPage() {
                           {(["Male", "Female"] as const).map((sex) => {
                             const values = sexTotals[sex];
                             const subTotal = sumBands(values);
                             const ayp = values["AYP (10-24)"] || 0;
                             const total = subTotal;
                             return (
                               <tr key={`total-${sex}`} className="bg-muted/30 font-semibold">
                                 <td className="p-1.5" colSpan={1}>
                                   TOTAL {sex.toUpperCase()}
                                 </td>
                                 {matrixAgeBandCore.map((band) => (
                                   <td key={`total-${sex}-${band}`} className="p-1.5 text-center">
                                     {values[band].toLocaleString()}
                                   </td>
                                 ))}
                                 <td className="p-1.5 text-center">{subTotal.toLocaleString()}</td>
                                 <td className="p-1.5 text-center">{total.toLocaleString()}</td>
                                 <td className="p-1.5 text-center">{ayp.toLocaleString()}</td>
                               </tr>
                             );
                           })}
                         </tbody>
                       </table>
                     </div>
 
-                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
-                      <div className="rounded-lg border border-border p-3">
-                        <p className="mb-2 text-sm font-medium">Age-band distribution</p>
+                    {isGroupChartOpen ? (
+                      <div className="mt-4 rounded-lg border border-border p-3">
+                        <p className="mb-1 text-sm font-medium">KP/Sex distribution across age ranges</p>
+                        <p className="mb-3 text-xs text-muted-foreground">Each color represents a key population + sex combination.</p>
+                        <div className="mb-3 flex flex-wrap gap-2">
+                          {chartSeries.map((series, index) => (
+                            <span
+                              key={`legend-${series.key}`}
+                              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px]"
+                            >
+                              <span
+                                className="inline-block h-2.5 w-2.5 rounded-full"
+                                style={{ backgroundColor: chartColors[index % chartColors.length] }}
+                                aria-hidden="true"
+                              />
+                              {series.label}
+                            </span>
+                          ))}
+                        </div>
                         <div className="h-64">
                           <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={ageDistributionData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                               <CartesianGrid vertical={false} strokeDasharray="3 3" />
                               <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={70} />
                               <YAxis />
                               <RechartsTooltip formatter={(value: number) => value.toLocaleString()} />
-                              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
+                              {chartSeries.map((series, index) => (
+                                <Bar
+                                  key={series.key}
+                                  dataKey={series.key}
+                                  name={series.label}
+                                  fill={chartColors[index % chartColors.length]}
+                                  radius={[3, 3, 0, 0]}
+                                />
+                              ))}
                             </BarChart>
                           </ResponsiveContainer>
                         </div>
                       </div>
-
-                      <div className="rounded-lg border border-border p-3">
-                        <p className="mb-2 text-sm font-medium">Sex split (pie chart)</p>
-                        <div className="h-64">
-                          <ResponsiveContainer width="100%" height="100%">
-                            <PieChart>
-                              <Pie
-                                data={sexChartData}
-                                dataKey="value"
-                                nameKey="name"
-                                cx="50%"
-                                cy="50%"
-                                outerRadius={90}
-                                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
-                              >
-                                {sexChartData.map((entry, index) => (
-                                  <Cell key={`${entry.name}-${index}`} fill={pieColors[index % pieColors.length]} />
-                                ))}
-                              </Pie>
-                              <RechartsTooltip formatter={(value: number) => value.toLocaleString()} />
-                            </PieChart>
-                          </ResponsiveContainer>
-                        </div>
-                      </div>
-                    </div>
+                    ) : null}
                   </div>
                 );
               })}
             </div>
           </CardContent>
         </Card>
 
         <Dialog open={isChartOpen} onOpenChange={setIsChartOpen}>
           <DialogContent className="w-[95vw] sm:max-w-5xl">
             <DialogHeader>
               <DialogTitle>Aggregate Totals</DialogTitle>
               <DialogDescription>
                 Totals by indicator for the selected filters.
               </DialogDescription>
             </DialogHeader>
             <div className="flex justify-end">
               <Button variant="outline" size="sm" onClick={downloadChartSvg}>
                 <Download className="mr-2 h-4 w-4" />
                 Download Chart
               </Button>
             </div>
             {chartData.length === 0 ? (
               <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                 No data available for the selected filters.
               </div>
@@ -1754,27 +2038,25 @@ export default function AggregatesPage() {
                     <YAxis tickLine={false} axisLine={false} />
                     <ChartTooltip
                       cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                       content={<ChartTooltipContent indicator="dot" />}
                     />
                     <ChartLegend content={<ChartLegendContent />} />
                     <Bar
                       dataKey="total"
                       fill="var(--color-total)"
                       fillOpacity={0.85}
                       stroke="rgba(16, 24, 40, 0.2)"
                       strokeWidth={1}
                       barSize={32}
                       radius={[4, 4, 0, 0]}
                     />
                   </BarChart>
                 </ChartContainer>
               </div>
             )}
           </DialogContent>
         </Dialog>
       </div>
     </Suspense>
   );
 }
-
-
