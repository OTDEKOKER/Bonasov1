"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Loader2, ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared/page-header"
import { OrganizationSelect } from "@/components/shared/organization-select"
import { useAllOrganizations, useUser, useUserPermissions } from "@/lib/hooks/use-api"
import { usersService } from "@/lib/api"
import type { UserRole } from "@/lib/types"
import { USER_ROLE_OPTIONS } from "@/lib/roles"
import { canManageUsers } from "@/lib/permissions"
import { useAuth } from "@/lib/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { UserPermissionsManager } from "@/components/users/user-permissions-manager"
import { getGroupCatalog, getUserGroupsForUser, setUserGroupsForUser } from "@/lib/user-groups"

type EditableUser = {
  email?: string
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  role?: UserRole
  organizationId?: string | number
  organization?: string | number
  is_active?: boolean
  isActive?: boolean
  permissions?: string[]
}

export default function UserEditPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const params = useParams()
  const userId = Number(params?.id)
  const { data: user, isLoading, error, mutate } = useUser(Number.isNaN(userId) ? null : userId)
  const { data: orgsData } = useAllOrganizations()
  const { data: availablePermissions = [], isLoading: isPermissionsLoading } = useUserPermissions()
  const organizations = orgsData?.results || []
  const canEditRestrictedFields = canManageUsers(currentUser)

  const [isSaving, setIsSaving] = useState(false)
  const [groupCatalog, setGroupCatalog] = useState<string[]>([])
  const [form, setForm] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    organizationId: string;
    isActive: boolean;
    permissions: string[];
    groups: string[];
  }>({
    email: "",
    firstName: "",
    lastName: "",
    role: "client",
    organizationId: "none",
    isActive: true,
    permissions: [] as string[],
    groups: [] as string[],
  })

  useEffect(() => {
    setGroupCatalog(getGroupCatalog())
  }, [])

  useEffect(() => {
    if (!user) return
    const source = user as EditableUser
    setForm({
      email: source.email || "",
      firstName: source.firstName || source.first_name || "",
      lastName: source.lastName || source.last_name || "",
      role: source.role || "client",
      organizationId: String(source.organizationId ?? source.organization ?? "all"),
      isActive: source.is_active ?? source.isActive ?? true,
      permissions: source.permissions || [],
      groups: getUserGroupsForUser(userId),
    })
  }, [user, userId])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const requestPayload: {
        email?: string
        first_name?: string
        last_name?: string
        role?: UserRole
        organization?: number
        is_active?: boolean
        permissions?: string[]
      } = {
        email: form.email || undefined,
        first_name: form.firstName || undefined,
        last_name: form.lastName || undefined,
      }
      if (canEditRestrictedFields) {
        requestPayload.role = form.role
        requestPayload.organization =
          form.organizationId !== "none" && form.organizationId !== "all"
            ? Number(form.organizationId)
            : undefined
        requestPayload.is_active = form.isActive
        requestPayload.permissions = form.permissions
      }

      await usersService.update(userId, requestPayload)
      setUserGroupsForUser(userId, form.groups)
      toast({ title: "User updated", description: "Changes saved successfully." })
      mutate()
      router.push(`/users/${userId}`)
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update user.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">User not found</p>
        <Button onClick={() => router.push("/users")}>Back to Users</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit User"
        description="Update user details and permissions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Users", href: "/users" },
          { label: "Edit" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/users/${userId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        {!canEditRestrictedFields ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Role, organization, status, and permissions can only be updated by admins.
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={form.role}
              onValueChange={(value) => setForm({ ...form, role: value as UserRole })}
              disabled={!canEditRestrictedFields}
            >
              <SelectTrigger disabled={!canEditRestrictedFields}>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {canEditRestrictedFields ? (
          <UserPermissionsManager
            availablePermissions={availablePermissions}
            value={form.permissions}
            onChange={(permissions) => setForm({ ...form, permissions })}
            isLoading={isPermissionsLoading}
          />
        ) : null}

        {canEditRestrictedFields ? (
          <div className="space-y-2">
            <Label>User Groups</Label>
            <div className="grid gap-2 sm:grid-cols-2 rounded-md border border-border p-3">
              {groupCatalog.map((group) => (
                <label key={group} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.groups.includes(group)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        groups: event.target.checked
                          ? [...prev.groups, group]
                          : prev.groups.filter((entry) => entry !== group),
                      }))
                    }
                  />
                  <span>{group}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>

        {canEditRestrictedFields ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Organization</Label>
              <OrganizationSelect
                organizations={organizations}
                value={form.organizationId}
                onChange={(value) => setForm({ ...form, organizationId: value })}
                placeholder="Select organization"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(value) => setForm({ ...form, isActive: value === "active" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
