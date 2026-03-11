import * as XLSX from "xlsx-js-style";
import type { AggregateValue } from "@/lib/aggregates/aggregate-helpers";
import { parseNumberInput } from "@/lib/aggregates/aggregate-helpers";
import type { AggregateTemplate } from "@/lib/api/services/aggregates";

export type AggregateImportPayload = {
  indicator: number;
  project: number;
  organization: number;
  period_start: string;
  period_end: string;
  value: AggregateValue | unknown;
  notes?: string;
};

export type GroupedAggregateImportPayload = {
  project: number;
  organization: number;
  period_start: string;
  period_end: string;
  data: Array<{
    indicator: number;
    value: AggregateValue | unknown;
    notes?: string;
  }>;
};

export type ImportTemplateLike = Pick<AggregateTemplate, "name"> & {
  indicators: Array<{ id: number; name?: string }>;
};

export type ImportEntityOption = {
  id: string | number;
  name?: string;
};

export type BuildImportPayloadsArgs = {
  file: File;
  organizations: ImportEntityOption[];
  projects: ImportEntityOption[];
  indicators: ImportEntityOption[];
  templates: ImportTemplateLike[];
  canReportAcrossOrganizations: boolean;
  writableOrganizationIds: Set<string>;
};

export type BuildImportPayloadsResult = {
  payloads: AggregateImportPayload[];
  failedCount: number;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function resolveId(value: string, list: ImportEntityOption[]): number | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return numeric;
  const match = list.find((item) => normalize(item.name || "") === normalize(value));
  return match ? Number(match.id) : null;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  const row: string[] = [];

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
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
}

function parseRowsToPayloads(args: {
  rows: string[][];
  sheetOrgId: number | null;
  templateIndicators: Array<{ id: number; name?: string }>;
  organizations: ImportEntityOption[];
  projects: ImportEntityOption[];
  indicators: ImportEntityOption[];
  canReportAcrossOrganizations: boolean;
  writableOrganizationIds: Set<string>;
}): BuildImportPayloadsResult {
  const {
    rows,
    sheetOrgId,
    templateIndicators,
    organizations,
    projects,
    indicators,
    canReportAcrossOrganizations,
    writableOrganizationIds,
  } = args;

  if (rows.length < 2) {
    return { payloads: [], failedCount: 0 };
  }

  const header = rows[0].map((value) => value.trim().toLowerCase());
  const getColumn = (row: string[], key: string) => {
    const index = header.indexOf(key);
    return index >= 0 ? row[index]?.trim() ?? "" : "";
  };

  const payloads: AggregateImportPayload[] = [];
  let failedCount = 0;

  for (const row of rows.slice(1)) {
    try {
      const indicatorValue = getColumn(row, "indicator_id") || getColumn(row, "indicator_name");
      let indicatorId = resolveId(indicatorValue, indicators);
      if (!indicatorId && templateIndicators.length > 0) {
        indicatorId = resolveId(indicatorValue, templateIndicators);
      }

      const projectId = resolveId(
        getColumn(row, "project_id") || getColumn(row, "project_name"),
        projects,
      );

      let organizationId = resolveId(
        getColumn(row, "organization_id") || getColumn(row, "organization_name"),
        organizations,
      );
      if (!organizationId && sheetOrgId) {
        organizationId = sheetOrgId;
      }

      const periodStart = getColumn(row, "period_start");
      const periodEnd = getColumn(row, "period_end");

      if (!indicatorId || !projectId || !organizationId || !periodStart || !periodEnd) {
        failedCount += 1;
        continue;
      }

      if (
        !canReportAcrossOrganizations &&
        !writableOrganizationIds.has(String(organizationId))
      ) {
        failedCount += 1;
        continue;
      }

      let value: AggregateValue | unknown = {};
      const valueJson = getColumn(row, "value_json");
      if (valueJson) {
        try {
          value = JSON.parse(valueJson);
        } catch {
          value = {};
        }
      }

      const male = parseNumberInput(getColumn(row, "male"));
      const female = parseNumberInput(getColumn(row, "female"));
      const total = parseNumberInput(getColumn(row, "total"));

      if (typeof value === "object" && value !== null) {
        if (male !== undefined) (value as AggregateValue).male = male;
        if (female !== undefined) (value as AggregateValue).female = female;
        if (total !== undefined) (value as AggregateValue).total = total;
      }

      if (
        !value ||
        (typeof value === "object" && Object.keys(value as Record<string, unknown>).length === 0)
      ) {
        value = {
          total: total ?? (male ?? 0) + (female ?? 0),
          ...(male !== undefined ? { male } : {}),
          ...(female !== undefined ? { female } : {}),
        };
      }

      payloads.push({
        indicator: indicatorId,
        project: projectId,
        organization: organizationId,
        period_start: periodStart,
        period_end: periodEnd,
        value,
        notes: getColumn(row, "notes") || undefined,
      });
    } catch {
      failedCount += 1;
    }
  }

  return { payloads, failedCount };
}

export async function buildImportPayloadsFromFile(
  args: BuildImportPayloadsArgs,
): Promise<BuildImportPayloadsResult> {
  const {
    file,
    organizations,
    projects,
    indicators,
    templates,
    canReportAcrossOrganizations,
    writableOrganizationIds,
  } = args;

  const extension = file.name.split(".").pop()?.toLowerCase();
  const findOrgBySheet = (sheetName: string) =>
    organizations.find((org) => normalize(org.name || "") === normalize(sheetName))?.id ?? null;
  const findTemplateBySheet = (sheetName: string) =>
    templates.find((template) => normalize(template.name || "") === normalize(sheetName)) ?? null;

  let payloads: AggregateImportPayload[] = [];
  let failedCount = 0;

  if (extension === "xlsx" || extension === "xls") {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheetNames = workbook.SheetNames.length ? workbook.SheetNames : [];

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = (
        XLSX.utils.sheet_to_json(sheet, { header: 1 }) as Array<Array<unknown>>
      ).map((row) =>
        row.map((cell) => (cell === undefined || cell === null ? "" : String(cell))),
      );

      const sheetOrgId = findOrgBySheet(sheetName);
      const template = findTemplateBySheet(sheetName);
      const templateIndicators = template?.indicators || [];

      const parsed = parseRowsToPayloads({
        rows,
        sheetOrgId: sheetOrgId ? Number(sheetOrgId) : null,
        templateIndicators,
        organizations,
        projects,
        indicators,
        canReportAcrossOrganizations,
        writableOrganizationIds,
      });

      payloads = payloads.concat(parsed.payloads);
      failedCount += parsed.failedCount;
    }

    return { payloads, failedCount };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  const parsed = parseRowsToPayloads({
    rows,
    sheetOrgId: null,
    templateIndicators: [],
    organizations,
    projects,
    indicators,
    canReportAcrossOrganizations,
    writableOrganizationIds,
  });

  return parsed;
}

export function groupImportPayloadsByScope(
  payloads: AggregateImportPayload[],
): GroupedAggregateImportPayload[] {
  const grouped = new Map<string, GroupedAggregateImportPayload>();

  for (const payload of payloads) {
    const key = `${payload.project}::${payload.organization}::${payload.period_start}::${payload.period_end}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.data.push({
        indicator: payload.indicator,
        value: payload.value,
        notes: payload.notes,
      });
      continue;
    }

    grouped.set(key, {
      project: payload.project,
      organization: payload.organization,
      period_start: payload.period_start,
      period_end: payload.period_end,
      data: [
        {
          indicator: payload.indicator,
          value: payload.value,
          notes: payload.notes,
        },
      ],
    });
  }

  return Array.from(grouped.values());
}
