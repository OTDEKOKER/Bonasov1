"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserSquare2, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { OrganizationSelect } from "@/components/shared/organization-select";
import { DataTable } from "@/components/shared/data-table";
import { useAllOrganizations, useRespondents } from "@/lib/hooks/use-api";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";


export default function RespondentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: respondentsData, isLoading, error, mutate } = useRespondents();
  const { data: organizationsData } = useAllOrganizations();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");

  const [formData, setFormData] = useState({
    unique_id: "",
    first_name: "",
    last_name: "",
    gender: "",
    date_of_birth: "",
    organization: "",
  });

  const respondents = respondentsData?.results || [];
  const organizations = organizationsData?.results || [];

  // Apply filters and search
  const filteredRespondents = respondents.filter((r) => {
    const matchesSearch =
      r.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.unique_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = genderFilter === "all" || r.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  const activeCount = respondents.filter((r) => r.is_active).length;
  const inactiveCount = respondents.filter((r) => !r.is_active).length;

  const columns = [
    {
      key: "name",
      label: "Respondent",
      sortable: true,
      render: (respondent: Respondent) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-secondary text-muted-foreground">
              {respondent.first_name?.[0] || ""}{respondent.last_name?.[0] || ""}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">
              {respondent.first_name} {respondent.last_name}
            </p>
            <p className="text-xs text-muted-foreground">ID: {respondent.unique_id}</p>
          </div>
        </div>
      ),
    },
    {
      key: "gender",
      label: "Gender",
      render: (respondent: Respondent) => (
        <Badge variant="secondary" className="capitalize">
          {respondent.gender || "â€”"}
        </Badge>
      ),
    },
    {
      key: "organization",
      label: "Organization",
      render: (respondent: Respondent) => (
        <span className="text-sm text-muted-foreground">
          {respondent.organization_name || "â€”"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (respondent: Respondent) => (
        <p className="text-sm text-muted-foreground">
          {new Date(respondent.created_at).toLocaleDateString()}
        </p>
      ),
    },
  ];

  const handleCreate = async () => {
    if (!formData.unique_id || !formData.first_name || !formData.last_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in unique ID, first name, and last name",
        variant: "destructive",
      });
      return;
    }

    if (!formData.gender) {
      toast({
        title: "Validation Error",
        description: "Please select gender",
        variant: "destructive",
      });
      return;
    }

    if (!formData.organization) {
      toast({
        title: "Validation Error",
        description: "Please select an organization",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await respondentsService.create({
        unique_id: formData.unique_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        gender: formData.gender as Respondent["gender"],
        date_of_birth: formData.date_of_birth || undefined,
        organization: Number(formData.organization),
      });
      toast({
        title: "Success",
        description: "Respondent registered successfully",
      });
      setIsCreateOpen(false);
      setFormData({
        unique_id: "",
        first_name: "",
        last_name: "",
        gender: "",
        date_of_birth: "",
        organization: "",
      });
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
          <div className="flex flex-wrap gap-2">
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Gender" />
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Inactive</p>
          <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Organizations</p>
          <p className="text-2xl font-bold text-chart-5">{organizations.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="bg-secondary">
          <TabsTrigger value="all">All Respondents</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
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

        <TabsContent value="active" className="mt-6">
          <DataTable
            data={filteredRespondents.filter((r) => r.is_active)}
            columns={columns}
            onRowClick={(r) => router.push(`/respondents/${r.id}`)}
            actions={actions}
          />
        </TabsContent>

        <TabsContent value="inactive" className="mt-6">
          <DataTable
            data={filteredRespondents.filter((r) => !r.is_active)}
            columns={columns}
            onRowClick={(r) => router.push(`/respondents/${r.id}`)}
            actions={actions}
          />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="uniqueId">Unique ID *</Label>
                <Input
                  id="uniqueId"
                  placeholder="e.g., RSP-0001"
                  value={formData.unique_id}
                  onChange={(e) =>
                    setFormData({ ...formData, unique_id: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                                <Label htmlFor="organization">Organization *</Label>
                <OrganizationSelect
                  organizations={organizations}
                  value={form.organization}
                  onChange={(value) => setForm({ ...form, organization: value })}
                  includeAll
                  allLabel="All organizations"
                  placeholder="Select organization"
                /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="Enter first name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Enter last name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({ ...formData, date_of_birth: e.target.value })
                  }
                />
              </div>
            </div>

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


