"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserSquare2, User, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useRespondents, useUsers } from "@/lib/hooks/use-api";
import { respondentsService } from "@/lib/api";
import type { Respondent } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const hivStatusColors: Record<string, string> = {
  positive: "bg-chart-5/10 text-chart-5",
  negative: "bg-chart-2/10 text-chart-2",
  unknown: "bg-muted text-muted-foreground",
};

export default function RespondentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: respondentsData, isLoading, error, mutate } = useRespondents();
  const { data: usersData } = useUsers();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sexFilter, setSexFilter] = useState("all");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    idNumber: "",
    dateOfBirth: "",
    sex: "",
    ageRange: "",
    district: "",
  });

  const respondents = respondentsData?.results || [];
  const users = usersData?.results || [];

  // Apply filters and search
  const filteredRespondents = respondents.filter((r) => {
    const matchesSearch =
      r.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.idNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSex = sexFilter === "all" || r.sex === sexFilter;
    return matchesSearch && matchesSex;
  });

  const identifiedCount = respondents.filter((r) => !r.isAnonymous).length;
  const anonymousCount = respondents.filter((r) => r.isAnonymous).length;
  const hivPositiveCount = respondents.filter((r) => r.hivStatus === "positive").length;

  const columns = [
    {
      key: "name",
      label: "Respondent",
      sortable: true,
      render: (respondent: Respondent) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-secondary text-muted-foreground">
              {respondent.isAnonymous ? (
                <User className="h-4 w-4" />
              ) : (
                `${respondent.firstName?.[0] || ""}${respondent.lastName?.[0] || ""}`
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            {respondent.isAnonymous ? (
              <>
                <p className="font-medium text-foreground">Anonymous</p>
                <p className="text-xs text-muted-foreground">ID: {respondent.id}</p>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">
                  {respondent.firstName} {respondent.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{respondent.idNumber}</p>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "demographics",
      label: "Demographics",
      render: (respondent: Respondent) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="capitalize">{respondent.sex}</span>
            {respondent.ageRange && (
              <>
                <span className="text-muted-foreground">|</span>
                <span>{respondent.ageRange}</span>
              </>
            )}
          </div>
          {respondent.district && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {respondent.district}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "hivStatus",
      label: "HIV Status",
      render: (respondent: Respondent) => (
        <Badge variant="secondary" className={hivStatusColors[respondent.hivStatus || "unknown"]}>
          {respondent.hivStatus
            ? respondent.hivStatus.charAt(0).toUpperCase() + respondent.hivStatus.slice(1)
            : "Unknown"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (respondent: Respondent) => {
        const creator = users.find((u) => u.id === respondent.createdById);
        return (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {new Date(respondent.createdAt).toLocaleDateString()}
            </p>
            {creator && (
              <p className="text-xs text-muted-foreground">
                by {creator.firstName} {creator.lastName}
              </p>
            )}
          </div>
        );
      },
    },
  ];

  const handleCreate = async () => {
    if (!isAnonymous && (!formData.firstName || !formData.lastName)) {
      toast({
        title: "Validation Error",
        description: "Please fill in first and last name",
        variant: "destructive",
      });
      return;
    }

    if (!formData.sex) {
      toast({
        title: "Validation Error",
        description: "Please select sex",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await respondentsService.create({
        isAnonymous,
        firstName: isAnonymous ? undefined : formData.firstName,
        lastName: isAnonymous ? undefined : formData.lastName,
        idNumber: isAnonymous ? undefined : formData.idNumber || undefined,
        dateOfBirth: isAnonymous ? undefined : formData.dateOfBirth || undefined,
        sex: formData.sex as Respondent["sex"],
        ageRange: formData.ageRange || undefined,
        district: formData.district || undefined,
      });
      toast({
        title: "Success",
        description: "Respondent registered successfully",
      });
      setIsCreateOpen(false);
      setFormData({
        firstName: "",
        lastName: "",
        idNumber: "",
        dateOfBirth: "",
        sex: "",
        ageRange: "",
        district: "",
      });
      setIsAnonymous(false);
      mutate(); // refresh data
    } catch {
      toast({
        title: "Error",
        description: "Failed to register respondent",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const actions = (respondent: Respondent) => [
    { label: "View Profile", onClick: () => router.push(`/respondents/${respondent.id}`) },
    {
      label: "New Interaction",
      onClick: () => router.push(`/respondents/interactions?respondentId=${respondent.id}`),
    },
    { label: "View History", onClick: () => router.push(`/respondents/${respondent.id}/history`) },
    { label: "Flag Record", onClick: () => router.push(`/flags?respondentId=${respondent.id}`) },
  ];

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
        <p className="text-muted-foreground">Failed to load respondents</p>
        <Button onClick={() => mutate()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Respondents"
        description="Manage respondent profiles and track interactions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Respondents" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/respondents/interactions">View Interactions</a>
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Respondent
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select value={sexFilter} onValueChange={setSexFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Sex" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <UserSquare2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{respondents.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Identified</p>
          <p className="text-2xl font-bold text-foreground">{identifiedCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Anonymous</p>
          <p className="text-2xl font-bold text-muted-foreground">{anonymousCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">HIV Positive</p>
          <p className="text-2xl font-bold text-chart-5">{hivPositiveCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="bg-secondary">
          <TabsTrigger value="all">All Respondents</TabsTrigger>
          <TabsTrigger value="identified">Identified</TabsTrigger>
          <TabsTrigger value="anonymous">Anonymous</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <DataTable
            data={filteredRespondents}
            columns={columns}
            searchPlaceholder="Search by name or ID..."
            onRowClick={(r) => router.push(`/respondents/${r.id}`)}
            actions={actions}
          />
        </TabsContent>

        <TabsContent value="identified" className="mt-6">
          <DataTable
            data={filteredRespondents.filter((r) => !r.isAnonymous)}
            columns={columns}
            onRowClick={(r) => router.push(`/respondents/${r.id}`)}
            actions={actions}
          />
        </TabsContent>

        <TabsContent value="anonymous" className="mt-6">
          <DataTable
            data={filteredRespondents.filter((r) => r.isAnonymous)}
            columns={columns}
            onRowClick={(r) => router.push(`/respondents/${r.id}`)}
            actions={actions}
          />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Respondent</DialogTitle>
            <DialogDescription>Add a new respondent to the system</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            {/* Anonymous toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label>Anonymous Registration</Label>
                <p className="text-xs text-muted-foreground">
                  Do not collect personal identifying information
                </p>
              </div>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>

            {!isAnonymous && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="idNumber">ID Number</Label>
                    <Input
                      id="idNumber"
                      placeholder="e.g., BW1234567"
                      value={formData.idNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, idNumber: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfBirth: e.target.value })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Register Respondent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
