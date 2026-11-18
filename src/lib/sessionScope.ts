import z from "zod";

const SessionMode = z
  .literal("word_whole")
  .or(z.literal("word_hole"))
  .or(z.literal("sentence"));

export type SessionMode = z.infer<typeof SessionMode>;

export const MODE_ORDER: SessionMode[] = [
  "word_whole",
  "word_hole",
  "sentence",
];

const isSessionModeString = (s: string): s is SessionMode => {
  return (MODE_ORDER as string[]).includes(s);
};

export type SessionLength = number | "all";
export const SessionLength = z.literal("all").or(z.number());
export type SessionScope = {
  modes: Set<SessionMode>;
  tags: string[];
  length: SessionLength;
  customrange?: string;
};
export const SessionScope = z.object({
  modes: z.set(SessionMode),
  tags: z.string().array(),
  length: SessionLength,
  customrange: z.string().optional(),
});

export const DEFAULT_SESSION_SCOPE: SessionScope = {
  modes: new Set(["word_whole"]),
  tags: [],
  length: "all",
};

export type PoolCounts = Record<SessionMode, number> & { all: number };

export const isValidRangeId = (id: string) => {
  return !!id && !!/^[a-zA-Z0-9_ ]{3,}$/.exec(id);
};

export const loadStoredSessionScope = (): SessionScope => {
  console.warn(
    "Could not load session scope from localStorage! TODO: Implement scope loading",
  );
  return DEFAULT_SESSION_SCOPE;
};

export const storeSessionScope = (scope: SessionScope) => {
  console.warn(
    "Could not save session scope to localStorage! TODO: Implement scope loading",
  );
  return;
};

export const scopeToSearchParams = (scope: SessionScope) => {
  const pArr = [
    ["l", `${scope.length}`],
    ...[...scope.modes].map((m) => ["mode", m]),
    scope.customrange ? ["cr", scope.customrange] : null,
    ...scope.tags.map((t) => ["t", t]),
  ].filter((q) => !!q);
  const hParams = new URLSearchParams(pArr);
  return hParams.toString();
};

export const searchParamsToScope = (
  sp: URLSearchParams,
): SessionScope | null => {
  const l = sp.get("l");
  const length: SessionLength = !l || l === "all" ? "all" : +l;
  const ms: string[] = sp.getAll("mode");
  const modes = ms.filter(isSessionModeString);
  const tags: string[] = sp.getAll("t");
  const customrange = sp.get("cr");

  const sessionScope: SessionScope = {
    length,
    tags,
    modes: new Set(modes),
    customrange: customrange || undefined,
  };

  return sessionScope;
};
