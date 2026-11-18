"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SESSION_SCOPE,
  loadStoredSessionScope,
  MODE_ORDER,
  scopeToSearchParams,
  storeSessionScope,
  type PoolCounts,
  type SessionLength,
  type SessionMode,
  type SessionScope,
} from "~/lib/sessionScope";
import { getFullTagName, SPECIAL_TAGS } from "~/lib/tags";
import { api } from "~/trpc/react";
import { CustomRange } from "./customRange";
import { cn } from "cn";
import { Skeleton } from "~/components/ui/skeleton";
import { RANDOM_NUMS } from "~/lib/utils";
import type { Tag, TagType, Training } from "~/lib/game";

const MODE_META: Record<
  SessionMode,
  { title: string; empty: { tagged: string; all: string } }
> = {
  sentence: {
    title: "In a sentence",
    empty: {
      tagged: "No sentences with these tags",
      all: "No sentences in the library yet",
    },
  },
  word_hole: {
    title: "Word hole",
    empty: {
      tagged: "No words with these tags",
      all: "No words in the library yet",
    },
  },
  word_whole: {
    title: "Whole words",
    empty: {
      tagged: "No kanji with these tags",
      all: "No kanji in the library yet",
    },
  },
};

function ModeExample({ mode }: { mode: SessionMode }) {
  if (mode === "sentence") {
    return (
      <div className="mt-3 rounded-lg bg-slate-950/60 p-3 text-center text-slate-200">
        <p className="text-lg tracking-wide">
          これは{" "}
          <span className="inline-block min-w-8 border-b border-slate-400 text-center">
            ___
          </span>{" "}
          です
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <div className="h-9 w-9 rounded border border-dashed border-slate-500 bg-slate-900" />
          <div className="h-9 w-9 rounded border border-dashed border-slate-500 bg-slate-900" />
          <div className="h-9 w-9 rounded border border-dashed border-slate-500 bg-slate-900" />
        </div>
      </div>
    );
  }
  if (mode === "word_hole") {
    return (
      <div className="mt-3 rounded-lg bg-slate-950/60 p-3 text-center text-slate-200">
        <p className="text-lg">
          <b className="text-green-300">あら</b>筋
        </p>
        <p className="text-xs text-slate-400">summary</p>
        <div className="mt-3 flex justify-center gap-2">
          <div className="h-9 w-9 rounded border border-dashed border-slate-500 bg-slate-900" />
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-lg bg-slate-950/60 p-3 text-center text-slate-200">
      <p className="text-md bold m-0 p-0 text-white italic">to be stealthy</p>
      <div className="flex justify-center gap-2 align-bottom">
        <div
          className={cn(
            `m-0 flex w-9 items-end justify-center p-0 text-white/50`,
          )}
        >
          しの
        </div>
        <div
          className={cn(
            `m-0 flex w-9 items-end justify-center p-0 text-white/50`,
          )}
        >
          ぶ
        </div>
      </div>
      <div className="flex justify-center gap-2">
        <div className="h-9 w-9 rounded border border-dashed border-slate-500 bg-slate-900" />
        <div className="h-9 w-9 rounded border border-dashed border-slate-500 bg-slate-900" />
      </div>
    </div>
  );
}

function startLabel(
  scope: SessionScope,
  pools: PoolCounts,
  tagNames: string[],
): string {
  const n = [...scope.modes].reduce((p, n) => p + pools[n], 0);
  const active = [...scope.modes];
  const mix = active.length > 1 ? "mixed " : `${active[0] ?? ""} `;
  const from =
    tagNames.length === 0
      ? "entire library"
      : tagNames
          .map((t) => getFullTagName(t))
          .map((q) => `'${q}'`)
          .join(" + ");
  return `Start ${n} ${mix}prompts from ${from}`;
}

function TagChip({
  label,
  selected,
  partial,
  onClick,
  expanded,
  onToggleExpand,
}: {
  label: string;
  selected: boolean;
  partial?: boolean;
  onClick: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const tone = selected
    ? "border-emerald-500 bg-emerald-900/50 text-emerald-200"
    : partial
      ? "border-emerald-700/80 bg-emerald-950/40 text-emerald-300/90"
      : "border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400";

  if (!onToggleExpand) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn("rounded-full border px-3 py-1 text-sm transition", tone)}
      >
        {label}
      </button>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-full border text-sm transition",
        tone,
      )}
    >
      <button type="button" onClick={onClick} className="px-3 py-1">
        {label}
      </button>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
        onClick={onToggleExpand}
        className="border-l border-current/20 px-2 text-xs opacity-70 hover:opacity-100"
      >
        <span
          className={cn(
            "inline-block transition-transform",
            expanded && "rotate-90",
          )}
        >
          ▸
        </span>
      </button>
    </span>
  );
}

const TagChipSkeleton = ({ w = 38 }: { w?: number }) => {
  return (
    <Skeleton
      style={{ width: `${w}px` }}
      className={cn(
        "h-7 rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-slate-300 hover:border-slate-400",
      )}
    />
  );
};

const TagChooserSkeleton = ({
  header,
  offset = 0,
  length = 30,
}: {
  header: string;
  offset?: number;
  length?: number;
}) => {
  return (
    <section className="mb-4 rounded-xl border border-slate-700 bg-slate-900/50 p-4">
      <h3 className="mb-3 text-lg font-semibold tracking-wide text-slate-100">
        {header}
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {[...Array(length)].map((_, i) => {
          const rw = RANDOM_NUMS[i + offset] ?? RANDOM_NUMS[0];
          return (
            <TagChipSkeleton
              key={`tcs_${header}_${i}`}
              w={110 + (rw < 8 ? -rw * 6 : rw * 6)}
            />
          );
        })}
      </div>
    </section>
  );
};

const TagChooser = ({
  header,
  groups,
  freeTags,
  selected,
  onToggle,
}: {
  header: string;
  groups: TagGroup[];
  freeTags: Tag[];
  selected: string[];
  onToggle: (t: string[]) => void;
}) => {
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      subtags: group.subtags.filter((t) => t._count.all > 0),
    }))
    .filter((group) => group.subtags.length > 0);

  const [unfolded, setUnfolded] = useState<string[]>(() =>
    visibleGroups
      .filter((group) => group.subtags.some((t) => selected.includes(t.name)))
      .map((group) => group.tag),
  );

  const toggleUnfolded = (tag: string) => {
    setUnfolded((prev) =>
      prev.includes(tag) ? prev.filter((z) => z !== tag) : [...prev, tag],
    );
  };

  return (
    <section className="mb-4 rounded-xl border border-slate-700 bg-slate-900/50 p-4">
      <h3 className="mb-3 text-lg font-semibold tracking-wide text-slate-100">
        {header}
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {visibleGroups.map((group) => {
          const names = group.subtags.map((t) => t.name);
          const selectedCount = names.filter((n) =>
            selected.includes(n),
          ).length;
          const allSelected = selectedCount === names.length;
          const someSelected = selectedCount > 0 && !allSelected;
          const open = unfolded.includes(group.tag);

          return (
            <div key={group.tag} className="contents">
              <TagChip
                label={getFullTagName(group.tag)}
                selected={allSelected}
                partial={someSelected}
                expanded={open}
                onClick={() => onToggle(names)}
                onToggleExpand={() => toggleUnfolded(group.tag)}
              />
              {open &&
                group.subtags.map((tObj) => {
                  const fullName = getFullTagName(tObj.name);
                  const shortName = getFullTagName(tObj.name, true);
                  return (
                    <TagChip
                      key={tObj.name}
                      label={
                        fullName.length > "Abbreviation".length
                          ? shortName
                          : fullName
                      }
                      selected={selected.includes(tObj.name)}
                      onClick={() => onToggle([tObj.name])}
                    />
                  );
                })}
            </div>
          );
        })}
        {freeTags.map((tObj) => (
          <TagChip
            key={tObj.name}
            label={getFullTagName(tObj.name, true)}
            selected={selected.includes(tObj.name)}
            onClick={() => onToggle([tObj.name])}
          />
        ))}
      </div>
    </section>
  );
};

type TagGroup = {
  tag: string;
  subtags: Tag[];
  type: TagType[];
};

export function ScopeBuilder() {
  const [scope, setScope] = useState<SessionScope>(DEFAULT_SESSION_SCOPE);
  const [hydrated, setHydrated] = useState(false);

  const [customRange, setCustomRange] = useState<Training | null>(null);

  const { data: tags = [], isLoading: tagsLoading } =
    api.session.getTags.useQuery();
  const poolsQuery = api.session.getPoolCounts.useQuery(
    {
      tagIds: scope.tags,
      range: customRange ?? undefined,
    },
    { enabled: hydrated },
  );

  const pools: PoolCounts = poolsQuery.data ?? {
    sentence: 0,
    word_hole: 0,
    word_whole: 0,
    all: 0,
  };

  useEffect(() => {
    const stored = loadStoredSessionScope();
    if (stored) {
      setScope(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    storeSessionScope(scope);
  }, [hydrated, scope]);

  const selectedTagNames = useMemo(
    () =>
      tags
        .filter((tag) => scope.tags.includes(tag.name))
        .map((tag) => tag.name),
    [tags, scope.tags],
  );

  const canStart = [...scope.modes].reduce((p, n) => p + pools[n], 0) > 0;
  const playHref = `/session/play?${scopeToSearchParams(scope)}`;
  const emptyLibrary =
    pools.sentence + pools.word_hole + pools.word_whole === 0 &&
    scope.tags.length === 0;

  const tagGroups = SPECIAL_TAGS.flatMap((st) => {
    return {
      tag: st.groupTag,
      subtags: tags.filter((xt) => st.check(xt.name)),
      type: st.type,
    };
  });

  const toggleMode = (mode: SessionMode) => {
    if (pools[mode] === 0) return;
    setScope((prev) => {
      const next = new Set([...prev.modes]);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return { ...prev, modes: next };
    });
  };

  const kanjiGroup = tagGroups
    .filter((z) => z.type.includes("kanji"))
    .map((t) => ({
      ...t,
      tag: `k${t.tag}`,
      subtags: t.subtags
        .map((z) => ({ ...z, name: `k${z.name}` }))
        .filter((q) => q._count.kanji > 0),
    }));

  const wordGroup = tagGroups
    .filter((z) => z.type.includes("word"))
    .map((t) => ({
      ...t,
      tag: `w${t.tag}`,
      subtags: t.subtags
        .map((z) => ({ ...z, name: `w${z.name}` }))
        .filter((q) => q._count.words > 0),
    }));
  const sentenceGroup = tagGroups
    .filter((z) => z.type.includes("sentence"))
    .map((t) => ({
      ...t,
      tag: `s${t.tag}`,
      subtags: t.subtags
        .map((z) => ({ ...z, name: `s${z.name}` }))
        .filter((q) => q._count.sentences > 0),
    }));

  const kanjiTags: { groups: TagGroup[]; ungrouped: Tag[] } = {
    groups: kanjiGroup,
    ungrouped: tags
      .filter(
        (q) =>
          q.type.includes("kanji") &&
          q._count.kanji > 0 &&
          !kanjiGroup.find(
            (g) =>
              g.type.includes("kanji") &&
              g.subtags.find((st) => st.name === `k${q.name}`),
          ),
      )
      .map((t) => ({ ...t, name: `k${t.name}` })),
  };

  const wordTags: { groups: TagGroup[]; ungrouped: Tag[] } = {
    groups: wordGroup,
    ungrouped: tags
      .filter(
        (q) =>
          q.type.includes("word") &&
          q._count.words > 0 &&
          !wordGroup.find(
            (g) =>
              g.type.includes("word") &&
              g.subtags.find((st) => st.name === `w${q.name}`),
          ),
      )
      .map((t) => ({ ...t, name: `w${t.name}` })),
  };

  const sentenceTags: { groups: TagGroup[]; ungrouped: Tag[] } = {
    groups: sentenceGroup,
    ungrouped: tags
      .filter(
        (q) =>
          q.type.includes("sentence") &&
          q._count.sentences > 0 &&
          !sentenceGroup.find(
            (g) =>
              g.type.includes("sentence") &&
              g.subtags.find((st) => st.name === `s${q.name}`),
          ),
      )
      .map((t) => ({ ...t, name: `s${t.name}` })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-800 text-white">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 pb-36">
        <div>
          <p className="text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-200">
              Home
            </Link>
            <span className="px-2">/</span>
            New session
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">
            Choose how you want to write
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Pick a pool, pick the handwriting checks, then start. Empty tag
            selection uses the entire library.
          </p>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-100">
            Choose training range
            <CustomRange
              range={customRange ?? { kanji: [], word: [] }}
              updateRange={(nr) => {
                setCustomRange(nr);
                setScope((p) => ({ ...p, customrange: nr.id }));
              }}
            />
            {customRange !== null && (
              <>
                #{customRange.id}
                <button
                  onClick={() => {
                    setCustomRange(null);
                    setScope((p) => {
                      let np = { ...p };
                      delete np.customrange;
                      return np;
                    });
                  }}
                  className="ml-2 items-center justify-center rounded-xl border border-red-400 bg-red-600/25 px-2 text-red-300/90"
                >
                  Cancel
                </button>
              </>
            )}
          </h2>
          {!tagsLoading ? (
            kanjiTags.ungrouped.length +
              kanjiTags.groups.flatMap((q) => q.subtags).length >
              0 && (
              <TagChooser
                header={"Kanji"}
                freeTags={kanjiTags.ungrouped.filter(
                  (ft) => ft._count.kanji > 0,
                )}
                groups={kanjiTags.groups.filter((ft) => ft.tag.length > 0)}
                onToggle={(t) => {
                  setScope((prev) => {
                    return {
                      ...prev,
                      tags: prev.tags.some((q) => t.includes(q))
                        ? prev.tags.filter((q) => !t.includes(q))
                        : [...new Set([...prev.tags, ...t])],
                    };
                  });
                }}
                selected={scope.tags}
              />
            )
          ) : (
            <TagChooserSkeleton header="Kanji" length={10} />
          )}
          {!tagsLoading ? (
            wordTags.ungrouped.length +
              wordTags.groups.flatMap((q) => q.subtags).length >
              0 && (
              <TagChooser
                header="Words"
                freeTags={wordTags.ungrouped.filter(
                  (ft) => ft._count.words > 0,
                )}
                groups={wordTags.groups.filter((ft) => ft.tag.length > 0)}
                onToggle={(t) => {
                  setScope((prev) => {
                    return {
                      ...prev,
                      tags: prev.tags.some((q) => t.includes(q))
                        ? prev.tags.filter((q) => !t.includes(q))
                        : [...new Set([...prev.tags, ...t])],
                    };
                  });
                }}
                selected={scope.tags}
              />
            )
          ) : (
            <TagChooserSkeleton header="Words" offset={5} length={35} />
          )}
          {sentenceTags.ungrouped.length +
            sentenceTags.groups.flatMap((q) => q.subtags).length >
            0 && (
            <TagChooser
              header="Sentences"
              freeTags={sentenceTags.ungrouped.filter(
                (ft) => ft._count.sentences > 0,
              )}
              groups={sentenceTags.groups.filter((ft) => ft.tag.length > 0)}
              onToggle={(t) => {
                setScope((prev) => {
                  return {
                    ...prev,
                    tags: prev.tags.some((q) => t.includes(q))
                      ? prev.tags.filter((q) => !t.includes(q))
                      : [...new Set([...prev.tags, ...t])],
                  };
                });
              }}
              selected={scope.tags}
            />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-100">
            How to check
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {MODE_ORDER.map((mode) => {
              const on = scope.modes.has(mode);
              const empty = pools[mode] === 0;
              const emptyCopy =
                scope.tags.length > 0
                  ? MODE_META[mode].empty.tagged
                  : MODE_META[mode].empty.all;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={empty}
                  onClick={() => toggleMode(mode)}
                  className={`rounded-xl border p-4 text-left transition ${
                    empty
                      ? "cursor-not-allowed border-slate-700 bg-slate-900/40 opacity-60"
                      : on
                        ? "border-emerald-500 bg-slate-900 shadow-lg shadow-black/20"
                        : "border-slate-700 bg-slate-900 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-100">
                      {MODE_META[mode].title}
                    </span>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        on && !empty
                          ? "bg-emerald-900/70 text-emerald-300"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {empty ? "unavailable" : on ? `enabled` : "off"}
                    </span>
                    <span>{pools[mode] > 0 && `(${pools[mode]})`}</span>
                  </div>
                  <ModeExample mode={mode} />
                  {empty && (
                    <p className="mt-3 text-xs text-amber-400">{emptyCopy}</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* {active.length >= 2 && (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-300">Mix</span>
                <button
                  type="button"
                  onClick={() => {
                    setMixCustom(false);
                    setScope((prev) => equalizeEnabledModes(prev));
                  }}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    !mixCustom
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Equal mix
                </button>
                <button
                  type="button"
                  onClick={() => setMixCustom(true)}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    mixCustom
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Custom
                </button>
              </div>
              {mixCustom && (
                <div className="mt-4 flex flex-wrap gap-4">
                  {active.map((mode) => (
                    <div key={mode} className="flex items-center gap-2">
                      <span className="w-20 text-sm text-slate-400">
                        {mode}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setScope((prev) => adjustModeWeight(prev, mode, -1))
                        }
                        className="h-8 w-8 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-slate-100">
                        {scope.modes[mode]}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setScope((prev) => adjustModeWeight(prev, mode, 1))
                        }
                        className="h-8 w-8 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-sm text-slate-400">
                {formatAboutLine(expected)}
              </p>
            </div>
          )} */}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-100">
            How many words
          </h2>
          <div className="flex flex-wrap gap-2">
            {([10, 20, "all"] as SessionLength[]).map((option) => (
              <button
                key={String(option)}
                type="button"
                onClick={() =>
                  setScope((prev) => ({ ...prev, length: option }))
                }
                className={`rounded-lg border px-4 py-2 text-sm ${
                  scope.length === option
                    ? "border-emerald-500 bg-emerald-900/40 text-emerald-200"
                    : "border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400"
                }`}
              >
                {option === "all" ? "All in this pool" : option}
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-700 bg-slate-900/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-400">
            {emptyLibrary ? (
              <>
                Nothing to practice yet.{" "}
                <Link href="/db" className="text-emerald-400 hover:underline">
                  Manage DB
                </Link>
              </>
            ) : canStart ? (
              startLabel(scope, pools, selectedTagNames)
            ) : (
              "No prompts match this mix. Change tags or turn on another mode."
            )}
          </div>
          {canStart ? (
            <Link
              href={playHref}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-center font-medium text-white hover:bg-emerald-500"
            >
              Start writing
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-xl bg-slate-700 px-5 py-2.5 text-center font-medium text-slate-400">
              Start writing
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
