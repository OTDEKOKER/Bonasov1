"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Table2,
  BarChart3,
  Calendar,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { mockIndicators, mockProjects } from "@/lib/mock-data";
import Loading from "./loading";

interface AggregateEntry {
  id: string;
  indicatorId: string;
  indicatorName: string;
  projectId: string;
  period: string;
  male: number;
  female: number;
  total: number;
  ageRange: string;
  keyPopulation: string;
  createdAt: string;
}

// Mock data
const mockAggregates: AggregateEntry[] = [
  {
    id: "agg-1",
    indicatorId: "ind-1",
    indicatorName: "Youth Reached with HIV Prevention",
    projectId: "proj-1",
    period: "2024-Q1",
    male: 245,
    female: 312,
    total: 557,
    ageRange: "15-19",
    keyPopulation: "AGYW",
    createdAt: "2024-03-15",
  },
  {
    id: "agg-2",
    indicatorId: "ind-2",
    indicatorName: "HIV Testing Services Provided",
    projectId: "proj-1",
    period: "2024-Q1",
    male: 189,
    female: 256,
    total: 445,
    ageRange: "20-24",
    keyPopulation: "General Population",
    createdAt: "2024-03-15",
  },
];

const ageRanges = [
  "10-14",
  "15-19",
  "20-24",
  "25-29",
  "30-34",
  "35-39",
  "40-44",
  "45-49",
  "50-54",
  "55-59",
  "60-64",
  "65+",
];

const keyPopulations = [
  "General Population",
  "MSM",
  "FSW",
  "PWID",
  "Adolescent Girls & Young Women (AGYW)",
];

export default function AggregatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter aggregates
  const filteredAggregates = mockAggregates.filter((agg) => {
    const matchesSearch = agg.indicatorName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesProject =
      projectFilter === "all" || agg.projectId === projectFilter;
    const matchesPeriod = periodFilter === "all" || agg.period === periodFilter;
    return matchesSearch && matchesProject && matchesPeriod;
  });

  // Totals
  const totalMale = filteredAggregates.reduce((sum, a) => sum + a.male, 0);
  const totalFemale = filteredAggregates.reduce((sum, a) => sum + a.female, 0);
  const grandTotal = filteredAggregates.reduce((sum, a) => sum + a.total, 0);

  const periods = Array.from(new Set(mockAggregates.map((a) => a.period)));

  return (
    <Suspense fallback={<Loading />}>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <PageHeader
          title="Aggregates"
          description="Enter and manage aggregate data without individual respondent tracking"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Aggregates" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Import
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Aggregate Entry</DialogTitle>
                    <DialogDescription>
                      Enter aggregate data for an indicator without individual
                      respondent tracking
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    {/* Project */}
                    <div className="space-y-2">
                      <Label htmlFor="agg-project">Project</Label>
                      <Select>
                        <SelectTrigger id="agg-project">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Indicator */}
                    <div className="space-y-2">
                      <Label htmlFor="agg-indicator">Indicator</Label>
                      <Select>
                        <SelectTrigger id="agg-indicator">
                          <SelectValue placeholder="Select indicator" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockIndicators.map((indicator) => (
                            <SelectItem key={indicator.id} value={indicator.id}>
                              {indicator.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Period */}
                    <div className="space-y-2">
                      <Label htmlFor="agg-period">Reporting Period</Label>
                      <Select>
                        <SelectTrigger id="agg-period">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          {periods.map((period) => (
                            <SelectItem key={period} value={period}>
                              {period}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Age Range */}
                    <div className="space-y-2">
                      <Label htmlFor="agg-ageRange">Age Range</Label>
                      <Select>
                        <SelectTrigger id="agg-ageRange">
                          <SelectValue placeholder="Select age range" />
                        </SelectTrigger>
                        <SelectContent>
                          {ageRanges.map((range) => (
                            <SelectItem key={range} value={range}>
                              {range}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Key Population */}
                    <div className="space-y-2">
                      <Label htmlFor="agg-kp">Key Population</Label>
                      <Select>
                        <SelectTrigger id="agg-kp">
                          <SelectValue placeholder="Select key population" />
                        </SelectTrigger>
                        <SelectContent>
                          {keyPopulations.map((kp) => (
                            <SelectItem key={kp} value={kp}>
                              {kp}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Male, Female, Total */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="agg-male">Male</Label>
                        <Input id="agg-male" type="number" placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="agg-female">Female</Label>
                        <Input id="agg-female" type="number" placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="agg-total">Total</Label>
                        <Input id="agg-total" type="number" placeholder="0" disabled />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setIsDialogOpen(false)}>Save Entry</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search indicators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Project Filter */}
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" /> <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {mockProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Period Filter */}
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="mr-2 h-4 w-4" /> <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {periods.map((period) => (
                  <SelectItem key={period} value={period}>
                    {period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Entries</CardDescription>
              <CardTitle className="text-2xl">{filteredAggregates.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Male Total</CardDescription>
              <CardTitle className="text-2xl text-chart-2">{totalMale.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Female Total</CardDescription>
              <CardTitle className="text-2xl text-chart-5">{totalFemale.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Grand Total</CardDescription>
              <CardTitle className="text-2xl text-primary">{grandTotal.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5" /> Aggregate Data
                </CardTitle>
                <CardDescription>Tabular view of all aggregate entries</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <BarChart3 className="mr-2 h-4 w-4" /> View Chart
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicator</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Age Range</TableHead>
                    <TableHead>Key Population</TableHead>
                    <TableHead className="text-right">Male</TableHead>
                    <TableHead className="text-right">Female</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Date Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAggregates.map((agg) => {
                    const project = mockProjects.find((p) => p.id === agg.projectId);
                    return (
                      <TableRow key={agg.id}>
                        <TableCell className="font-medium">{agg.indicatorName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{project?.name}</Badge>
                        </TableCell>
                        <TableCell>{agg.period}</TableCell>
                        <TableCell>{agg.ageRange}</TableCell>
                        <TableCell>{agg.keyPopulation}</TableCell>
                        <TableCell className="text-right text-chart-2">{agg.male.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-chart-5">{agg.female.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{agg.total.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(agg.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredAggregates.length > 0 && (
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={4}>Totals</TableCell>
                      <TableCell />
                      <TableCell className="text-right text-chart-2">{totalMale.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-chart-5">{totalFemale.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{grandTotal.toLocaleString()}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredAggregates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Table2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No data found</h3>
                <p className="text-muted-foreground mt-1">Try adjusting your filters or add new entries</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Suspense>
  );
}
