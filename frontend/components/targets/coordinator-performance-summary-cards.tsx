"use client";

import { Activity, Gauge, Target, TrendingUp } from "lucide-react";

import type { CoordinatorPerformanceRow } from "@/components/targets/coordinator-targets-types";
import { Card, CardContent } from "@/components/ui/card";

type CoordinatorPerformanceSummaryCardsProps = {
  rows: CoordinatorPerformanceRow[];
  totalCount: number;
};

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString();
}

export function CoordinatorPerformanceSummaryCards(props: CoordinatorPerformanceSummaryCardsProps) {
  const { rows, totalCount } = props;

  const totalTarget = rows.reduce((sum, row) => sum + Number(row.target.target_value || 0), 0);
  const totalActual = rows.reduce((sum, row) => sum + Number(row.actualValue || 0), 0);
  const achievementValues = rows
    .map((row) => row.achievementPercent)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const averageAchievement =
    achievementValues.length > 0
      ? achievementValues.reduce((sum, value) => sum + value, 0) / achievementValues.length
      : null;
  const metCount = rows.filter((row) => row.status === "met").length;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Rows</p>
            <p className="mt-2 text-2xl font-semibold">{totalCount.toLocaleString()}</p>
          </div>
          <Activity className="h-5 w-5 text-primary" />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Target</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(totalTarget)}</p>
          </div>
          <Target className="h-5 w-5 text-primary" />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Actual</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(totalActual)}</p>
          </div>
          <TrendingUp className="h-5 w-5 text-primary" />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Avg Achievement</p>
            <p className="mt-2 text-2xl font-semibold">{formatPercent(averageAchievement)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{metCount} met</p>
          </div>
          <Gauge className="h-5 w-5 text-primary" />
        </CardContent>
      </Card>
    </section>
  );
}
