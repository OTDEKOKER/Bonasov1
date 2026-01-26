"use client";

import { useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { mockEvents, mockOrganizations } from "@/lib/mock-data";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const Loading = () => null;

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredEvents = mockEvents.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "upcoming":
        return (
          <Badge className="bg-info/20 text-info border-info/30">
            <Clock className="mr-1 h-3 w-3" />
            Upcoming
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "workshop":
        return "bg-chart-1/20 text-chart-1 border-chart-1/30";
      case "training":
        return "bg-chart-2/20 text-chart-2 border-chart-2/30";
      case "outreach":
        return "bg-chart-3/20 text-chart-3 border-chart-3/30";
      case "meeting":
        return "bg-chart-4/20 text-chart-4 border-chart-4/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Events"
          description="Manage workshops, trainings, outreach activities, and meetings"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Events" },
          ]}
        >
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>
                  Add a new event to track activities and attendance
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-name">Event Name</Label>
                    <Input id="event-name" placeholder="Enter event name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-type">Event Type</Label>
                    <Select>
                      <SelectTrigger id="event-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="outreach">Outreach</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-date">Date</Label>
                    <Input id="event-date" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-org">Organization</Label>
                    <Select>
                      <SelectTrigger id="event-org">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockOrganizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-location">Location</Label>
                  <Input id="event-location" placeholder="Enter event location" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    placeholder="Describe the event..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expected-attendance">
                      Expected Attendance
                    </Label>
                    <Input
                      id="expected-attendance"
                      type="number"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-budget">Budget (BWP)</Label>
                    <Input id="event-budget" type="number" placeholder="0.00" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>
                  Create Event
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Events</CardDescription>
              <CardTitle className="text-2xl">{mockEvents.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Upcoming</CardDescription>
              <CardTitle className="text-2xl text-info">
                {mockEvents.filter((e) => e.status === "upcoming").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl text-success">
                {mockEvents.filter((e) => e.status === "completed").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Attendees</CardDescription>
              <CardTitle className="text-2xl">
                {mockEvents.reduce((acc, e) => acc + e.actualAttendance, 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Events Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base line-clamp-1">
                      {event.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getEventTypeColor(event.type)}>
                        {event.type}
                      </Badge>
                      {getStatusBadge(event.status)}
                    </div>
                  </div>
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
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {event.actualAttendance} / {event.expectedAttendance} attendees
                </div>
                {event.status === "completed" && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Attendance Rate</span>
                      <span>
                        {Math.round(
                          (event.actualAttendance / event.expectedAttendance) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, (event.actualAttendance / event.expectedAttendance) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No events found</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          </Card>
        )}
      </div>
    </Suspense>
  );
}
