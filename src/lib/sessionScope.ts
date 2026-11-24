import z from "zod";
import { isTruthy, randomInt } from "./utils";
import chalk from "chalk";

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

export const Seed = z
  .string()
  .length(16, "Seed should be 16 characters long")
  .regex(/^[a-zA-Z0-9_]*$/, "Seed is invalid shape!");
export const isCorrectSeed = (seed: unknown): seed is Seed => {
  const check = Seed.safeParse(seed);
  if (!check.success) {
    // console.warn("Seed check failed", check.error);
  }
  return check.success;
};
export type Seed = z.infer<typeof Seed>;

const POSSIBLE_SEED_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_";
export const generateSeed = (crash = false): Seed => {
  const s = [...Array(16)]
    .map((r) =>
      POSSIBLE_SEED_CHARS.charAt(randomInt(0, POSSIBLE_SEED_CHARS.length - 1)),
    )
    .join("");
  console.log(chalk.green("Generated a new seed!"), s);
  if (isCorrectSeed(s)) return s;
  else if (crash) throw new Error("Could not generate the seed!");
  else return generateSeed(true);
};

export type SessionLength = number | "all";
export const SessionLength = z.literal("all").or(z.number());
export type SessionScope = {
  modes: Set<SessionMode>;
  tags: string[];
  length: SessionLength;
  customrange?: string;
  gameData?: {
    seed: Seed;
    cardPage: number;
    cardIdx: number;
  };
};
export const SessionScope = z.object({
  modes: z.set(SessionMode),
  tags: z.string().array(),
  length: SessionLength,
  customrange: z.string().optional(),
  gameData: z
    .object({
      seed: Seed,
      cardPage: z.number().default(0),
      cardIdx: z.number().default(0),
    })
    .optional(),
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

export const PARAM_NAMES = {
  length: "l",
  mode: "mode",
  customrange: "cr",
  tag: "t",
  seed: "s",
  cardIndex: "cx",
  cardPage: "p",
};

export const scopeToSearchParams = (scope: SessionScope) => {
  const pArr = [
    [PARAM_NAMES.length, `${scope.length}`],
    ...[...scope.modes].map((m) => [PARAM_NAMES.mode, m]),
    scope.customrange ? [PARAM_NAMES.customrange, scope.customrange] : null,
    ...scope.tags.map((t) => [PARAM_NAMES.tag, t]),
    ...(scope.gameData
      ? [
          [PARAM_NAMES.seed, scope.gameData.seed],
          [PARAM_NAMES.cardIndex, `${scope.gameData.cardIdx}`],
          [PARAM_NAMES.cardPage, `${scope.gameData.cardPage}`],
        ]
      : []),
  ]
    .filter(isTruthy)
    .filter((q) => !!q[1]);
  const hParams = new URLSearchParams(pArr);
  return hParams.toString();
};

export const searchParamsToScope = (
  sp: URLSearchParams,
): SessionScope | null => {
  const l = sp.get(PARAM_NAMES.length);
  const length: SessionLength = !l || l === "all" ? "all" : +l;
  const ms: string[] = sp.getAll(PARAM_NAMES.mode);
  const modes = ms.filter(isSessionModeString);
  const tags: string[] = sp.getAll(PARAM_NAMES.tag);
  const customrange = sp.get(PARAM_NAMES.customrange);

  const seed = sp.get(PARAM_NAMES.seed);
  const cidx = sp.get(PARAM_NAMES.cardIndex);
  const cardIdx = Number(cidx) || 0;
  const cpx = sp.get(PARAM_NAMES.cardPage);
  const cardPage = Number(cpx) || 0;

  const sessionScope: SessionScope = {
    length,
    tags,
    modes: new Set(modes),
    customrange: customrange || undefined,
    gameData: isCorrectSeed(seed)
      ? {
          seed,
          cardIdx,
          cardPage,
        }
      : undefined,
  };

  return sessionScope;
};
