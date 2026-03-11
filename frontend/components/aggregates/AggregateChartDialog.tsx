"use client";

import { useRef } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
  total: number;
};

type AggregateChartDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AggregateChartPoint[];
};

export function AggregateChartDialog(props: AggregateChartDialogProps) {
  const { open, onOpenChange, data } = props;
  const chartRef = useRef<HTMLDivElement | null>(null);

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

        {data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No data available for the selected filters.
          </div>
        ) : (
          <div ref={chartRef}>
            <ChartContainer
              config={{ total: { label: "Total", color: "hsl(var(--primary))" } }}
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
  );
}
