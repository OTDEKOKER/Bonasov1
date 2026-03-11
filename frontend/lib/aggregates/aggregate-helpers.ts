import type { Aggregate } from "@/lib/types";

export type AggregateValue = {
  male?: number;
  female?: number;
  total?: number;
  age_range?: string;
  key_population?: string;
  disaggregates?: MatrixDisaggregates;
};

export type MatrixDisaggregates = Record<
  string,
  Record<string, Record<string, number | undefined>>
>;

export type MatrixInputValues = Record<
  string,
  Record<string, Record<string, string>>
>;

export type OrganizationWithParent = {
  id: string | number;
  name?: string;
  parentId?: string | number | null;
  parent?: string | number | null;
};

export type AggregateIndicatorGroup = {
  key: string;
  indicatorId: string;
  indicatorName: string;
  code: string;
  items: Aggregate[];
};

export type DisplayMatrixResult = {
  matrix: MatrixDisaggregates;
  keyPops: string[];
  secondDimensionValues: string[];
  ageBands: string[];
  showAypColumn: boolean;
};

export const AGE_RANGES = [
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
] as const;

export const AYP_BAND_LABEL = "AYP (10-24)";

export const KEY_POPULATIONS = [
  "MSM",
  "FSW",
  "PWD",
  "PWID",
  "LGBTQI+",
  "GENERAL POP.",
] as const;

export const MATRIX_AGE_BANDS = [...AGE_RANGES, AYP_BAND_LABEL] as const;

export const MATRIX_SEXES = ["Male", "Female"] as const;

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

export function toSafeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseNumberInput(value: string): number | undefined {
  if (value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

export function getPeriodLabel(aggregate: Pick<Aggregate, "period_start" | "period_end">): string {
  return `${formatDate(aggregate.period_start)} - ${formatDate(aggregate.period_end)}`;
}

export function parseAggregateValue(value: unknown): AggregateValue {
  if (typeof value === "number") {
    return { total: value };
  }
  if (value && typeof value === "object") {
    return value as AggregateValue;
  }
  return {};
}

export function getDisaggregates(value: unknown): MatrixDisaggregates | null {
  const parsed = parseAggregateValue(value);
  return parsed.disaggregates || null;
}

export function getAggregateTotal(aggregate: Pick<Aggregate, "value">): number {
  const value = parseAggregateValue(aggregate.value);
  const male = Number(value.male) || 0;
  const female = Number(value.female) || 0;
  return value.total !== undefined ? Number(value.total) || 0 : male + female;
}

export function calculateAggregateTotals(aggregates: Aggregate[]): {
  male: number;
  female: number;
  total: number;
} {
  return aggregates.reduce(
    (acc, aggregate) => {
      const value = parseAggregateValue(aggregate.value);
      acc.male += Number(value.male) || 0;
      acc.female += Number(value.female) || 0;
      acc.total += getAggregateTotal(aggregate);
      return acc;
    },
    { male: 0, female: 0, total: 0 },
  );
}

export function buildChartData(
  aggregates: Aggregate[],
  indicatorNameById: Map<string, string>,
): Array<{ name: string; total: number }> {
  const totalsByIndicator = new Map<string, number>();
  for (const aggregate of aggregates) {
    const total = getAggregateTotal(aggregate);
    const indicatorName =
      aggregate.indicator_name ||
      indicatorNameById.get(String(aggregate.indicator)) ||
      "Indicator";
    totalsByIndicator.set(indicatorName, (totalsByIndicator.get(indicatorName) || 0) + total);
  }
  return Array.from(totalsByIndicator.entries()).map(([name, total]) => ({ name, total }));
}

export function sortWithPreferred(values: string[], preferred: readonly string[]): string[] {
  const preferredMap = new Map(preferred.map((value, index) => [value.toLowerCase(), index]));
  return [...values].sort((left, right) => {
    const leftRank = preferredMap.get(left.toLowerCase()) ?? Number.POSITIVE_INFINITY;
    const rightRank = preferredMap.get(right.toLowerCase()) ?? Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.localeCompare(right);
  });
}

export function getIndicatorDisaggregateGroups(labels?: string[]): Set<string> {
  return new Set((labels || []).map((value) => value.toLowerCase().trim()));
}

export function indicatorUsesMatrixEntry(labels?: string[]): boolean {
  const groups = getIndicatorDisaggregateGroups(labels);
  if (groups.size === 0) return true;
  const hasPrimaryGroup = Array.from(groups).some(
    (group) => group !== "sex" && group !== "age range",
  );
  return hasPrimaryGroup || groups.has("sex") || groups.has("age range");
}

export function getPrimaryDisaggregateLabel(labels?: string[]): string {
  const groups = getIndicatorDisaggregateGroups(labels);
  for (const key of primaryDisaggregateOrder) {
    if (groups.has(key)) return primaryDisaggregateLabelMap[key];
  }
  return "Disaggregate";
}

export function sumBands(
  values: Record<string, number | undefined>,
  bands: readonly string[],
): number {
  return bands.reduce((acc, band) => acc + toSafeNumber(values[band]), 0);
}

export function computeAyp(values: Record<string, number | undefined>): number {
  const explicit = toSafeNumber(values[AYP_BAND_LABEL]);
  if (explicit > 0) return explicit;
  return (
    toSafeNumber(values["10-14"]) +
    toSafeNumber(values["15-19"]) +
    toSafeNumber(values["20-24"])
  );
}

export function getBandsForTotals(ageBands: readonly string[]): string[] {
  if (ageBands.length === 1 && ageBands[0] === "Value") return ["Value"];
  return ageBands.filter((band) => band !== AYP_BAND_LABEL);
}

export function buildDisplayMatrix(source: MatrixDisaggregates, groups: Set<string>): DisplayMatrixResult {
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
    ? sortWithPreferred(Object.keys(matrix), KEY_POPULATIONS)
    : ["All"];

  const secondDimensions = new Set<string>();
  const ageBandSet = new Set<string>();
  let hasAypFromData = false;

  keyPops.forEach((kp) => {
    const row = matrix[kp] || {};
    Object.keys(row).forEach((dimension) => {
      secondDimensions.add(dimension);
      Object.keys(row[dimension] || {}).forEach((band) => {
        if (band === AYP_BAND_LABEL) {
          hasAypFromData = true;
          return;
        }
        ageBandSet.add(band);
      });
    });
  });

  if (secondDimensions.size === 0) {
    secondDimensions.add("All");
  }

  const secondDimensionValues = includeSecondDimension
    ? sortWithPreferred(Array.from(secondDimensions), preferredSecondDimensionOrder)
    : ["All"];

  const hasAgeDefaults = groups.has("age range") && ageBandSet.size === 0;
  const ageBands = includeAge
    ? sortWithPreferred(
        hasAgeDefaults ? [...AGE_RANGES] : Array.from(ageBandSet),
        AGE_RANGES,
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
}

export function mergeDisaggregatesForGroup(items: Aggregate[]): MatrixDisaggregates | null {
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
}

export function buildEmptyMatrix(): MatrixInputValues {
  const matrix: MatrixInputValues = {};
  for (const kp of KEY_POPULATIONS) {
    matrix[kp] = { Male: {}, Female: {} };
    for (const band of MATRIX_AGE_BANDS) {
      matrix[kp].Male[band] = "";
      matrix[kp].Female[band] = "";
    }
  }
  return matrix;
}

export function computeMatrixTotal(matrixValues: MatrixInputValues): number {
  let total = 0;
  for (const kp of KEY_POPULATIONS) {
    for (const sex of MATRIX_SEXES) {
      // AYP is derived/reporting and must not be counted into base totals.
      for (const band of AGE_RANGES) {
        const parsed = parseNumberInput(matrixValues[kp]?.[sex]?.[band] ?? "");
        if (parsed !== undefined) total += parsed;
      }
    }
  }
  return total;
}

export function buildMatrixPayload(matrixValues: MatrixInputValues): MatrixDisaggregates {
  const payload: MatrixDisaggregates = {};
  for (const kp of KEY_POPULATIONS) {
    payload[kp] = { Male: {}, Female: {} };
    for (const band of MATRIX_AGE_BANDS) {
      payload[kp].Male[band] = parseNumberInput(matrixValues[kp]?.Male?.[band] ?? "");
      payload[kp].Female[band] = parseNumberInput(matrixValues[kp]?.Female?.[band] ?? "");
    }
  }
  return payload;
}

function parseIndicatorCodeOrder(code?: string | null): { num: number; suffix: string } {
  if (!code) return { num: Number.POSITIVE_INFINITY, suffix: "" };
  const match = code.match(/(\d+)([a-zA-Z])?/);
  if (!match) return { num: Number.POSITIVE_INFINITY, suffix: String(code) };
  return { num: Number(match[1]), suffix: (match[2] || "").toLowerCase() };
}

export function groupAggregatesByIndicator(
  aggregates: Aggregate[],
  indicatorNameById: Map<string, string>,
  indicatorCodeById: Map<string, string>,
): AggregateIndicatorGroup[] {
  const groups = new Map<string, Aggregate[]>();

  for (const aggregate of aggregates) {
    const indicatorId = String(aggregate.indicator || "");
    const indicatorName =
      aggregate.indicator_name || indicatorNameById.get(indicatorId) || "Indicator";
    const key = indicatorId || indicatorName;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)?.push(aggregate);
  }

  const entries = Array.from(groups.entries()).map(([key, items]) => {
    const first = items[0];
    const indicatorId = String(first?.indicator || key);
    const indicatorName =
      first?.indicator_name || indicatorNameById.get(indicatorId) || "Indicator";
    const code = first?.indicator_code || indicatorCodeById.get(indicatorId) || "";
    return { key, indicatorId, indicatorName, code, items };
  });

  return entries.sort((left, right) => {
    const leftCode = parseIndicatorCodeOrder(left.code);
    const rightCode = parseIndicatorCodeOrder(right.code);
    if (leftCode.num !== rightCode.num) return leftCode.num - rightCode.num;
    if (leftCode.suffix !== rightCode.suffix) {
      return leftCode.suffix.localeCompare(rightCode.suffix);
    }
    return left.indicatorName.localeCompare(right.indicatorName);
  });
}

export function resolveParentOrganizationId(org: OrganizationWithParent): string {
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
}
