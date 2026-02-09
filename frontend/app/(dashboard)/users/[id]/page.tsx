"use client"

import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { useUser, useAllOrganizations } from "@/lib/hooks/use-api"

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = Number(params?.id)
  const { data: user, isLoading, error } = useUser(Number.isNaN(userId) ? null : userId)
  const { data: orgsData } = useAllOrganizations()
  const organizations = orgsData?.results || []

  const orgId =
    (user as any)?.organizationId ??
    (user as any)?.organization ??
    ""
  const orgName = organizations.find((org) => String(org.id) === String(orgId))?.name

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
              {(user as any)?.firstName || (user as any)?.first_name || ""}{" "}
              {(user as any)?.lastName || (user as any)?.last_name || ""}
            </p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {(user as any)?.role?.replace("_", " ") || "user"}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm">{(user as any)?.email || "â€”"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Organization</p>
            <p className="text-sm">{orgName || "â€”"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="text-sm">
              {new Date((user as any)?.createdAt || (user as any)?.date_joined || Date.now()).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Active</p>
            <p className="text-sm">
              {(user as any)?.lastLogin || (user as any)?.last_activity
                ? new Date((user as any)?.lastLogin || (user as any)?.last_activity).toLocaleDateString()
                : "Never"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

