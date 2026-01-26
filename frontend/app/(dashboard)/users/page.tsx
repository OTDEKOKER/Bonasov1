"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Shield, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { useUsers, useOrganizations } from "@/lib/hooks/use-api"
import { usersService } from "@/lib/api"
import type { User } from "@/lib/types"
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

const roleColors: Record<string, string> = {
  admin: "bg-chart-5/10 text-chart-5",
  me_officer: "bg-chart-1/10 text-chart-1",
  me_manager: "bg-chart-2/10 text-chart-2",
  client: "bg-chart-4/10 text-chart-4",
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  me_officer: "M&E Officer",
  me_manager: "M&E Manager",
  client: "Client",
}

export default function UsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: usersData, isLoading, error, mutate } = useUsers()
  const { data: orgsData } = useOrganizations()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    organizationId: "",
  })

  const users = usersData?.results || []
  const organizations = orgsData?.results || []

  const columns = [
    {
      key: "name",
      label: "User",
      sortable: true,
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {user.firstName[0]}{user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (user: User) => (
        <Badge variant="secondary" className={roleColors[user.role] || ""}>
          <Shield className="mr-1 h-3 w-3" />
          {roleLabels[user.role] || user.role}
        </Badge>
      ),
    },
    {
      key: "organizationId",
      label: "Organization",
      render: (user: User) => {
        const org = organizations.find(o => o.id === user.organizationId)
        return (
          <span className="text-sm text-muted-foreground">
            {org?.name || "—"}
          </span>
        )
      },
    },
    {
      key: "lastLogin",
      label: "Last Active",
      sortable: true,
      render: (user: User) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          {user.lastLogin
            ? new Date(user.lastLogin).toLocaleDateString()
            : "Never"}
        </div>
      ),
    },
  ]

  const handleCreate = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await usersService.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role as User["role"],
        organizationId: formData.organizationId || undefined,
      })
      toast({
        title: "Success",
        description: "User created successfully",
      })
      setIsCreateOpen(false)
      setFormData({ firstName: "", lastName: "", email: "", role: "", organizationId: "" })
      mutate()
    } catch {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (user: User) => {
    try {
      await usersService.resetPassword(user.id)
      toast({
        title: "Success",
        description: "Password reset email sent",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to send password reset",
        variant: "destructive",
      })
    }
  }

  const handleDeactivate = async (user: User) => {
    if (!confirm(`Are you sure you want to deactivate ${user.firstName} ${user.lastName}?`)) return

    try {
      await usersService.deactivate(user.id)
      toast({
        title: "Success",
        description: "User deactivated successfully",
      })
      mutate()
    } catch {
      toast({
        title: "Error",
        description: "Failed to deactivate user",
        variant: "destructive",
      })
    }
  }

  const actions = (user: User) => [
    { label: "View Profile", onClick: () => router.push(`/users/${user.id}`) },
    { label: "Edit", onClick: () => router.push(`/users/${user.id}/edit`) },
    { label: "Reset Password", onClick: () => handleResetPassword(user) },
    { label: "Deactivate", onClick: () => handleDeactivate(user), destructive: true },
  ]

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
        <p className="text-muted-foreground">Failed to load users</p>
        <Button onClick={() => mutate()}>Retry</Button>
      </div>
    )
  }

  const adminCount = users.filter(u => u.role === 'admin').length
  const meStaffCount = users.filter(u => u.role === 'me_officer' || u.role === 'me_manager').length
  const clientCount = users.filter(u => u.role === 'client').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage user accounts and permissions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Users" },
        ]}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        }
      />

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-2xl font-bold text-foreground">{users.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="text-2xl font-bold text-foreground">{adminCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">M&E Staff</p>
          <p className="text-2xl font-bold text-foreground">{meStaffCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Clients</p>
          <p className="text-2xl font-bold text-foreground">{clientCount}</p>
        </div>
      </div>

      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="Search users..."
        searchKey="email"
        onRowClick={(user) => router.push(`/users/${user.id}`)}
        actions={actions}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a new user account
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleCreate()
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.org"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
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
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Select
                value={formData.organizationId}
                onValueChange={(value) => setFormData({ ...formData, organizationId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
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
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
