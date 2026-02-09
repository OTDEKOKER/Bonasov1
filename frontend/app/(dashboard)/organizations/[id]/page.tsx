"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2, Mail, Phone, MapPin, Pencil, Loader2, Users, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { useAllOrganizations, useIndicators, useOrganization, useUsers } from "@/lib/hooks/use-api"

const orgTypeColors: Record<string, string> = {
  headquarters: "bg-chart-1/10 text-chart-1",
  regional: "bg-chart-2/10 text-chart-2",
  district: "bg-chart-3/10 text-chart-3",
  partner: "bg-chart-4/10 text-chart-4",
}

const orgTypeLabels: Record<string, string> = {
  headquarters: "Headquarters",
  regional: "Regional Office",
  district: "District Office",
  partner: "Partner Organization",
}

export default function OrganizationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params?.id)

  const { data: org, isLoading, error } = useOrganization(Number.isFinite(id) ? id : null)
  const { data: orgsData } = useAllOrganizations()
  const organizations = orgsData || []
  const { data: indicatorsData } = useIndicators(
    Number.isFinite(id) ? { organizations: String(id), page_size: "200" } : undefined
  )
  const { data: usersData } = useUsers(
    Number.isFinite(id) ? { organization: String(id), is_active: "true", page_size: "200" } : undefined
  )
  const indicators = indicatorsData?.results || []
  const activeUsers = usersData?.results || []

  const parentName = useMemo(() => {
    if (!org?.parentId) return null
    return organizations.find((item) => item.id === org.parentId)?.name || null
  }, [org?.parentId, organizations])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !org) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Organization not found</p>
        <Button onClick={() => router.push("/organizations")}>Back to Organizations</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description="Organization details"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Organizations", href: "/organizations" },
          { label: org.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/organizations")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => router.push(`/organizations/${org.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Profile
            </CardTitle>
            <CardDescription>Core organization details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant="secondary" className={orgTypeColors[org.type] || ""}>
                {orgTypeLabels[org.type] || org.type}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Code</p>
              <p className="text-sm font-medium">{org.code || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Parent Organization</p>
              <p className="text-sm font-medium">{parentName || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm font-medium">
                {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>Primary contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{org.contactEmail || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{org.contactPhone || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{org.address || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" /> Indicators
            </CardTitle>
            <CardDescription>{indicators.length} linked indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {indicators.slice(0, 8).map((indicator) => (
              <div key={indicator.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{indicator.name}</span>
                <span className="text-muted-foreground">{indicator.code}</span>
              </div>
            ))}
            {!indicators.length && (
              <p className="text-sm text-muted-foreground">No indicators assigned.</p>
            )}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/indicators?organization=${org.id}`)}
              >
                View All Indicators
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Active Users
            </CardTitle>
            <CardDescription>{activeUsers.length} active users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeUsers.slice(0, 8).map((user) => (
              <div key={user.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {user.first_name} {user.last_name}
                </span>
                <span className="text-muted-foreground">{user.role}</span>
              </div>
            ))}
            {!activeUsers.length && (
              <p className="text-sm text-muted-foreground">No active users.</p>
            )}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/users?organization=${org.id}`)}
              >
                View All Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
