"use client";

import React from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AYP_BAND_LABEL,
  buildAggregateWorkbookTopicSections,
  buildDisplayMatrix,
  computeAyp,
  getAggregateEntryMatrixConfig,
  getAggregateTotal,
  getBandsForTotals,
  getIndicatorDisaggregateGroups,
  getPeriodLabel,
  getPrimaryDisaggregateLabel,
  mergeDisaggregatesForGroup,
  normalizeMatrixDisaggregatesForIndicator,
  sumBands,
  toSafeNumber,
  type AggregateIndicatorGroup,
  type IndicatorDisaggregationInput,
} from "@/lib/aggregates/aggregate-helpers";

const matrixColumnWidths = {
  keyPopulation: 96,
  ageSex: 72,
  metric: 42,
};

type AggregateMatrixTableProps = {
  aggregateGroups: AggregateIndicatorGroup[];
  projectNameById: Map<string, string>;
  indicatorById: Map<string, IndicatorDisaggregationInput>;
  onViewChart: (group: AggregateIndicatorGroup) => void;
};

function summarizeGroupContext(group: AggregateIndicatorGroup, projectNameById: Map<string, string>) {
  const projectNames = Array.from(
    new Set(
      group.items.map(
        (item) =>
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

  const periodLabels = Array.from(new Set(group.items.map((item) => getPeriodLabel(item))));
  const totalValue = group.items.reduce((sum, item) => sum + getAggregateTotal(item), 0);

  return {
    projectLabel:
      projectNames.length === 1 ? projectNames[0] : `${projectNames.length} projects`,
    organizationLabel:
      organizationNames.length === 1
        ? organizationNames[0]
        : `${organizationNames.length} organizations`,
    periodLabel:
      periodLabels.length === 1 ? periodLabels[0] : `${periodLabels.length} periods`,
    totalValue,
  };
}

function renderSimpleGroupCard(
  group: AggregateIndicatorGroup,
  context: ReturnType<typeof summarizeGroupContext>,
  onViewChart: (group: AggregateIndicatorGroup) => void,
) {
  return (
    <div key={group.key} className="min-w-full rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Indicator</p>
          <p className="text-base font-semibold">{group.indicatorName}</p>
          <p className="text-sm text-muted-foreground">
            {context.organizationLabel} | {context.projectLabel} | {context.periodLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-semibold text-primary">
            {Number(context.totalValue).toLocaleString()}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => onViewChart(group)}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Chart
          </Button>
        </div>
      </div>
    </div>
  );
}

function renderMatrixGroupCard(
  group: AggregateIndicatorGroup,
  context: ReturnType<typeof summarizeGroupContext>,
  disaggregates: NonNullable<ReturnType<typeof mergeDisaggregatesForGroup>>,
  indicatorById: Map<string, IndicatorDisaggregationInput>,
  onViewChart: (group: AggregateIndicatorGroup) => void,
) {
  const indicator = indicatorById.get(group.indicatorId);
  const matrixConfig = getAggregateEntryMatrixConfig(indicator);
  const indicatorGroups = getIndicatorDisaggregateGroups(indicator);
  const primaryDisaggregateLabel = getPrimaryDisaggregateLabel(indicator);
  const alignedDisaggregates = normalizeMatrixDisaggregatesForIndicator(disaggregates, indicator);
  const { matrix, keyPops, secondDimensionValues, ageBands, showAypColumn } =
    buildDisplayMatrix(alignedDisaggregates, indicatorGroups);

  const safeDimensions = secondDimensionValues.length ? secondDimensionValues : ["All"];
  const safeAgeBands = ageBands.length ? ageBands : ["Value"];
  const totalBands = getBandsForTotals(safeAgeBands);
  const dimensionTotals: Record<string, Record<string, number>> = {};
  safeDimensions.forEach((dimension) => {
    dimensionTotals[dimension] = {};
    safeAgeBands.forEach((band) => {
      dimensionTotals[dimension][band] = 0;
    });
    if (showAypColumn) {
      dimensionTotals[dimension][AYP_BAND_LABEL] = 0;
    }
  });

  keyPops.forEach((kp) => {
    const kpData = matrix[kp] || {};
    safeDimensions.forEach((dimension) => {
      const values = kpData[dimension] || {};
      safeAgeBands.forEach((band) => {
        dimensionTotals[dimension][band] += toSafeNumber(values[band]);
      });
      if (showAypColumn) {
        dimensionTotals[dimension][AYP_BAND_LABEL] += computeAyp(values);
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
    combinedTotals[AYP_BAND_LABEL] = safeDimensions.reduce(
      (sum, dimension) => sum + toSafeNumber(dimensionTotals[dimension]?.[AYP_BAND_LABEL]),
      0,
    );
  }

  const combinedTotal = sumBands(combinedTotals, totalBands);

  return (
    <div key={group.key} className="w-full rounded-lg border border-border p-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Indicator</p>
          <p className="text-sm font-semibold">{group.indicatorName}</p>
          <p className="text-xs text-muted-foreground">
            {context.organizationLabel} | {context.projectLabel} | {context.periodLabel}
          </p>
        </div>
        <Badge variant="outline" className="px-2 py-0 text-[11px]">
          Total {Number(context.totalValue).toLocaleString()}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewChart(group)}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Chart
        </Button>
      </div>

      <div className="max-h-[68vh] overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-0 text-[11px]">
          <thead>
            <tr>
              <th
                className="sticky top-0 z-40 border-b border-r border-border bg-muted/90 px-1 py-0.75 text-left font-semibold"
                style={{ minWidth: matrixColumnWidths.keyPopulation, width: matrixColumnWidths.keyPopulation }}
              >
                {primaryDisaggregateLabel}
              </th>
              <th
                className="sticky top-0 z-40 border-b border-r border-border bg-muted/90 px-1 py-0.75 text-left font-semibold"
                style={{ minWidth: matrixColumnWidths.ageSex, width: matrixColumnWidths.ageSex }}
              >
                {matrixConfig.secondaryLabel || "Category"}
              </th>
              {safeAgeBands.map((band) => (
                <th
                  key={band}
                  className="sticky top-0 z-30 border-b border-r border-border bg-muted/90 px-0.5 py-0.75 text-center font-semibold whitespace-nowrap"
                  style={{ minWidth: matrixColumnWidths.metric, width: matrixColumnWidths.metric }}
                >
                  {band}
                </th>
              ))}
              <th
                className="sticky top-0 z-30 border-b border-r border-border bg-muted/90 px-0.5 py-0.75 text-center font-semibold whitespace-nowrap"
                style={{ minWidth: matrixColumnWidths.metric, width: matrixColumnWidths.metric }}
              >
                TOTAL
              </th>
              {showAypColumn ? (
                <th
                  className="sticky top-0 z-30 border-b border-r border-border bg-muted/90 px-0.5 py-0.75 text-center font-semibold whitespace-nowrap"
                  style={{ minWidth: matrixColumnWidths.metric, width: matrixColumnWidths.metric }}
                >
                  {AYP_BAND_LABEL}
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {keyPops.map((kp, kpIndex) => {
              const kpData = matrix[kp] || {};
              return (
                <React.Fragment key={kp}>
                  {safeDimensions.map((dimension, dimensionIndex) => {
                    const values = kpData[dimension] || {};
                    const total = sumBands(values, totalBands);
                    const ayp = showAypColumn ? computeAyp(values) : 0;
                    const rowIndex = kpIndex * safeDimensions.length + dimensionIndex;
                    const rowBaseClass = rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10";

                    return (
                      <tr key={`${kp}-${dimension}`} className={rowBaseClass}>
                        {dimensionIndex === 0 ? (
                          <td
                            className={`border-b border-r border-border px-1 py-0.75 align-top font-medium whitespace-normal break-words ${rowBaseClass}`}
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
                          className={`border-b border-r border-border px-1 py-0.75 whitespace-normal break-words ${rowBaseClass}`}
                          style={{ minWidth: matrixColumnWidths.ageSex, width: matrixColumnWidths.ageSex }}
                        >
                          {dimension}
                        </td>

                        {safeAgeBands.map((band) => (
                          <td
                            key={`${kp}-${dimension}-${band}`}
                            className={`border-b border-r border-border px-0.5 py-0.5 text-center ${rowBaseClass}`}
                          >
                            {toSafeNumber(values[band]).toLocaleString()}
                          </td>
                        ))}

                        <td
                          className={`border-b border-r border-border px-0.5 py-0.75 text-center font-semibold ${rowBaseClass}`}
                        >
                          {total.toLocaleString()}
                        </td>

                        {showAypColumn ? (
                          <td
                            className={`border-b border-r border-border px-0.5 py-0.5 text-center ${rowBaseClass}`}
                          >
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
                className="border-b border-r border-border bg-muted/20 px-1 py-0.75 whitespace-normal break-words"
                style={{
                  minWidth: matrixColumnWidths.keyPopulation,
                  width: matrixColumnWidths.keyPopulation,
                }}
              >
                All
              </td>
              <td
                className="border-b border-r border-border bg-muted/20 px-1 py-0.75 whitespace-normal break-words"
                style={{ minWidth: matrixColumnWidths.ageSex, width: matrixColumnWidths.ageSex }}
              >
                -
              </td>
              {safeAgeBands.map((band) => (
                <td key={`total-all-${band}`} className="border-b border-r border-border px-0.5 py-0.5 text-center">
                  {combinedTotals[band].toLocaleString()}
                </td>
              ))}
              <td className="border-b border-r border-border px-0.5 py-0.75 text-center">
                {combinedTotal.toLocaleString()}
              </td>
              {showAypColumn ? (
                <td className="border-b border-r border-border px-0.5 py-0.5 text-center">
                  {toSafeNumber(combinedTotals[AYP_BAND_LABEL]).toLocaleString()}
                </td>
              ) : null}
            </tr>

            {safeDimensions.map((dimension) => {
              const values = dimensionTotals[dimension] || {};
              const total = sumBands(values, totalBands);
              const ayp = toSafeNumber(values[AYP_BAND_LABEL]);

              return (
                <tr key={`total-${dimension}`} className="bg-muted/30 font-semibold">
                  <td
                    className="border-b border-r border-border bg-muted/30 px-1 py-0.75 whitespace-normal break-words"
                    style={{
                      minWidth: matrixColumnWidths.keyPopulation,
                      width: matrixColumnWidths.keyPopulation,
                    }}
                  >
                    All
                  </td>
                  <td
                    className="border-b border-r border-border bg-muted/30 px-1 py-0.75 whitespace-normal break-words"
                    style={{ minWidth: matrixColumnWidths.ageSex, width: matrixColumnWidths.ageSex }}
                  >
                    {dimension}
                  </td>
                  {safeAgeBands.map((band) => (
                    <td key={`total-${dimension}-${band}`} className="border-b border-r border-border px-0.5 py-0.5 text-center">
                      {toSafeNumber(values[band]).toLocaleString()}
                    </td>
                  ))}
                  <td className="border-b border-r border-border px-0.5 py-0.75 text-center">
                    {total.toLocaleString()}
                  </td>
                  {showAypColumn ? (
                    <td className="border-b border-r border-border px-0.5 py-0.5 text-center">
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
}

export function AggregateMatrixTable(props: AggregateMatrixTableProps) {
  const { aggregateGroups, projectNameById, indicatorById, onViewChart } = props;
  const topicSections = React.useMemo(
    () => buildAggregateWorkbookTopicSections(aggregateGroups),
    [aggregateGroups],
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" /> Aggregate Data
            </CardTitle>
            <CardDescription>Tabular view of all aggregate entries</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto pt-0">
        {aggregateGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Table2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No data found</h3>
            <p className="mt-1 text-muted-foreground">Try adjusting your filters or add new entries</p>
          </div>
        ) : (
          <div className="min-w-full space-y-8">
            {topicSections.map((section) => (
              <section key={section.id} className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/20 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold tracking-wide text-foreground">
                        {section.label}
                      </p>
                      <p className="max-w-3xl text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {section.groups.length} indicator{section.groups.length === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline">
                        Topic total {section.totalValue.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {section.groups.map((group) => {
                    const disaggregates = mergeDisaggregatesForGroup(group.items);
                    const context = summarizeGroupContext(group, projectNameById);

                    if (!disaggregates) {
                      return renderSimpleGroupCard(group, context, onViewChart);
                    }

                    return renderMatrixGroupCard(
                      group,
                      context,
                      disaggregates,
                      indicatorById,
                      onViewChart,
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
