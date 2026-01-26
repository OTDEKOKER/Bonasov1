"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Target,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { mockProjects, mockIndicators } from "@/lib/mock-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const performanceData = [
  { name: "Q1", target: 500, achieved: 420, rate: 84 },
  { name: "Q2", target: 600, achieved: 580, rate: 97 },
  { name: "Q3", target: 700, achieved: 650, rate: 93 },
  { name: "Q4", target: 800, achieved: 720, rate: 90 },
];

const indicatorBreakdown = [
  { name: "HIV Prevention", value: 2450, color: "hsl(var(--chart-1))" },
  { name: "HIV Testing", value: 1890, color: "hsl(var(--chart-2))" },
  { name: "Condom Distribution", value: 4500, color: "hsl(var(--chart-3))" },
  { name: "Youth Outreach", value: 1200, color: "hsl(var(--chart-4))" },
  { name: "Training Sessions", value: 340, color: "hsl(var(--chart-5))" },
];

const monthlyTrend = [
  { month: "Jan", male: 145, female: 189 },
  { month: "Feb", male: 167, female: 210 },
  { month: "Mar", male: 198, female: 245 },
  { month: "Apr", male: 212, female: 267 },
  { month: "May", male: 234, female: 289 },
  { month: "Jun", male: 256, female: 312 },
];

const savedReports = [
  {
    id: "1",
    name: "Q4 2024 Performance Summary",
    type: "Performance",
    createdAt: "2024-12-15",
    createdBy: "Admin User",
  },
  {
    id: "2",
    name: "Annual Indicator Report 2024",
    type: "Indicator",
    createdAt: "2024-12-01",
    createdBy: "M&E Officer",
  },
  {
    id: "3",
    name: "Youth Outreach Analysis",
    type: "Analysis",
    createdAt: "2024-11-20",
    createdBy: "Program Manager",
  },
  {
    id: "4",
    name: "Funder Report - PEPFAR",
    type: "Funder",
    createdAt: "2024-11-15",
    createdBy: "Admin User",
  },
];

export default function ReportsPage() {
  const [projectFilter, setProjectFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("2024");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports & Analysis"
        description="Generate reports, analyze data, and export insights"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports" },
        ]}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Project" />
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
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
            <SelectItem value="2022">2022</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Reached</CardDescription>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10,380</div>
            <p className="text-xs text-success flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +12% from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Target Achievement</CardDescription>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">91%</div>
            <p className="text-xs text-muted-foreground">
              2,370 / 2,600 targets met
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Active Indicators</CardDescription>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockIndicators.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {mockProjects.length} projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Data Quality Score</CardDescription>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">94%</div>
            <p className="text-xs text-muted-foreground">12 flags resolved</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">
            <TrendingUp className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="indicators">
            <PieChart className="mr-2 h-4 w-4" />
            Indicators
          </TabsTrigger>
          <TabsTrigger value="demographics">
            <Users className="mr-2 h-4 w-4" />
            Demographics
          </TabsTrigger>
          <TabsTrigger value="saved">
            <FileText className="mr-2 h-4 w-4" />
            Saved Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quarterly Performance</CardTitle>
                <CardDescription>
                  Target vs achieved comparison by quarter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="target"
                        fill="hsl(var(--chart-2))"
                        name="Target"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="achieved"
                        fill="hsl(var(--chart-1))"
                        name="Achieved"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Achievement Rate Trend</CardTitle>
                <CardDescription>
                  Percentage of targets achieved over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--chart-1))" }}
                        name="Achievement Rate %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="indicators" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Indicator Distribution</CardTitle>
                <CardDescription>Breakdown by indicator category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={indicatorBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {indicatorBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {indicatorBreakdown.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indicator Progress</CardTitle>
                <CardDescription>
                  Individual indicator achievement rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockIndicators.slice(0, 5).map((indicator) => {
                  const progress = Math.round(Math.random() * 40 + 60);
                  return (
                    <div key={indicator.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[200px]">
                          {indicator.name}
                        </span>
                        <span
                          className={
                            progress >= 80 ? "text-success" : "text-warning"
                          }
                        >
                          {progress}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${progress >= 80 ? "bg-success" : "bg-warning"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gender Distribution Over Time</CardTitle>
              <CardDescription>
                Monthly breakdown of male vs female beneficiaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="male"
                      fill="hsl(var(--chart-2))"
                      name="Male"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="female"
                      fill="hsl(var(--chart-5))"
                      name="Female"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Male</CardDescription>
                <CardTitle className="text-2xl text-chart-2">1,212</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">42% of total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Female</CardDescription>
                <CardTitle className="text-2xl text-chart-5">1,512</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">52% of total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Other / Not Specified</CardDescription>
                <CardTitle className="text-2xl">176</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">6% of total</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
              <CardDescription>
                Previously generated reports available for download
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {report.type}
                          </Badge>
                          <span>by {report.createdBy}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
