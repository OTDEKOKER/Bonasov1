"use client"

import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { useUser, useAllOrganizations } from "@/lib/hooks/use-api"
import { getUserGroupsForUser } from "@/lib/user-groups"

type UserView = {
  organizationId?: string | number
  organization?: string | number
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  role?: string
  email?: string
  createdAt?: string
  date_joined?: string
  lastLogin?: string
  last_activity?: string
}

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = Number(params?.id)
  const { data: user, isLoading, error } = useUser(Number.isNaN(userId) ? null : userId)
  const { data: orgsData } = useAllOrganizations()
  const organizations = orgsData?.results || []
  const userView = (user ?? {}) as UserView

  const orgId =
    userView.organizationId ??
    userView.organization ??
    ""
  const orgName = organizations.find((org) => String(org.id) === String(orgId))?.name
  const createdAtValue = userView.createdAt || userView.date_joined
  const lastActiveValue = userView.lastLogin || userView.last_activity
  const groups = user ? getUserGroupsForUser((user as { id: string | number }).id) : []

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
        title="User Profile"
        description="User details and account information"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Users", href: "/users" },
          { label: "Profile" },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push("/users")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="text-lg font-semibold">
              {userView.firstName || userView.first_name || ""}{" "}
              {userView.lastName || userView.last_name || ""}
            </p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {userView.role?.replace("_", " ") || "user"}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm">{userView.email || "â€”"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Organization</p>
            <p className="text-sm">{orgName || "â€”"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="text-sm">
              {createdAtValue ? new Date(createdAtValue).toLocaleDateString() : "â€”"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Active</p>
            <p className="text-sm">
              {lastActiveValue
                ? new Date(lastActiveValue).toLocaleDateString()
                : "Never"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Groups</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {groups.length === 0 ? (
              <span className="text-sm">—</span>
            ) : (
              groups.map((group) => (
                <Badge key={group} variant="outline" className="text-xs">
                  {group}
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

