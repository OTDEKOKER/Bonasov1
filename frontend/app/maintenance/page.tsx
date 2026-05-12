import type { Metadata } from "next"

import { MaintenanceScreen } from "@/components/shared/maintenance-screen"

export const metadata: Metadata = {
  title: "Maintenance | BONASO Data Portal",
  description: "System maintenance status page for the BONASO Data Portal.",
}

export default function MaintenancePage() {
  return (
    <MaintenanceScreen
      expectedResolution="We are working to restore service as quickly as possible today."
      updatedAt="March 14, 2026"
    />
  )
}
