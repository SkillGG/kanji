import type { SearchParams } from "next/dist/server/request/search-params";
import { extractTags } from "./tags";

export type UnpackSet<T> = T extends Set<infer Q> ? Q : never;

export const noop = <T>(...n: T[]): void => {};

export const toggleMultiple = <T>(
  a: T[],
  b: T[],
  predicate?: (a: T, b: T) => boolean,
) => {
  let ret: T[] = [...a];
  const pred = (r: T[], o: T) =>
    predicate ? r.find((i) => predicate(i, o)) : r.includes(o);
  for (const o of b) {
    if (!pred(ret, o)) {
      ret = [...ret, o];
    } else {
      ret = ret.filter((z) => z !== o);
    }
  }
  return ret;
};

export const pushIfNotIn = <T>(
  a: T[],
  b: T[],
  predicate?: (a: T, b: T) => boolean,
  merge?: (a: T, b: T) => T,
) => {
  let ret: T[] = [...a];
  const pred = (r: T[], o: T) =>
    predicate ? r.some((i) => predicate(i, o)) : r.includes(o);
  for (const o of b) {
    if (!pred(ret, o)) {
      ret.push(o);
    } else if (merge) {
      ret = ret.map((i) => (pred([i], o) ? merge(i, o) : i));
    }
  }
  return ret;
};

export function randomInt(min: number, max: number) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}
export const randomBase64 = (l: number): string => {
  const POSSIBLE =
    "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ+/";
  return [...Array(l)]
    .map((z) => {
      return POSSIBLE[randomInt(0, POSSIBLE.length - 1)] ?? "";
    })
    .join("");
};

export function hashSortKey(input: string): string {
  let h = 0x811c9dc5; // any non-zero value will do
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function randomizeArray<T>(
  arr: T[],
  getKey: (o: T, i: number, a: T[]) => string,
  seed?: string,
) {
  // calculate hashes
  const hashes = arr.map(
    (v, i, a) => [hashSortKey(seed + ":" + getKey(v, i, a)), v] as const,
  );
  // sort and then map back
  return hashes.toSorted((a, b) => a[0].localeCompare(b[0])).map((r) => r[1]);
}

export const parseServerSearchParams = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
  }
  return params;
};

export const RANDOM_NUMS = [
  5, 7, 7, 4, 7, 6, 10, 8, 5, 11, 11, 5, 5, 7, 10, 7, 11, 6, 8, 10, 11, 5, 10,
  9, 7, 10, 9, 9, 8, 7, 9, 7, 10, 9, 6, 9, 9, 6, 10, 4, 9, 8, 8, 9, 11, 10, 10,
  5, 11, 7, 8, 11, 5, 8, 5, 5, 6, 7, 6, 8, 5, 6, 5, 6, 9, 5, 6, 8, 10, 11, 5,
  10, 10, 8, 11, 5, 11, 9, 4, 10, 11, 6, 10, 11, 4, 8, 11, 9, 8, 4, 6, 5, 9, 7,
  11, 6, 10, 11, 11, 11, 10, 8, 8, 6, 10, 10, 5, 9, 8, 10, 11, 6, 11, 11, 9, 8,
  11, 5, 9, 10, 7, 6, 5, 8, 9, 7, 10, 11, 11, 6, 11, 4, 9, 5, 10, 10, 7, 8, 8,
  9, 7, 6, 4, 11, 9, 6, 6, 4, 8, 10,
] as const;

export const isTruthy = <T>(
  q: T,
): q is NonNullable<T extends false ? never : T> => !!q;

export const isInArrayWithDefaultOnEmpty = <T>(
  v: T,
  arr?: T[],
  def = false,
  pred: (a: T, arr: T[]) => boolean = (a, arr) => arr.includes(a),
) => (!arr || arr.length === 0 ? def : pred(v, arr));

export const inArrTOE = <T>(
  v: T,
  arr?: T[],
  pred: (a: T, arr: T[]) => boolean = (a, arr) => arr.includes(a),
) => isInArrayWithDefaultOnEmpty(v, arr, true, pred);

export const isTagInInput = (t: string, tg: string[]) =>
  inArrTOE(t, tg, (a, ar) =>
    extractTags(a).some((x) => ar.flatMap((x) => extractTags(x)).includes(x)),
  );

export const isInRange = inArrTOE<string>;

export const getFullWordRading = (w: string, r: string): string => {
  if (!r.includes(".")) return r;

  const rd = r.split(".");

  return rd.map((q, i) => (q === "" ? (w[i] ?? "") : q)).join("");
};

export const hasDefinedProp = <T extends object, K extends keyof T>(
  obj: T,
  key: K,
): obj is T & Record<K, NonNullable<T[K]>> =>
  obj[key] !== undefined && obj[key] !== null;

export const dedupe = <T>(
  arr: T[],
  pred?: (a: T, b: T) => boolean,
  merge?: (a: T, b: T) => T,
): T[] => {
  if (!pred && !merge) return [...new Set(arr)];
  else {
    let nA: T[] = [];
    for (const o of arr) {
      nA = pushIfNotIn(nA, [o], pred, merge);
    }
    return nA;
  }
};

export type ServerError = {
  message: string;
};

export type Solid<T extends object> = Required<{
  [P in keyof T]: NonNullable<T[P]>;
}>;

export const setTimeoutAsync = <T>(fn: () => T, delay: number): Promise<T> => {
  return new Promise((r) => {
    setTimeout(() => {
      r(fn());
    }, delay);
  });
};

const logged: string[] = [];
export const logOnce = (tag: string, ...log: any) => {
  if (!logged.includes(tag)) {
    logged.push(tag);
    console.log(`[${tag}]: `, ...log);
  }
};
