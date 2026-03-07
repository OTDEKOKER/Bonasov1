export const getUserOrganizationId = (user: unknown): number | null => {
  if (!user || typeof user !== "object") return null

  const candidate = user as { organizationId?: unknown; organization?: unknown }
  const raw = candidate.organizationId ?? candidate.organization
  const parsed = Number(raw)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}
