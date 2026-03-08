import type { User } from "@/lib/types"

type UserLike = Partial<User> & {
  role?: string | null
  is_staff?: boolean
  is_superuser?: boolean
}

export function isPlatformAdmin(user?: UserLike | null): boolean {
  return Boolean(
    user &&
      (user.is_superuser === true || user.is_staff === true || user.role === "admin"),
  )
}

export function canManageUsers(user?: UserLike | null): boolean {
  return isPlatformAdmin(user)
}

export function canResetUserPasswords(user?: UserLike | null): boolean {
  return isPlatformAdmin(user)
}

export function canChangeUserActivation(user?: UserLike | null): boolean {
  return isPlatformAdmin(user)
}

export function canEditUserRecord(
  actor?: UserLike | null,
  targetUserId?: string | number | null,
): boolean {
  if (!actor) return false
  if (isPlatformAdmin(actor)) return true
  if (targetUserId === null || targetUserId === undefined) return false
  return String(actor.id) === String(targetUserId)
}
