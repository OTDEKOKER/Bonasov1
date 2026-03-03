const normalizeOrgText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const ORG_CANONICAL_ALIASES: Array<{ canonical: string; aliases: string[] }> = [
  {
    canonical: "BONELA",
    aliases: ["bonela"],
  },
  {
    canonical: "MEN & BOYS FOR GENDER EQUALITY (MBGE)",
    aliases: [
      "mbge",
      "men boys",
      "men and boys",
      "men boys for gender equality",
      "men and boys for gender equality",
      "men boys for gender equality mbge",
      "men and boys for gender equality mbge",
    ],
  },
  {
    canonical: "TEBELOPELE",
    aliases: ["tebelopele", "tebe lopele"],
  },
  {
    canonical: "BONEPWA",
    aliases: ["bonepwa", "bone pwa"],
  },
  {
    canonical: "MAKGABANENG",
    aliases: ["makgabaneng", "mak gabaneng"],
  },
];

const ORG_ALIAS_LOOKUP = new Map<string, string>(
  ORG_CANONICAL_ALIASES.flatMap(({ canonical, aliases }) =>
    aliases.map((alias) => [normalizeOrgText(alias), canonical] as const),
  ),
);

export const RECOGNIZED_PARENT_ORGANIZATIONS = [
  "BONELA",
  "MEN & BOYS FOR GENDER EQUALITY (MBGE)",
  "TEBELOPELE",
  "BONEPWA",
  "MAKGABANENG",
] as const;

const RECOGNIZED_PARENT_SET = new Set<string>(RECOGNIZED_PARENT_ORGANIZATIONS);

export const canonicalizeOrganizationName = (name: string) => {
  const normalized = normalizeOrgText(name);
  const canonical = ORG_ALIAS_LOOKUP.get(normalized);
  if (canonical) return canonical;
  return name.trim();
};

export const isRecognizedParentOrganizationName = (name: string) =>
  RECOGNIZED_PARENT_SET.has(canonicalizeOrganizationName(name));
