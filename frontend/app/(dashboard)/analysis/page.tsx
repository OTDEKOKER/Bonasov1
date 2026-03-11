"use client";

import { Suspense, useMemo, useState } from "react";
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  Eye,
  AlertCircle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { useFlags, useFlagStats } from "@/lib/hooks/use-api";
import type { Flag as FlagType } from "@/lib/types";

const typeLabels: Record<string, string> = {
  data_quality: "Data Quality",
  follow_up: "Follow Up",
  urgent: "Urgent",
  review: "Needs Review",
  other: "Other",
};

const statusBadge = (status: FlagType["status"]) => {
  switch (status) {
    case "open":
      return (
        <Badge className="bg-destructive/20 text-destructive border-destructive/30">
          <Clock className="mr-1 h-3 w-3" /> Open
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-warning/20 text-warning border-warning/30">
          <Clock className="mr-1 h-3 w-3" /> In Progress
        </Badge>
      );
    case "resolved":
      return (
        <Badge className="bg-success/20 text-success border-success/30">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Resolved
        </Badge>
      );
    case "dismissed":
      return (
        <Badge variant="secondary">
          <Eye className="mr-1 h-3 w-3" /> Dismissed
        </Badge>
      );
  }
};

const flagIcon = (flag: FlagType) => {
  switch (flag.flag_type) {
    case "urgent":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "data_quality":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "follow_up":
      return <Flag className="h-4 w-4 text-info" />;
    case "review":
      return <AlertTriangle className="h-4 w-4 text-info" />;
    default:
      return <Flag className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function AnalysisPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: flagsData, isLoading, error, mutate } = useFlags();
  const { data: statsData } = useFlagStats();

  const flags = flagsData?.results || [];

  const filteredFlags = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return flags.filter((flag) => {
      const matchesSearch =
        flag.title.toLowerCase().includes(query) ||
        flag.description.toLowerCase().includes(query) ||
        flag.content_type.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || flag.status === statusFilter;
      const matchesType =
        typeFilter === "all" || flag.flag_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [flags, searchQuery, statusFilter, typeFilter]);

  const stats = statsData
    ? {
        open: statsData.open,
        inProgress: statsData.in_progress,
        resolved: statsData.resolved,
        critical: statsData.by_priority.find((p) => p.priority === "critical")?.count || 0,
      }
    : {
        open: flags.filter((f) => f.status === "open").length,
        inProgress: flags.filter((f) => f.status === "in_progress").length,
        resolved: flags.filter((f) => f.status === "resolved").length,
        critical: flags.filter((f) => f.priority === "critical").length,
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
        <p className="text-muted-foreground">Failed to load analysis data</p>
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
          title="Data Analysis & Flags"
          description="Monitor data quality, investigate anomalies, and resolve data flags"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Analysis" },
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardDescription>Open Flags</CardDescription>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.open}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardDescription>In Progress</CardDescription>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">Active investigations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardDescription>Resolved</CardDescription>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground">Closed issues</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardDescription>Critical Flags</CardDescription>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
              <p className="text-xs text-muted-foreground">High priority</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="flags" className="space-y-4">
          <TabsList>
            <TabsTrigger value="flags">
              <Flag className="mr-2 h-4 w-4" /> Data Flags
            </TabsTrigger>
            <TabsTrigger value="anomalies">
              <AlertTriangle className="mr-2 h-4 w-4" /> Anomalies
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flags" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search flags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />{" "}
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="data_quality">Data Quality</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="review">Needs Review</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {filteredFlags.length === 0 ? (
                <Card className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success/50 mb-4 mx-auto" />
                  <h3 className="text-lg font-semibold">No flags found</h3>
                  <p className="text-muted-foreground mt-1">
                    No data quality issues match your filters
                  </p>
                </Card>
              ) : (
                filteredFlags.map((flag) => (
                  <Card key={flag.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {flagIcon(flag)}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-medium">{flag.title}</h4>
                              <p className="text-sm text-muted-foreground">{flag.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {statusBadge(flag.status)}
                              <Badge variant="outline" className="text-xs">
                                {typeLabels[flag.flag_type] || flag.flag_type}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span>Type: {flag.content_type}</span>
                            <span>ID: {flag.object_id}</span>
                            <span>
                              Created: {new Date(flag.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="anomalies">
            <Card>
              <CardHeader>
                <CardTitle>Detected Anomalies</CardTitle>
                <CardDescription>
                  Automated anomaly detection is not enabled yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mb-3" />
                  <p className="max-w-md">
                    This section will surface outliers once automated checks are configured.
                    For now, use data flags to track quality issues.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Suspense>
  );
}
