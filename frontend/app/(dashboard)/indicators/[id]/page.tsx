"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import QuarterlyTargetsSection from "@/components/indicators/quarterly-targets-section"
import { useIndicator } from "@/lib/hooks/use-api"

export default function IndicatorDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params?.id)

  const { data: indicator, isLoading, error, mutate } = useIndicator(Number.isFinite(id) ? id : null)

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !indicator) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Indicator not found</p>
        <Button onClick={() => router.push("/indicators")}>Back to Indicators</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={indicator.name}
        description={`Indicator code: ${indicator.code}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Indicators", href: "/indicators" },
          { label: indicator.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => router.push(`/indicators/${indicator.id}/edit`)}>
              Edit Indicator
            </Button>
            <Button variant="outline" onClick={() => router.push("/indicators")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Indicator Details</CardTitle>
          <CardDescription>View indicator configuration and financial year targets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{indicator.category}</Badge>
            <Badge variant="secondary">{indicator.type.replace(/_/g, " ")}</Badge>
            <Badge variant={indicator.is_active ? "default" : "secondary"}>
              {indicator.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Code</p>
              <p className="text-sm font-medium">{indicator.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unit</p>
              <p className="text-sm font-medium">{indicator.unit || "—"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm font-medium">{indicator.description || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <QuarterlyTargetsSection
        indicatorId={id}
        projectTargets={indicator.project_targets}
        editable={false}
        onUpdated={() => mutate()}
      />
    </div>
  )
}
