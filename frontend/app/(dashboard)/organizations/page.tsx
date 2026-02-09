"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Building2, Loader2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { OrganizationSelect } from "@/components/shared/organization-select"
import { useOrganizations, useOrganizationTree } from "@/lib/hooks/use-api"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"

const orgTypeColors: Record<string, string> = {
  headquarters: "bg-chart-1/10 text-chart-1",
  regional: "bg-chart-2/10 text-chart-2",
  district: "bg-chart-3/10 text-chart-3",
  partner: "bg-chart-4/10 text-chart-4",
  ngo: "bg-chart-5/10 text-chart-5",
}

const orgTypeLabels: Record<string, string> = {
  headquarters: "Headquarters",
  regional: "Regional Office",
  district: "District Office",
  partner: "Partner Organization",
  ngo: "NGO",
}

export default function OrganizationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data, isLoading, error, mutate } = useOrganizations({ page_size: "200" })
  const { data: treeData } = useOrganizationTree()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    parentId: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    description: "",
    isActive: true,
  })

  const organizations = data?.results || []
  const tree = (treeData as any[]) || []
  console.log("[orgs] loaded", {
    listCount: organizations.length,
    treeCount: tree.length,
  })

  const filteredParents = (tree.length ? tree : organizations.filter((org) => !org.parentId)).filter((parent) => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    if ((parent.name || "").toLowerCase().includes(query)) return true
    const children = (parent as any).children || organizations.filter((org) => org.parentId === parent.id)
    return children.some((child: any) => (child.name || "").toLowerCase().includes(query))
  })

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
        address: formData.address || undefined,
        description: formData.description || undefined,
        is_active: formData.isActive,
      })
      toast({
        title: "Success",
        description: "Organization created successfully",
      })
      setIsCreateOpen(false)
      setFormData({
        name: "",
        type: "",
        parentId: "",
        contactEmail: "",
        contactPhone: "",
        address: "",
        description: "",
        isActive: true,
      })
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-sm"
        />
      </div>

      <div className="space-y-3">
        {filteredParents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No organizations found.
          </div>
        ) : (
          filteredParents.map((org: any) => {
            const rawChildren = org.children || organizations.filter((child) => child.parentId === org.id)
            const children = (rawChildren || []).slice().sort((a: any, b: any) =>
              (a.name || "").localeCompare(b.name || ""),
            )
            return (
              <Collapsible key={org.id} defaultOpen={false} className="rounded-lg border border-border">
                <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{org.name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {org.type && (
                          <Badge variant="secondary" className={orgTypeColors[org.type] || ""}>
                            {orgTypeLabels[org.type] || org.type}
                          </Badge>
                        )}
                        <span>{children.length} sub-grantees</span>
                      </div>
                    </div>
                  </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/organizations/${org.id}`)}>
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/organizations/${org.id}/edit`)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(org)}>
                    Delete
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      Sub-grantees
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                </div>

                <CollapsibleContent className="border-t border-border bg-muted/20">
                  <div className="p-4 space-y-2">
                    {children.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sub-grantees.</p>
                    ) : (
                      children.map((child: any) => (
                        <div key={child.id} className="flex flex-col gap-2 rounded-md bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{child.name}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/organizations/${child.id}`)}>
                              View
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/organizations/${child.id}/edit`)}>
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(child)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg">
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
                  <SelectItem value="headquarters">Headquarters</SelectItem>
                  <SelectItem value="regional">Regional Office</SelectItem>
                  <SelectItem value="district">District Office</SelectItem>
                  <SelectItem value="partner">Partner Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                            <Label htmlFor="parent">Parent Organization (Optional)</Label>
              <OrganizationSelect
                organizations={organizations}
                value={formData.parentId}
                onChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}
                includeNone
                noneLabel="No parent"
                placeholder="Select parent"
              /></div>
            <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Enable or disable this organization</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
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


