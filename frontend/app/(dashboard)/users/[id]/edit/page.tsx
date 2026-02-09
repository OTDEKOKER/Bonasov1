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
import { useAllOrganizations, useUser } from "@/lib/hooks/use-api"
import { usersService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function UserEditPage() {
  const router = useRouter()
  const { toast } = useToast()
  const params = useParams()
  const userId = Number(params?.id)
  const { data: user, isLoading, error, mutate } = useUser(Number.isNaN(userId) ? null : userId)
  const { data: orgsData } = useAllOrganizations()
  const organizations = orgsData?.results || []

  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "client",
    organizationId: "none",
    isActive: true,
  })

  useEffect(() => {
    if (!user) return
    setForm({
      email: (user as any)?.email || "",
      firstName: (user as any)?.firstName || (user as any)?.first_name || "",
      lastName: (user as any)?.lastName || (user as any)?.last_name || "",
      role: (user as any)?.role || "client",
      organizationId: String((user as any)?.organizationId ?? (user as any)?.organization ?? "all"),
      isActive: (user as any)?.is_active ?? (user as any)?.isActive ?? true,
    })
  }, [user])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await usersService.update(userId, {
        email: form.email || undefined,
        first_name: form.firstName || undefined,
        last_name: form.lastName || undefined,
        role: form.role as any,
        organization:
          form.organizationId !== "none" && form.organizationId !== "all"
            ? Number(form.organizationId)
            : undefined,
        is_active: form.isActive,
      })
      toast({ title: "User updated", description: "Changes saved successfully." })
      mutate()
      router.push(`/users/${userId}`)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update user.",
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="me_manager">M&E Manager</SelectItem>
                <SelectItem value="me_officer">M&E Officer</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
                        <Label>Organization</Label>
            <OrganizationSelect
              organizations={organizations}
              value={form.organization}
              onChange={(value) => setForm({ ...form, organization: value })}
              includeAll
              allLabel="All organizations"
              placeholder="Select organization"
            /></div>
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
      </div>
    </div>
  )
}


