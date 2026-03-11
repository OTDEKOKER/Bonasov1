export const USER_GROUPS_STORAGE_KEY = "bonaso_user_groups_v1";

const DEFAULT_GROUP_CATALOG = ["Coordinators", "Funders", "Partner Org", "Viewers"];

type UserGroupState = {
  catalog: string[];
  assignments: Record<string, string[]>;
};

const isClient = () => typeof window !== "undefined";

const normalizeGroupName = (value: string) => value.trim();

const unique = (values: string[]) =>
  Array.from(new Set(values.map((value) => normalizeGroupName(value)).filter(Boolean)));

const fallbackState = (): UserGroupState => ({
  catalog: [...DEFAULT_GROUP_CATALOG],
  assignments: {},
});

export const getUserGroupState = (): UserGroupState => {
  if (!isClient()) return fallbackState();

  const raw = window.localStorage.getItem(USER_GROUPS_STORAGE_KEY);
  if (!raw) return fallbackState();

  try {
    const parsed = JSON.parse(raw) as Partial<UserGroupState>;
    const catalog = unique(
      Array.isArray(parsed.catalog)
        ? [...DEFAULT_GROUP_CATALOG, ...parsed.catalog.map((entry) => String(entry))]
        : DEFAULT_GROUP_CATALOG,
    );

    const assignmentsRaw = parsed.assignments && typeof parsed.assignments === "object"
      ? parsed.assignments
      : {};

    const assignments = Object.fromEntries(
      Object.entries(assignmentsRaw).map(([userId, groups]) => [
        userId,
        unique(Array.isArray(groups) ? groups.map((group) => String(group)) : []),
      ]),
    );

    return { catalog, assignments };
  } catch {
    return fallbackState();
  }
};

export const setUserGroupState = (state: UserGroupState) => {
  if (!isClient()) return;

  const nextState: UserGroupState = {
    catalog: unique([...DEFAULT_GROUP_CATALOG, ...state.catalog]),
    assignments: Object.fromEntries(
      Object.entries(state.assignments).map(([userId, groups]) => [userId, unique(groups)]),
    ),
  };

  window.localStorage.setItem(USER_GROUPS_STORAGE_KEY, JSON.stringify(nextState));
};

export const getGroupCatalog = (): string[] => getUserGroupState().catalog;

export const addGroupToCatalog = (groupName: string): string[] => {
  const state = getUserGroupState();
  const nextCatalog = unique([...state.catalog, groupName]);
  setUserGroupState({ ...state, catalog: nextCatalog });
  return nextCatalog;
};

export const removeGroupFromCatalog = (groupName: string): string[] => {
  const state = getUserGroupState();
  const target = normalizeGroupName(groupName).toLowerCase();
  const nextCatalog = state.catalog.filter((group) => group.toLowerCase() !== target);

  const nextAssignments = Object.fromEntries(
    Object.entries(state.assignments).map(([userId, groups]) => [
      userId,
      groups.filter((group) => group.toLowerCase() !== target),
    ]),
  );

  setUserGroupState({ catalog: nextCatalog, assignments: nextAssignments });
  return nextCatalog;
};

export const getUserGroupsForUser = (userId: string | number): string[] => {
  const state = getUserGroupState();
  return unique(state.assignments[String(userId)] || []);
};

export const setUserGroupsForUser = (userId: string | number, groups: string[]) => {
  const state = getUserGroupState();
  state.assignments[String(userId)] = unique(groups);
  setUserGroupState(state);
};

export const getGroupsFromUnknownUser = (user: unknown): string[] => {
  if (!user || typeof user !== "object") return [];
  const normalizedUser = user as Record<string, unknown>;
  const userId = normalizedUser.id;
  const localGroups = userId !== undefined && userId !== null
    ? getUserGroupsForUser(String(userId))
    : [];

  const backendRaw = normalizedUser.groups ?? normalizedUser.user_groups;
  const backendGroups = Array.isArray(backendRaw)
    ? backendRaw
        .map((group) => {
          if (typeof group === "string") return group;
          if (group && typeof group === "object" && "name" in group) {
            return String((group as { name?: unknown }).name ?? "");
          }
          return "";
        })
        .filter(Boolean)
    : [];

  return unique([...backendGroups, ...localGroups]);
};
