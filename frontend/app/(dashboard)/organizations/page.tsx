"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Building2, Mail, Phone, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { useOrganizations } from "@/lib/hooks/use-api"
import { organizationsService } from "@/lib/api"
import type { Organization } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

const orgTypeColors: Record<string, string> = {
  ngo: "bg-chart-1/10 text-chart-1",
  government: "bg-chart-2/10 text-chart-2",
  partner: "bg-chart-3/10 text-chart-3",
  funder: "bg-chart-4/10 text-chart-4",
}

export default function OrganizationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data, isLoading, error, mutate } = useOrganizations()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    parentId: "",
    contactEmail: "",
    contactPhone: "",
  })

  const organizations = data?.results || []

  const columns = [
    {
      key: "name",
      label: "Organization",
      sortable: true,
      render: (org: Organization) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{org.name}</p>
            {org.parentId && (
              <p className="text-xs text-muted-foreground">
                Sub-org of {organizations.find(o => o.id === org.parentId)?.name}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (org: Organization) => (
        <Badge variant="secondary" className={orgTypeColors[org.type] || ""}>
          {org.type.charAt(0).toUpperCase() + org.type.slice(1)}
        </Badge>
      ),
    },
    {
      key: "contactEmail",
      label: "Contact",
      render: (org: Organization) => (
        <div className="space-y-1">
          {org.contactEmail && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              {org.contactEmail}
            </div>
          )}
          {org.contactPhone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {org.contactPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (org: Organization) => (
        <span className="text-sm text-muted-foreground">
          {new Date(org.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ]

  const handleCreate = async () => {
    if (!formData.name || !formData.type) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await organizationsService.create({
        name: formData.name,
        type: formData.type as Organization["type"],
        parentId: formData.parentId || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
      })
      toast({
        title: "Success",
        description: "Organization created successfully",
      })
      setIsCreateOpen(false)
      setFormData({ name: "", type: "", parentId: "", contactEmail: "", contactPhone: "" })
      mutate()
    } catch {
      toast({
        title: "Error",
        description: "Failed to create organization",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (org: Organization) => {
    if (!confirm(`Are you sure you want to delete "${org.name}"?`)) return

    try {
      await organizationsService.delete(org.id)
      toast({
        title: "Success",
        description: "Organization deleted successfully",
      })
      mutate()
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete organization",
        variant: "destructive",
      })
    }
  }

  const actions = (org: Organization) => [
    { label: "View Details", onClick: () => router.push(`/organizations/${org.id}`) },
    { label: "Edit", onClick: () => router.push(`/organizations/${org.id}/edit`) },
    { label: "Delete", onClick: () => handleDelete(org), destructive: true },
  ]

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    console.log("[v0] Organizations error:", error)
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Failed to load organizations</p>
        <p className="text-sm text-destructive">
          {error?.message || "Could not connect to the server"}
        </p>
        <p className="text-xs text-muted-foreground">
          Check that your Django backend is running and NEXT_PUBLIC_API_URL is set correctly
        </p>
        <Button onClick={() => mutate()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage organizations and their hierarchies"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Organizations" },
        ]}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Organization
          </Button>
        }
      />

      <DataTable
        data={organizations}
        columns={columns}
        searchPlaceholder="Search organizations..."
        searchKey="name"
        onRowClick={(org) => router.push(`/organizations/${org.id}`)}
        actions={actions}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>
              Create a new organization in the system
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleCreate()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                placeholder="Enter organization name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ngo">NGO</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="funder">Funder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Organization (Optional)</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData({ ...formData, parentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="info@org.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  placeholder="+267 123 4567"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
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
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Organization
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
