"use client";

import { useCallback, useMemo, useState } from "react";
import { aggregatesService } from "@/lib/api";
import { type AggregateIndicatorGroup, getAggregateTotal, getPeriodLabel, resolveParentOrganizationId } from "@/lib/aggregates/aggregate-helpers";
import { isPlatformAdmin } from "@/lib/permissions";
import type { Aggregate, User } from "@/lib/types";
import { getUserOrganizationId } from "@/lib/utils/organization";

type UserLike = User | null | undefined;

export type OrganizationWithParent = {
  id: string | number;
  name?: string;
  type?: string;
  parentId?: string | number | null;
  parent?: string | number | null;
};

export type AggregateEntryDraft = {
  total: string;
  matrixValues: Record<string, Record<string, Record<string, string>>>;
};

type ToastFn = (payload: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

const coordinatorOrganizationTypes = new Set([
  "coordinator",
  "senior_coordinator",
  "headquarters",
  "regional",
  "district",
]);

function collectDescendantOrganizationIds(
  rootId: string,
  childrenByParentId: Map<string, string[]>,
): Set<string> {
  const visited = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) continue;
    visited.add(currentId);
    for (const childId of childrenByParentId.get(currentId) || []) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }
  return visited;
}

type AggregateVisibilityScopeArgs = {
  organizations: OrganizationWithParent[];
  user: UserLike;
};

export function useAggregateVisibilityScope(args: AggregateVisibilityScopeArgs) {
  const { organizations, user } = args;
  const userOrganizationId = useMemo(() => getUserOrganizationId(user), [user]);
  const canReportAcrossOrganizations = useMemo(() => isPlatformAdmin(user), [user]);
  const canReviewAggregates = Boolean(user && (isPlatformAdmin(user) || user.role === "manager"));
  const ownOrganizationId = userOrganizationId ? String(userOrganizationId) : "";

  const childrenByParentId = useMemo(() => {
    const map = new Map<string, string[]>();
    organizations.forEach((organization) => {
      const organizationId = String(organization.id);
      const parentId = resolveParentOrganizationId(organization);
      if (!parentId) return;
      const children = map.get(parentId) || [];
      children.push(organizationId);
      map.set(parentId, children);
    });
    return map;
  }, [organizations]);

  const ownOrganization = useMemo(
    () => organizations.find((organization) => String(organization.id) === ownOrganizationId) || null,
    [organizations, ownOrganizationId],
  );

  const ownDescendantIds = useMemo(() => {
    if (!ownOrganizationId) return new Set<string>();
    return collectDescendantOrganizationIds(ownOrganizationId, childrenByParentId);
  }, [childrenByParentId, ownOrganizationId]);

  const isCoordinatorUser = useMemo(() => {
    if (!ownOrganizationId || !ownOrganization) return false;
    if (coordinatorOrganizationTypes.has(String(ownOrganization.type || "").toLowerCase())) return true;
    return ownDescendantIds.size > 1;
  }, [ownDescendantIds, ownOrganization, ownOrganizationId]);

  const visibleOrganizationIds = useMemo(() => {
    if (canReportAcrossOrganizations || canReviewAggregates) {
      return new Set(organizations.map((organization) => String(organization.id)));
    }
    if (!ownOrganizationId) return new Set<string>();
    if (isCoordinatorUser) return ownDescendantIds;
    return new Set<string>([ownOrganizationId]);
  }, [
    canReportAcrossOrganizations,
    canReviewAggregates,
    isCoordinatorUser,
    organizations,
    ownDescendantIds,
    ownOrganizationId,
  ]);

  const visibleOrganizations = useMemo(
    () =>
      organizations
        .filter((organization) => visibleOrganizationIds.has(String(organization.id)))
        .slice()
        .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""))),
    [organizations, visibleOrganizationIds],
  );

  const availableCoordinatorOrganizations = useMemo(() => {
    if (!canReportAcrossOrganizations && !canReviewAggregates && !isCoordinatorUser) {
      return [];
    }
    if (isCoordinatorUser && ownOrganization) {
      return [ownOrganization];
    }
    return visibleOrganizations.filter((organization) => {
      const organizationId = String(organization.id);
      const parentId = resolveParentOrganizationId(organization);
      const hasVisibleChildren = (childrenByParentId.get(organizationId) || []).some((childId) =>
        visibleOrganizationIds.has(childId),
      );
      return !parentId || !visibleOrganizationIds.has(parentId) || hasVisibleChildren;
    });
  }, [
    canReportAcrossOrganizations,
    canReviewAggregates,
    childrenByParentId,
    isCoordinatorUser,
    ownOrganization,
    visibleOrganizationIds,
    visibleOrganizations,
  ]);

  const writableOrganizations = useMemo(() => {
    if (canReportAcrossOrganizations) return organizations;
    if (!ownOrganizationId) return [];
    return organizations.filter((organization) => String(organization.id) === ownOrganizationId);
  }, [canReportAcrossOrganizations, organizations, ownOrganizationId]);

  const writableOrganizationIds = useMemo(
    () => new Set<string>(writableOrganizations.map((organization) => String(organization.id))),
    [writableOrganizations],
  );

  return {
    availableCoordinatorOrganizations,
    canReportAcrossOrganizations,
    canReviewAggregates,
    defaultOwnOrganizationValue: ownOrganizationId,
    isOrganizationSelectionLocked: !canReportAcrossOrganizations,
    userOrganizationId,
    visibleOrganizationIds,
    visibleOrganizations,
    writableOrganizationIds,
    writableOrganizations,
  };
}

export type PeriodFilterOption = {
  id: string;
  label: string;
  periodEnd: string;
  periodStart: string;
};

type AggregateFiltersArgs = {
  aggregates: Aggregate[];
  availableCoordinatorOrganizations: OrganizationWithParent[];
  visibleOrganizations: OrganizationWithParent[];
};

export function useAggregateFilters(args: AggregateFiltersArgs) {
  const {
    aggregates,
    availableCoordinatorOrganizations,
    visibleOrganizations,
  } = args;
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [parentOrgFilter, setParentOrgFilter] = useState("all");
  const [selectedOrganizationIdsList, setSelectedOrganizationIdsList] = useState<string[]>([]);

  const childrenByParentId = useMemo(() => {
    const map = new Map<string, string[]>();
    visibleOrganizations.forEach((organization) => {
      const organizationId = String(organization.id);
      const parentId = resolveParentOrganizationId(organization);
      if (!parentId) return;
      const children = map.get(parentId) || [];
      children.push(organizationId);
      map.set(parentId, children);
    });
    return map;
  }, [visibleOrganizations]);

  const effectiveParentOrgFilter = useMemo(() => {
    if (parentOrgFilter === "all") return "all";
    const isKnownCoordinator = availableCoordinatorOrganizations.some(
      (organization) => String(organization.id) === parentOrgFilter,
    );
    return isKnownCoordinator ? parentOrgFilter : "all";
  }, [availableCoordinatorOrganizations, parentOrgFilter]);

  const scopedOrganizations = useMemo(() => {
    if (effectiveParentOrgFilter === "all") {
      return visibleOrganizations;
    }
    const scopedIds = collectDescendantOrganizationIds(effectiveParentOrgFilter, childrenByParentId);
    return visibleOrganizations
      .filter((organization) => scopedIds.has(String(organization.id)))
      .slice()
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  }, [childrenByParentId, effectiveParentOrgFilter, visibleOrganizations]);

  const scopedOrganizationIds = useMemo(
    () => new Set(scopedOrganizations.map((organization) => String(organization.id))),
    [scopedOrganizations],
  );

  const normalizedSelectedOrganizationIdsList = useMemo(
    () =>
      selectedOrganizationIdsList.filter((organizationId) =>
        scopedOrganizationIds.has(organizationId),
      ),
    [scopedOrganizationIds, selectedOrganizationIdsList],
  );

  const selectedOrganizationIds = useMemo(() => {
    if (normalizedSelectedOrganizationIdsList.length === 0) {
      return scopedOrganizationIds;
    }
    return new Set(
      normalizedSelectedOrganizationIdsList.filter((organizationId) => scopedOrganizationIds.has(organizationId)),
    );
  }, [normalizedSelectedOrganizationIdsList, scopedOrganizationIds]);

  const periodOptions = useMemo<PeriodFilterOption[]>(() => {
    const periodMap = new Map<string, PeriodFilterOption>();
    aggregates.forEach((aggregate) => {
      if (aggregate.status !== "approved") return;
      const organizationId = String(aggregate.organization);
      if (!selectedOrganizationIds.has(organizationId)) return;
      if (projectFilter !== "all" && String(aggregate.project) !== projectFilter) return;
      const periodStart = aggregate.period_start || "";
      const periodEnd = aggregate.period_end || "";
      if (!periodStart || !periodEnd) return;
      const optionId = `${periodStart}|${periodEnd}`;
      if (periodMap.has(optionId)) return;
      periodMap.set(optionId, {
        id: optionId,
        label: getPeriodLabel(aggregate),
        periodEnd,
        periodStart,
      });
    });
    return Array.from(periodMap.values()).sort((left, right) =>
      String(right.periodEnd).localeCompare(String(left.periodEnd)),
    );
  }, [aggregates, projectFilter, selectedOrganizationIds]);

  const effectivePeriodFilter = useMemo(
    () => (periodFilter === "all" || periodOptions.some((option) => option.id === periodFilter) ? periodFilter : "all"),
    [periodFilter, periodOptions],
  );
  const selectedPeriodOption = useMemo(
    () => periodOptions.find((option) => option.id === effectivePeriodFilter) || null,
    [effectivePeriodFilter, periodOptions],
  );

  const setCoordinatorFilter = useCallback((value: string) => {
    setParentOrgFilter(value);
    setSelectedOrganizationIdsList([]);
  }, []);

  return {
    parentOrgFilter: effectiveParentOrgFilter,
    periodFilter: effectivePeriodFilter,
    periodOptions,
    projectFilter,
    scopedOrganizations,
    searchQuery,
    selectedOrganizationIds,
    selectedOrganizationIdsList: normalizedSelectedOrganizationIdsList,
    selectedPeriodOption,
    setCoordinatorFilter,
    setPeriodFilter,
    setProjectFilter,
    setSearchQuery,
    setSelectedOrganizationIdsList,
  };
}

export function useAggregateEntryForm() {
  const [formProject, setFormProject] = useState("");
  const [formOrganization, setFormOrganization] = useState("");
  const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<string[]>([]);
  const [indicatorDrafts, setIndicatorDrafts] = useState<Record<string, AggregateEntryDraft>>({});
  const [formPeriodStart, setFormPeriodStart] = useState("");
  const [formPeriodEnd, setFormPeriodEnd] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formDataSource, setFormDataSource] = useState("");

  const resetForm = useCallback(() => {
    setFormProject("");
    setFormOrganization("");
    setSelectedIndicatorIds([]);
    setIndicatorDrafts({});
    setFormPeriodStart("");
    setFormPeriodEnd("");
    setFormNotes("");
    setFormDataSource("");
  }, []);

  const handleFormProjectChange = useCallback((value: string) => {
    setFormProject(value);
    setFormOrganization("");
    setSelectedIndicatorIds([]);
    setIndicatorDrafts({});
  }, []);

  const handleFormOrganizationChange = useCallback((value: string) => {
    setFormOrganization(value);
    setSelectedIndicatorIds([]);
    setIndicatorDrafts({});
  }, []);

  return {
    formDataSource,
    formNotes,
    formOrganization,
    formPeriodEnd,
    formPeriodStart,
    formProject,
    handleFormOrganizationChange,
    handleFormProjectChange,
    indicatorDrafts,
    resetForm,
    selectedIndicatorIds,
    setFormDataSource,
    setFormNotes,
    setFormOrganization,
    setFormPeriodEnd,
    setFormPeriodStart,
    setFormProject,
    setIndicatorDrafts,
    setSelectedIndicatorIds,
  };
}

type AggregateReviewActionsArgs = {
  mutate: () => Promise<unknown>;
  toast: ToastFn;
};

export function useAggregateReviewActions(args: AggregateReviewActionsArgs) {
  const { mutate, toast } = args;
  const [actingAggregateId, setActingAggregateId] = useState<string | null>(null);
  const [actingReviewAction, setActingReviewAction] = useState<"review" | "approve" | "flag" | "delete" | null>(null);

  const handleReviewAggregate = useCallback(
    async (aggregateId: string, notes: string) => {
      setActingAggregateId(aggregateId);
      setActingReviewAction("review");
      try {
        await aggregatesService.review(Number(aggregateId), { notes });
        await mutate();
        toast({
          title: "Aggregate reviewed",
          description: "The aggregate has been reviewed and is now ready for approval.",
        });
      } catch (error) {
        console.error("Failed to review aggregate", error);
        toast({
          title: "Review failed",
          description: error instanceof Error ? error.message : "Unable to review this aggregate.",
          variant: "destructive",
        });
      } finally {
        setActingAggregateId(null);
        setActingReviewAction(null);
      }
    },
    [mutate, toast],
  );

  const handleApproveAggregate = useCallback(
    async (aggregateId: string) => {
      setActingAggregateId(aggregateId);
      setActingReviewAction("approve");
      try {
        await aggregatesService.approve(Number(aggregateId));
        await mutate();
        toast({
          title: "Aggregate approved",
          description: "The aggregate entry is now approved.",
        });
      } catch (error) {
        console.error("Failed to approve aggregate", error);
        toast({
          title: "Approval failed",
          description: error instanceof Error ? error.message : "Unable to approve this aggregate.",
          variant: "destructive",
        });
      } finally {
        setActingAggregateId(null);
        setActingReviewAction(null);
      }
    },
    [mutate, toast],
  );

  const handleFlagAggregate = useCallback(
    async (
      aggregateId: string,
      payload: {
        reason: "duplicate" | "incorrect_data" | "suspicious" | "incomplete" | "other";
        description: string;
        severity: "low" | "medium" | "high";
      },
    ) => {
      setActingAggregateId(aggregateId);
      setActingReviewAction("flag");
      try {
        await aggregatesService.flag(Number(aggregateId), payload);
        await mutate();
        toast({
          title: "Aggregate flagged",
          description: "The aggregate was flagged for correction and a data-quality flag was created.",
        });
      } catch (error) {
        console.error("Failed to flag aggregate", error);
        toast({
          title: "Flagging failed",
          description: error instanceof Error ? error.message : "Unable to flag this aggregate.",
          variant: "destructive",
        });
      } finally {
        setActingAggregateId(null);
        setActingReviewAction(null);
      }
    },
    [mutate, toast],
  );

  const handleUpdateAggregate = useCallback(
    async (
      aggregateId: string,
      payload: {
        indicator: number;
        notes: string;
        organization: number;
        period_end: string;
        period_start: string;
        project: number;
        value: unknown;
      },
    ) => {
      setActingAggregateId(aggregateId);
      setActingReviewAction("review");
      try {
        const updated = await aggregatesService.update(Number(aggregateId), payload);
        await mutate();
        toast({
          title: "Corrections saved",
          description: "The aggregate was updated and sent back for review.",
        });
        return updated;
      } catch (error) {
        console.error("Failed to update aggregate", error);
        toast({
          title: "Update failed",
          description: error instanceof Error ? error.message : "Unable to save corrections.",
          variant: "destructive",
        });
        throw error;
      } finally {
        setActingAggregateId(null);
        setActingReviewAction(null);
      }
    },
    [mutate, toast],
  );

  const handleDeleteAggregate = useCallback(
    async (aggregateId: string) => {
      setActingAggregateId(aggregateId);
      setActingReviewAction("delete");
      try {
        await aggregatesService.delete(Number(aggregateId));
        await mutate();
        toast({
          title: "Aggregate deleted",
          description: "The aggregate record was deleted successfully.",
        });
      } catch (error) {
        console.error("Failed to delete aggregate", error);
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Unable to delete this aggregate.",
          variant: "destructive",
        });
        throw error;
      } finally {
        setActingAggregateId(null);
        setActingReviewAction(null);
      }
    },
    [mutate, toast],
  );

  return {
    actingAggregateId,
    actingReviewAction,
    handleApproveAggregate,
    handleDeleteAggregate,
    handleFlagAggregate,
    handleReviewAggregate,
    handleUpdateAggregate,
  };
}

type AggregateChartStateArgs = {
  aggregateGroups: AggregateIndicatorGroup[];
};

export function useAggregateChartState(args: AggregateChartStateArgs) {
  const { aggregateGroups } = args;
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [selectedChartGroupKey, setSelectedChartGroupKey] = useState("");

  const selectedChartGroup = useMemo(
    () => aggregateGroups.find((group) => group.key === selectedChartGroupKey) || null,
    [aggregateGroups, selectedChartGroupKey],
  );

  const chartData = useMemo(() => {
    if (!selectedChartGroup) return [];
    const totalsByPeriod = new Map<string, { label: string; periodEnd: string; total: number }>();
    selectedChartGroup.items.forEach((aggregate) => {
      const periodStart = String(aggregate.period_start || "");
      const periodEnd = String(aggregate.period_end || "");
      const periodKey = `${periodStart}|${periodEnd}`;
      const current = totalsByPeriod.get(periodKey) || {
        label: getPeriodLabel(aggregate),
        periodEnd,
        total: 0,
      };
      current.total += getAggregateTotal(aggregate);
      totalsByPeriod.set(periodKey, current);
    });
    return Array.from(totalsByPeriod.values())
      .sort((left, right) => String(left.periodEnd).localeCompare(String(right.periodEnd)))
      .map((entry) => ({ name: entry.label, total: entry.total }));
  }, [selectedChartGroup]);

  const openChartForGroup = useCallback((group: AggregateIndicatorGroup) => {
    setSelectedChartGroupKey(group.key);
    setIsChartOpen(true);
  }, []);

  return {
    chartData,
    chartDescription: selectedChartGroup
      ? `Totals for ${selectedChartGroup.indicatorName} within the current filter scope.`
      : "Totals by indicator for the selected filters.",
    chartTitle: selectedChartGroup?.indicatorName || "Aggregate Totals",
    isChartOpen,
    openChartForGroup,
    selectedChartGroup,
    setIsChartOpen,
  };
}
