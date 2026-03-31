"use client";

import { useRef } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import type { AggregateChartSection } from "@/app/(dashboard)/aggregates/hooks";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type AggregateChartDialogProps = {
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: AggregateChartSection[];
  title?: string;
};

export function AggregateChartDialog(props: AggregateChartDialogProps) {
  const { description, open, onOpenChange, sections, title } = props;
  const chartRef = useRef<HTMLDivElement | null>(null);
  const barPalette = [
    "#4F81BD",
    "#F58231",
    "#A5A5A5",
    "#FFC000",
    "#4472C4",
    "#70AD47",
    "#255E91",
    "#9E480E",
    "#5B9BD5",
  ];

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

  const formatChartValue = (value: number) => value.toLocaleString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{title || "Aggregate Totals"}</DialogTitle>
          <DialogDescription>
            {description || "Totals by indicator for the selected filters."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={downloadChartSvg}>
            <Download className="mr-2 h-4 w-4" />
            Download Chart
          </Button>
        </div>

        {sections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No data available for the selected filters.
          </div>
        ) : (
          <div ref={chartRef} className="grid gap-6 md:grid-cols-2">
            {sections.map((section) => {
              const needsAngledLabels =
                section.data.length > 6 || section.data.some((entry) => entry.name.length > 16);
              const positiveValues = section.data.map((entry) => entry.total).filter((value) => value > 0);
              const smallestPositiveValue = positiveValues.length > 0 ? Math.min(...positiveValues) : 0;
              const largestValue = positiveValues.length > 0 ? Math.max(...positiveValues) : 0;
              const useCompressedScale =
                positiveValues.length >= 3 &&
                smallestPositiveValue > 0 &&
                largestValue / smallestPositiveValue >= 12;
              const yAxisUpperBound = largestValue > 0 ? Math.ceil(largestValue * 1.12) : "auto";

              return (
                <section key={section.id} className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                  </div>

                  <ChartContainer
                    config={{ total: { label: "Totals", color: section.color } }}
                    className="h-[320px]"
                  >
                    <BarChart data={section.data} margin={{ top: 28, right: 20, left: 0, bottom: needsAngledLabels ? 40 : 12 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={needsAngledLabels ? -20 : 0}
                        textAnchor={needsAngledLabels ? "end" : "middle"}
                        height={needsAngledLabels ? 72 : 36}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        scale={useCompressedScale ? "sqrt" : "auto"}
                        domain={[0, yAxisUpperBound]}
                      />
                      <ChartTooltip
                        cursor={{ fill: "rgba(16, 24, 40, 0.06)" }}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Bar
                        dataKey="total"
                        fillOpacity={1}
                        stroke="rgba(255, 255, 255, 0.9)"
                        strokeWidth={1.25}
                        barSize={34}
                        radius={[5, 5, 0, 0]}
                      >
                        {section.data.map((entry, index) => (
                          <Cell
                            key={`${section.id}-${entry.name}`}
                            fill={barPalette[index % barPalette.length]}
                          />
                        ))}
                        <LabelList
                          dataKey="total"
                          position="top"
                          offset={8}
                          formatter={(value: number) => formatChartValue(Number(value) || 0)}
                          className="fill-foreground text-xs font-medium"
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>

                  {useCompressedScale ? (
                    <p className="text-xs text-muted-foreground">
                      Scale adjusted to keep smaller values visible alongside a much larger category.
                    </p>
                  ) : null}

                  <p className="text-sm text-muted-foreground">{section.note}</p>
                </section>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
