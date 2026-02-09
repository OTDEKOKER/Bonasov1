"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Export"
        description="Bulk exports will be available here."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Analysis", href: "/analysis" },
          { label: "Export" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Not configured</CardTitle>
        </CardHeader>
        <CardContent>
          This section will provide bulk export tools once reporting is finalized.
        </CardContent>
      </Card>
    </div>
  );
}

