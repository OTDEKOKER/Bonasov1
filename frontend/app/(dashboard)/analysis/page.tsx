"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  MessageSquare,
  Eye,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertCircle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import Loading from "./loading";

// Interfaces
interface DataFlag {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  indicator: string;
  project: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  resolvedAt?: string;
}

interface Anomaly {
  id: string;
  indicator: string;
  period: string;
  expected: number;
  actual: number;
  deviation: string;
  severity: "high" | "medium" | "low";
}

// Mock data
const mockFlags: DataFlag[] = [
  {
    id: "flag-1",
    type: "error",
    title: "Missing Data Entry",
    description:
      "No data submitted for Q3 reporting period. This indicator requires quarterly updates.",
    indicator: "HIV Testing Services",
    project: "Youth Health Initiative",
    status: "open",
    createdAt: "2024-12-10",
  },
  {
    id: "flag-2",
    type: "warning",
    title: "Target Underperformance",
    description:
      "Current achievement is 45% of target with only 1 month remaining in the reporting period.",
    indicator: "Condom Distribution",
    project: "Community Outreach Program",
    status: "open",
    createdAt: "2024-12-08",
  },
  {
    id: "flag-3",
    type: "warning",
    title: "Data Anomaly Detected",
    description:
      "Reported value is 300% higher than the previous period average. Please verify.",
    indicator: "Youth Reached",
    project: "Youth Health Initiative",
    status: "open",
    createdAt: "2024-12-05",
  },
  {
    id: "flag-4",
    type: "info",
    title: "Duplicate Entry Suspected",
    description:
      "Similar entries found within the same timeframe. May indicate duplicate submission.",
    indicator: "Training Sessions",
    project: "Capacity Building",
    status: "resolved",
    createdAt: "2024-12-01",
    resolvedAt: "2024-12-03",
  },
  {
    id: "flag-5",
    type: "error",
    title: "Validation Error",
    description:
      "Total does not equal sum of male + female values. Data integrity issue.",
    indicator: "HIV Prevention Outreach",
    project: "Community Outreach Program",
    status: "dismissed",
    createdAt: "2024-11-28",
  },
];

const anomalies: Anomaly[] = [
  {
    id: "anom-1",
    indicator: "Youth Reached",
    period: "Nov 2024",
    expected: 250,
    actual: 752,
    deviation: "+201%",
    severity: "high",
  },
  {
    id: "anom-2",
    indicator: "HIV Testing",
    period: "Dec 2024",
    expected: 180,
    actual: 45,
    deviation: "-75%",
    severity: "high",
  },
  {
    id: "anom-3",
    indicator: "Condom Distribution",
    period: "Dec 2024",
    expected: 500,
    actual: 380,
    deviation: "-24%",
    severity: "medium",
  },
  {
    id: "anom-4",
    indicator: "Training Sessions",
    period: "Nov 2024",
    expected: 12,
    actual: 8,
    deviation: "-33%",
    severity: "low",
  },
];

export default function AnalysisPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const searchParams = useSearchParams();

  // Filtered Flags
  const filteredFlags = mockFlags.filter((flag) => {
    const matchesSearch =
      flag.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.indicator.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || flag.status === statusFilter;
    const matchesType = typeFilter === "all" || flag.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Helper functions for badges & icons
  const getFlagIcon = (type: DataFlag["type"]) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "info":
        return <Flag className="h-4 w-4 text-info" />;
    }
  };

  const getStatusBadge = (status: DataFlag["status"]) => {
    switch (status) {
      case "open":
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30">
            <Clock className="mr-1 h-3 w-3" /> Open
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

  const getSeverityBadge = (severity: Anomaly["severity"]) => {
    switch (severity) {
      case "high":
        return <Badge className="bg-destructive/20 text-destructive">High</Badge>;
      case "medium":
        return <Badge className="bg-warning/20 text-warning">Medium</Badge>;
      case "low":
        return <Badge className="bg-info/20 text-info">Low</Badge>;
    }
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Data Analysis & Flags"
          description="Monitor data quality, investigate anomalies, and resolve data flags"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Analysis" },
          ]}
        />

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardDescription>Open Flags</CardDescription>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {mockFlags.filter((f) => f.status === "open").length}
              </div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardDescription>Resolved This Month</CardDescription>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">12</div>
              <p className="text-xs text-muted-foreground">+3 from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardDescription>Data Quality Score</CardDescription>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> +2% improvement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardDescription>Anomalies Detected</CardDescription>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{anomalies.length}</div>
              <p className="text-xs text-muted-foreground">
                {anomalies.filter((a) => a.severity === "high").length} high severity
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="flags" className="space-y-4">
          <TabsList>
            <TabsTrigger value="flags">
              <Flag className="mr-2 h-4 w-4" /> Data Flags
            </TabsTrigger>
            <TabsTrigger value="anomalies">
              <AlertTriangle className="mr-2 h-4 w-4" /> Anomalies
            </TabsTrigger>
          </TabsList>

          {/* Flags Tab */}
          <TabsContent value="flags" className="space-y-4">
            {/* Filters */}
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
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" /> <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="warning">Warnings</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flags List */}
            <div className="space-y-3">
              {filteredFlags.length === 0 ? (
                <Card className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success/50 mb-4 mx-auto" />
                  <h3 className="text-lg font-semibold">No flags found</h3>
                  <p className="text-muted-foreground mt-1">
                    All data quality issues have been resolved
                  </p>
                </Card>
              ) : (
                filteredFlags.map((flag) => (
                  <Card key={flag.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {getFlagIcon(flag.type)}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-medium">{flag.title}</h4>
                              <p className="text-sm text-muted-foreground">{flag.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(flag.status)}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Resolved
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <MessageSquare className="mr-2 h-4 w-4" /> Add Comment
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Indicator: {flag.indicator}</span>
                            <span>Project: {flag.project}</span>
                            <span>
                              Created: {new Date(flag.createdAt).toLocaleDateString()}
                            </span>
                            {flag.resolvedAt && (
                              <span>
                                Resolved: {new Date(flag.resolvedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies">
            <Card>
              <CardHeader>
                <CardTitle>Detected Anomalies</CardTitle>
                <CardDescription>Data points deviating from expected values</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Indicator</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Expected</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Deviation</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anomalies.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.indicator}</TableCell>
                          <TableCell>{a.period}</TableCell>
                          <TableCell className="text-right">{a.expected}</TableCell>
                          <TableCell className="text-right">{a.actual}</TableCell>
                          <TableCell className="text-right flex items-center justify-end gap-1">
                            {a.deviation.startsWith("+") ? (
                              <TrendingUp className="h-3 w-3 text-success" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-destructive" />
                            )}
                            <span className={a.deviation.startsWith("+") ? "text-success" : "text-destructive"}>
                              {a.deviation}
                            </span>
                          </TableCell>
                          <TableCell>{getSeverityBadge(a.severity)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Suspense>
  );
}
