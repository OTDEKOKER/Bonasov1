"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx-js-style";
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
import { PageHeader } from "@/components/shared/page-header";
import { OrganizationSelect } from "@/components/shared/organization-select";
import { aggregatesService } from "@/lib/api";
import {
  useAggregates,
  useAggregateTemplates,
  useIndicators,
  useAllOrganizations,
  useProjects,
} from "@/lib/hooks/use-api";
import type { Aggregate } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/contexts/auth-context";
import { getUserOrganizationId } from "@/lib/utils/organization";
import { isPlatformAdmin } from "@/lib/permissions";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type AggregateValue = {
  male?: number;
  female?: number;
  total?: number;
  age_range?: string;
  key_population?: string;
  disaggregates?: Record<
    string,
    Record<string, Record<string, number | undefined>>
  >;
};
type MatrixDisaggregates = Record<
  string,
  Record<string, Record<string, number | undefined>>
>;

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

const keyPopulations = [
  "MSM",
  "FSW",
  "PWD",
  "PWID",
  "LGBTQI+",
  "GENERAL POP.",
];
const matrixAgeBands = [...ageRanges, "AYP (10-24)"];
const matrixAgeBandCore = ageRanges;
const aypBandLabel = "AYP (10-24)";
const preferredSecondDimensionOrder = ["Male", "Female", "Other", "Unknown", "All"];
const primaryDisaggregateLabelMap: Record<string, string> = {
  kp: "Key Population",
  "community leaders": "Community Leaders",
  "family planning": "Family Planning",
  "non traditional sites": "Non Traditional Sites",
  "social media platform": "Social Media Platform",
  "ncd screening": "NCD Screening",
};
const primaryDisaggregateOrder = [
  "kp",
  "community leaders",
  "family planning",
  "non traditional sites",
  "social media platform",
  "ncd screening",
];
const matrixColumnWidths = {
  indicator: 210,
  keyPopulation: 140,
  ageSex: 96,
  metric: 56,
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
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

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumBands = (
  values: Record<string, number | undefined>,
  bands: string[] = matrixAgeBandCore,
) => bands.reduce((acc, band) => acc + toSafeNumber(values[band]), 0);

const computeAYP = (values: Record<string, number | undefined>) =>
  toSafeNumber(values[aypBandLabel]) ||
  toSafeNumber(values["10-14"]) +
    toSafeNumber(values["15-19"]) +
    toSafeNumber(values["20-24"]);

const sortWithPreferred = (values: string[], preferred: string[]) => {
  const preferredMap = new Map(preferred.map((value, index) => [value.toLowerCase(), index]));
  return [...values].sort((a, b) => {
    const aRank = preferredMap.get(a.toLowerCase()) ?? Number.POSITIVE_INFINITY;
    const bRank = preferredMap.get(b.toLowerCase()) ?? Number.POSITIVE_INFINITY;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });
};

const getIndicatorDisaggregateGroups = (labels?: string[]) =>
  new Set((labels || []).map((value) => value.toLowerCase().trim()));

const indicatorUsesMatrixEntry = (labels?: string[]) => {
  const groups = getIndicatorDisaggregateGroups(labels);
  if (groups.size === 0) return true;
  const hasPrimaryGroup = Array.from(groups).some(
    (group) => group !== "sex" && group !== "age range",
  );
  return hasPrimaryGroup || groups.has("sex") || groups.has("age range");
};

const buildDisplayMatrix = (
  source: MatrixDisaggregates,
  groups: Set<string>,
) => {
  const hasPrimaryGroup = Array.from(groups).some(
    (group) => group !== "sex" && group !== "age range",
  );
  const includeKeyPopulation = groups.size === 0 || hasPrimaryGroup;
  const includeSecondDimension = groups.size === 0 || groups.has("sex");
  const includeAge = groups.size === 0 || groups.has("age range");
  const matrix: MatrixDisaggregates = {};

  const ensureBucket = (kp: string, dimension: string) => {
    if (!matrix[kp]) matrix[kp] = {};
    if (!matrix[kp][dimension]) matrix[kp][dimension] = {};
    return matrix[kp][dimension];
  };

  Object.entries(source).forEach(([rawKp, rawDimensions]) => {
    const targetKp = includeKeyPopulation ? rawKp : "All";
    const dimensionEntries = Object.entries(rawDimensions || {});
    if (dimensionEntries.length === 0) {
      const bucket = ensureBucket(targetKp, "All");
      if (!includeAge) {
        bucket.Value = toSafeNumber(bucket.Value);
      }
      return;
    }

    dimensionEntries.forEach(([rawDimension, rawBands]) => {
      const targetDimension = includeSecondDimension ? rawDimension : "All";
      const bucket = ensureBucket(targetKp, targetDimension);
      if (includeAge) {
        Object.entries(rawBands || {}).forEach(([band, value]) => {
          bucket[band] = toSafeNumber(bucket[band]) + toSafeNumber(value);
        });
        return;
      }

      bucket.Value =
        toSafeNumber(bucket.Value) +
        Object.values(rawBands || {}).reduce((sum, value) => sum + toSafeNumber(value), 0);
    });
  });

  if (Object.keys(matrix).length === 0) {
    matrix.All = { All: includeAge ? {} : { Value: 0 } };
  }

  const keyPops = includeKeyPopulation
    ? sortWithPreferred(Object.keys(matrix), keyPopulations)
    : ["All"];
  const secondDimension = new Set<string>();
  const ageBandSet = new Set<string>();
  let hasAypFromData = false;

  keyPops.forEach((kp) => {
    const row = matrix[kp] || {};
    Object.keys(row).forEach((dimension) => {
      secondDimension.add(dimension);
      Object.keys(row[dimension] || {}).forEach((band) => {
        if (band === aypBandLabel) {
          hasAypFromData = true;
          return;
        }
        ageBandSet.add(band);
      });
    });
  });

  if (secondDimension.size === 0) {
    secondDimension.add("All");
  }

  const secondDimensionValues = includeSecondDimension
    ? sortWithPreferred(Array.from(secondDimension), preferredSecondDimensionOrder)
    : ["All"];

  const hasAgeDefaults = groups.has("age range") && ageBandSet.size === 0;
  const ageBands = includeAge
    ? sortWithPreferred(
        hasAgeDefaults ? matrixAgeBandCore : Array.from(ageBandSet),
        matrixAgeBandCore,
      )
    : ["Value"];
  const showAypColumn =
    includeAge &&
    (hasAypFromData ||
      ageBands.some((band) => band === "10-14" || band === "15-19" || band === "20-24"));

  return {
    matrix,
    keyPops,
    secondDimensionValues,
    ageBands,
    showAypColumn,
  };
};

const getPrimaryDisaggregateLabel = (labels?: string[]) => {
  const groups = getIndicatorDisaggregateGroups(labels);
  for (const key of primaryDisaggregateOrder) {
    if (groups.has(key)) return primaryDisaggregateLabelMap[key];
  }
  return "Disaggregate";
};

const getAggregateTotal = (aggregate: Aggregate) => {
  const value = parseAggregateValue(aggregate.value);
  const male = Number(value.male) || 0;
  const female = Number(value.female) || 0;
  return value.total !== undefined
    ? Number(value.total) || 0
    : male + female;
};

const mergeDisaggregatesForGroup = (items: Aggregate[]) => {
  const merged: MatrixDisaggregates = {};
  let hasDisaggregates = false;

  items.forEach((item) => {
    const disaggregates = getDisaggregates(item.value);
    if (!disaggregates) return;
    hasDisaggregates = true;
    Object.entries(disaggregates).forEach(([kp, dimensions]) => {
      if (!merged[kp]) merged[kp] = {};
      Object.entries(dimensions || {}).forEach(([dimension, bands]) => {
        if (!merged[kp][dimension]) merged[kp][dimension] = {};
        Object.entries(bands || {}).forEach(([band, value]) => {
          merged[kp][dimension][band] =
            toSafeNumber(merged[kp][dimension][band]) + toSafeNumber(value);
        });
      });
    });
  });

  return hasDisaggregates ? merged : null;
};

const parseNumber = (value: string) => {
  if (value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

type OrganizationWithParent = {
  id: string | number;
  name?: string;
  parentId?: string | number | null;
  parent?: string | number | null;
};

const resolveParentOrganizationId = (org: OrganizationWithParent): string => {
  const rawParent = org.parentId ?? org.parent ?? null;
  if (rawParent === null || rawParent === undefined) return "";
  const normalized = String(rawParent).trim().toLowerCase();
  if (
    normalized === "" ||
    normalized === "null" ||
    normalized === "none" ||
    normalized === "undefined" ||
    normalized === "0"
  ) {
    return "";
  }
  return String(rawParent);
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

export default function AggregatesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [parentOrgFilter, setParentOrgFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
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
  const userOrganizationId = useMemo(() => getUserOrganizationId(user), [user]);
  const canReportAcrossOrganizations = useMemo(() => isPlatformAdmin(user), [user]);

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
  const indicatorById = useMemo(
    () => new Map(indicators.map((indicator) => [String(indicator.id), indicator])),
    [indicators],
  );
  const projectNameById = useMemo(
    () =>
      new Map(projects.map((project) => [String(project.id), project.name])),
    [projects],
  );
  const parentOrganizations = useMemo(
    () =>
      organizations
        .filter(
          (org) =>
            !resolveParentOrganizationId(org as unknown as OrganizationWithParent),
        )
        .slice()
        .sort((left, right) =>
          String(left.name || "").localeCompare(String(right.name || "")),
        ),
    [organizations],
  );
  const scopedOrganizations = useMemo(() => {
    const scoped =
      parentOrgFilter === "all"
        ? organizations
        : organizations.filter((org) => {
            const orgId = String(org.id);
            const parentId = resolveParentOrganizationId(
              org as unknown as OrganizationWithParent,
            );
            return orgId === parentOrgFilter || parentId === parentOrgFilter;
          });
    return scoped
      .slice()
      .sort((left, right) =>
        String(left.name || "").localeCompare(String(right.name || "")),
      );
  }, [organizations, parentOrgFilter]);
  const scopedOrganizationIds = useMemo(
    () => new Set(scopedOrganizations.map((org) => String(org.id))),
    [scopedOrganizations],
  );
  const selectedOrganizationIds = useMemo(() => {
    if (orgFilter === "all") {
      return scopedOrganizationIds;
    }
    return new Set(
      orgFilter
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && scopedOrganizationIds.has(value)),
    );
  }, [orgFilter, scopedOrganizationIds]);
  const writableOrganizations = useMemo(() => {
    if (canReportAcrossOrganizations) return organizations;
    const ownOrganizationId = userOrganizationId ? String(userOrganizationId) : "";
    if (!ownOrganizationId) return [];
    return organizations.filter((org) => String(org.id) === ownOrganizationId);
  }, [canReportAcrossOrganizations, organizations, userOrganizationId]);
  const writableOrganizationIds = useMemo(
    () => new Set(writableOrganizations.map((org) => String(org.id))),
    [writableOrganizations],
  );
  const isOrganizationSelectionLocked = !canReportAcrossOrganizations;
  const defaultOwnOrganizationValue = userOrganizationId
    ? String(userOrganizationId)
    : "";
  const selectedFormIndicator = useMemo(
    () => indicatorById.get(formIndicator),
    [formIndicator, indicatorById],
  );
  const selectedFormIndicatorUsesMatrix = useMemo(
    () => indicatorUsesMatrixEntry(selectedFormIndicator?.sub_labels),
    [selectedFormIndicator],
  );
  const formPrimaryDisaggregateLabel = useMemo(
    () => getPrimaryDisaggregateLabel(selectedFormIndicator?.sub_labels),
    [selectedFormIndicator],
  );
  const matrixToggleDisabled = Boolean(formIndicator) && !selectedFormIndicatorUsesMatrix;
  const sidebarOrgId = searchParams.get("orgId");

  useEffect(() => {
    if (!formIndicator) return;
    if (selectedFormIndicatorUsesMatrix && !useMatrixEntry) {
      setUseMatrixEntry(true);
      return;
    }
    if (!selectedFormIndicatorUsesMatrix && useMatrixEntry) {
      setUseMatrixEntry(false);
    }
  }, [formIndicator, selectedFormIndicatorUsesMatrix, useMatrixEntry]);

  useEffect(() => {
    if (!sidebarOrgId) return;

    const matchedCoordinator = parentOrganizations.find(
      (org) => String(org.id) === sidebarOrgId,
    );
    if (matchedCoordinator) {
      setParentOrgFilter(sidebarOrgId);
      setOrgFilter("all");
      return;
    }

    const matchedOrg = organizations.find((org) => String(org.id) === sidebarOrgId);
    if (!matchedOrg) return;
    const parentId = resolveParentOrganizationId(
      matchedOrg as unknown as OrganizationWithParent,
    );
    setParentOrgFilter(parentId || String(matchedOrg.id));
    setOrgFilter("all");
  }, [organizations, parentOrganizations, sidebarOrgId]);

  useEffect(() => {
    if (!isDialogOpen || !isOrganizationSelectionLocked) return;
    if (!userOrganizationId) return;
    setFormOrganization(String(userOrganizationId));
  }, [isDialogOpen, isOrganizationSelectionLocked, userOrganizationId]);

  useEffect(() => {
    if (!isAutoCalcOpen || !isOrganizationSelectionLocked) return;
    if (!userOrganizationId) return;
    setAutoOrganization(String(userOrganizationId));
  }, [isAutoCalcOpen, isOrganizationSelectionLocked, userOrganizationId]);

  const periods = useMemo(
    () => Array.from(new Set(aggregates.map(getPeriodLabel))),
    [aggregates],
  );

  const filteredAggregates = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return aggregates.filter((agg) => {
      const aggregateOrganizationId = String(agg.organization);
      if (!selectedOrganizationIds.has(aggregateOrganizationId)) return false;

      const matchesProject =
        projectFilter === "all" || String(agg.project) === projectFilter;
      if (!matchesProject) return false;

      const matchesPeriod =
        periodFilter === "all" || getPeriodLabel(agg) === periodFilter;
      if (!matchesPeriod) return false;

      const indicatorName =
        agg.indicator_name ||
        indicatorNameById.get(String(agg.indicator)) ||
        "";
      const matchesSearch =
        query.length === 0 || indicatorName.toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [
    aggregates,
    indicatorNameById,
    periodFilter,
    projectFilter,
    searchQuery,
    selectedOrganizationIds,
  ]);

  const aggregateGroups = useMemo(() => {
    const groups = new Map<string, Aggregate[]>();
    for (const agg of filteredAggregates) {
      const indicatorId = String(agg.indicator || "");
      const indicatorName = agg.indicator_name || indicatorNameById.get(indicatorId) || "Indicator";
      const key = indicatorId || indicatorName;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(agg);
    }
    const parseCode = (code?: string | null) => {
      if (!code) return { num: Number.POSITIVE_INFINITY, suffix: "" };
      const match = code.match(/(\d+)([a-zA-Z])?/);
      if (!match) return { num: Number.POSITIVE_INFINITY, suffix: code };
      return { num: Number(match[1]), suffix: (match[2] || "").toLowerCase() };
    };
    const entries = Array.from(groups.entries()).map(([key, items]) => {
      const first = items[0];
      const indicatorId = String(first?.indicator || key);
      const indicatorName =
        first?.indicator_name ||
        indicatorNameById.get(indicatorId) ||
        "Indicator";
      const code =
        first?.indicator_code ||
        indicatorCodeById.get(indicatorId) ||
        "";
      return { key, indicatorId, indicatorName, items, code };
    });
    return entries.sort((a, b) => {
      const ac = parseCode(a.code);
      const bc = parseCode(b.code);
      if (ac.num !== bc.num) return ac.num - bc.num;
      if (ac.suffix !== bc.suffix) return ac.suffix.localeCompare(bc.suffix);
      return a.indicatorName.localeCompare(b.indicatorName);
    });
  }, [filteredAggregates, indicatorCodeById, indicatorNameById]);

  const totals = useMemo(() => {
    return filteredAggregates.reduce(
      (acc, agg) => {
        const value = parseAggregateValue(agg.value);
        const male = Number(value.male) || 0;
        const female = Number(value.female) || 0;
        const total = getAggregateTotal(agg);
        acc.male += male;
        acc.female += female;
        acc.total += total;
        return acc;
      },
      { male: 0, female: 0, total: 0 },
    );
  }, [filteredAggregates]);

  const parseCSV = (text: string) => {
    const rows: string[][] = [];
    let current = "";
    let inQuotes = false;
    const row: string[] = [];
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === "\"") {
        if (inQuotes && next === "\"") {
          current += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (char === "," && !inQuotes) {
        row.push(current);
        current = "";
        continue;
      }
      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (current !== "" || row.length > 0) {
          row.push(current);
          rows.push([...row]);
          row.length = 0;
          current = "";
        }
        continue;
      }
      current += char;
    }
    if (current !== "" || row.length > 0) {
      row.push(current);
      rows.push(row);
    }
    return rows;
  };

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
        organization: orgFilter !== "all" ? orgFilter : undefined,
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

  const resolveId = (value: string, list: Array<{ id: number; name?: string }>) => {
    if (!value) return null;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
    const match = list.find((item) => (item.name || "").toLowerCase() === value.toLowerCase());
    return match?.id ?? null;
  };

  const handleImport = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const normalize = (value: string) => value.trim().toLowerCase();
    const findOrgBySheet = (sheetName: string) =>
      organizations.find((org) => normalize(org.name) === normalize(sheetName))?.id ?? null;
    const findTemplateBySheet = (sheetName: string) =>
      templates.find((template) => normalize(template.name) === normalize(sheetName)) ?? null;

    let success = 0;
    let failed = 0;
    const payloads: Array<{
      indicator: number;
      project: number;
      organization: number;
      period_start: string;
      period_end: string;
      value: AggregateValue | unknown;
      notes?: string;
    }> = [];

    const processRows = (
      rows: string[][],
      sheetOrgId: number | null,
      templateIndicators: Array<{ id: number; name?: string }>,
    ) => {
      if (rows.length < 2) return;
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const get = (row: string[], key: string) => {
        const idx = header.indexOf(key);
        return idx >= 0 ? row[idx]?.trim() : "";
      };
      for (const row of rows.slice(1)) {
        try {
          const indicatorValue = get(row, "indicator_id") || get(row, "indicator_name");
          let indicatorId = resolveId(indicatorValue, indicators);
          if (!indicatorId && templateIndicators.length) {
            indicatorId = resolveId(indicatorValue, templateIndicators);
          }
          const projectId = resolveId(get(row, "project_id") || get(row, "project_name"), projects);
          let orgId = resolveId(get(row, "organization_id") || get(row, "organization_name"), organizations);
          if (!orgId && sheetOrgId) orgId = sheetOrgId;
          const periodStart = get(row, "period_start");
          const periodEnd = get(row, "period_end");
          if (!indicatorId || !projectId || !orgId || !periodStart || !periodEnd) {
            failed += 1;
            continue;
          }
          if (!canReportAcrossOrganizations && !writableOrganizationIds.has(String(orgId))) {
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
      for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = (XLSX.utils.sheet_to_json(sheet, { header: 1 }) as Array<Array<unknown>>).map(
          (row) => row.map((cell) => (cell === undefined || cell === null ? "" : String(cell))),
        );
        const sheetOrgId = findOrgBySheet(sheetName);
        const template = findTemplateBySheet(sheetName);
        const templateIndicators = template?.indicators || [];
        processRows(rows, sheetOrgId, templateIndicators);
      }
    } else {
      const text = await file.text();
      const rows = parseCSV(text);
      processRows(rows, null, []);
    }

    if (payloads.length === 0) {
      toast({ title: "Invalid file", description: "No rows found.", variant: "destructive" });
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

  const resetForm = () => {
    setFormProject("");
    setFormIndicator("");
    setFormOrganization(defaultOwnOrganizationValue);
    setFormTemplate("all");
    setFormPeriodStart("");
    setFormPeriodEnd("");
    setUseMatrixEntry(true);
    setFormMale("");
    setFormFemale("");
    setFormNotes("");
    setFormDataSource("");
    setMatrixValues(buildEmptyMatrix());
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
    for (const kp of keyPopulations) {
      for (const sex of ["Male", "Female"]) {
        for (const band of matrixAgeBands) {
          const value = parseNumber(matrixValues[kp]?.[sex]?.[band] ?? "");
          if (value !== undefined) total += value;
        }
      }
    }
    return total;
  }, [matrixValues, useMatrixEntry]);

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

    if (!canReportAcrossOrganizations && !writableOrganizationIds.has(formOrganization)) {
      toast({
        title: "Organization restricted",
        description: "You can only submit aggregate data for your own organization.",
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
      for (const kp of keyPopulations) {
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

    if (
      autoSaveAggregate &&
      !canReportAcrossOrganizations &&
      !writableOrganizationIds.has(autoOrganization)
    ) {
      toast({
        title: "Organization restricted",
        description: "You can only save aggregates for your own organization.",
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
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
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
                    <Calculator className="mr-2 h-4 w-4" />
                    Auto-calculate
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Auto-calculate Aggregate</DialogTitle>
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
                        <SelectTrigger disabled={isOrganizationSelectionLocked}>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {writableOrganizations.map((org) => (
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
                <DialogContent className="fixed inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen overflow-hidden rounded-none p-0">
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
                        organizations={writableOrganizations}
                        value={formOrganization}
                        onChange={setFormOrganization}
                        placeholder="Select organization"
                        disabled={isOrganizationSelectionLocked}
                      />
                    </div>

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
                          disabled={matrixToggleDisabled}
                          onCheckedChange={(checked) => setUseMatrixEntry(Boolean(checked))}
                        />
                        Use KP x Sex x Age matrix
                      </div>
                      {matrixToggleDisabled ? (
                        <p className="text-xs text-muted-foreground">
                          This indicator is configured as total-only. Matrix entry is disabled.
                        </p>
                      ) : null}
                    </div>

                    {useMatrixEntry ? (
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          Enter values by {formPrimaryDisaggregateLabel}, Sex, and Age band.
                        </div>
                        <div className="overflow-auto rounded-lg border border-border max-h-[55vh]">
                          <table className="min-w-[960px] w-full text-xs">
                            <thead className="bg-muted/50 sticky top-0 z-10">
                              <tr>
                                <th className="p-1.5 text-left">{formPrimaryDisaggregateLabel}</th>
                                <th className="p-1.5 text-left">Sex</th>
                                {matrixAgeBands.map((band) => (
                                  <th key={band} className="p-1.5 text-center whitespace-nowrap">
                                    {band}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {keyPopulations.map((kp) => (
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search indicators..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
              value={parentOrgFilter}
              onValueChange={(value) => {
                setParentOrgFilter(value);
                setOrgFilter("all");
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Coordinator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Coordinators</SelectItem>
                {parentOrganizations.map((org) => (
                  <SelectItem key={org.id} value={String(org.id)}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {scopedOrganizations.map((org) => (
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
                const disaggregates = mergeDisaggregatesForGroup(group.items);
                const projectNames = Array.from(
                  new Set(
                    group.items.map((item) =>
                      item.project_name ||
                      projectNameById.get(String(item.project)) ||
                      "Project",
                    ),
                  ),
                );
                const organizationNames = Array.from(
                  new Set(
                    group.items
                      .map((item) => item.organization_name || "")
                      .filter((name) => name.length > 0),
                  ),
                );
                const periodLabels = Array.from(
                  new Set(group.items.map((item) => getPeriodLabel(item))),
                );
                const totalValue = group.items.reduce(
                  (sum, item) => sum + getAggregateTotal(item),
                  0,
                );
                const organizationLabel =
                  organizationNames.length === 1
                    ? organizationNames[0]
                    : `${organizationNames.length} organizations`;
                const projectLabel =
                  projectNames.length === 1
                    ? projectNames[0]
                    : `${projectNames.length} projects`;
                const periodLabel =
                  periodLabels.length === 1
                    ? periodLabels[0]
                    : `${periodLabels.length} periods`;

                if (!disaggregates) {
                  return (
                    <div key={group.key} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Indicator</p>
                          <p className="text-base font-semibold">{group.indicatorName}</p>
                          <p className="text-sm text-muted-foreground">
                            {organizationLabel} | {projectLabel} | {periodLabel}
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

                const indicator = indicatorById.get(group.indicatorId);
                const indicatorGroups = getIndicatorDisaggregateGroups(indicator?.sub_labels);
                const primaryDisaggregateLabel = getPrimaryDisaggregateLabel(indicator?.sub_labels);
                const {
                  matrix: displayMatrix,
                  keyPops: displayKeyPops,
                  secondDimensionValues,
                  ageBands,
                  showAypColumn,
                } = buildDisplayMatrix(disaggregates, indicatorGroups);

                const safeDimensions = secondDimensionValues.length ? secondDimensionValues : ["All"];
                const safeAgeBands = ageBands.length ? ageBands : ["Value"];
                const dataRowCount = displayKeyPops.length * safeDimensions.length;

                const dimensionTotals: Record<string, Record<string, number>> = {};
                safeDimensions.forEach((dimension) => {
                  dimensionTotals[dimension] = {};
                  safeAgeBands.forEach((band) => {
                    dimensionTotals[dimension][band] = 0;
                  });
                  if (showAypColumn) {
                    dimensionTotals[dimension][aypBandLabel] = 0;
                  }
                });

                displayKeyPops.forEach((kp) => {
                  const kpData = displayMatrix[kp] || {};
                  safeDimensions.forEach((dimension) => {
                    const values = kpData[dimension] || {};
                    safeAgeBands.forEach((band) => {
                      dimensionTotals[dimension][band] += toSafeNumber(values[band]);
                    });
                    if (showAypColumn) {
                      dimensionTotals[dimension][aypBandLabel] += computeAYP(values);
                    }
                  });
                });

                const combinedTotals: Record<string, number> = {};
                safeAgeBands.forEach((band) => {
                  combinedTotals[band] = safeDimensions.reduce(
                    (sum, dimension) => sum + toSafeNumber(dimensionTotals[dimension]?.[band]),
                    0,
                  );
                });
                if (showAypColumn) {
                  combinedTotals[aypBandLabel] = safeDimensions.reduce(
                    (sum, dimension) =>
                      sum + toSafeNumber(dimensionTotals[dimension]?.[aypBandLabel]),
                    0,
                  );
                }
                const combinedSubTotal = sumBands(combinedTotals, safeAgeBands);
                const combinedTotal = combinedSubTotal;

                return (
                  <div key={group.key} className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Indicator</p>
                        <p className="text-base font-semibold">{group.indicatorName}</p>
                        <p className="text-sm text-muted-foreground">
                          {organizationLabel} | {projectLabel} | {periodLabel}
                        </p>
                      </div>
                      <Badge variant="outline">Total {Number(totalValue).toLocaleString()}</Badge>
                    </div>

                    <div className="w-full overflow-x-auto overflow-y-auto rounded-lg border border-border max-h-[68vh]">
                      <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
                        <thead>
                          <tr>
                            <th
                              className="sticky top-0 z-40 border-b border-r border-border bg-muted/90 px-2 py-2 text-center font-semibold"
                              style={{
                                minWidth: matrixColumnWidths.indicator,
                                width: matrixColumnWidths.indicator,
                              }}
                            >
                              Indicator
                            </th>
                            <th
                              className="sticky top-0 z-40 border-b border-r border-border bg-muted/90 px-2 py-2 text-left font-semibold"
                              style={{
                                minWidth: matrixColumnWidths.keyPopulation,
                                width: matrixColumnWidths.keyPopulation,
                              }}
                            >
                              {primaryDisaggregateLabel}
                            </th>
                            <th
                              className="sticky top-0 z-40 border-b border-r border-border bg-muted/90 px-2 py-2 text-left font-semibold"
                              style={{
                                minWidth: matrixColumnWidths.ageSex,
                                width: matrixColumnWidths.ageSex,
                              }}
                            >
                              Age/Sex
                            </th>
                            {safeAgeBands.map((band) => (
                              <th
                                key={band}
                                className="sticky top-0 z-30 border-b border-r border-border bg-muted/90 px-2 py-2 text-center font-semibold whitespace-nowrap"
                                style={{ minWidth: matrixColumnWidths.metric, width: matrixColumnWidths.metric }}
                              >
                                {band}
                              </th>
                            ))}
                            <th
                              className="sticky top-0 z-30 border-b border-r border-border bg-muted/90 px-2 py-2 text-center font-semibold whitespace-nowrap"
                              style={{ minWidth: matrixColumnWidths.metric, width: matrixColumnWidths.metric }}
                            >
                              Sub-total
                            </th>
                            <th
                              className="sticky top-0 z-30 border-b border-r border-border bg-muted/90 px-2 py-2 text-center font-semibold whitespace-nowrap"
                              style={{ minWidth: matrixColumnWidths.metric, width: matrixColumnWidths.metric }}
                            >
                              TOTAL
                            </th>
                            {showAypColumn ? (
                              <th
                                className="sticky top-0 z-30 border-b border-r border-border bg-muted/90 px-2 py-2 text-center font-semibold whitespace-nowrap"
                                style={{ minWidth: matrixColumnWidths.metric, width: matrixColumnWidths.metric }}
                              >
                                {aypBandLabel}
                              </th>
                            ) : null}
                          </tr>
                        </thead>
                        <tbody>
                          {displayKeyPops.map((kp, kpIndex) => {
                            const kpData = displayMatrix[kp] || {};
                            return (
                              <React.Fragment key={kp}>
                                {safeDimensions.map((dimension, dimensionIndex) => {
                                  const values = kpData[dimension] || {};
                                  const subTotal = sumBands(values, safeAgeBands);
                                  const ayp = showAypColumn ? computeAYP(values) : 0;
                                  const total = subTotal;
                                  const rowIndex = kpIndex * safeDimensions.length + dimensionIndex;
                                  const rowBaseClass = rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10";
                                  return (
                                    <tr key={`${kp}-${dimension}`} className={rowBaseClass}>
                                      {kpIndex === 0 && dimensionIndex === 0 && (
                                        <td
                                          className="border-b border-r border-border bg-background px-2 py-2 align-middle text-center font-medium"
                                          rowSpan={dataRowCount}
                                          style={{
                                            minWidth: matrixColumnWidths.indicator,
                                            width: matrixColumnWidths.indicator,
                                          }}
                                        >
                                          <span className="block whitespace-normal break-words leading-snug text-center">
                                            {group.indicatorName}
                                          </span>
                                        </td>
                                      )}
                                      {dimensionIndex === 0 ? (
                                        <td
                                          className={`border-b border-r border-border px-2 py-2 align-top font-medium whitespace-normal break-words ${rowBaseClass}`}
                                          rowSpan={safeDimensions.length}
                                          style={{
                                            minWidth: matrixColumnWidths.keyPopulation,
                                            width: matrixColumnWidths.keyPopulation,
                                          }}
                                        >
                                          {kp}
                                        </td>
                                      ) : null}
                                      <td
                                        className={`border-b border-r border-border px-2 py-2 whitespace-normal break-words ${rowBaseClass}`}
                                        style={{
                                          minWidth: matrixColumnWidths.ageSex,
                                          width: matrixColumnWidths.ageSex,
                                        }}
                                      >
                                        {dimension}
                                      </td>
                                      {safeAgeBands.map((band) => (
                                        <td
                                          key={`${kp}-${dimension}-${band}`}
                                          className={`border-b border-r border-border px-2 py-2 text-center ${rowBaseClass}`}
                                        >
                                          {toSafeNumber(values[band]).toLocaleString()}
                                        </td>
                                      ))}
                                      <td className={`border-b border-r border-border px-2 py-2 text-center ${rowBaseClass}`}>
                                        {subTotal.toLocaleString()}
                                      </td>
                                      <td className={`border-b border-r border-border px-2 py-2 text-center font-semibold ${rowBaseClass}`}>
                                        {total.toLocaleString()}
                                      </td>
                                      {showAypColumn ? (
                                        <td className={`border-b border-r border-border px-2 py-2 text-center ${rowBaseClass}`}>
                                          {ayp.toLocaleString()}
                                        </td>
                                      ) : null}
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                          <tr className="bg-muted/20 font-semibold">
                            <td
                              className="border-b border-r border-border bg-muted/20 px-2 py-2"
                              style={{
                                minWidth: matrixColumnWidths.indicator,
                                width: matrixColumnWidths.indicator,
                              }}
                            >
                              Sub-total
                            </td>
                            <td
                              className="border-b border-r border-border bg-muted/20 px-2 py-2 whitespace-normal break-words"
                              style={{
                                minWidth: matrixColumnWidths.keyPopulation,
                                width: matrixColumnWidths.keyPopulation,
                              }}
                            >
                              All
                            </td>
                            <td
                              className="border-b border-r border-border bg-muted/20 px-2 py-2 whitespace-normal break-words"
                              style={{
                                minWidth: matrixColumnWidths.ageSex,
                                width: matrixColumnWidths.ageSex,
                              }}
                            >
                              -
                            </td>
                            {safeAgeBands.map((band) => (
                              <td key={`sub-${band}`} className="border-b border-r border-border px-2 py-2 text-center">
                                {combinedTotals[band].toLocaleString()}
                              </td>
                            ))}
                            <td className="border-b border-r border-border px-2 py-2 text-center">{combinedSubTotal.toLocaleString()}</td>
                            <td className="border-b border-r border-border px-2 py-2 text-center">{combinedTotal.toLocaleString()}</td>
                            {showAypColumn ? (
                              <td className="border-b border-r border-border px-2 py-2 text-center">
                                {toSafeNumber(combinedTotals[aypBandLabel]).toLocaleString()}
                              </td>
                            ) : null}
                          </tr>
                          {safeDimensions.map((dimension) => {
                            const values = dimensionTotals[dimension] || {};
                            const subTotal = sumBands(values, safeAgeBands);
                            const ayp = toSafeNumber(values[aypBandLabel]);
                            const total = subTotal;
                            return (
                              <tr key={`total-${dimension}`} className="bg-muted/30 font-semibold">
                                <td
                                  className="border-b border-r border-border bg-muted/30 px-2 py-2"
                                  style={{
                                    minWidth: matrixColumnWidths.indicator,
                                    width: matrixColumnWidths.indicator,
                                  }}
                                >
                                  TOTAL
                                </td>
                                <td
                                  className="border-b border-r border-border bg-muted/30 px-2 py-2 whitespace-normal break-words"
                                  style={{
                                    minWidth: matrixColumnWidths.keyPopulation,
                                    width: matrixColumnWidths.keyPopulation,
                                  }}
                                >
                                  All
                                </td>
                                <td
                                  className="border-b border-r border-border bg-muted/30 px-2 py-2 whitespace-normal break-words"
                                  style={{
                                    minWidth: matrixColumnWidths.ageSex,
                                    width: matrixColumnWidths.ageSex,
                                  }}
                                >
                                  {dimension}
                                </td>
                                {safeAgeBands.map((band) => (
                                  <td key={`total-${dimension}-${band}`} className="border-b border-r border-border px-2 py-2 text-center">
                                    {toSafeNumber(values[band]).toLocaleString()}
                                  </td>
                                ))}
                                <td className="border-b border-r border-border px-2 py-2 text-center">{subTotal.toLocaleString()}</td>
                                <td className="border-b border-r border-border px-2 py-2 text-center">{total.toLocaleString()}</td>
                                {showAypColumn ? (
                                  <td className="border-b border-r border-border px-2 py-2 text-center">
                                    {ayp.toLocaleString()}
                                  </td>
                                ) : null}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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


