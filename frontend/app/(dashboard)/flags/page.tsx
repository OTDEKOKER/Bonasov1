"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  XCircle,
  Filter,
  Eye,
} from "lucide-react";

interface DataFlag {
  id: string;
  type: "missing_data" | "outlier" | "duplicate" | "inconsistent" | "incomplete";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_review" | "resolved" | "dismissed";
  description: string;
  affectedRecord: string;
  recordType: string;
  indicator?: string;
  project?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

const mockFlags: DataFlag[] = [
  {
    id: "flag-1",
    type: "outlier",
    severity: "high",
    status: "open",
    description: "Value 250% above expected range for HIV testing indicator",
    affectedRecord: "RSP-1234",
    recordType: "Response",
    indicator: "HIV Testing Rate",
    project: "USAID Health Initiative",
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "flag-2",
    type: "missing_data",
    severity: "medium",
    status: "in_review",
    description: "Missing demographic data for 45 respondents",
    affectedRecord: "Batch Upload #892",
    recordType: "Respondent",
    project: "Global Fund Round 12",
    createdAt: "2024-01-14T14:20:00Z",
  },
  {
    id: "flag-3",
    type: "duplicate",
    severity: "low",
    status: "resolved",
    description: "Duplicate respondent entry detected",
    affectedRecord: "RSP-5678",
    recordType: "Respondent",
    createdAt: "2024-01-13T09:15:00Z",
    resolvedAt: "2024-01-13T11:30:00Z",
    resolvedBy: "Sarah Johnson",
    resolution: "Merged duplicate records",
  },
  {
    id: "flag-4",
    type: "inconsistent",
    severity: "critical",
    status: "open",
    description: "Age recorded as negative value in multiple records",
    affectedRecord: "Multiple (12 records)",
    recordType: "Response",
    indicator: "Youth Demographics",
    project: "PEPFAR OVC",
    createdAt: "2024-01-15T08:00:00Z",
  },
  {
    id: "flag-5",
    type: "incomplete",
    severity: "medium",
    status: "dismissed",
    description: "Assessment form submitted without all required fields",
    affectedRecord: "ASM-4521",
    recordType: "Assessment",
    indicator: "Service Delivery",
    createdAt: "2024-01-12T16:45:00Z",
    resolvedAt: "2024-01-12T17:00:00Z",
    resolvedBy: "Admin",
    resolution: "Fields are optional for this indicator type",
  },
];

const severityColors = {
  low: "bg-info/20 text-info border-info/30",
  medium: "bg-warning/20 text-warning border-warning/30",
  high: "bg-accent/20 text-accent border-accent/30",
  critical: "bg-destructive/20 text-destructive border-destructive/30",
};

const statusColors = {
  open: "bg-destructive/20 text-destructive border-destructive/30",
  in_review: "bg-warning/20 text-warning border-warning/30",
  resolved: "bg-primary/20 text-primary border-primary/30",
  dismissed: "bg-muted text-muted-foreground border-border",
};

const typeLabels = {
  missing_data: "Missing Data",
  outlier: "Outlier",
  duplicate: "Duplicate",
  inconsistent: "Inconsistent",
  incomplete: "Incomplete",
};

export default function FlagsPage() {
  const [flags] = useState<DataFlag[]>(mockFlags);
  const [selectedFlag, setSelectedFlag] = useState<DataFlag | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const filteredFlags = flags.filter((flag) => {
    if (filterStatus !== "all" && flag.status !== filterStatus) return false;
    if (filterSeverity !== "all" && flag.severity !== filterSeverity) return false;
    return true;
  });

  const stats = {
    open: flags.filter((f) => f.status === "open").length,
    inReview: flags.filter((f) => f.status === "in_review").length,
    resolved: flags.filter((f) => f.status === "resolved").length,
    critical: flags.filter((f) => f.severity === "critical" && f.status === "open").length,
  };

  const columns: Column<DataFlag>[] = [
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      render: (flag) => (
        <Badge variant="outline" className={severityColors[flag.severity]}>
          {flag.severity.charAt(0).toUpperCase() + flag.severity.slice(1)}
        </Badge>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (flag) => typeLabels[flag.type],
    },
    {
      key: "description",
      header: "Description",
      render: (flag) => (
        <span className="text-sm line-clamp-2">{flag.description}</span>
      ),
    },
    {
      key: "affectedRecord",
      header: "Affected Record",
      render: (flag) => (
        <div>
          <p className="font-medium">{flag.affectedRecord}</p>
          <p className="text-xs text-muted-foreground">{flag.recordType}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (flag) => (
        <Badge variant="outline" className={statusColors[flag.status]}>
          {flag.status === "in_review"
            ? "In Review"
            : flag.status.charAt(0).toUpperCase() + flag.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (flag) => new Date(flag.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (flag) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFlag(flag)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {flag.status === "open" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFlag(flag);
                setIsResolveDialogOpen(true);
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality Flags"
        description="Review and resolve data quality issues across the system"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Issues
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.open}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Review
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.inReview}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Flag className="h-5 w-5" />
              All Flags
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] bg-input border-border">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-[140px] bg-input border-border">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredFlags}
            columns={columns}
            searchable
            searchPlaceholder="Search flags..."
          />
        </CardContent>
      </Card>

      {/* Flag Detail Dialog */}
      <Dialog open={!!selectedFlag && !isResolveDialogOpen} onOpenChange={() => setSelectedFlag(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Flag Details</DialogTitle>
            <DialogDescription>
              Review the data quality issue details
            </DialogDescription>
          </DialogHeader>
          {selectedFlag && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Severity</Label>
                  <Badge variant="outline" className={severityColors[selectedFlag.severity]}>
                    {selectedFlag.severity.charAt(0).toUpperCase() + selectedFlag.severity.slice(1)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant="outline" className={statusColors[selectedFlag.status]}>
                    {selectedFlag.status === "in_review"
                      ? "In Review"
                      : selectedFlag.status.charAt(0).toUpperCase() + selectedFlag.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="text-foreground">{typeLabels[selectedFlag.type]}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-foreground">{selectedFlag.description}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Affected Record</Label>
                <p className="text-foreground">
                  {selectedFlag.affectedRecord} ({selectedFlag.recordType})
                </p>
              </div>
              {selectedFlag.indicator && (
                <div>
                  <Label className="text-muted-foreground">Indicator</Label>
                  <p className="text-foreground">{selectedFlag.indicator}</p>
                </div>
              )}
              {selectedFlag.project && (
                <div>
                  <Label className="text-muted-foreground">Project</Label>
                  <p className="text-foreground">{selectedFlag.project}</p>
                </div>
              )}
              {selectedFlag.resolution && (
                <div>
                  <Label className="text-muted-foreground">Resolution</Label>
                  <p className="text-foreground">{selectedFlag.resolution}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Resolved by {selectedFlag.resolvedBy} on{" "}
                    {new Date(selectedFlag.resolvedAt!).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedFlag?.status === "open" && (
              <Button
                onClick={() => setIsResolveDialogOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Resolve Flag
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Resolve Flag</DialogTitle>
            <DialogDescription>
              Provide resolution details for this data quality issue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="resolution" className="text-foreground">
                Resolution Notes
              </Label>
              <Textarea
                id="resolution"
                placeholder="Describe how this issue was resolved..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="bg-input border-border text-foreground mt-2"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsResolveDialogOpen(false);
                setResolution("");
              }}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsResolveDialogOpen(false);
                setSelectedFlag(null);
                setResolution("");
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
