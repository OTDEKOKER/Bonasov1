"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
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
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ToastAction } from "@/components/ui/toast";
import { PageHeader } from "@/components/shared/page-header";
import { OrganizationSelect } from "@/components/shared/organization-select";
import { aggregatesService, indicatorsService } from "@/lib/api";
import {
  useAllAggregates,
  useAggregateTemplates,
  useIndicators,
  useAllOrganizations,
  useProjects,
} from "@/lib/hooks/use-api";
import type { Aggregate } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Loading from "./loading";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  buildIndicatorGroupKey,
  normalizeIndicatorText,
  rollupLinkedIndicatorTotals,
} from "@/lib/indicator-linking";
import { getGroupsFromUnknownUser } from "@/lib/user-groups";
import { isRecognizedParentOrganizationName } from "@/lib/organization-aliases";
import indicatorDisaggregationReport from "@/indicator-disaggregation-final-report.json";

type AggregateValue = {
  male?: number;
  female?: number;
  total?: number;
  age_range?: string;
  key_population?: string;
  other_disaggregates?: Record<string, number>;
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

const familyPlanningKeyPopulations = [
  "IUD",
  "Emergency contraceptive",
  "Implant 3 years",
  "Implant 5 years",
  "Contraceptive pill",
  "Injectables",
  "Non traditional site",
];

const communityLeadersKeyPopulations = [
  "Traditional leaders (chiefs, headmen/women)",
  "Political leaders (councillors, MPs, local authorities)",
  "Youth leaders (student representatives, youth movement leaders)",
  "Women leaders (from women's groups, associations)",
  "Community-based organization (CBO/CSO) leaders",
  "Religious/faith-based leaders",
];

const keyPopulations = [
  "MSM",
  "FSW",
  "PWD",
  "PWID",
  "LGBTQI+",
  "GENERAL POP.",
  ...familyPlanningKeyPopulations,
  ...communityLeadersKeyPopulations,
];

const disaggregateGroupNames = [
  "Sex",
  "Age Range",
  "KP",
  "Family Planning",
  "Community Leaders",
  "Non Traditional Sites",
  "Social Media Platform",
  "NCD Screening",
  "Tobacco Use",
  "Alcohol Use",
  "Mental Health",
  "Mental Health Management",
];

const socialMediaPlatforms = [
  "Facebook",
  "Instagram",
  "TikTok",
  "X",
  "WhatsApp",
  "YouTube",
  "Printed media",
  "Physical",
  "Other",
];

const ncdScreeningTypes = [
  "Hypertension",
  "Diabetes",
  "Cervical Cancer",
  "Breast Cancer",
  "Prostate Cancer",
  "Mental Health",
  "Other",
  "Blood Glucose",
  "BP",
  "BMI",
  "Waist Circumference",
];

const tobaccoUseDisaggregateTypes = ["Tobacco use", "Suicide", "Depression"];

const alcoholUseDisaggregateTypes = ["Alcohol use", "Clinical care", "Psychosocial support"];

const mentalHealthDisaggregateTypes = ["Mental Health"];

const mentalHealthManagementDisaggregateTypes = [
  "Rehabilitation",
  "Substance use disorder",
  "Crisis services",
  "Specialized care",
  "Others (State the type)",
];

const normalizeGroupName = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const resolveDisaggregateCategories = (groups: string[]) => {
  const categories: string[] = [];
  const add = (value: string) => {
    if (!categories.includes(value)) categories.push(value);
  };

  const normalizedGroups = new Set(groups.map(normalizeGroupName).filter(Boolean));

  if (normalizedGroups.has("sex")) add("Sex");
  if (normalizedGroups.has("age range")) add("Age Range");
  if (normalizedGroups.has("kp")) keyPopulations.forEach(add);
  if (normalizedGroups.has("family planning")) familyPlanningKeyPopulations.forEach(add);
  if (
    normalizedGroups.has("community leaders") ||
    normalizedGroups.has("communinity leaders") ||
    normalizedGroups.has("ommuninity leaders")
  ) {
    communityLeadersKeyPopulations.forEach(add);
  }
  if (normalizedGroups.has("non traditional sites") || normalizedGroups.has("non traditional site")) {
    add("Non Traditional Sites");
  }
  if (normalizedGroups.has("social media platform") || normalizedGroups.has("media platform")) {
    socialMediaPlatforms.forEach(add);
  }
  if (normalizedGroups.has("ncd screening")) ncdScreeningTypes.forEach(add);
  if (normalizedGroups.has("tobacco use")) tobaccoUseDisaggregateTypes.forEach(add);
  if (normalizedGroups.has("alcohol use")) alcoholUseDisaggregateTypes.forEach(add);
  if (normalizedGroups.has("mental health")) mentalHealthDisaggregateTypes.forEach(add);
  if (normalizedGroups.has("mental health management")) mentalHealthManagementDisaggregateTypes.forEach(add);

  return categories;
};

const matrixAgeBands = [...ageRanges, "AYP (10-24)"];
const matrixAgeBandCore = ageRanges;
const ageBandLookup = new Map(
  matrixAgeBands.map((band) => [band.toLowerCase().replace(/[^a-z0-9+]+/g, ""), band] as const),
);

const chartPalette = [
  { color: "#2563eb", dotClass: "bg-[#2563eb]" },
  { color: "#16a34a", dotClass: "bg-[#16a34a]" },
  { color: "#f59e0b", dotClass: "bg-[#f59e0b]" },
  { color: "#ef4444", dotClass: "bg-[#ef4444]" },
  { color: "#9333ea", dotClass: "bg-[#9333ea]" },
  { color: "#0891b2", dotClass: "bg-[#0891b2]" },
  { color: "#f97316", dotClass: "bg-[#f97316]" },
  { color: "#14b8a6", dotClass: "bg-[#14b8a6]" },
  { color: "#e11d48", dotClass: "bg-[#e11d48]" },
  { color: "#84cc16", dotClass: "bg-[#84cc16]" },
  { color: "#6366f1", dotClass: "bg-[#6366f1]" },
  { color: "#d946ef", dotClass: "bg-[#d946ef]" },
];


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

const getAllKeyPopulations = (
  disaggregates: Record<string, Record<string, Record<string, number | undefined>>> | null,
) => {
  const extras: string[] = [];
  if (disaggregates) {
    Object.keys(disaggregates).forEach((kp) => {
      if (!keyPopulations.includes(kp)) extras.push(kp);
    });
  }
  return [...keyPopulations, ...extras];
};

const mergeDisaggregates = (
  values: unknown[],
): Record<string, Record<string, Record<string, number>>> | null => {
  const merged: Record<string, Record<string, Record<string, number>>> = {};

  values.forEach((value) => {
    const disaggregates = getDisaggregates(value);
    if (!disaggregates) return;

    Object.entries(disaggregates).forEach(([kp, kpData]) => {
      if (!merged[kp]) {
        merged[kp] = { Male: {}, Female: {} };
      }
      (["Male", "Female"] as const).forEach((sex) => {
        const sexValues = kpData?.[sex] || {};
        Object.entries(sexValues).forEach(([band, bandValue]) => {
          merged[kp][sex][band] = (merged[kp][sex][band] || 0) + (Number(bandValue) || 0);
        });
      });
    });
  });

  return Object.keys(merged).length > 0 ? merged : null;
};

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

const normalizeIndicatorCanonicalKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/\bnunber\b/g, "number")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizeLowerTrim = (value: string) => String(value || "").trim().toLowerCase();

const normalizeDisaggregateLabel = (value: string) => {
  const raw = String(value || "").replace(/[\u2018\u2019]/g, "'").trim();
  if (!raw) return "";

  const compact = raw
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();

  const aliases: Record<string, string> = {
    "tiktok": "TikTok",
    "gen population": "GENERAL POP.",
    "general population": "GENERAL POP.",
    "gen pop": "GENERAL POP.",
    "general pop": "GENERAL POP.",
    "women leaders from women s groups associations": "Women leaders (from women's groups, associations)",
    "emergency contraceptive": "Emergency contraceptive",
    "implant 3 years": "Implant 3 years",
    "implant 5 years": "Implant 5 years",
    "contraceptive pills": "Contraceptive pill",
    "blood glucose": "Blood Glucose",
    "waist circumference": "Waist Circumference",
    "substance use disorder": "Substance use disorder",
    "printed media": "Printed media",
    "physical": "Physical",
    "tobacco use": "Tobacco use",
    "alcohol use": "Alcohol use",
    "mental health": "Mental Health",
    "x": "X",
  };

  return aliases[compact] || raw.replace(/\s+/g, " ");
};

const normalizeIndicatorDisplayName = (value: string) => {
  const normalized = String(value || "")
    .replace(/â€“|–|—/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "Indicator";

  const autoPrefixed = normalized.match(/^AUTO_[A-Z0-9_]+\s*-\s*(.+)$/i);
  if (autoPrefixed?.[1]) {
    return autoPrefixed[1].trim();
  }

  return normalized;
};

const IMPORT_COLUMN_ALIASES: Record<string, string[]> = {
  indicator_id: ["indicator", "indicatorid", "indicator_code", "code"],
  indicator_name: ["indicator", "indicatorname", "indicator_title", "name"],
  project_id: ["project", "projectid"],
  project_name: ["project", "projectname"],
  organization_id: ["organization", "organisation", "organizationid", "organisationid", "org_id"],
  organization_name: ["organization", "organisation", "organizationname", "organisationname", "org"],
  period_start: ["start", "start_date", "period_from", "from"],
  period_end: ["end", "end_date", "period_to", "to"],
  value_json: ["valuejson", "json", "value"],
  male: ["m"],
  female: ["f"],
  total: ["totals"],
  notes: ["note", "comment", "comments"],
};

const IMPORT_FIXED_COLUMNS = new Set([
  "indicator_id",
  "indicator_name",
  "project_id",
  "project_name",
  "organization_id",
  "organization_name",
  "period_start",
  "period_end",
  "value_json",
  "male",
  "female",
  "total",
  "notes",
  "key_population",
  "key_population_name",
  "age_range",
  "age_band",
  "sex",
  "disaggregate_type",
  "disaggregate_value",
  "value",
  "amount",
  "count",
]);

const normalizeImportHeaderKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const resolveImportHeaderIndex = (header: string[], key: string) => {
  const searchKeys = [key, ...(IMPORT_COLUMN_ALIASES[key] || [])].map((item) => normalizeImportHeaderKey(item));
  for (const searchKey of searchKeys) {
    const index = header.indexOf(searchKey);
    if (index >= 0) return index;
  }
  return -1;
};

const detectImportHeaderRow = (rows: string[][]) => {
  let bestIndex = -1;
  let bestScore = -1;
  const scanLimit = Math.min(rows.length, 30);
  for (let i = 0; i < scanLimit; i += 1) {
    const candidateHeader = (rows[i] || []).map((cell) => normalizeImportHeaderKey(cell));
    if (!candidateHeader.some(Boolean)) continue;

    let score = 0;
    const hasIndicatorColumn =
      resolveImportHeaderIndex(candidateHeader, "indicator_id") >= 0 ||
      resolveImportHeaderIndex(candidateHeader, "indicator_name") >= 0;
    const hasValueColumn =
      resolveImportHeaderIndex(candidateHeader, "male") >= 0 ||
      resolveImportHeaderIndex(candidateHeader, "female") >= 0 ||
      resolveImportHeaderIndex(candidateHeader, "total") >= 0 ||
      resolveImportHeaderIndex(candidateHeader, "value_json") >= 0 ||
      resolveImportHeaderIndex(candidateHeader, "value") >= 0 ||
      resolveImportHeaderIndex(candidateHeader, "amount") >= 0 ||
      resolveImportHeaderIndex(candidateHeader, "count") >= 0;

    if (hasIndicatorColumn) score += 2;
    if (hasValueColumn) score += 1;
    if (resolveImportHeaderIndex(candidateHeader, "project_id") >= 0 || resolveImportHeaderIndex(candidateHeader, "project_name") >= 0) score += 1;
    if (resolveImportHeaderIndex(candidateHeader, "organization_id") >= 0 || resolveImportHeaderIndex(candidateHeader, "organization_name") >= 0) score += 1;
    if (resolveImportHeaderIndex(candidateHeader, "period_start") >= 0) score += 1;
    if (resolveImportHeaderIndex(candidateHeader, "period_end") >= 0) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex < 0 || bestScore < 2) return null;
  return {
    header: (rows[bestIndex] || []).map((cell) => normalizeImportHeaderKey(cell)),
    dataRows: rows.slice(bestIndex + 1),
  };
};

const normalizeImportDateValue = (value: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]);
    const year = Number(ddmmyyyy[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year.toString().padStart(4, "0")}-${month
        .toString()
        .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    }
  }

  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && numeric > 20000 && numeric < 80000) {
    const utcMillis = Math.round((numeric - 25569) * 86400 * 1000);
    const excelDate = new Date(utcMillis);
    if (!Number.isNaN(excelDate.getTime())) {
      return excelDate.toISOString().slice(0, 10);
    }
  }

  const parsedDate = new Date(raw);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return "";
};

const COMMENT_PREFIX = "[COMMENT]|";
const COMMENT_WRITE_ROLES = new Set(["admin", "manager", "officer"]);
const MANUAL_IMPORTS_STORAGE_KEY = "bonaso.manualImportHistory";

type ManualImportHistoryRecord = {
  id: string;
  source: "aggregates-manual";
  fileName: string;
  importedRows: number;
  failedRows: number;
  status: "draft" | "validated" | "failed";
  indicatorsCreated: number;
  periodStart: string | null;
  periodEnd: string | null;
  error: string | null;
  reportGroups?: Array<{
    project: number;
    organization: number;
    period_start: string;
    period_end: string;
  }>;
  validatedAt?: string | null;
  createdAt: string;
};

type AggregateComment = {
  id: string;
  aggregateId: string;
  author: string;
  message: string;
  createdAt: string;
  isSystem: boolean;
};

type ImportPreview = {
  fileName: string;
  totalRows: number;
  detectedIndicators: string[];
  missingIndicators: string[];
  extraDisaggregateColumns: string[];
};

type IndicatorImportProfile =
  | "kp_age_sex_matrix"
  | "age_sex_matrix_non_kp"
  | "category_or_cadre_breakdown"
  | "single_total";

const parseAggregateComments = (aggregate: Aggregate): AggregateComment[] => {
  const notes = (aggregate.notes || "").trim();
  if (!notes) return [];

  const lines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = lines
    .map((line, index) => {
      if (!line.startsWith(COMMENT_PREFIX)) return null;
      const parts = line.split("|");
      if (parts.length < 4) return null;
      const createdAt = parts[1] || aggregate.updated_at || aggregate.created_at;
      const author = parts[2] || "Unknown user";
      const message = parts.slice(3).join("|").trim();
      if (!message) return null;
      return {
        id: `${aggregate.id}-${index}`,
        aggregateId: String(aggregate.id),
        author,
        message,
        createdAt,
        isSystem: false,
      };
    })
    .filter((comment): comment is AggregateComment => comment !== null);

  if (parsed.length > 0) return parsed;

  return [
    {
      id: `${aggregate.id}-legacy-note`,
      aggregateId: String(aggregate.id),
      author: "System note",
      message: notes,
      createdAt: aggregate.updated_at || aggregate.created_at,
      isSystem: true,
    },
  ];
};

const buildCommentLine = (author: string, message: string, createdAt: string) => {
  const sanitizedAuthor = author.replace(/\|/g, "/").trim() || "Unknown user";
  const sanitizedMessage = message
    .replace(/\r?\n+/g, " ")
    .replace(/\|/g, "/")
    .trim();
  return `${COMMENT_PREFIX}${createdAt}|${sanitizedAuthor}|${sanitizedMessage}`;
};

export default function AggregatesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [orgScopeFilter, setOrgScopeFilter] = useState("all");
  const [keyPopulationFilter, setKeyPopulationFilter] = useState("all");
  const [ageRangeFilter, setAgeRangeFilter] = useState("all");
  const [indicatorGroupingMode, setIndicatorGroupingMode] = useState<"exact" | "linked" | "linked_global">("linked_global");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isAutoCalcOpen, setIsAutoCalcOpen] = useState(false);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoCalcSubmitting, setIsAutoCalcSubmitting] = useState(false);
  const [isPreparingImportPreview, setIsPreparingImportPreview] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [selectedDetectedIndicators, setSelectedDetectedIndicators] = useState<string[]>([]);
  const [selectedExtraDisaggregates, setSelectedExtraDisaggregates] = useState<string[]>([]);
  const [importProject, setImportProject] = useState("");
  const [importOrganization, setImportOrganization] = useState("");
  const [importPeriodStart, setImportPeriodStart] = useState("");
  const [importPeriodEnd, setImportPeriodEnd] = useState("");
  const [importSheetName, setImportSheetName] = useState("");
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
  const [selectedDisaggregates, setSelectedDisaggregates] = useState<string[]>(() => [...keyPopulations]);
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
  const [groupChartsOpen, setGroupChartsOpen] = useState<Record<string, boolean>>({});
  const [groupCommentDrafts, setGroupCommentDrafts] = useState<Record<string, string>>({});
  const [groupCommentSubmitting, setGroupCommentSubmitting] = useState<Record<string, boolean>>({});
  const [systemNotesOpen, setSystemNotesOpen] = useState<Record<string, boolean>>({});

  const { data: aggregatesData, isLoading, error, mutate } = useAllAggregates();
  const { data: projectsData } = useProjects();
  const { data: indicatorsData } = useIndicators();
  const { data: organizationsData } = useAllOrganizations();
  const { data: templatesData } = useAggregateTemplates({
    project: formProject || undefined,
    organization: formOrganization || undefined,
  });

  const aggregates = useMemo(() => aggregatesData ?? [], [aggregatesData]);
  const projects = useMemo(() => projectsData?.results ?? [], [projectsData?.results]);
  const indicators = useMemo(() => indicatorsData?.results ?? [], [indicatorsData?.results]);
  const organizations = useMemo(() => organizationsData?.results ?? [], [organizationsData?.results]);
  const templates = useMemo(() => templatesData ?? [], [templatesData]);
  const normalizedUser = useMemo(
    () => (user && typeof user === "object" ? (user as unknown as Record<string, unknown>) : null),
    [user],
  );
  const currentUserName = useMemo(() => {
    if (!normalizedUser) return "Unknown user";
    const firstName = String(normalizedUser.firstName ?? normalizedUser.first_name ?? "").trim();
    const lastName = String(normalizedUser.lastName ?? normalizedUser.last_name ?? "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
    const username = String(normalizedUser.username ?? "").trim();
    if (username) return username;
    const email = String(normalizedUser.email ?? "").trim();
    if (email) return email;
    return "Unknown user";
  }, [normalizedUser]);
  const userRole = useMemo(
    () => String(normalizedUser?.role ?? "").toLowerCase(),
    [normalizedUser],
  );
  const userGroupNames = useMemo(() => {
    return getGroupsFromUnknownUser(user)
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);
  }, [user]);
  const userPermissionNames = useMemo(() => {
    const rawPermissions = normalizedUser?.permissions;
    if (!Array.isArray(rawPermissions)) return [] as string[];
    return rawPermissions
      .map((permission) => String(permission).trim().toLowerCase())
      .filter(Boolean);
  }, [normalizedUser]);
  const canPostGroupComments = useMemo(() => {
    if (!normalizedUser) return false;
    if (COMMENT_WRITE_ROLES.has(userRole)) return true;

    const hasWriteGroup = userGroupNames.some(
      (group) => group.includes("coordinator") || group.includes("funder") || group.includes("manager"),
    );
    if (hasWriteGroup) return true;

    return userPermissionNames.some(
      (permission) =>
        (permission.includes("aggregate") || permission.includes("comment")) &&
        (permission.includes("add") || permission.includes("change") || permission.includes("write")),
    );
  }, [normalizedUser, userGroupNames, userPermissionNames, userRole]);
  const userOrganizationId = useMemo(() => {
    if (!user || typeof user !== "object") return null;
    const normalizedUser = user as unknown as Record<string, unknown>;
    const rawOrganization =
      normalizedUser.organizationId ??
      normalizedUser.organization_id ??
      normalizedUser.organization;
    if (rawOrganization === null || rawOrganization === undefined || rawOrganization === "") return null;
    return String(rawOrganization);
  }, [user]);
  const accessibleOrgIds = useMemo(() => {
    if (!user || typeof user !== "object") return null;
    const normalizedUser = user as unknown as Record<string, unknown>;
    const role = String(normalizedUser.role ?? "").toLowerCase();
    if (role === "admin") return null;
    if (!userOrganizationId) return null;

    const childrenByParent = new Map<string, string[]>();
    organizations.forEach((org) => {
      const parentId = String((org as { parentId?: string | number | null }).parentId ?? "");
      if (!parentId) return;
      const list = childrenByParent.get(parentId) || [];
      list.push(String(org.id));
      childrenByParent.set(parentId, list);
    });

    const allowed = new Set<string>([userOrganizationId]);
    const queue = [userOrganizationId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      const children = childrenByParent.get(current) || [];
      children.forEach((childId) => {
        if (allowed.has(childId)) return;
        allowed.add(childId);
        queue.push(childId);
      });
    }

    return allowed;
  }, [organizations, user, userOrganizationId]);
  const scopedOrganizations = useMemo(
    () =>
      accessibleOrgIds
        ? organizations.filter((org) => accessibleOrgIds.has(String(org.id)))
        : organizations,
    [accessibleOrgIds, organizations],
  );

  const resetAutoCalcForm = () => {
    setAutoOutputIndicator("");
    setAutoSourceIndicator("");
    setAutoOperator("equals");
    setAutoMatchValue("yes");
    setAutoCountDistinct("respondent");
    setAutoProject("");
    setAutoOrganization("");
    setAutoPeriodStart("");
    setAutoPeriodEnd("");
    setAutoSaveRule(true);
    setAutoSaveAggregate(true);
    setAutoComputed(null);
  };

  const indicatorNameById = useMemo(
    () =>
      new Map(indicators.map((indicator) => [String(indicator.id), indicator.name])),
    [indicators],
  );
  const indicatorCodeById = useMemo(
    () =>
      new Map(indicators.map((indicator) => [String(indicator.id), indicator.code])),
    [indicators],
  );
  const indicatorGroupKeyById = useMemo(
    () =>
      new Map(indicators.map((indicator) => [String(indicator.id), buildIndicatorGroupKey(indicator)])),
    [indicators],
  );
  const indicatorGroupLabelByKey = useMemo(() => {
    const labelByKey = new Map<string, string>();
    indicators.forEach((indicator) => {
      const key = buildIndicatorGroupKey(indicator);
      if (!labelByKey.has(key)) {
        labelByKey.set(key, indicator.name || "Indicator");
      }
    });
    return labelByKey;
  }, [indicators]);
  const projectNameById = useMemo(
    () =>
      new Map(projects.map((project) => [String(project.id), project.name])),
    [projects],
  );
  const parentOrganizations = useMemo(
    () =>
      scopedOrganizations.filter(
        (org: { parent?: number | string | null; parentId?: number | string | null }) =>
          !String(org.parentId ?? org.parent ?? "") &&
          isRecognizedParentOrganizationName(String((org as { name?: string }).name ?? "")),
      ),
    [scopedOrganizations],
  );
  const childOrganizationsByParentId = useMemo(() => {
    const groups = new Map<string, typeof scopedOrganizations>();
    parentOrganizations.forEach((parent) => {
      groups.set(String(parent.id), []);
    });
    scopedOrganizations.forEach((organization) => {
      const parentId = String(
        (organization as { parent?: number | string | null; parentId?: number | string | null }).parentId ??
          (organization as { parent?: number | string | null }).parent ??
          "",
      );
      if (!parentId || !groups.has(parentId)) return;
      const items = groups.get(parentId) || [];
      items.push(organization);
      groups.set(parentId, items);
    });
    groups.forEach((items, parentId) => {
      groups.set(
        parentId,
        items.slice().sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""))),
      );
    });
    return groups;
  }, [parentOrganizations, scopedOrganizations]);
  const descendantsByOrgId = useMemo(() => {
    const childrenMap = new Map<string, string[]>();
    scopedOrganizations.forEach((organization) => {
      const parentId = String(
        (organization as { parent?: number | string | null; parentId?: number | string | null }).parentId ??
          (organization as { parent?: number | string | null }).parent ??
          "",
      );
      if (!parentId) return;
      const list = childrenMap.get(parentId) || [];
      list.push(String(organization.id));
      childrenMap.set(parentId, list);
    });

    const descendants = new Map<string, Set<string>>();
    scopedOrganizations.forEach((organization) => {
      const rootId = String(organization.id);
      const visited = new Set<string>([rootId]);
      const queue = [rootId];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        const children = childrenMap.get(current) || [];
        children.forEach((childId) => {
          if (visited.has(childId)) return;
          visited.add(childId);
          queue.push(childId);
        });
      }
      descendants.set(rootId, visited);
    });
    return descendants;
  }, [scopedOrganizations]);
  const quickOrgScopeOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = [];
    parentOrganizations.forEach((parent) => {
      options.push({ id: String(parent.id), label: `${parent.name} (with sub-grantees)` });
      const children = childOrganizationsByParentId.get(String(parent.id)) || [];
      children.forEach((child) => {
        options.push({ id: String(child.id), label: `↳ ${child.name}` });
      });
    });
    return options;
  }, [childOrganizationsByParentId, parentOrganizations]);
  const quickScopeIds = useMemo(() => {
    if (orgScopeFilter === "all") return null;
    return descendantsByOrgId.get(String(orgScopeFilter)) || new Set<string>([String(orgScopeFilter)]);
  }, [descendantsByOrgId, orgScopeFilter]);
  const effectiveOrgScopeIds = useMemo(() => quickScopeIds, [quickScopeIds]);

  useEffect(() => {
    const orgIdQuery = searchParams.get("orgId");
    if (orgIdQuery) {
      const targetId = orgIdQuery.trim();
      const hasMatch = scopedOrganizations.some((organization) => String(organization.id) === targetId);
      if (hasMatch) {
        setOrgScopeFilter((prev) => (prev === targetId ? prev : targetId));
        return;
      }
    }

    const parentQuery = searchParams.get("parent");
    if (!parentQuery) return;
    const normalized = parentQuery.trim().toLowerCase();
    const targetParent = parentOrganizations.find(
      (parent) => String(parent.name || "").trim().toLowerCase() === normalized,
    );
    if (!targetParent) return;
    const targetId = String(targetParent.id);
    setOrgScopeFilter((prev) => (prev === targetId ? prev : targetId));
  }, [parentOrganizations, scopedOrganizations, searchParams]);

  const periods = useMemo(
    () => Array.from(new Set(aggregates.map(getPeriodLabel))),
    [aggregates],
  );

  const availableKeyPopulations = useMemo(() => {
    const set = new Set<string>(keyPopulations);
    aggregates.forEach((agg) => {
      const disaggregates = getDisaggregates(agg.value);
      if (!disaggregates) return;
      Object.keys(disaggregates).forEach((kp) => set.add(kp));
    });
    return Array.from(set);
  }, [aggregates]);

  const filteredAggregates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const queryTerms = query.split(/\s+/).filter(Boolean);
    return aggregates.filter((agg) => {
      const rawIndicatorName = String(agg.indicator_name || "").trim();
      const mappedIndicatorName = String(
        indicatorNameById.get(String(agg.indicator)) || "",
      ).trim();
      const displayIndicatorName = normalizeIndicatorDisplayName(
        rawIndicatorName || mappedIndicatorName,
      );
      const indicatorCode = String(
        agg.indicator_code || indicatorCodeById.get(String(agg.indicator)) || "",
      ).trim();
      const searchHaystack = [rawIndicatorName, mappedIndicatorName, displayIndicatorName, indicatorCode]
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        queryTerms.length === 0 || queryTerms.every((term) => searchHaystack.includes(term));
      const matchesProject =
        projectFilter === "all" || String(agg.project) === projectFilter;
      const matchesPeriod =
        periodFilter === "all" || getPeriodLabel(agg) === periodFilter;
      const matchesOrgScope =
        !effectiveOrgScopeIds || effectiveOrgScopeIds.has(String(agg.organization));
      const matchesAccess =
        !accessibleOrgIds || accessibleOrgIds.has(String(agg.organization));

      const hasDisaggregateFilter =
        keyPopulationFilter !== "all" || ageRangeFilter !== "all";
      let matchesDisaggregate = true;
      if (hasDisaggregateFilter) {
        const disaggregates = getDisaggregates(agg.value);
        matchesDisaggregate = false;
        if (disaggregates) {
          const kpKeys = keyPopulationFilter === "all" ? Object.keys(disaggregates) : [keyPopulationFilter];
          for (const kp of kpKeys) {
            const kpData = disaggregates[kp];
            if (!kpData) continue;
            for (const sex of ["Male", "Female"] as const) {
              const values = kpData[sex] || {};
              if (ageRangeFilter !== "all") {
                const value = Number(values[ageRangeFilter] || 0);
                if (value > 0 && matrixAgeBands.includes(ageRangeFilter)) {
                  matchesDisaggregate = true;
                  break;
                }
                continue;
              }
              const totalForAgeBands = matrixAgeBands.reduce(
                (sum, band) => sum + (Number(values[band]) || 0),
                0,
              );
              if (totalForAgeBands > 0) {
                matchesDisaggregate = true;
                break;
              }
            }
            if (matchesDisaggregate) break;
          }
        }
      }

      return (
        matchesSearch &&
        matchesProject &&
        matchesPeriod &&
        matchesOrgScope &&
        matchesAccess &&
        matchesDisaggregate
      );
    });
  }, [
    accessibleOrgIds,
    ageRangeFilter,
    aggregates,
    effectiveOrgScopeIds,
    indicatorCodeById,
    indicatorNameById,
    keyPopulationFilter,
    periodFilter,
    projectFilter,
    searchQuery,
  ]);

  const aggregateGroups = useMemo(() => {
    const groups = new Map<string, Aggregate[]>();
    for (const agg of filteredAggregates) {
      const rawIndicatorName =
        agg.indicator_name ||
        indicatorNameById.get(String(agg.indicator)) ||
        "Indicator";
      const indicatorGroupKey =
        indicatorGroupingMode === "linked"
          ? indicatorGroupKeyById.get(String(agg.indicator)) || normalizeIndicatorText(rawIndicatorName)
          : indicatorGroupingMode === "linked_global"
            ? indicatorGroupKeyById.get(String(agg.indicator)) || normalizeIndicatorText(rawIndicatorName)
          : normalizeIndicatorText(rawIndicatorName);
      const orgName =
        indicatorGroupingMode === "linked_global"
          ? "__all_orgs__"
          : agg.organization_name || "";
      const key = `${indicatorGroupKey}||${orgName}`;
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
      const indicatorGroupKey = key.split("||")[0];
      const organizationName =
        indicatorGroupingMode === "linked_global"
          ? "All Organizations"
          : key.split("||")[1];
      const first = items[0];
      const code =
        first?.indicator_code ||
        indicatorCodeById.get(String(first?.indicator)) ||
        "";
      const indicatorName =
        items.length > 0
          ? indicatorGroupingMode === "linked"
            ? normalizeIndicatorDisplayName(
                String(
                  indicatorGroupLabelByKey.get(indicatorGroupKey) ||
                    first?.indicator_name ||
                    indicatorNameById.get(String(first?.indicator)) ||
                    "Indicator",
                ),
              )
            : normalizeIndicatorDisplayName(
                String(
                  first?.indicator_name ||
                    indicatorNameById.get(String(first?.indicator)) ||
                    "Indicator",
                ),
              )
          : "Indicator";
      return {
        key,
        indicatorName: String(indicatorName),
        organizationName: String(organizationName),
        items,
        code: String(code),
      };
    });
    return entries.sort((a, b) => {
      const ac = parseCode(String(a.code));
      const bc = parseCode(String(b.code));
      if (ac.num !== bc.num) return ac.num - bc.num;
      if (ac.suffix !== bc.suffix) return ac.suffix.localeCompare(bc.suffix);
      return a.organizationName.localeCompare(b.organizationName);
    });
  }, [
    filteredAggregates,
    indicatorCodeById,
    indicatorGroupKeyById,
    indicatorGroupLabelByKey,
    indicatorGroupingMode,
    indicatorNameById,
  ]);

  const totals = useMemo(() => {
    return filteredAggregates.reduce(
      (acc, agg) => {
        const value = parseAggregateValue(agg.value);
        const male = Number(value.male) || 0;
        const female = Number(value.female) || 0;
        const total =
          value.total !== undefined
            ? Number(value.total) || 0
            : male + female;
        acc.male += male;
        acc.female += female;
        acc.total += total;
        return acc;
      },
      { male: 0, female: 0, total: 0 },
    );
  }, [filteredAggregates]);

  const getPeriodBounds = (label: string) => {
    const match = aggregates.find((agg) => getPeriodLabel(agg) === label);
    if (!match) return null;
    return { from: match.period_start, to: match.period_end };
  };

  const handleExport = async () => {
    try {
      const periodBounds =
        periodFilter !== "all" ? getPeriodBounds(periodFilter) : null;
      const blob = await aggregatesService.export({
        format: "excel",
        project: projectFilter !== "all" ? projectFilter : undefined,
        organization: orgScopeFilter !== "all" ? orgScopeFilter : undefined,
        date_from: periodBounds?.from,
        date_to: periodBounds?.to,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `aggregates_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export aggregates", err);
      toast({
        title: "Export failed",
        description: "Unable to export aggregates.",
        variant: "destructive",
      });
    }
  };

  const resolveId = (value: string, list: Array<{ id: number | string; name?: string }>) => {
    if (!value) return null;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
    const match = list.find((item) => (item.name || "").toLowerCase() === value.toLowerCase());
    if (!match) return null;
    const matchId = Number(match.id);
    return Number.isNaN(matchId) ? null : matchId;
  };

  const resolveIndicatorLabel = (
    indicatorValue: string,
    templateIndicators: Array<{ id: number; name?: string }>,
  ) => {
    const indicatorId =
      resolveId(indicatorValue, indicators) ||
      (templateIndicators.length ? resolveId(indicatorValue, templateIndicators) : null);

    if (!indicatorId) {
      return indicatorValue.trim();
    }

    const knownName =
      indicators.find((item) => Number(item.id) === Number(indicatorId))?.name ||
      templateIndicators.find((item) => Number(item.id) === Number(indicatorId))?.name ||
      indicatorValue;

    return String(knownName || indicatorValue).trim();
  };

  const buildImportPreview = async (file: File, selectedSheetName?: string): Promise<ImportPreview> => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const isExcelFile = extension === "xlsx" || extension === "xls";
    if (!isExcelFile) {
      throw new Error("Only Excel files are supported");
    }
    const findTemplateBySheet = (sheetName: string) =>
      templates.find((template) => normalizeLowerTrim(template.name) === normalizeLowerTrim(sheetName)) ?? null;

    const missingIndicators = new Set<string>();
    const detectedIndicators = new Set<string>();
    const extraDisaggregateColumns = new Set<string>();
    let totalRows = 0;

    const inspectRows = (rows: string[][], templateIndicators: Array<{ id: number; name?: string }>) => {
      if (rows.length < 2) return;
      const headerContext = detectImportHeaderRow(rows);
      if (!headerContext) return;
      const { header, dataRows } = headerContext;
      const get = (row: string[], key: string) => {
        const idx = resolveImportHeaderIndex(header, key);
        return idx >= 0 ? String(row[idx] ?? "").trim() : "";
      };

      for (const row of dataRows) {
        if (!row.some((cell) => String(cell || "").trim() !== "")) continue;
        totalRows += 1;
        const indicatorValue = (get(row, "indicator_id") || get(row, "indicator_name") || "").trim();
        const indicatorId =
          resolveId(indicatorValue, indicators) ||
          (templateIndicators.length ? resolveId(indicatorValue, templateIndicators) : null);
        if (indicatorValue) {
          const indicatorLabel = resolveIndicatorLabel(indicatorValue, templateIndicators);
          if (indicatorLabel) {
            detectedIndicators.add(indicatorLabel);
          }
        }
        if (!indicatorId && indicatorValue) {
          missingIndicators.add(indicatorValue);
        }
      }

      header.forEach((columnKey) => {
        if (!columnKey) return;
        if (IMPORT_FIXED_COLUMNS.has(columnKey)) return;
        extraDisaggregateColumns.add(columnKey);
      });
    };

    if (extension === "xlsx" || extension === "xls") {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetNames = workbook.SheetNames.length ? workbook.SheetNames : [];
      const sheetNamesToRead = selectedSheetName
        ? sheetNames.filter((name) => normalizeLowerTrim(name) === normalizeLowerTrim(selectedSheetName))
        : sheetNames;
      for (const sheetName of sheetNamesToRead) {
        const sheet = workbook.Sheets[sheetName];
        const rows = (XLSX.utils.sheet_to_json(sheet, { header: 1 }) as Array<Array<unknown>>).map(
          (row) => row.map((cell) => (cell === undefined || cell === null ? "" : String(cell))),
        );
        const template = findTemplateBySheet(sheetName);
        inspectRows(rows, template?.indicators || []);
      }
      if (selectedSheetName && sheetNamesToRead.length === 0) {
        throw new Error("Selected sheet name was not found in workbook");
      }
    } else {
      throw new Error("Unsupported file type");
    }

    return {
      fileName: file.name,
      totalRows,
      detectedIndicators: Array.from(detectedIndicators).sort((a, b) => a.localeCompare(b)),
      missingIndicators: Array.from(missingIndicators).sort((a, b) => a.localeCompare(b)),
      extraDisaggregateColumns: Array.from(extraDisaggregateColumns).sort((a, b) => a.localeCompare(b)),
    };
  };

  const handleImportFileSelection = async (file: File) => {
    setIsPreparingImportPreview(true);
    setPendingImportFile(file);
    try {
      const preview = await buildImportPreview(file, importSheetName);
      setImportPreview(preview);
      setSelectedDetectedIndicators(
        Array.from(new Set([...(preview.detectedIndicators || []), ...(preview.missingIndicators || [])])),
      );
      setSelectedExtraDisaggregates(preview.extraDisaggregateColumns || []);
      setIsImportPreviewOpen(true);
    } catch (err) {
      console.error("Failed to prepare import preview", err);
      setPendingImportFile(null);
      setImportPreview(null);
      setSelectedDetectedIndicators([]);
      setSelectedExtraDisaggregates([]);
      toast({
        title: "Preview failed",
        description: "Could not inspect the selected file.",
        variant: "destructive",
      });
    } finally {
      setIsPreparingImportPreview(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImportFile) return;
    if (!importProject || !importOrganization || !importPeriodStart || !importPeriodEnd) {
      toast({
        title: "Missing required fields",
        description: "Project, organization, period start, and period end are required for import.",
        variant: "destructive",
      });
      return;
    }
    const selectableIndicatorsCount =
      (importPreview?.detectedIndicators?.length || 0) + (importPreview?.missingIndicators?.length || 0);
    if (selectableIndicatorsCount > 0 && selectedDetectedIndicators.length === 0) {
      toast({
        title: "No indicators selected",
        description: "Select at least one detected indicator to continue.",
        variant: "destructive",
      });
      return;
    }
    setIsImportPreviewOpen(false);
    await handleImport(pendingImportFile, {
      projectId: Number(importProject),
      organizationId: Number(importOrganization),
      periodStart: importPeriodStart,
      periodEnd: importPeriodEnd,
      sheetName: importSheetName.trim() || undefined,
      selectedIndicators: selectedDetectedIndicators,
      selectedExtraDisaggregates,
    });
    setPendingImportFile(null);
    setImportPreview(null);
    setSelectedDetectedIndicators([]);
    setSelectedExtraDisaggregates([]);
  };

  const handleImport = async (
    file: File,
    defaults?: {
      projectId?: number;
      organizationId?: number;
      periodStart?: string;
      periodEnd?: string;
      sheetName?: string;
      selectedIndicators?: string[];
      selectedExtraDisaggregates?: string[];
    },
  ) => {
    const persistManualImportHistory = (record: ManualImportHistoryRecord) => {
      try {
        const existingRaw = window.localStorage.getItem(MANUAL_IMPORTS_STORAGE_KEY);
        const parsed = existingRaw ? JSON.parse(existingRaw) : [];
        const existing = Array.isArray(parsed) ? (parsed as ManualImportHistoryRecord[]) : [];
        const next = [record, ...existing].slice(0, 100);
        window.localStorage.setItem(MANUAL_IMPORTS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore local history persistence issues
      }
    };

    const extension = file.name.split(".").pop()?.toLowerCase();
    const isExcelFile = extension === "xlsx" || extension === "xls";
    if (!isExcelFile) {
      toast({
        title: "Unsupported file",
        description: "Use Excel files (.xlsx or .xls).",
        variant: "destructive",
      });
      persistManualImportHistory({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        source: "aggregates-manual",
        fileName: file.name,
        importedRows: 0,
        failedRows: 1,
        status: "failed",
        indicatorsCreated: 0,
        periodStart: null,
        periodEnd: null,
        error: "Unsupported file type",
        createdAt: new Date().toISOString(),
      });
      return;
    }
    const fallbackProjectId = defaults?.projectId;
    const fallbackOrganizationId = defaults?.organizationId;
    const fallbackPeriodStart = normalizeImportDateValue(defaults?.periodStart?.trim() || "");
    const fallbackPeriodEnd = normalizeImportDateValue(defaults?.periodEnd?.trim() || "");
    const selectedSheetName = defaults?.sheetName?.trim();
    const normalizeIndicatorKey = (value: string) => normalizeLowerTrim(value).replace(/[^a-z0-9]+/g, " ").trim();
    const selectedIndicatorKeys = new Set(
      (defaults?.selectedIndicators || []).map((value) => normalizeIndicatorKey(value)).filter(Boolean),
    );
    const selectedExtraDisaggregateKeys = new Set(
      (defaults?.selectedExtraDisaggregates || []).map((value) => normalizeImportHeaderKey(value)).filter(Boolean),
    );

    const indicatorProfileByName = new Map<string, IndicatorImportProfile>();
    ((indicatorDisaggregationReport as { indicators?: Array<{ indicatorName?: string; recommendation?: { profile?: string } }> }).indicators || []).forEach((entry) => {
      const nameKey = normalizeIndicatorKey(String(entry.indicatorName || ""));
      const profile = entry.recommendation?.profile as IndicatorImportProfile | undefined;
      if (nameKey && profile) {
        indicatorProfileByName.set(nameKey, profile);
      }
    });
    const findOrgBySheet = (sheetName: string) =>
      organizations.find((org) => normalizeLowerTrim(org.name) === normalizeLowerTrim(sheetName))?.id ?? null;
    const findTemplateBySheet = (sheetName: string) =>
      templates.find((template) => normalizeLowerTrim(template.name) === normalizeLowerTrim(sheetName)) ?? null;
    const inferOrgIdFromPath = (path: string) => {
      const segments = path
        .split("/")
        .map((segment) => normalizeLowerTrim(segment))
        .filter(Boolean)
        .reverse();

      for (const segment of segments) {
        const exact = organizations.find((org) => normalizeLowerTrim(String(org.name || "")) === segment);
        if (exact) return Number(exact.id);
      }

      for (const segment of segments) {
        const fuzzy = organizations.find((org) => {
          const orgName = normalizeLowerTrim(String(org.name || ""));
          if (!orgName) return false;
          return segment.includes(orgName) || (segment.length >= 5 && orgName.includes(segment));
        });
        if (fuzzy) return Number(fuzzy.id);
      }

      return null;
    };

    let success = 0;
    let failed = 0;
    let indicatorsCreated = 0;
    let firstBulkErrorMessage = "";
    const payloads: Array<{
      indicator: number;
      project: number;
      organization: number;
      period_start: string;
      period_end: string;
      value: AggregateValue | unknown;
      notes?: string;
    }> = [];

    const indicatorIdByName = new Map<string, number>();
    const indicatorIdByCanonicalName = new Map<string, number>();
    indicators.forEach((indicator) => {
      const nameKey = normalizeLowerTrim(String(indicator.name || ""));
      if (nameKey) indicatorIdByName.set(nameKey, Number(indicator.id));
      const canonicalKey = normalizeIndicatorCanonicalKey(String(indicator.name || ""));
      if (canonicalKey && !indicatorIdByCanonicalName.has(canonicalKey)) {
        indicatorIdByCanonicalName.set(canonicalKey, Number(indicator.id));
      }
    });

    const makeIndicatorCode = (name: string) => {
      const token = name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 24) || "AUTO_INDICATOR";
      return `AUTO_${token}_${Date.now().toString().slice(-6)}`;
    };

    const normalizeSex = (value: string) => {
      const normalized = normalizeLowerTrim(value);
      if (normalized === "male" || normalized === "m") return "Male" as const;
      if (normalized === "female" || normalized === "f") return "Female" as const;
      return null;
    };

    const normalizeAgeBand = (value: string) => {
      const compact = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9+]+/g, "");
      if (!compact) return "";
      return ageBandLookup.get(compact) || value.trim();
    };

    const ensureDisaggregate = (
      value: AggregateValue,
      keyPopulation: string,
      sex: "Male" | "Female",
      ageBand: string,
      amount: number,
    ) => {
      const kp = normalizeDisaggregateLabel(keyPopulation);
      const band = normalizeAgeBand(ageBand);
      if (!kp || !band) return;
      if (!value.disaggregates) value.disaggregates = {};
      if (!value.disaggregates[kp]) {
        value.disaggregates[kp] = { Male: {}, Female: {} };
      }
      const current = Number(value.disaggregates[kp][sex][band]) || 0;
      value.disaggregates[kp][sex][band] = current + amount;
    };

    const ensureOtherDisaggregate = (
      value: AggregateValue,
      label: string,
      amount: number,
    ) => {
      const key = normalizeDisaggregateLabel(label);
      if (!key) return;
      if (!value.other_disaggregates) value.other_disaggregates = {};
      value.other_disaggregates[key] = (Number(value.other_disaggregates[key]) || 0) + amount;
    };

    const sumDisaggregateTotals = (value: AggregateValue) => {
      const disaggregates = value.disaggregates;
      if (!disaggregates) return { male: 0, female: 0, total: 0 };
      let maleTotal = 0;
      let femaleTotal = 0;
      Object.values(disaggregates).forEach((kpData) => {
        Object.values(kpData.Male || {}).forEach((amount) => {
          maleTotal += Number(amount) || 0;
        });
        Object.values(kpData.Female || {}).forEach((amount) => {
          femaleTotal += Number(amount) || 0;
        });
      });
      return { male: maleTotal, female: femaleTotal, total: maleTotal + femaleTotal };
    };

    const ensureIndicatorId = async (
      indicatorValue: string,
      orgId: number | null,
      templateIndicators: Array<{ id: number; name?: string }>,
    ) => {
      let indicatorId = resolveId(indicatorValue, indicators);
      if (!indicatorId && templateIndicators.length) {
        indicatorId = resolveId(indicatorValue, templateIndicators);
      }
      if (indicatorId) return indicatorId;

      const byName = indicatorIdByName.get(normalizeLowerTrim(indicatorValue));
      if (byName) return byName;

      const byCanonicalName = indicatorIdByCanonicalName.get(
        normalizeIndicatorCanonicalKey(indicatorValue),
      );
      if (byCanonicalName) return byCanonicalName;

      const cleanName = indicatorValue.trim();
      if (!cleanName) return null;

      const seed = indicators[0];
      const fallbackCategory = (seed?.category || "hiv_prevention") as "hiv_prevention" | "ncd" | "events";
      const fallbackType = (seed?.type || "number") as
        | "yes_no"
        | "number"
        | "percentage"
        | "text"
        | "select"
        | "multiselect"
        | "date"
        | "multi_int";

      try {
        const created = await indicatorsService.create({
          name: cleanName,
          code: makeIndicatorCode(cleanName),
          category: fallbackCategory,
          type: fallbackType,
          organizations: orgId ? [orgId] : undefined,
          aggregation_method: "sum",
        });
        const createdId = Number(created.id);
        if (Number.isNaN(createdId)) return null;
        indicatorIdByName.set(normalizeLowerTrim(cleanName), createdId);
        const canonicalKey = normalizeIndicatorCanonicalKey(cleanName);
        if (canonicalKey) {
          indicatorIdByCanonicalName.set(canonicalKey, createdId);
        }
        indicatorsCreated += 1;
        return createdId;
      } catch {
        return null;
      }
    };

    const resolveIndicatorProfile = (indicatorValue: string, indicatorId: number | null): IndicatorImportProfile => {
      const nameFromValue = normalizeIndicatorKey(indicatorValue);
      if (nameFromValue && indicatorProfileByName.has(nameFromValue)) {
        return indicatorProfileByName.get(nameFromValue)!;
      }
      if (indicatorId) {
        const existingName = indicators.find((item) => Number(item.id) === Number(indicatorId))?.name || "";
        const nameKey = normalizeIndicatorKey(existingName);
        if (nameKey && indicatorProfileByName.has(nameKey)) {
          return indicatorProfileByName.get(nameKey)!;
        }
      }
      return "kp_age_sex_matrix";
    };

    const processRows = async (
      rows: string[][],
      sheetOrgId: number | null,
      templateIndicators: Array<{ id: number; name?: string }>,
      fallbackOrgId: number | null,
    ) => {
      if (rows.length < 2) return;
      const headerContext = detectImportHeaderRow(rows);
      if (!headerContext) return;
      const { header, dataRows } = headerContext;
      const get = (row: string[], key: string) => {
        const idx = resolveImportHeaderIndex(header, key);
        return idx >= 0 ? String(row[idx] ?? "").trim() : "";
      };
      const getAny = (row: string[], keys: string[]) => {
        for (const key of keys) {
          const value = get(row, key);
          if (value) return value;
        }
        return "";
      };
      const getIndicatorFallback = (row: string[]) => {
        for (const cell of row) {
          const text = String(cell || "").trim();
          if (!text) continue;
          if (!Number.isNaN(Number(text))) continue;
          return text;
        }
        return "";
      };
      for (const row of dataRows) {
        try {
          const projectId =
            resolveId(getAny(row, ["project_id", "project_name"]), projects) || fallbackProjectId || null;
          let orgId = resolveId(getAny(row, ["organization_id", "organization_name"]), organizations);
          if (!orgId && fallbackOrganizationId) orgId = fallbackOrganizationId;
          if (!orgId && sheetOrgId) orgId = sheetOrgId;
          if (!orgId && fallbackOrgId) orgId = fallbackOrgId;

          const indicatorValue =
            getAny(row, ["indicator_id", "indicator_name"]) ||
            getIndicatorFallback(row);
          const indicatorSelectionLabel = resolveIndicatorLabel(indicatorValue, templateIndicators);
          const indicatorSelectionKey = normalizeIndicatorKey(indicatorSelectionLabel || indicatorValue);
          if (selectedIndicatorKeys.size > 0 && !selectedIndicatorKeys.has(indicatorSelectionKey)) {
            continue;
          }
          const indicatorId = await ensureIndicatorId(indicatorValue, orgId, templateIndicators);
          const indicatorProfile = resolveIndicatorProfile(indicatorValue, indicatorId);

          const periodStart = normalizeImportDateValue(get(row, "period_start") || fallbackPeriodStart);
          const periodEnd = normalizeImportDateValue(get(row, "period_end") || fallbackPeriodEnd);
          if (!indicatorId || !projectId || !orgId || !periodStart || !periodEnd) {
            failed += 1;
            continue;
          }
          let value: AggregateValue | unknown = {};
          const valueJson = get(row, "value_json");
          if (valueJson) {
            try {
              value = JSON.parse(valueJson);
            } catch {
              value = {};
            }
          }
          const male = parseNumber(get(row, "male"));
          const female = parseNumber(get(row, "female"));
          const total = parseNumber(get(row, "total"));

          const rowKeyPopulation = getAny(row, ["key_population", "key_population_name"]);
          const rowAgeBand = getAny(row, ["age_range", "age_band"]);
          const rowSex = normalizeSex(get(row, "sex"));
          const rowCategory = getAny(row, ["category", "cadre", "breakdown", "population_group"]);
          const rowDisaggregateType = get(row, "disaggregate_type");
          const rowDisaggregateValue = get(row, "disaggregate_value");

          if (typeof value === "object" && value !== null) {
            if (male !== undefined) (value as AggregateValue).male = male;
            if (female !== undefined) (value as AggregateValue).female = female;
            if (total !== undefined) (value as AggregateValue).total = total;
          }
          if (!value || (typeof value === "object" && Object.keys(value as object).length === 0)) {
            value = {
              total: total ?? (male ?? 0) + (female ?? 0),
              ...(male !== undefined ? { male } : {}),
              ...(female !== undefined ? { female } : {}),
            };
          }

          const valueObject = value as AggregateValue;

          const allowAgeSex =
            indicatorProfile === "kp_age_sex_matrix" || indicatorProfile === "age_sex_matrix_non_kp";
          const requireKeyPopulation = indicatorProfile === "kp_age_sex_matrix";
          const allowCategoryOnly = indicatorProfile === "category_or_cadre_breakdown";
          const singleTotalOnly = indicatorProfile === "single_total";

          if (!singleTotalOnly && rowAgeBand && rowSex && allowAgeSex) {
            const rowAmount =
              rowSex === "Male"
                ? male ?? total ?? 0
                : female ?? total ?? 0;
            if (rowAmount > 0) {
              ensureDisaggregate(
                valueObject,
                requireKeyPopulation
                  ? rowKeyPopulation || rowCategory || "GENERAL POP."
                  : "ALL POPULATIONS",
                rowSex,
                rowAgeBand,
                rowAmount,
              );
            }
          }

          const rowGenericAmount =
            parseNumber(getAny(row, ["value", "amount", "count"])) ?? total ?? male ?? female;
          if (!singleTotalOnly && rowDisaggregateType && rowDisaggregateValue && rowGenericAmount !== undefined) {
            ensureOtherDisaggregate(valueObject, `${rowDisaggregateType}:${rowDisaggregateValue}`, rowGenericAmount);
          }
          if (!singleTotalOnly && allowCategoryOnly && rowCategory && rowGenericAmount !== undefined) {
            ensureOtherDisaggregate(valueObject, rowCategory, rowGenericAmount);
          }

          header.forEach((columnKey, index) => {
            if (singleTotalOnly) return;
            if (IMPORT_FIXED_COLUMNS.has(columnKey)) return;
            if (
              selectedExtraDisaggregateKeys.size > 0
              && !selectedExtraDisaggregateKeys.has(normalizeImportHeaderKey(columnKey))
            ) {
              return;
            }
            const amount = parseNumber(row[index] || "");
            if (amount === undefined) return;

            const tokens = columnKey.split("_").filter(Boolean);
            const sexIndex = tokens.findIndex((token) => token === "male" || token === "female");
            if (allowCategoryOnly) {
              ensureOtherDisaggregate(valueObject, columnKey, amount);
              return;
            }
            if (!allowAgeSex) {
              ensureOtherDisaggregate(valueObject, columnKey, amount);
              return;
            }
            if (sexIndex <= 0 || sexIndex >= tokens.length - 1) {
              ensureOtherDisaggregate(valueObject, columnKey, amount);
              return;
            }

            const kp = tokens.slice(0, sexIndex).join(" ");
            const sex = tokens[sexIndex] === "male" ? "Male" : "Female";
            const ageBandToken = tokens.slice(sexIndex + 1).join("-");
            const ageBand = normalizeAgeBand(ageBandToken);
            if (kp && ageBand) {
              ensureDisaggregate(
                valueObject,
                requireKeyPopulation ? kp : "ALL POPULATIONS",
                sex,
                ageBand,
                amount,
              );
              return;
            }

            ensureOtherDisaggregate(valueObject, columnKey, amount);
          });

          if (valueObject.disaggregates) {
            const totalsFromDisaggregates = sumDisaggregateTotals(valueObject);
            if (valueObject.male === undefined) valueObject.male = totalsFromDisaggregates.male;
            if (valueObject.female === undefined) valueObject.female = totalsFromDisaggregates.female;
            if (valueObject.total === undefined) valueObject.total = totalsFromDisaggregates.total;
          }

          payloads.push({
            indicator: indicatorId,
            project: projectId,
            organization: orgId,
            period_start: periodStart,
            period_end: periodEnd,
            value,
            notes: get(row, "notes") || undefined,
          });
        } catch {
          failed += 1;
        }
      }
    };

    if (extension === "xlsx" || extension === "xls") {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetNames = workbook.SheetNames.length ? workbook.SheetNames : [];
      const sheetNamesToRead = selectedSheetName
        ? sheetNames.filter((name) => normalizeLowerTrim(name) === normalizeLowerTrim(selectedSheetName))
        : sheetNames;
      if (selectedSheetName && sheetNamesToRead.length === 0) {
        toast({
          title: "Sheet not found",
          description: `No sheet named "${selectedSheetName}" was found in this workbook.`,
          variant: "destructive",
        });
        return;
      }
      const fileOrgId = inferOrgIdFromPath(file.name);
      for (const sheetName of sheetNamesToRead) {
        const sheet = workbook.Sheets[sheetName];
        const rows = (XLSX.utils.sheet_to_json(sheet, { header: 1 }) as Array<Array<unknown>>).map(
          (row) => row.map((cell) => (cell === undefined || cell === null ? "" : String(cell))),
        );
        const sheetOrgCandidate = findOrgBySheet(sheetName);
        const parsedSheetOrgId = sheetOrgCandidate === null ? null : Number(sheetOrgCandidate);
        const sheetOrgId = Number.isNaN(parsedSheetOrgId) ? fileOrgId : parsedSheetOrgId;
        const template = findTemplateBySheet(sheetName);
        const templateIndicators = template?.indicators || [];
        await processRows(rows, sheetOrgId, templateIndicators, fileOrgId);
      }
    } else {
      toast({
        title: "Unsupported file",
        description: "Use Excel files (.xlsx or .xls).",
        variant: "destructive",
      });
      return;
    }

    if (payloads.length === 0) {
      toast({ title: "Invalid file", description: "No rows found.", variant: "destructive" });
      persistManualImportHistory({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        source: "aggregates-manual",
        fileName: file.name,
        importedRows: 0,
        failedRows: 1,
        status: "failed",
        indicatorsCreated,
        periodStart: fallbackPeriodStart || null,
        periodEnd: fallbackPeriodEnd || null,
        error: "No rows found",
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const grouped = new Map<
      string,
      {
        project: number;
        organization: number;
        period_start: string;
        period_end: string;
        data: Array<{ indicator: number; value: AggregateValue | unknown; notes?: string }>;
      }
    >();

    for (const item of payloads) {
      const key = `${item.project}::${item.organization}::${item.period_start}::${item.period_end}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          project: item.project,
          organization: item.organization,
          period_start: item.period_start,
          period_end: item.period_end,
          data: [],
        });
      }
      grouped.get(key)!.data.push({
        indicator: item.indicator,
        value: item.value,
        notes: item.notes,
      });
    }

    const reportGroups = Array.from(grouped.values());

    for (const group of reportGroups) {
      try {
        const result = await aggregatesService.bulkCreate({
          project: group.project,
          organization: group.organization,
          period_start: group.period_start,
          period_end: group.period_end,
          data: group.data,
        });
        success += result.length;
      } catch (err) {
        failed += group.data.length;
        if (!firstBulkErrorMessage) {
          firstBulkErrorMessage =
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message || "")
              : "";
        }
      }
    }

    await mutate();

    toast({
      title: "Import complete",
      description: `Imported ${success} rows. ${failed} failed.${indicatorsCreated ? ` Created ${indicatorsCreated} new indicator(s).` : ""}${failed && firstBulkErrorMessage ? ` Error: ${firstBulkErrorMessage}` : ""} Saved as draft. Validate in All Imports to populate reports.`,
      variant: failed ? "destructive" : "default",
      action: (
        <ToastAction altText="View all imports" onClick={() => router.push("/uploads/imports")}>
          View imports
        </ToastAction>
      ),
    });

    persistManualImportHistory({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: "aggregates-manual",
      fileName: file.name,
      importedRows: success,
      failedRows: failed,
      status: success > 0 ? "draft" : "failed",
      indicatorsCreated,
      periodStart: fallbackPeriodStart || null,
      periodEnd: fallbackPeriodEnd || null,
      error: firstBulkErrorMessage || null,
      reportGroups: reportGroups.map((group) => ({
        project: group.project,
        organization: group.organization,
        period_start: group.period_start,
        period_end: group.period_end,
      })),
      validatedAt: null,
      createdAt: new Date().toISOString(),
    });
  };

  const chartData = useMemo(() => {
    const totalsByIndicatorId = new Map<string, number>();
    for (const agg of filteredAggregates) {
      const value = parseAggregateValue(agg.value);
      const male = Number(value.male) || 0;
      const female = Number(value.female) || 0;
      const total =
        value.total !== undefined
          ? Number(value.total) || 0
          : male + female;
      const indicatorId = String(agg.indicator);
      totalsByIndicatorId.set(
        indicatorId,
        (totalsByIndicatorId.get(indicatorId) || 0) + total,
      );
    }

    const rolledTotals = rollupLinkedIndicatorTotals(indicators, totalsByIndicatorId);

    return Array.from(rolledTotals.entries()).map(([indicatorId, total]) => ({
      name: indicatorNameById.get(indicatorId) || "Indicator",
      total,
    }));
  }, [filteredAggregates, indicatorNameById, indicators]);

  const resetForm = () => {
    setFormProject("");
    setFormIndicator("");
    setFormOrganization("");
    setFormTemplate("all");
    setFormPeriodStart("");
    setFormPeriodEnd("");
    setUseMatrixEntry(true);
    setFormMale("");
    setFormFemale("");
    setFormNotes("");
    setFormDataSource("");
    setMatrixValues(buildEmptyMatrix());
    setSelectedDisaggregates([...keyPopulations]);
  };

  const downloadChartSvg = () => {
    const container = chartRef.current;
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
    link.download = `aggregates_chart_${new Date().toISOString().slice(0, 10)}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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

  const selectedFormIndicator = useMemo(
    () => indicators.find((indicator) => String(indicator.id) === formIndicator),
    [formIndicator, indicators],
  );

  const selectedIndicatorDisaggregateGroups = useMemo(() => {
    const labels = Array.isArray(selectedFormIndicator?.sub_labels)
      ? selectedFormIndicator.sub_labels
      : [];
    const known = new Set(disaggregateGroupNames.map((name) => normalizeGroupName(name)));
    return labels.filter((label) => known.has(normalizeGroupName(label)));
  }, [selectedFormIndicator]);

  const disaggregateCategoryOptions = useMemo(() => {
    const fromGroups = resolveDisaggregateCategories(selectedIndicatorDisaggregateGroups);
    return fromGroups.length > 0 ? fromGroups : [...keyPopulations];
  }, [selectedIndicatorDisaggregateGroups]);

  useEffect(() => {
    if (!useMatrixEntry) return;
    setSelectedDisaggregates((prev) => {
      const allowed = new Set(disaggregateCategoryOptions);
      const next = prev.filter((item) => allowed.has(item));
      if (next.length > 0) return next;
      return [...disaggregateCategoryOptions];
    });
  }, [disaggregateCategoryOptions, useMatrixEntry]);

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
    for (const kp of selectedDisaggregates) {
      for (const sex of ["Male", "Female"]) {
        for (const band of matrixAgeBands) {
          const value = parseNumber(matrixValues[kp]?.[sex]?.[band] ?? "");
          if (value !== undefined) total += value;
        }
      }
    }
    return total;
  }, [matrixValues, selectedDisaggregates, useMatrixEntry]);

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

    if (useMatrixEntry && selectedDisaggregates.length === 0) {
      toast({
        title: "Missing disaggregate selection",
        description: "Select at least one disaggregate category.",
        variant: "destructive",
      });
      return;
    }

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
      for (const kp of selectedDisaggregates) {
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
      });
      toast({
        title: "Aggregate saved",
        description: "Aggregate entry created successfully.",
      });
      await mutate();
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Failed to create aggregate", err);
      toast({
        title: "Error",
        description: "Failed to create aggregate entry.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoCalculate = async () => {
    if (
      !autoOutputIndicator ||
      !autoSourceIndicator ||
      !autoProject ||
      !autoOrganization ||
      !autoPeriodStart ||
      !autoPeriodEnd
    ) {
      toast({
        title: "Missing required fields",
        description: "Output, source, project, organization, and period dates are required.",
        variant: "destructive",
      });
      return;
    }

    setIsAutoCalcSubmitting(true);
    try {
      const result = await aggregatesService.generateFromInteractions({
        output_indicator: Number(autoOutputIndicator),
        source_indicator: Number(autoSourceIndicator),
        operator: autoOperator,
        match_value: autoMatchValue,
        count_distinct: autoCountDistinct,
        project: Number(autoProject),
        organization: Number(autoOrganization),
        period_start: autoPeriodStart,
        period_end: autoPeriodEnd,
        save_rule: autoSaveRule,
        save_aggregate: autoSaveAggregate,
      });

      setAutoComputed(result.computed);
      if (autoSaveAggregate) {
        await mutate();
      }
      toast({
        title: "Auto-calculation complete",
        description: `Computed value: ${result.computed}`,
      });
    } catch (err) {
      console.error("Failed to auto-calculate aggregate", err);
      toast({
        title: "Error",
        description: "Failed to auto-calculate from interactions.",
        variant: "destructive",
      });
    } finally {
      setIsAutoCalcSubmitting(false);
    }
  };

  const handlePostGroupComment = async (groupKey: string, items: Aggregate[]) => {
    if (!canPostGroupComments) {
      toast({
        title: "Read-only comments",
        description: "Your role or group can view comments but cannot post new ones.",
        variant: "destructive",
      });
      return;
    }

    const message = (groupCommentDrafts[groupKey] || "").trim();
    if (!message) {
      toast({
        title: "Comment required",
        description: "Please type a comment before posting.",
        variant: "destructive",
      });
      return;
    }

    const targetAggregate = items
      .slice()
      .sort(
        (left, right) =>
          new Date(right.updated_at || right.created_at).getTime() -
          new Date(left.updated_at || left.created_at).getTime(),
      )[0];

    if (!targetAggregate) {
      toast({
        title: "Unable to post",
        description: "No aggregate record found for this group.",
        variant: "destructive",
      });
      return;
    }

    const targetId = Number(targetAggregate.id);
    if (Number.isNaN(targetId)) {
      toast({
        title: "Unable to post",
        description: "This aggregate record cannot be updated.",
        variant: "destructive",
      });
      return;
    }

    const createdAt = new Date().toISOString();
    const line = buildCommentLine(currentUserName, message, createdAt);
    const existingNotes = (targetAggregate.notes || "").trim();
    const nextNotes = existingNotes ? `${existingNotes}\n${line}` : line;

    setGroupCommentSubmitting((prev) => ({ ...prev, [groupKey]: true }));
    try {
      await aggregatesService.update(targetId, { notes: nextNotes });
      setGroupCommentDrafts((prev) => ({ ...prev, [groupKey]: "" }));
      await mutate();
      toast({
        title: "Comment posted",
        description: "Your comment is now visible to users with access to this data.",
      });
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Failed to save comment.")
          : "Failed to save comment.";
      toast({
        title: "Failed to post comment",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGroupCommentSubmitting((prev) => ({ ...prev, [groupKey]: false }));
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
        <p className="text-muted-foreground">Failed to load aggregates</p>
        <Button onClick={() => mutate()}>Retry</Button>
      </div>
    );
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="flex flex-col gap-6 pb-6">
        <PageHeader
          title="Aggregates"
          description="Enter and manage aggregate data without individual respondent tracking"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Aggregates" },
          ]}
          actions={
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <Button
                variant="outline"
                onClick={() => importInputRef.current?.click()}
                disabled={isPreparingImportPreview}
              >
                {isPreparingImportPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isPreparingImportPreview ? "Preparing..." : "Import"}
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                aria-label="Select aggregate import file"
                title="Select aggregate import file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleImportFileSelection(file);
                  }
                  if (importInputRef.current) {
                    importInputRef.current.value = "";
                  }
                }}
              />

              <Dialog
                open={isImportPreviewOpen}
                onOpenChange={(open) => {
                  setIsImportPreviewOpen(open);
                  if (!open) {
                    setPendingImportFile(null);
                    setImportPreview(null);
                    setSelectedDetectedIndicators([]);
                    setSelectedExtraDisaggregates([]);
                  }
                }}
              >
                <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
                  <DialogHeader>
                    <DialogTitle>Import Preview</DialogTitle>
                    <DialogDescription>
                      Review what will be imported before applying changes.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex-1 space-y-4 overflow-y-auto pr-1 text-sm">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Project</Label>
                        <Select value={importProject} onValueChange={setImportProject}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
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
                        <Select value={importOrganization} onValueChange={setImportOrganization}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.map((org) => (
                              <SelectItem key={org.id} value={String(org.id)}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Period Start</Label>
                        <Input type="date" value={importPeriodStart} onChange={(event) => setImportPeriodStart(event.target.value)} />
                      </div>

                      <div className="space-y-2">
                        <Label>Period End</Label>
                        <Input type="date" value={importPeriodEnd} onChange={(event) => setImportPeriodEnd(event.target.value)} />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Sheet Name (optional)</Label>
                        <Input
                          value={importSheetName}
                          onChange={(event) => setImportSheetName(event.target.value)}
                          placeholder="Leave blank to import all sheets"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="font-medium">File</p>
                      <p className="text-muted-foreground">{importPreview?.fileName || "-"}</p>
                    </div>
                    <div>
                      <p className="font-medium">Rows detected</p>
                      <p className="text-muted-foreground">{importPreview?.totalRows ?? 0}</p>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-medium">Detected indicators</p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedDetectedIndicators(
                                Array.from(
                                  new Set([
                                    ...(importPreview?.detectedIndicators || []),
                                    ...(importPreview?.missingIndicators || []),
                                  ]),
                                ),
                              )
                            }
                          >
                            Select all
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDetectedIndicators([])}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      {importPreview?.detectedIndicators?.length ? (
                        <div className="max-h-40 space-y-2 overflow-auto rounded-md border border-border p-2 text-xs">
                          {importPreview.detectedIndicators.map((name) => {
                            const id = `import-detected-indicator-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
                            const checked = selectedDetectedIndicators.includes(name);
                            return (
                              <label key={name} htmlFor={id} className="flex cursor-pointer items-center gap-2">
                                <Checkbox
                                  id={id}
                                  checked={checked}
                                  onCheckedChange={(value) => {
                                    setSelectedDetectedIndicators((prev) => {
                                      if (value === true) {
                                        if (prev.includes(name)) return prev;
                                        return [...prev, name];
                                      }
                                      return prev.filter((item) => item !== name);
                                    });
                                  }}
                                />
                                <span className="text-muted-foreground">{name}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">None</p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Missing indicators (will be auto-created)</p>
                      {importPreview?.missingIndicators?.length ? (
                        <div className="max-h-28 space-y-2 overflow-auto rounded-md border border-border p-2 text-xs">
                          {importPreview.missingIndicators.map((name) => {
                            const id = `import-missing-indicator-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
                            const checked = selectedDetectedIndicators.includes(name);
                            return (
                              <label key={name} htmlFor={id} className="flex cursor-pointer items-center gap-2">
                                <Checkbox
                                  id={id}
                                  checked={checked}
                                  onCheckedChange={(value) => {
                                    setSelectedDetectedIndicators((prev) => {
                                      if (value === true) {
                                        if (prev.includes(name)) return prev;
                                        return [...prev, name];
                                      }
                                      return prev.filter((item) => item !== name);
                                    });
                                  }}
                                />
                                <span className="text-muted-foreground">{name}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">None</p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Extra disaggregate columns detected</p>
                      {importPreview?.extraDisaggregateColumns?.length ? (
                        <>
                          <div className="mb-2 flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedExtraDisaggregates(importPreview.extraDisaggregateColumns)}
                            >
                              Select all
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedExtraDisaggregates([])}
                            >
                              Clear
                            </Button>
                          </div>
                          <div className="max-h-28 space-y-2 overflow-auto rounded-md border border-border p-2 text-xs">
                            {importPreview.extraDisaggregateColumns.map((column) => {
                              const id = `import-extra-disaggregate-${column.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
                              const checked = selectedExtraDisaggregates.includes(column);
                              return (
                                <label key={column} htmlFor={id} className="flex cursor-pointer items-center gap-2">
                                  <Checkbox
                                    id={id}
                                    checked={checked}
                                    onCheckedChange={(value) => {
                                      setSelectedExtraDisaggregates((prev) => {
                                        if (value === true) {
                                          if (prev.includes(column)) return prev;
                                          return [...prev, column];
                                        }
                                        return prev.filter((item) => item !== column);
                                      });
                                    }}
                                  />
                                  <span className="text-muted-foreground">{column}</span>
                                </label>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground">None</p>
                      )}
                    </div>
                  </div>

                  <DialogFooter className="shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsImportPreviewOpen(false);
                        setPendingImportFile(null);
                        setImportPreview(null);
                        setSelectedDetectedIndicators([]);
                        setSelectedExtraDisaggregates([]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => void handleConfirmImport()}>Import now</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog
                open={isAutoCalcOpen}
                onOpenChange={(open) => {
                  setIsAutoCalcOpen(open);
                  if (!open) resetAutoCalcForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Calculator className="mr-2 h-4 w-4" />
                    Auto-calculate
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Auto-calculate
                    </DialogTitle>
                    <DialogDescription>
                      Create/update a derivation rule and compute an aggregate from interaction responses.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-2">
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select value={autoProject} onValueChange={setAutoProject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
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
                      <Select value={autoOrganization} onValueChange={setAutoOrganization}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={String(org.id)}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Output Indicator (the number you report)</Label>
                      <Select value={autoOutputIndicator} onValueChange={setAutoOutputIndicator}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select output indicator" />
                        </SelectTrigger>
                        <SelectContent>
                          {indicators
                            .filter((i) => i.type === "number" || i.type === "percentage")
                            .map((indicator) => (
                              <SelectItem key={indicator.id} value={String(indicator.id)}>
                                {indicator.name} ({indicator.code})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Source Indicator (screening indicator)</Label>
                      <Select value={autoSourceIndicator} onValueChange={setAutoSourceIndicator}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source indicator" />
                        </SelectTrigger>
                        <SelectContent>
                          {indicators.map((indicator) => (
                            <SelectItem key={indicator.id} value={String(indicator.id)}>
                              {indicator.name} ({indicator.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Operator</Label>
                        <Select
                          value={autoOperator}
                          onValueChange={(v) =>
                            setAutoOperator(v as "equals" | "not_equals" | "contains")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="not_equals">Not equals</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Match value</Label>
                        {(() => {
                          const source = indicators.find((i) => String(i.id) === autoSourceIndicator);
                          if (source?.type === "yes_no") {
                            return (
                              <Select value={autoMatchValue} onValueChange={setAutoMatchValue}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                            );
                          }
                          return (
                            <Input
                              value={autoMatchValue}
                              onChange={(e) => setAutoMatchValue(e.target.value)}
                              placeholder="e.g., yes"
                            />
                          );
                        })()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Count distinct</Label>
                      <Select
                        value={autoCountDistinct}
                        onValueChange={(v) =>
                          setAutoCountDistinct(v as "respondent" | "interaction")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="respondent">Respondent (people)</SelectItem>
                          <SelectItem value="interaction">Interaction (services)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Period start</Label>
                        <Input
                          type="date"
                          value={autoPeriodStart}
                          onChange={(e) => setAutoPeriodStart(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Period end</Label>
                        <Input
                          type="date"
                          value={autoPeriodEnd}
                          onChange={(e) => setAutoPeriodEnd(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={autoSaveRule} onCheckedChange={(v) => setAutoSaveRule(v === true)} />
                        <span className="text-sm">Save mapping rule</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={autoSaveAggregate} onCheckedChange={(v) => setAutoSaveAggregate(v === true)} />
                        <span className="text-sm">Save aggregate record</span>
                      </div>
                    </div>

                    {autoComputed !== null ? (
                      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                        Computed value: <span className="font-medium">{autoComputed}</span>
                      </div>
                    ) : null}
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAutoCalcOpen(false)}
                      disabled={isAutoCalcSubmitting}
                    >
                      Close
                    </Button>
                    <Button onClick={handleAutoCalculate} disabled={isAutoCalcSubmitting}>
                      {isAutoCalcSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Calculate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="fixed inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen overflow-y-auto rounded-none p-0">
                  <DialogHeader>
                    <DialogTitle>Add Aggregate Entry</DialogTitle>
                    <DialogDescription>
                      Enter aggregate data for an indicator without individual
                      respondent tracking
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4 px-6 h-[calc(100vh-140px)] overflow-y-auto">
                    <div className="space-y-2">
                      <Label htmlFor="agg-project">Project</Label>
                      <Select value={formProject} onValueChange={setFormProject}>
                        <SelectTrigger id="agg-project">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agg-template">Indicator Template</Label>
                      <Select
                        value={formTemplate}
                        onValueChange={(value) => {
                          setFormTemplate(value);
                          setFormIndicator("");
                        }}
                      >
                        <SelectTrigger id="agg-template">
                          <SelectValue placeholder="All indicators" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All indicators</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={String(template.id)}>
                              {template.name} ({template.indicators?.length ?? 0})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agg-indicator">Indicator</Label>
                      <Select value={formIndicator} onValueChange={setFormIndicator}>
                        <SelectTrigger id="agg-indicator">
                          <SelectValue placeholder="Select indicator" />
                        </SelectTrigger>
                        <SelectContent>
                          {templateIndicatorOptions.map((indicator) => (
                            <SelectItem key={indicator.id} value={String(indicator.id)}>
                              {indicator.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                                        <Label htmlFor="agg-org">Organization</Label>
                  <OrganizationSelect
                    organizations={parentOrganizations}
                    value={formOrganization}
                    onChange={setFormOrganization}
                    placeholder="Select organization"
                  /></div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="agg-period-start">Period Start</Label>
                        <Input
                          id="agg-period-start"
                          type="date"
                          value={formPeriodStart}
                          onChange={(event) => setFormPeriodStart(event.target.value)}
                        />
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
                        <div className="rounded-lg border border-border p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">Select disaggregate categories</p>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDisaggregates([...disaggregateCategoryOptions])}>
                                Select all
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDisaggregates([])}>
                                Clear
                              </Button>
                            </div>
                          </div>
                          {selectedIndicatorDisaggregateGroups.length > 0 ? (
                            <div className="mb-2 text-xs text-muted-foreground">
                              Indicator groups: {selectedIndicatorDisaggregateGroups.join(", ")}
                            </div>
                          ) : null}
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {disaggregateCategoryOptions.map((kp) => {
                              const checked = selectedDisaggregates.includes(kp);
                              return (
                                <label key={`disagg-option-${kp}`} className="flex items-center gap-2 text-xs">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) => {
                                      const nextChecked = Boolean(value);
                                      setSelectedDisaggregates((prev) =>
                                        nextChecked
                                          ? (prev.includes(kp) ? prev : [...prev, kp])
                                          : prev.filter((item) => item !== kp),
                                      );
                                    }}
                                  />
                                  <span>{kp}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Enter values by selected disaggregate, sex, and age band.
                        </div>
                        <div className="overflow-auto rounded-lg border border-border max-h-[55vh]">
                          <table className="min-w-[960px] w-full border-collapse text-xs [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border">
                            <thead className="bg-muted/50 sticky top-0 z-10">
                              <tr>
                                <th className="p-1.5 text-left">Disaggregate Category</th>
                                <th className="p-1.5 text-left">Sex</th>
                                {matrixAgeBands.map((band) => (
                                  <th key={band} className="p-1.5 text-center whitespace-nowrap">
                                    {band}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {selectedDisaggregates.map((kp) => (
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
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Matrix total: <span className="font-semibold text-foreground">{matrixTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="agg-male">Male</Label>
                          <Input
                            id="agg-male"
                            type="number"
                            placeholder="0"
                            value={formMale}
                            onChange={(event) => setFormMale(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="agg-female">Female</Label>
                          <Input
                            id="agg-female"
                            type="number"
                            placeholder="0"
                            value={formFemale}
                            onChange={(event) => setFormFemale(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="agg-total">Total</Label>
                          <Input
                            id="agg-total"
                            type="number"
                            value={computedTotal}
                            disabled
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="agg-source">Data Source</Label>
                      <Input
                        id="agg-source"
                        placeholder="e.g. DHIS2 report, Excel, routine register"
                        value={formDataSource}
                        onChange={(event) => setFormDataSource(event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agg-notes">Notes</Label>
                      <Input
                        id="agg-notes"
                        placeholder="Optional notes"
                        value={formNotes}
                        onChange={(event) => setFormNotes(event.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Entry
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search indicators..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full">
                <Filter className="mr-2 h-4 w-4" />{" "}
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

            <Select
              value={orgScopeFilter}
              onValueChange={setOrgScopeFilter}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Organization Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {quickOrgScopeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full">
                <Calendar className="mr-2 h-4 w-4" />{" "}
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {periods.map((period) => (
                  <SelectItem key={String(period)} value={String(period)}>
                    {String(period)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={keyPopulationFilter} onValueChange={setKeyPopulationFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Key Population" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Key Populations</SelectItem>
                {availableKeyPopulations.map((kp) => (
                  <SelectItem key={kp} value={kp}>
                    {kp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>


            <Select value={ageRangeFilter} onValueChange={setAgeRangeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Age Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Age Ranges</SelectItem>
                {matrixAgeBands.map((band) => (
                  <SelectItem key={band} value={band}>
                    {band}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={indicatorGroupingMode}
              onValueChange={(value) =>
                setIndicatorGroupingMode(value as "exact" | "linked" | "linked_global")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Indicator Grouping" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Exact indicator + organization</SelectItem>
                <SelectItem value="linked">Linked family + organization</SelectItem>
                <SelectItem value="linked_global">Linked families (all organizations)</SelectItem>
              </SelectContent>
            </Select>
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
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Grand Total</CardDescription>
              <CardTitle className="text-2xl text-primary">
                {totals.total.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5" /> Aggregate Data
                </CardTitle>
                <CardDescription>Tabular view of all aggregate entries</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsChartOpen(true)}>
                <BarChart3 className="mr-2 h-4 w-4" /> View Chart
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {aggregateGroups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Table2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No data found</h3>
                <p className="text-muted-foreground mt-1">
                  Try adjusting your filters or add new entries
                </p>
              </div>
            )}

            <div className="space-y-6">
              {aggregateGroups.map((group) => {
                const agg = group.items[0];
                const disaggregates = mergeDisaggregates(group.items.map((item) => item.value));
                const comments = group.items
                  .flatMap((item) => parseAggregateComments(item))
                  .sort(
                    (left, right) =>
                      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
                  );
                const regularComments = comments.filter((comment) => !comment.isSystem);
                const groupSystemNotes = comments.filter((comment) => comment.isSystem);
                const isSystemNotesOpen = systemNotesOpen[group.key] || false;
                const commentDraft = groupCommentDrafts[group.key] || "";
                const isPostingComment = groupCommentSubmitting[group.key] || false;
                const keyPops = getAllKeyPopulations(disaggregates).filter((kp) => {
                  const kpData = disaggregates?.[kp];
                  if (!kpData) return false;
                  return (["Male", "Female"] as const).some((sex) => {
                    const values = kpData[sex] || {};
                    return matrixAgeBands.some((band) => (Number(values[band]) || 0) > 0);
                  });
                });
                const projectName =
                  agg?.project_name ||
                  projectNameById.get(String(agg?.project)) ||
                  "Project";
                const periodLabel = agg ? getPeriodLabel(agg) : "";
                const totalValue = group.items.reduce((sum, item) => {
                  const value = parseAggregateValue(item.value);
                  const male = Number(value.male) || 0;
                  const female = Number(value.female) || 0;
                  const total = value.total !== undefined ? Number(value.total) || 0 : male + female;
                  return sum + total;
                }, 0);
                if (!disaggregates) {
                  return (
                    <div key={group.key} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Indicator</p>
                          <p className="text-base font-semibold">{group.indicatorName}</p>
                          <p className="text-sm text-muted-foreground">
                            {String(group.organizationName)} ? {String(projectName)} ? {String(periodLabel)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-xl font-semibold text-primary">
                            {Number(totalValue).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                const sexTotals: Record<"Male" | "Female", Record<string, number>> = {
                  Male: {},
                  Female: {},
                };
                for (const band of matrixAgeBandCore) {
                  sexTotals.Male[band] = 0;
                  sexTotals.Female[band] = 0;
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

                const chartSeries = keyPops.flatMap((kp) =>
                  (["Male", "Female"] as const).map((sex) => ({
                    key: `${kp}__${sex}`,
                    label: `${kp} ${sex}`,
                  })),
                );

                const ageDistributionData = matrixAgeBandCore.map((band) => {
                  const row: Record<string, string | number> = { name: band };
                  keyPops.forEach((kp) => {
                    const kpData = disaggregates[kp] || { Male: {}, Female: {} };
                    row[`${kp}__Male`] = kpData.Male?.[band] || 0;
                    row[`${kp}__Female`] = kpData.Female?.[band] || 0;
                  });
                  return row;
                });

                const isGroupChartOpen = groupChartsOpen[group.key] || false;

                return (
                  <div key={group.key} className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Indicator</p>
                        <p className="text-base font-semibold">
                          {group.indicatorName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {String(group.organizationName)} ? {String(projectName)} ? {String(periodLabel)}
                        </p>
                      </div>
                      <Badge variant="outline">Total {Number(totalValue).toLocaleString()}</Badge>
                    </div>

                    <div className="mb-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setGroupChartsOpen((prev) => ({
                            ...prev,
                            [group.key]: !prev[group.key],
                          }))
                        }
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        {isGroupChartOpen ? "Hide graph" : "Create KP/Sex/Age graph"}
                      </Button>
                    </div>

                    <div className="overflow-auto rounded-lg border border-border">
                      <table className="min-w-[960px] w-full border-collapse text-xs [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="w-[140px] p-1.5 text-left">Key Population</th>
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
                          {keyPops.map((kp) => {
                            const kpData = disaggregates[kp] || { Male: {}, Female: {} };
                            return (
                              <React.Fragment key={kp}>
                                {(["Male", "Female"] as const).map((sex) => {
                                  const values = kpData[sex] || {};
                                  const subTotal = sumBands(values);
                                  const ayp = computeAYP(values);
                                  const total = subTotal;
                                  return (
                                    <tr key={`${kp}-${sex}`} className="border-t border-border">
                                      {sex === "Male" ? (
                                        <td className="max-w-[140px] p-1.5 font-medium whitespace-normal break-words leading-tight" rowSpan={2}>
                                          {kp}
                                        </td>
                                      ) : null}
                                      <td className="p-1.5 whitespace-nowrap">{sex}</td>
                                      {matrixAgeBandCore.map((band) => (
                                        <td key={`${kp}-${sex}-${band}`} className="p-1.5 text-center">
                                          {(values[band] || 0).toLocaleString()}
                                        </td>
                                      ))}
                                      <td className="p-1.5 text-center">{subTotal.toLocaleString()}</td>
                                      <td className="p-1.5 text-center font-semibold">
                                        {total.toLocaleString()}
                                      </td>
                                      <td className="p-1.5 text-center">{ayp.toLocaleString()}</td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                          <tr className="bg-muted/20 font-semibold">
                            <td className="p-1.5" colSpan={2}>
                              Sub - total
                            </td>
                            {matrixAgeBandCore.map((band) => (
                              <td key={`sub-${band}`} className="p-1.5 text-center">
                                {combinedTotals[band].toLocaleString()}
                              </td>
                            ))}
                            <td className="p-1.5 text-center">{combinedSubTotal.toLocaleString()}</td>
                            <td className="p-1.5 text-center">{combinedTotal.toLocaleString()}</td>
                            <td className="p-1.5 text-center">{combinedTotals["AYP (10-24)"].toLocaleString()}</td>
                          </tr>
                          {(["Male", "Female"] as const).map((sex) => {
                            const values = sexTotals[sex];
                            const subTotal = sumBands(values);
                            const ayp = values["AYP (10-24)"] || 0;
                            const total = subTotal;
                            return (
                              <tr key={`total-${sex}`} className="bg-muted/30 font-semibold">
                                <td className="p-1.5" colSpan={2}>
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

                    {isGroupChartOpen ? (
                      <div className="mt-4 rounded-lg border border-border p-3">
                        <p className="mb-1 text-sm font-medium">KP/Sex distribution across age ranges</p>
                        <p className="mb-3 text-xs text-muted-foreground">Each color represents a key population + sex combination.</p>
                        <div className="mb-3 flex flex-wrap gap-2">
                          {chartSeries.map((series, index) => (
                            <span
                              key={`legend-${series.key}`}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px]"
                            >
                              <span
                                className={`inline-block h-2.5 w-2.5 rounded-full ${chartPalette[index % chartPalette.length].dotClass}`}
                                aria-hidden="true"
                              />
                              {series.label}
                            </span>
                          ))}
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ageDistributionData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" />
                              <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={70} />
                              <YAxis />
                              <RechartsTooltip formatter={(value: number) => value.toLocaleString()} />
                              {chartSeries.map((series, index) => (
                                <Bar
                                  key={series.key}
                                  dataKey={series.key}
                                  name={series.label}
                                  fill={chartPalette[index % chartPalette.length].color}
                                  radius={[3, 3, 0, 0]}
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 rounded-lg border border-border p-3">
                      <div className="mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">Comments</p>
                        {!canPostGroupComments ? (
                          <Badge variant="outline" className="text-[10px]">
                            Read-only
                          </Badge>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        {regularComments.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No comments yet. Start a discussion for coordinators, funders, and partner organizations.
                          </p>
                        ) : (
                          regularComments.map((comment) => (
                            <div key={comment.id} className="rounded-md border border-border/70 bg-muted/20 p-2">
                              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-medium">{comment.author}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed">{comment.message}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {groupSystemNotes.length > 0 ? (
                        <div className="mt-3 rounded-md border border-border/70 p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              setSystemNotesOpen((prev) => ({
                                ...prev,
                                [group.key]: !prev[group.key],
                              }))
                            }
                          >
                            {isSystemNotesOpen ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronRight className="mr-1 h-3 w-3" />}
                            System notes ({groupSystemNotes.length})
                          </Button>
                          {isSystemNotesOpen ? (
                            <div className="mt-2 space-y-2">
                              {groupSystemNotes.map((comment) => (
                                <div key={comment.id} className="rounded-md border border-border/70 bg-muted/20 p-2">
                                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-medium">{comment.author}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(comment.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs leading-relaxed">{comment.message}</p>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {canPostGroupComments ? (
                        <div className="mt-3 space-y-2">
                          <Label htmlFor={`comment-${group.key}`} className="text-xs text-muted-foreground">
                            Add comment
                          </Label>
                          <Textarea
                            id={`comment-${group.key}`}
                            value={commentDraft}
                            onChange={(event) =>
                              setGroupCommentDrafts((prev) => ({
                                ...prev,
                                [group.key]: event.target.value,
                              }))
                            }
                            rows={3}
                            placeholder="Write a comment for this indicator group..."
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => handlePostGroupComment(group.key, group.items)}
                              disabled={isPostingComment || !commentDraft.trim()}
                            >
                              {isPostingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Post comment
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Your current role/group has view-only access to this discussion.
                        </p>
                      )}
                    </div>
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
            ) : (
              <div ref={chartRef}>
                <ChartContainer
                  config={{
                    total: { label: "Total", color: "hsl(var(--primary))" },
                  }}
                  className="h-[420px]"
                >
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={80}
                    />
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
