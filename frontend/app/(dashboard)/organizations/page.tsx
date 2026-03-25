"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Building2, Loader2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { OrganizationSelect } from "@/components/shared/organization-select"
import { useAllOrganizations } from "@/lib/hooks/use-api"
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
import { useAuth } from "@/lib/contexts/auth-context"
import { canManageOrganizations } from "@/lib/permissions"
import {
  canOrganizationBeParentForType,
  getEffectiveOrganizationType,
  getOrganizationTypeColorClass,
  getOrganizationTypeLabel,
  isBonasoOrganizationName,
  isSeedCoordinatorOrganizationName,
  ORGANIZATION_TYPE_OPTIONS,
  organizationCanBeParent,
  organizationCanHaveParent,
} from "@/lib/organization-hierarchy"

const EMPTY_ORGANIZATIONS: never[] = []

const resolveParentId = (org: Organization & { parent?: string | number | null }) => {
  const rawParent = (org as { parentId?: string | number | null }).parentId ?? org.parent ?? null
  if (rawParent === null || rawParent === undefined) return ""
  const normalized = String(rawParent).trim().toLowerCase()
  if (
    normalized === "" ||
    normalized === "null" ||
    normalized === "none" ||
    normalized === "undefined" ||
    normalized === "0"
  ) {
    return ""
  }
  return String(rawParent)
}

export default function OrganizationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { data, isLoading, error, mutate } = useAllOrganizations()
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

  const organizations = data?.results || EMPTY_ORGANIZATIONS
  const canManageOrgRecords = canManageOrganizations(user)
  const bonasoOrganization = useMemo(
    () => organizations.find((org) => isBonasoOrganizationName(org.name)),
    [organizations],
  )
  const organizationsByParentId = useMemo(() => {
    const map = new Map<string, Organization[]>()
    organizations.forEach((org) => {
      const actualParentId = resolveParentId(org as Organization & { parent?: string | number | null })
      const parentId =
        bonasoOrganization &&
        isSeedCoordinatorOrganizationName(org.name) &&
        String(org.id) !== String(bonasoOrganization.id)
          ? String(bonasoOrganization.id)
          : actualParentId
      const key = parentId || "__root__"
      const existing = map.get(key) || []
      existing.push(org)
      map.set(key, existing)
    })
    map.forEach((items) => items.sort((left, right) => (left.name || "").localeCompare(right.name || "")))
    return map
  }, [bonasoOrganization, organizations])
  const rootOrganizations = useMemo(() => organizationsByParentId.get("__root__") || EMPTY_ORGANIZATIONS, [organizationsByParentId])
  const parentOptions = useMemo(
    () =>
      organizations
        .filter((org) => organizationCanBeParent(getEffectiveOrganizationType(org)))
        .filter((org) => canOrganizationBeParentForType(getEffectiveOrganizationType(org), formData.type))
        .sort((left, right) => (left.name || "").localeCompare(right.name || "")),
    [formData.type, organizations],
  )

  useEffect(() => {
    if (!formData.parentId) return
    if (parentOptions.some((org) => String(org.id) === formData.parentId)) return
    setFormData((current) => ({ ...current, parentId: "" }))
  }, [formData.parentId, parentOptions])

  const matchesSearch = useCallback((org: Organization): boolean => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    if ((org.name || "").toLowerCase().includes(query)) return true
    const children = organizationsByParentId.get(String(org.id)) || EMPTY_ORGANIZATIONS
    return children.some((child) => matchesSearch(child))
  }, [organizationsByParentId, searchQuery])

  const visibleRootOrganizations = useMemo(
    () => rootOrganizations.filter((org) => matchesSearch(org)),
    [matchesSearch, rootOrganizations],
  )
  const protectedOrganizationIds = useMemo(() => {
    const ids = new Set<string>()

    organizations.forEach((org) => {
      if (isBonasoOrganizationName(org.name)) {
        ids.add(String(org.id))
      }
      const childOrganizations = organizationsByParentId.get(String(org.id)) || EMPTY_ORGANIZATIONS
      if (childOrganizations.length > 0) {
        ids.add(String(org.id))
      }
    })

    return ids
  }, [organizations, organizationsByParentId])

  const handleCreate = async () => {
    if (!canManageOrgRecords) {
      toast({
        title: "Read-only access",
        description: "Only platform admins can create organizations.",
        variant: "destructive",
      })
      return
    }

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
    if (!canManageOrgRecords) {
      toast({
        title: "Read-only access",
        description: "Only platform admins can delete organizations.",
        variant: "destructive",
      })
      return
    }

    if (protectedOrganizationIds.has(String(org.id))) {
      toast({
        title: "Delete blocked",
        description: "This organization is protected because it is BONASO or it still has child organizations.",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`Are you sure you want to delete "${org.name}"?`)) return

    try {
      await organizationsService.delete(Number(org.id))
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

  const renderOrganizationNode = (org: Organization, level = 0) => {
    const children = (organizationsByParentId.get(String(org.id)) || []).filter((child) => matchesSearch(child))
    const displayType = getEffectiveOrganizationType(org)
    const isBonaso = isBonasoOrganizationName(org.name)
    const canDelete = canManageOrgRecords && !protectedOrganizationIds.has(String(org.id))

    return (
      <Collapsible
        key={org.id}
        defaultOpen={searchQuery.trim().length > 0}
        className={`rounded-lg border ${isBonaso ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">{org.name}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className={getOrganizationTypeColorClass(displayType)}>
                  {getOrganizationTypeLabel(displayType)}
                </Badge>
                {isBonaso ? <Badge variant="outline">Seeded BONASO admin view</Badge> : null}
                <span>Level {level + 1}</span>
                <span>{children.length} direct child{children.length === 1 ? "" : "ren"}</span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => router.push(`/organizations/${org.id}`)}>
              View
            </Button>
            {canManageOrgRecords ? (
              <Button variant="outline" size="sm" onClick={() => router.push(`/organizations/${org.id}/edit`)}>
                Edit
              </Button>
            ) : null}
            {canManageOrgRecords ? (
              <Button variant="outline" size="sm" onClick={() => handleDelete(org)} disabled={!canDelete}>
                Delete
              </Button>
            ) : null}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                Hierarchy
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="border-t border-border bg-muted/20">
          <div className="space-y-3 p-4">
            {children.length === 0 ? (
              <p className="text-sm text-muted-foreground">No child organizations.</p>
            ) : (
              children.map((child) => (
                <div key={child.id} className="pl-4 sm:pl-6">
                  {renderOrganizationNode(child, level + 1)}
                </div>
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
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
        description="Manage the hierarchy from funders down to sub-grantees"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Organizations" },
        ]}
        actions={
          canManageOrgRecords ? (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Organization
            </Button>
          ) : null
        }
      />

      {!canManageOrgRecords ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Read-only organization access</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can review the organization hierarchy, but only platform admins can create, edit, or delete organizations.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-sm"
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="text-sm font-medium text-foreground">Hierarchy order</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Funder {"->"} Project Senior Coordinator / Admin {"->"} Coordinator {"->"} Sub-grantee
        </p>
      </div>

      <div className="space-y-3">
        {visibleRootOrganizations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No organizations found.
          </div>
        ) : (
          visibleRootOrganizations.map((org) => renderOrganizationNode(org))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={canManageOrgRecords && isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                  {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Organization (Optional)</Label>
              <OrganizationSelect
                organizations={parentOptions}
                value={formData.parentId}
                onChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}
                includeNone
                noneLabel="No parent"
                placeholder="Select parent"
                disabled={!organizationCanHaveParent(formData.type)}
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
