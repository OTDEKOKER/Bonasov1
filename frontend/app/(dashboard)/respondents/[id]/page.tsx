"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Mail, MapPin, Phone, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/shared/page-header"
import { useRespondentProfile } from "@/lib/hooks/use-api"

export default function RespondentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params?.id)

  const { data: respondent, isLoading, error } = useRespondentProfile(
    Number.isFinite(id) ? id : null,
  )

  const demographicsEntries = useMemo(() => {
    if (!respondent?.demographics) return []
    return Object.entries(respondent.demographics)
  }, [respondent?.demographics])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !respondent) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Respondent not found</p>
        <Button onClick={() => router.push("/respondents")}>
          Back to Respondents
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={respondent.full_name || `${respondent.first_name} ${respondent.last_name}`}
        description={`Respondent ID: ${respondent.unique_id}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Respondents", href: "/respondents" },
          { label: respondent.full_name || respondent.unique_id },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push("/respondents")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Profile
            </CardTitle>
            <CardDescription>Basic respondent information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{respondent.gender || "Unknown"}</Badge>
              <Badge variant="secondary">
                {respondent.is_active ? "Active" : "Inactive"}
              </Badge>
              {respondent.organization_name && (
                <Badge variant="outline">{respondent.organization_name}</Badge>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="text-sm font-medium">
                  {respondent.date_of_birth
                    ? new Date(respondent.date_of_birth).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Interaction</p>
                <p className="text-sm font-medium">
                  {respondent.last_interaction
                    ? new Date(respondent.last_interaction).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Interactions</p>
                <p className="text-sm font-medium">{respondent.interactions_count ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm font-medium">
                  {new Date(respondent.created_at).toLocaleDateString()}
                </p>
              </div>
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
              <span>{respondent.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{respondent.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{respondent.address || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demographics</CardTitle>
          <CardDescription>Additional respondent information</CardDescription>
        </CardHeader>
        <CardContent>
          {demographicsEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No demographic data available.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {demographicsEntries.map(([key, value]) => (
                <div key={key} className="rounded-lg border border-border p-3">
                  <p className="text-xs uppercase text-muted-foreground">{key}</p>
                  <p className="text-sm font-medium">
                    {typeof value === "string" || typeof value === "number"
                      ? String(value)
                      : JSON.stringify(value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interactions</CardTitle>
          <CardDescription>Recent engagements with this respondent</CardDescription>
        </CardHeader>
        <CardContent>
          {respondent.interactions?.length ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {respondent.interactions.map((interaction) => (
                    <TableRow key={interaction.id}>
                      <TableCell className="text-sm">
                        {interaction.date
                          ? new Date(interaction.date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {interaction.assessment_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {interaction.project_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {interaction.responses_count ?? interaction.responses?.length ?? 0}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {interaction.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              No interactions recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
