"use client";

import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export type AggregateChartPoint = {
  name: string;
} & Record<string, string | number>;

export type AggregateChartSeries = {
  key: string;
  label: string;
  color: string;
};

type PresentationMode = "report" | "split";
type ReportChartPoint = {
  name: string;
  total: number;
};

const reportPalette = [
  "#AFC4D8",
  "#CC0000",
  "#93C94D",
  "#F1E800",
  "#0FA546",
  "#20A3D3",
  "#0A2B73",
  "#6F35A5",
];

const formatter = new Intl.NumberFormat("en-US");

function toNumeric(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function wrapLabel(label: string, maxCharsPerLine: number) {
  const words = String(label || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const next = currentLine ? `${currentLine} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      currentLine = next;
      return;
    }
    if (currentLine) lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [label];
}

function WrappedTick(props: { x?: number; y?: number; payload?: { value?: string } }) {
  const { x = 0, y = 0, payload } = props;
  const lines = wrapLabel(String(payload?.value || ""), 14);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={10}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={12}
      >
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={0} dy={index === 0 ? 0 : 14}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

type AggregateChartDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AggregateChartPoint[];
  series: AggregateChartSeries[];
  title?: string;
  subtitle?: string;
  meta?: string;
};

export function AggregateChartDialog(props: AggregateChartDialogProps) {
  const { open, onOpenChange, data, series, title, subtitle, meta } = props;
  const chartRef = useRef<HTMLDivElement | null>(null);
  const isSexSplitSeries = useMemo(() => {
    if (series.length < 2) return false;
    const normalizedKeys = series.map((entry) => entry.key.toLowerCase());
    return normalizedKeys.includes("male") && normalizedKeys.includes("female");
  }, [series]);
  const [preferredMode, setPreferredMode] = useState<PresentationMode | null>(null);
  const mode: PresentationMode = isSexSplitSeries ? preferredMode ?? "report" : "split";

  const reportData = useMemo<ReportChartPoint[]>(() => {
    return data.map((row) => {
      const total = series.reduce((sum, entry) => sum + toNumeric(row[entry.key]), 0);
      return {
        name: row.name,
        total,
      };
    });
  }, [data, series]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title || "Aggregate Totals"}</DialogTitle>
          {subtitle ? (
            <DialogDescription className="text-base text-foreground/80">
              {subtitle}
            </DialogDescription>
          ) : null}
          {meta ? (
            <div className="text-sm text-muted-foreground">{meta}</div>
          ) : null}
        </DialogHeader>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={downloadChartSvg}>
            <Download className="mr-2 h-4 w-4" />
            Download Chart
          </Button>
        </div>

        {isSexSplitSeries ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "report" ? "default" : "outline"}
              onClick={() => setPreferredMode("report")}
            >
              Report View
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "split" ? "default" : "outline"}
              onClick={() => setPreferredMode("split")}
            >
              Sex Split View
            </Button>
          </div>
        ) : null}

        {data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No data available for the selected filters.
          </div>
        ) : (
          <div ref={chartRef}>
            {mode === "report" ? (
              <div className="space-y-4">
                <ChartContainer
                  config={{
                    total: {
                      label: "Total",
                      color: reportPalette[0],
                    },
                  }}
                  className="h-[500px]"
                >
                  <BarChart data={reportData} margin={{ top: 28, right: 20, left: 0, bottom: 56 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      height={88}
                      tick={<WrappedTick />}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip
                      cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar
                      dataKey="total"
                      name="Total"
                      fillOpacity={0.95}
                      stroke="rgba(16, 24, 40, 0.2)"
                      strokeWidth={1}
                      barSize={34}
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey="total"
                        position="top"
                        offset={8}
                        formatter={(value: number) => formatter.format(toNumeric(value))}
                        className="fill-foreground text-[10px] font-medium"
                      />
                      {reportData.map((row, index) => (
                        <Cell
                          key={`${row.name}-${index}`}
                          fill={reportPalette[index % reportPalette.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[720px] border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/40">
                        {reportData.map((row) => (
                          <th
                            key={`head-${row.name}`}
                            className="border px-2 py-1.5 text-left font-medium text-muted-foreground"
                          >
                            {row.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {reportData.map((row) => (
                          <td key={`val-${row.name}`} className="border px-2 py-1.5 text-center">
                            {formatter.format(row.total)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <ChartContainer
                config={Object.fromEntries(
                  series.map((entry) => [
                    entry.key,
                    { label: entry.label, color: entry.color },
                  ]),
                )}
                className="h-[420px]"
              >
                <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
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
                  {series.map((entry) => (
                    <Bar
                      key={entry.key}
                      dataKey={entry.key}
                      name={entry.label}
                      fill={`var(--color-${entry.key})`}
                      fillOpacity={0.85}
                      stroke="rgba(16, 24, 40, 0.2)"
                      strokeWidth={1}
                      barSize={series.length === 1 ? 32 : 20}
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey={entry.key}
                        position="top"
                        offset={6}
                        formatter={(value: number) => formatter.format(toNumeric(value))}
                        className="fill-foreground text-[10px] font-medium"
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ChartContainer>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
