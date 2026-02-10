"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCcw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ReportLike = {
  id: number;
  name?: string;
  type?: string;
  status?: string;
  cached_data?: unknown;
  last_generated?: string | null;
  parameters?: Record<string, unknown>;
};

const chartPalette = [
  "#1CE783",
  "#0EA5E9",
  "#F97316",
  "#A855F7",
  "#14B8A6",
  "#EF4444",
  "#84CC16",
  "#FACC15",
];

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value).replace(/,/g, "").trim();
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
};

const guessDefaults = (row: Record<string, unknown>) => {
  const keys = Object.keys(row);
  const has = (key: string) => keys.includes(key);

  const rowKey =
    (has("indicator_name") && "indicator_name") ||
    (has("project_name") && "project_name") ||
    (has("organization_name") && "organization_name") ||
    keys.find((key) => key.endsWith("_name")) ||
    keys[0] ||
    "indicator_name";

  const valueKey =
    (has("total_value") && "total_value") ||
    (has("value") && "value") ||
    (has("entries") && "entries") ||
    keys.find((key) => typeof row[key] === "number") ||
    "value";

  let colKey =
    (has("organization_name") && rowKey !== "organization_name" && "organization_name") ||
    (has("period_start") && rowKey !== "period_start" && "period_start") ||
    "none";

  if (colKey === rowKey) colKey = "none";

  return { rowKey, colKey, valueKey };
};

export function ReportViewerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportLike | null;
  onRefresh: () => Promise<void>;
  onDownload: () => Promise<void> | void;
  refreshing?: boolean;
}) {
  const { open, onOpenChange, report, onRefresh, onDownload, refreshing } = props;
  const cachedRows = Array.isArray(report?.cached_data)
    ? (report?.cached_data as Array<Record<string, unknown>>)
    : [];

  const [pivotRowKey, setPivotRowKey] = useState("indicator_name");
  const [pivotColKey, setPivotColKey] = useState("none");
  const [pivotValueKey, setPivotValueKey] = useState("value");
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!cachedRows.length) return;
    const defaults = guessDefaults(cachedRows[0] || {});
    setPivotRowKey(defaults.rowKey);
    setPivotColKey(defaults.colKey);
    setPivotValueKey(defaults.valueKey);
  }, [open, report?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fieldOptions = useMemo(() => {
    if (!cachedRows.length) return { rows: [], cols: [], values: [] };
    const sample = cachedRows[0] || {};
    const keys = Object.keys(sample);

    const dimensionKeys = keys.filter((key) => {
      if (key === "value" || key === "total_value" || key === "entries") return false;
      if (key.endsWith("_id")) return false;
      const v = sample[key];
      return typeof v === "string" || key.endsWith("_name") || key.endsWith("_code") || key.startsWith("period_");
    });

    const valueKeys = keys.filter((key) => {
      const v = sample[key];
      return (
        key === "value" ||
        key === "total_value" ||
        key === "entries" ||
        typeof v === "number"
      );
    });

    return {
      rows: dimensionKeys.length ? dimensionKeys : keys,
      cols: dimensionKeys.length ? dimensionKeys : keys,
      values: valueKeys.length ? valueKeys : ["value"],
    };
  }, [cachedRows]);

  const pivot = useMemo(() => {
    const rowKey = pivotRowKey;
    const colKey = pivotColKey;
    const valueKey = pivotValueKey;

    if (!cachedRows.length || !rowKey || !valueKey) {
      return {
        rowLabels: [] as string[],
        colLabels: [] as string[],
        matrix: {} as Record<string, Record<string, number>>,
        rowTotals: {} as Record<string, number>,
        colTotals: {} as Record<string, number>,
        grandTotal: 0,
        truncatedCols: false,
      };
    }

    const matrix: Record<string, Record<string, number>> = {};
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    let grandTotal = 0;

    const rowSet = new Set<string>();
    const colSet = new Set<string>();

    for (const item of cachedRows) {
      const rowLabel = String(item?.[rowKey] ?? "(blank)");
      const colLabel = colKey === "none" ? "Total" : String(item?.[colKey] ?? "(blank)");
      const v = toNumber(item?.[valueKey]);

      rowSet.add(rowLabel);
      colSet.add(colLabel);

      matrix[rowLabel] ||= {};
      matrix[rowLabel][colLabel] = (matrix[rowLabel][colLabel] || 0) + v;
      rowTotals[rowLabel] = (rowTotals[rowLabel] || 0) + v;
      colTotals[colLabel] = (colTotals[colLabel] || 0) + v;
      grandTotal += v;
    }

    const rowLabels = Array.from(rowSet).sort((a, b) => (rowTotals[b] || 0) - (rowTotals[a] || 0));
    let colLabels = Array.from(colSet).sort((a, b) => (colTotals[b] || 0) - (colTotals[a] || 0));

    const MAX_COLS = 25;
    const truncatedCols = colLabels.length > MAX_COLS;
    if (truncatedCols) colLabels = colLabels.slice(0, MAX_COLS);

    return { rowLabels, colLabels, matrix, rowTotals, colTotals, grandTotal, truncatedCols };
  }, [cachedRows, pivotRowKey, pivotColKey, pivotValueKey]);

  const chartData = useMemo(() => {
    return pivot.rowLabels.slice(0, 20).map((label) => ({
      label,
      value: pivot.rowTotals[label] || 0,
    }));
  }, [pivot.rowLabels, pivot.rowTotals]);

  const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    if (Math.abs(value) >= 1000) return value.toLocaleString();
    return String(Math.round(value * 100) / 100);
  };

  const downloadChartSvg = () => {
    const container = chartRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;

    const cloned = svg.cloneNode(true) as SVGSVGElement;
    const viewBox = svg.getAttribute("viewBox");
    if (viewBox) cloned.setAttribute("viewBox", viewBox);
    if (!cloned.getAttribute("xmlns")) {
      cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }

    const serializer = new XMLSerializer();
    const svgText = serializer.serializeToString(cloned);
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report?.name || "report"}-chart.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{report?.name || "Report"}</DialogTitle>
          <DialogDescription>
            {report?.type ? String(report.type).replaceAll("_", " ") : "Report preview"}
            {report?.last_generated ? ` - Last generated: ${new Date(report.last_generated).toLocaleString()}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={!!refreshing}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {refreshing ? "Generating..." : "Refresh Data"}
          </Button>
          <Button variant="outline" onClick={onDownload} disabled={report?.status !== "completed"}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>

        {!cachedRows.length ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No cached data yet. Click â€œRefresh Dataâ€ to generate it.
          </div>
        ) : (
          <Tabs defaultValue="pivot" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pivot">Pivot</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>

            <TabsContent value="pivot" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Rows</Label>
                  <Select value={pivotRowKey} onValueChange={setPivotRowKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.rows.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Columns</Label>
                  <Select value={pivotColKey} onValueChange={setPivotColKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="No columns" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No columns</SelectItem>
                      {fieldOptions.cols
                        .filter((field) => field !== pivotRowKey)
                        .map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Values</Label>
                  <Select value={pivotValueKey} onValueChange={setPivotValueKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.values.map((field) => (
                        <SelectItem key={field} value={field}>
                          Sum of {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {pivot.truncatedCols ? (
                <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
                  Too many columns to display ({pivot.colLabels.length}+). Showing first 25.
                </div>
              ) : null}

              <div className="max-h-[55vh] overflow-auto rounded-lg border">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-card">
                    <tr>
                      <th className="whitespace-nowrap border-b px-3 py-2 text-left font-medium">
                        {pivotRowKey}
                      </th>
                      {pivot.colLabels.map((col) => (
                        <th key={col} className="whitespace-nowrap border-b px-3 py-2 text-right font-medium">
                          {col}
                        </th>
                      ))}
                      <th className="whitespace-nowrap border-b px-3 py-2 text-right font-medium">Row total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivot.rowLabels.slice(0, 200).map((row) => (
                      <tr key={row} className="border-b last:border-b-0">
                        <td className="max-w-[260px] truncate px-3 py-2 font-medium" title={row}>
                          {row}
                        </td>
                        {pivot.colLabels.map((col) => (
                          <td key={col} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                            {formatNumber(pivot.matrix[row]?.[col] || 0)}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                          {formatNumber(pivot.rowTotals[row] || 0)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40">
                      <td className="whitespace-nowrap px-3 py-2 font-semibold">Column total</td>
                      {pivot.colLabels.map((col) => (
                        <td key={col} className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                          {formatNumber(pivot.colTotals[col] || 0)}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                        {formatNumber(pivot.grandTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {pivot.rowLabels.length > 200 ? (
                  <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                    Showing first 200 rows (download for full data).
                  </div>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="chart" className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                  {pivotValueKey} by {pivotRowKey} (top {Math.min(20, pivot.rowLabels.length)})
                  <Button variant="outline" size="sm" onClick={downloadChartSvg}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Chart
                  </Button>
                </div>
                <div className="mt-3 h-[360px]" ref={chartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={70}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        tickFormatter={(value: string) =>
                          value.length > 18 ? `${value.slice(0, 18)}â€¦` : value
                        }
                      />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <Tooltip
                        cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: any) => formatNumber(Number(value))}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} fillOpacity={0.88}>
                        {chartData.map((entry, idx) => (
                          <Cell key={entry.label} fill={chartPalette[idx % chartPalette.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="table" className="space-y-3">
              <div className="max-h-[60vh] overflow-auto rounded-lg border">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-card">
                    <tr>
                      {Object.keys(cachedRows[0] || {}).map((key) => (
                        <th key={key} className="whitespace-nowrap border-b px-3 py-2 text-left font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cachedRows.slice(0, 500).map((row, idx) => (
                      <tr key={idx} className="border-b last:border-b-0">
                        {Object.keys(cachedRows[0] || {}).map((key) => (
                          <td key={key} className="whitespace-nowrap px-3 py-2 align-top">
                            {row?.[key] === null || row?.[key] === undefined ? "" : String(row[key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cachedRows.length > 500 ? (
                  <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                    Showing first 500 rows (download for full data).
                  </div>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}


