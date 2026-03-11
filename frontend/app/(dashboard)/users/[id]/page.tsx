"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Mail, Building2, CalendarDays, Clock, Shield } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"

import { useAllOrganizations, useUser } from "@/lib/hooks/use-api"
import { getUserGroupsForUser } from "@/lib/user-groups"

type RawUser = {
  id?: string | number
  organizationId?: string | number
  organization_id?: string | number
  organization?: string | number
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  username?: string
  role?: string
  email?: string
  createdAt?: string
  created_at?: string
  date_joined?: string
  lastLogin?: string
  last_login?: string
  last_activity?: string
  isActive?: boolean
  is_active?: boolean
}

const formatDate = (value?: string, fallback = "—") => {
  if (!value) return fallback

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const formatDateTime = (value?: string, fallback = "Never") => {
  if (!value) return fallback

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatRole = (value?: string) => {
  if (!value) return "User"
  return value
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()

  const rawId = params?.id
  const userId = Number(Array.isArray(rawId) ? rawId[0] : rawId)
  const isValidId = Number.isFinite(userId)

  const { data: user, isLoading, error } = useUser(isValidId ? userId : null)
  const { data: orgsData } = useAllOrganizations()

  const organizations = orgsData?.results || []

  const normalizedUser = useMemo(() => {
    const source = (user ?? {}) as RawUser

    const firstName = source.firstName || source.first_name || ""
    const lastName = source.lastName || source.last_name || ""
    const fullName = `${firstName} ${lastName}`.trim()

    const organizationId =
      source.organizationId ?? source.organization_id ?? source.organization ?? ""

    return {
      id: source.id,
      firstName,
      lastName,
      fullName: fullName || source.username || "Unnamed User",
      username: source.username || "—",
      email: source.email || "—",
      role: source.role || "user",
      organizationId,
      createdAt: source.createdAt || source.created_at || source.date_joined,
      lastActive: source.lastLogin || source.last_login || source.last_activity,
      isActive: source.isActive ?? source.is_active ?? true,
    }
  }, [user])

  const organizationName = useMemo(() => {
    return (
      organizations.find((org) => String(org.id) === String(normalizedUser.organizationId))?.name || "—"
    )
  }, [organizations, normalizedUser.organizationId])

  const groups = useMemo(() => {
    if (!normalizedUser.id) return []
    return getUserGroupsForUser(normalizedUser.id)
  }, [normalizedUser.id])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !user || !isValidId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">User not found</p>
        <Button onClick={() => router.push("/users")}>Back to Users</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
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

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{normalizedUser.fullName}</CardTitle>
              <CardDescription>
                {normalizedUser.username !== "—" ? `@${normalizedUser.username}` : "User account profile"}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={normalizedUser.isActive ? "default" : "secondary"}>
                {normalizedUser.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">{formatRole(normalizedUser.role)}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <p className="text-sm">Email</p>
              </div>
              <p className="break-all text-sm font-medium text-foreground">{normalizedUser.email}</p>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <p className="text-sm">Organization</p>
              </div>
              <p className="text-sm font-medium text-foreground">{organizationName}</p>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <p className="text-sm">Created</p>
              </div>
              <p className="text-sm font-medium text-foreground">{formatDate(normalizedUser.createdAt)}</p>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <p className="text-sm">Last Active</p>
              </div>
              <p className="text-sm font-medium text-foreground">
                {formatDateTime(normalizedUser.lastActive)}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Account Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">First Name</p>
                  <p className="text-sm font-medium">{normalizedUser.firstName || "—"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Last Name</p>
                  <p className="text-sm font-medium">{normalizedUser.lastName || "—"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="text-sm font-medium">{normalizedUser.username}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="text-sm font-medium">{formatRole(normalizedUser.role)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Groups</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No groups assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {groups.map((group) => (
                      <Badge key={group} variant="outline" className="text-xs">
                        {group}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}