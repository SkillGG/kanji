"use client";

import { useSearchParams, useRouter } from "next/navigation";

import Link from "next/link";
import React, {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MouseEventHandler,
  type ReactElement,
  type ReactEventHandler,
  type SetStateAction,
  type SubmitEventHandler,
} from "react";
import { type Tag, type WordRecordData } from "~/app/_components/db/records";
import { containsKanji, uniqueKanjiFromWordsWithTags } from "~/lib/seed";
import { extractTags, getFullTagName, WARN_TAGS } from "~/lib/tags";
import { getFullWordRading, isTruthy, noop, pushIfNotIn } from "~/lib/utils";
import type { DicEntry } from "~/server/api/routers/db";
import { api } from "~/trpc/react";
import type { KanjiWithTag } from "../page";
import { tagShortcutOKD, ArrayField } from "~/app/_components/db/addRecords";
import { cn } from "cn";
import { OkuriganaInputDialog } from "~/app/_components/okuriganaInput";
import { Spinner } from "~/app/_components/spinnerOn";

function WordText({ text }: { text: string }) {
  return (
    <>
      {[...text].map((q, i) =>
        !containsKanji(q) ? (
          <span key={`${text}_${q}_${i}`} className="text-orange-400">
            {q}
          </span>
        ) : (
          q
        ),
      )}
    </>
  );
}

function KanjiWordDisplay({
  word,
  readings,
  kEleInfo = [],
  rEleInfos = [],
  meanings = [],
  onClickReading,
  selectedEntSeqs = [],
  entSeqArr = [],
  canSelect,
  inDB,
  removedTags,
  toggleExistingTag,
  nth,
  addTag,
  addedTags = [],
}: {
  word: string;
  readings: string[];
  kEleInfo?: string[];
  rEleInfos?: string[][];
  meanings?: string[];
  nth: number;
  onClickReading?: (reading: string, readingIdx: number) => void;
  removedTags?: string[];
  toggleExistingTag?: (tag: string) => void;
  addedTags?: string[];
  addTag?: (tag: string) => void;
  selectedEntSeqs?: string[];
  entSeqArr?: string[];
  canSelect: boolean;
  inDB?: { word: string; reading: string[] }[];
}) {
  const mainTags = [...kEleInfo, ...addedTags];
  const body = useRef<HTMLDivElement>(null);

  return (
    <div
      className={cn("flex w-full min-w-0 flex-col gap-2")}
      data-word={word}
      onKeyDown={(e) => {
        switch (e.code) {
          case "F1":
          case "F2":
          case "F3":
          case "F4":
          case "F5":
            if (e.getModifierState("CapsLock")) {
              e.preventDefault();
              const nLVL = "N" + e.code.replace(/F/i, "");
              addTag?.(nLVL);
            }
            break;
          case "KeyA":
            if (e.getModifierState("CapsLock")) {
              const tag = prompt("Tag to toggle");
              if (tag) addTag?.(tag);
            }
            break;
        }
      }}
      ref={body}
      tabIndex={0}
      title={`#${nth}`}
    >
      <div className="flex min-w-0 flex-row items-center gap-3">
        <span className="text-2xl font-extrabold tracking-tight text-nowrap text-slate-50">
          <WordText text={word} />
        </span>

        {mainTags.length > 0 && (
          <div className="ml-1 flex flex-row flex-wrap gap-1">
            {mainTags
              .flatMap((q) => extractTags(q))
              .map((tag) => {
                const full = getFullTagName(tag);
                const short = getFullTagName(tag, true);
                const tg = tag.length < 10 ? tag : `${tag.substring(0, 7)}...`;
                return (
                  <span
                    key={`${word}_${tag}`}
                    className={cn(
                      "flex rounded border border-sky-200 bg-sky-200 px-2 py-0.5",
                      "items-center text-center text-xs font-medium text-sky-950",
                      WARN_TAGS.includes(tag) &&
                        "border-orange-800 bg-orange-400",
                      removedTags?.includes(tag) && "border-red-800 bg-red-300",
                    )}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      toggleExistingTag?.(tag);
                      body?.current?.focus();
                    }}
                    title={full !== tg ? (full ?? tag) : undefined}
                  >
                    {full.length < 10 ? full : short.length < 10 ? short : tg}
                  </span>
                );
              })}
          </div>
        )}
      </div>
      <div className="flex flex-row flex-wrap items-center gap-2">
        {readings.map((reading, idx) => {
          const readingText = reading.trim();
          const readingEntSeq = entSeqArr?.[idx];
          const isSelected =
            readingEntSeq && selectedEntSeqs.includes(readingEntSeq);
          const isInDB = !!inDB?.find(
            (db) => db.reading.includes(reading) && db.word === word,
          );

          return (
            <button
              key={reading + idx}
              type="button"
              className={cn(
                "cursor-pointer rounded-lg border px-3 py-1 text-base font-semibold shadow-sm transition-all",
                isSelected
                  ? "border-green-500 bg-green-200 text-green-900 ring-2 ring-green-400"
                  : canSelect && !isInDB
                    ? "border-sky-400 bg-white text-blue-900 hover:bg-blue-50 hover:shadow-md"
                    : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-70",
              )}
              disabled={!canSelect || isInDB}

              onClick={(e) => {
                e.stopPropagation();
                if (onClickReading && canSelect) onClickReading(reading, idx);
                body.current?.focus();
              }}
            >
              <span className="font-mono">{readingText}</span>
              {rEleInfos[idx] && rEleInfos[idx].length > 0 && (
                <span className="ml-2 text-xs text-gray-600">
                  [
                  {rEleInfos[idx]
                    .flatMap((q) => extractTags(q))
                    .map((riTag) => {
                      const fullTag = getFullTagName(riTag);
                      return (
                        <span title={fullTag ?? ""} key={riTag}>
                          {riTag}
                        </span>
                      );
                    })
                    .reduce(
                      (acc, curr, i, arr) => {
                        acc.push(curr);
                        if (i !== arr.length - 1)
                          acc.push(<span key={`c${i}`}>, </span>);
                        return acc;
                      },
                      [] as (string | ReactElement)[],
                    )}
                  ]
                </span>
              )}
            </button>
          );
        })}
      </div>
      {meanings.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {meanings.map((m, idx) => (
            <span
              key={m + idx}
              className="rounded border border-indigo-300 bg-indigo-100 px-2 py-0.5 text-sm font-medium text-blue-800"
            >
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function KanaOnlyRecord({
  word,
  reading,
  kEleInfo,
  rEleInfo,
  meaning,
  nth,
  tags,
  onClick,
  isSelected = false,
  ...rest
}: {
  word: string;
  reading: string[];
  kEleInfo?: string[];
  rEleInfo?: string[];
  meaning?: string[];
  nth: number;
  tags?: Tag[];
  onClick?: MouseEventHandler<HTMLDivElement>;
  isSelected?: boolean;
  [key: string]: any;
}) {
  const hasMeaning = !!meaning && meaning.length > 0;

  const wordTags = extractTags(word);
  const readingTags = reading.flatMap((r) => extractTags(r));

  const containerClass = [
    "group relative flex w-full grow basis-50 items-stretch overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-blue-900 to-blue-950/80 p-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer border-slate-900",
    isSelected &&
      "border-emerald-400 ring ring-emerald-800 bg-gradient-to-br from-green-950 via-slate-950 to-green-900",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      onClick={onClick}
      className={containerClass}
      style={{ margin: "0.2rem 0" }}
      {...rest}
    >
      <div className="flex min-w-0 flex-1 flex-col px-6 py-4">
        <span className="flex flex-row items-center gap-2 truncate text-lg font-bold tracking-tight text-blue-100">
          {word.replace(/\s*\([^)]+\)\s*/g, "").trim()}
          {wordTags.length > 0 &&
            wordTags.map((tag) => {
              const full = getFullTagName(tag);
              return (
                <span
                  key={"wordtag" + tag}
                  className="rounded border border-pink-300 bg-pink-200 px-1 py-0.5 text-xs font-medium text-pink-900"
                  title={full !== tag ? full : undefined}
                >
                  {tag}
                </span>
              );
            })}
        </span>
        <span className="mt-0.5 mb-1 flex flex-row items-center gap-2 truncate text-base font-semibold text-blue-300">
          {reading.join("、").trim()}
          {readingTags.length > 0 &&
            readingTags.map((tag) => {
              const full = getFullTagName(tag);
              return (
                <span
                  key={"readtag" + tag}
                  className="rounded border border-pink-300 bg-pink-200 px-1 py-0.5 text-xs font-medium text-pink-900"
                  title={full !== tag ? full : undefined}
                >
                  {tag}
                </span>
              );
            })}
        </span>
        <div className="mt-1 flex flex-row flex-wrap gap-1">
          {(kEleInfo ?? []).map((tag) => {
            const full = getFullTagName(tag);
            return (
              <span
                key={"k" + tag}
                className="rounded border border-sky-200 bg-sky-100 px-2 py-0.5 text-xs font-medium text-blue-900"
                title={full !== tag ? full : undefined}
              >
                {tag}
              </span>
            );
          })}
          {(rEleInfo ?? []).map((tag) => {
            const plainTag = tag;
            const full = getFullTagName(tag);
            return (
              <span
                key={"r" + tag}
                className="rounded border border-purple-200 bg-purple-100 px-2 py-0.5 text-xs font-medium text-blue-900"
                title={full !== tag ? full : undefined}
              >
                {tag}
              </span>
            );
          })}
        </div>
        {hasMeaning && (
          <span className="mt-1 block max-w-full truncate rounded border border-blue-800 bg-sky-900 px-2 py-0.5 text-sm font-medium text-blue-100">
            {meaning}
          </span>
        )}
      </div>
      <div className="mr-2 flex flex-col items-center justify-between">
        {isSelected && (
          <span className="mt-2 rounded-full border border-green-300 bg-green-600 px-3 py-1 text-xs font-bold text-white shadow-inner">
            ✓
          </span>
        )}
      </div>
    </div>
  );
}

type FlatRecord = {
  ent_seq: string;
  word: string;
  reading: string[];
  sreading: string[];
  kEleInfo: string[];
  rEleInfo: string[];
  meaning?: string[];
  canSelect: boolean;
};

type KanjiWordGroup = {
  id: string;
  ent_seq_arr: string[];
  word: string;
  readings: string[];
  kEleInfo: string[];
  rEleInfos: string[][];
  meanings: string[];
  canSelect: boolean;
};

type KanaOnlyGroup = {
  id: string;
  ent_seq: string;
  word: string;
  reading: string[];
  kEleInfo: string[];
  rEleInfo: string[];
  meaning?: string[];
  canSelect: boolean;
};

function flattenDicEntry(d: DicEntry): FlatRecord[] {
  const records: FlatRecord[] = [];
  const senses = d.sense.flatMap((q) => [...q.glos]);

  const posTags = [
    ...new Set([...d.sense.flatMap((q) => [...q.pos, ...q.info])]),
  ];

  if (
    Array.isArray(d.k_ele) &&
    d.k_ele.length > 0 &&
    Array.isArray(d.r_ele) &&
    d.r_ele.length > 0
  ) {
    for (let kIdx = 0; kIdx < d.k_ele.length; ++kIdx) {
      const k = d.k_ele[kIdx];
      for (let rIdx = 0; rIdx < d.r_ele.length; ++rIdx) {
        const r = d.r_ele[rIdx];
        records.push({
          ent_seq: `${d.ent_seq}|k${kIdx}|r${rIdx}`,
          word: Array.isArray(k?.word) ? (k.word[0] ?? "") : "",
          reading: r?.readings ?? [],
          sreading: r?.readings ?? [],
          kEleInfo: Array.isArray(k?.info)
            ? [...k.info, ...posTags]
            : [...posTags],
          rEleInfo: Array.isArray(r?.info) ? [...r.info] : [],
          meaning: senses,
          canSelect: true,
        });
      }
    }
  } else if (Array.isArray(d.k_ele) && d.k_ele.length > 0) {
    for (let kIdx = 0; kIdx < d.k_ele.length; ++kIdx) {
      const k = d.k_ele[kIdx];
      records.push({
        ent_seq: `${d.ent_seq}|k${kIdx}`,
        word: Array.isArray(k?.word) ? (k.word[0] ?? "") : "",
        reading: [],
        sreading: [],
        kEleInfo: Array.isArray(k?.info) ? [...k.info, ...posTags] : posTags,
        rEleInfo: [],
        meaning: senses,
        canSelect: true,
      });
    }
  } else if (Array.isArray(d.r_ele) && d.r_ele.length > 0) {
    for (let rIdx = 0; rIdx < d.r_ele.length; ++rIdx) {
      const r = d.r_ele[rIdx];
      records.push({
        ent_seq: `${d.ent_seq}|r${rIdx}`,
        word: Array.isArray(r?.readings) ? (r.readings[0] ?? "") : "",
        reading: [],
        sreading: [],
        kEleInfo: posTags,
        rEleInfo: Array.isArray(r?.info) ? [...r.info] : [],
        meaning: senses,
        canSelect: false,
      });
    }
  } else {
    records.push({
      ent_seq: `${d.ent_seq}|raw`,
      word: "",
      reading: [],
      sreading: [],
      kEleInfo: posTags,
      rEleInfo: [],
      meaning: senses,
      canSelect: false,
    });
  }
  return records;
}

function groupKanjiFlatRecords(
  flatRecs: FlatRecord[],
  readingChanges: Map<string, string[]>,
): (KanjiWordGroup | KanaOnlyGroup)[] {
  const kanjiGroups = new Map<string, KanjiWordGroup>();
  const kanaOnlyGroups: KanaOnlyGroup[] = [];
  for (const fr of flatRecs) {
    const basicWord = (fr.word || "").replace(/\s*\([^)]+\)\s*/g, "");
    const isKanjiWord = containsKanji(basicWord);

    if (isKanjiWord) {
      const kEleInfoStr = (fr.kEleInfo ?? []).join(",");
      const key = `${fr.word}|${kEleInfoStr}`;
      const rEleInfo = fr.rEleInfo || [];
      const frReading = readingChanges.get(fr.ent_seq) ?? fr.sreading;

      if (!kanjiGroups.has(key)) {
        kanjiGroups.set(key, {
          id: key,
          ent_seq_arr: [fr.ent_seq],
          word: fr.word,
          readings: frReading ? [...frReading] : [],
          kEleInfo: fr.kEleInfo ?? [],
          rEleInfos: frReading ? [rEleInfo] : [],
          meanings: fr.meaning ? [...fr.meaning] : [],
          canSelect: fr.canSelect,
        });
      } else {
        const group = kanjiGroups.get(key);
        if (group) {
          frReading.forEach((r) => {
            if (r && !group.readings.includes(r)) {
              group.readings.push(r);
            }
          });
          group.rEleInfos.push(rEleInfo);
          fr.meaning?.forEach((m) => {
            if (m && !group.meanings.includes(m)) {
              group.meanings.push(m);
            }
          });
          if (!group.ent_seq_arr.includes(fr.ent_seq))
            group.ent_seq_arr.push(fr.ent_seq);
          group.canSelect = group.canSelect || fr.canSelect;
        }
      }
    } else {
      kanaOnlyGroups.push({
        id: fr.ent_seq,
        ent_seq: fr.ent_seq,
        word: fr.word,
        reading: fr.reading,
        kEleInfo: fr.kEleInfo,
        rEleInfo: fr.rEleInfo,
        meaning: fr.meaning,
        canSelect: fr.canSelect,
      });
    }
  }

  const kanjiGroupsArr = Array.from(kanjiGroups.values()).sort((a, b) => {
    const ra =
      a.readings.length > 0
        ? getFullWordRading(a.word, a.readings[0] ?? "")
        : "";
    const rb =
      b.readings.length > 0
        ? getFullWordRading(b.word, b.readings[0] ?? "")
        : "";
    if (!ra && rb) return 1;
    if (ra && !rb) return -1;
    if (ra && rb) return ra.localeCompare(rb);
    return 0;
  });

  const kanaOnlyGroupsSorted = kanaOnlyGroups.slice().sort((a, b) => {
    const ra = a.reading[0] ?? "";
    const rb = b.reading[0] ?? "";
    if (!ra && rb) return 1;
    if (ra && !rb) return -1;
    return ra.localeCompare(rb);
  });

  return [...kanjiGroupsArr, ...kanaOnlyGroupsSorted];
}

type KanjiInputData = {
  kanji: string;
  meaning: string[];
  onyomi: string[];
  kunyomi: string[];
  tags: string[];
};

// Multi-Kanji version of AddKanjiRecord's dialog (unchanged)
function KanjiMeaningInputDialog({
  open,
  kanjis,
  onClose,
  onSubmit,
}: {
  open: boolean;
  kanjis: Omit<KanjiWithTag, "meaning" | `${string}yomi`>[];
  onClose: () => void;
  onSubmit: (data: KanjiInputData[], forced?: string[]) => void;
}) {
  // Main state: mapping kanji to all their fields & array fields
  const [data, setData] = useState<KanjiInputData[]>([]);
  const [copiedKanji, setCopiedKanji] = useState<string | null>(null);

  const [allowForce, setAllowForce] = useState(false);

  const { mutateAsync: getKanjiData, isPending: gettingKanjiData } =
    api.db.getKanjiJishoData.useMutation();

  // Utilities
  const updateArrayField = (
    kanji: string,
    field: Exclude<keyof KanjiInputData, "kanji">,
    idx: number,
    value: string,
  ) => {
    setData((prev) => {
      return prev.map((q) => {
        return q.kanji === kanji
          ? { ...q, [field]: q[field].map((q, i) => (i === idx ? value : q)) }
          : q;
      });
    });
  };
  const addArrayItem = (
    kanji: string,
    field: Exclude<keyof KanjiInputData, "kanji">,
    def?: string,
  ) => {
    setData((prev) => {
      return prev.map((q) =>
        q.kanji === kanji ? { ...q, [field]: [...q[field], def ?? ""] } : q,
      );
    });
  };
  const removeArrayItem = (
    kanji: string,
    field: Exclude<keyof KanjiInputData, "kanji">,
    index: number,
  ) => {
    setData((prev) =>
      prev.map((q) =>
        q.kanji === kanji
          ? { ...q, [field]: q[field].filter((_, i) => i !== index) }
          : q,
      ),
    );
  };

  useEffect(() => {
    if (open) {
      setData(
        kanjis
          .filter(
            (q, i1, a) => !a.find((z, i2) => i2 > i1 && q.kanji === z.kanji),
          )
          .map((q) => ({
            kanji: q.kanji,
            kunyomi: [""],
            meaning: [""],
            onyomi: [""],
            tags: q.tags.map((q) => q.name),
          })),
      );
    }
  }, [open, kanjis]);

  useEffect(() => {
    if (allowForce) {
      const timer = setTimeout(() => {
        setAllowForce(false);
      }, 3000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [allowForce]);

  if (!open) return null;
  if (!kanjis.length) return null;

  async function handleCopyKanji(kanji: string) {
    try {
      await navigator.clipboard.writeText(kanji);
      setCopiedKanji(kanji);
      setTimeout(
        () => setCopiedKanji((prev) => (prev === kanji ? null : prev)),
        1200,
      );
    } catch (e) {}
  }

  const handleSubmit: SubmitEventHandler = (e) => {
    e.preventDefault();
    onSubmit(data);
  };

  const handleInvalid: ReactEventHandler<HTMLFormElement> = (e) => {
    if (!allowForce) {
      setAllowForce(true);
      return;
    }
  };

  const handleForce = () => {
    const ok: KanjiInputData[] = [];
    const force: string[] = [];

    for (const k of data) {
      if (
        (k.kunyomi.join("") + k.onyomi.join("") + k.meaning.join("")).length > 0
      )
        ok.push(k);
      else force.push(k.kanji);
    }

    onSubmit(ok, force);
  };

  return (
    <div
      className="fixed top-0 left-0 z-50 flex h-screen w-screen items-center justify-center bg-black/70"
      style={{ backdropFilter: "blur(2px)" }}
    >
      <div
        className="relative max-w-[90vw] min-w-97.5 rounded-2xl border-2 border-emerald-800 bg-slate-900 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 text-center text-2xl font-bold text-emerald-400">
          漢字情報追加
        </h2>
        <div className="absolute top-5 right-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              handleCopyKanji([...new Set(data.map((q) => q.kanji))].join(""))
            }
            className={cn(
              "rounded border border-slate-500 bg-slate-800 px-2 py-1 text-xs text-emerald-300",
              "cursor-pointer transition hover:bg-emerald-800",
            )}
            title="すべての漢字をコピー"
          >
            {copiedKanji === kanjis.join("") ? "〇 コピー" : "コピー"}
          </button>
          <a
            href={`https://jisho.org/search/${encodeURIComponent(kanjis.join(""))}%23kanji`}
            target="_blank"
            rel="noopener"
            aria-label={`Open all kanji in Jisho`}
            title="Open in Jisho.org (kanji page)"
            className={cn(
              "ml-0.5 inline-flex items-center justify-center rounded border",
              "border-blue-300 bg-blue-800 px-2 py-1 text-xs text-blue-100",
              "transition hover:bg-blue-700 active:scale-95",
            )}
            onContextMenu={async (e) => {
              e.preventDefault();

              // load data from jisho

              const kanjis = [...new Set(data.map((q) => q.kanji))];

              const jshoData = await getKanjiData(kanjis);

              console.log(jshoData);

              setData((prev) =>
                prev.map((q) => {
                  const nD = jshoData.find((z) => z.kanji === q.kanji);
                  return nD
                    ? {
                        kanji: q.kanji,
                        kunyomi: nD.kunyomi,
                        meaning: nD.meaning,
                        onyomi: nD.onyomi,
                        tags: nD.tags.map((t) => t.name),
                      }
                    : q;
                }),
              );
            }}
          >
            {gettingKanjiData ? <Spinner /> : "Jisho"}
          </a>
        </div>
        <form
          onSubmit={(ev) => {
            handleSubmit(ev);
          }}
          onInvalid={(e) => {
            handleInvalid(e);
          }}
        >
          <div className="flex max-h-[60vh] flex-col gap-6 overflow-auto pb-3">
            {data.map(({ kanji, kunyomi, meaning, onyomi, tags }) => {
              return (
                <div
                  key={kanji}
                  className="flex flex-col gap-2 border-b border-slate-700 pb-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-blue-200">
                      {kanji}
                    </span>
                    <button
                      type="button"
                      aria-label={`Copy kanji ${kanji}`}
                      title="Copy this kanji"
                      className={cn(
                        "ml-0.5 cursor-pointer rounded border border-slate-400",
                        "bg-slate-700 px-2 py-1 text-xs text-emerald-200 transition",
                        "hover:bg-emerald-800 active:scale-95",
                      )}
                      style={{ minWidth: 38 }}
                      onClick={() => handleCopyKanji(kanji)}
                    >
                      {copiedKanji === kanji ? "〇 コピー" : "コピー"}
                    </button>
                    <a
                      href={`https://jisho.org/search/${encodeURIComponent(
                        kanji,
                      )}%23kanji`}
                      target="_blank"
                      rel="noopener"
                      aria-label={`Open ${kanji} in Jisho`}
                      title="Open in Jisho.org (kanji page)"
                      className={cn(
                        "ml-0.5 inline-flex items-center justify-center rounded border",
                        "border-blue-300 bg-blue-800 px-2 py-1 text-xs text-blue-100",
                        "transition hover:bg-blue-700 active:scale-95",
                      )}
                    >
                      Jisho
                    </a>
                  </div>

                  <ArrayField
                    name="英語"
                    onAddNew={() => {
                      addArrayItem(kanji, "meaning");
                    }}
                    onChange={(idx, v) =>
                      updateArrayField(kanji, "meaning", idx, v)
                    }
                    onPaste={(i, pasted) => {
                      if (pasted.includes(",") || pasted.includes("、")) {
                        const items = pasted
                          .split(/,|、/)
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (items.length > 0) {
                          updateArrayField(kanji, "meaning", i, items[0] ?? "");
                          // Add the rest:
                          for (let idx = 1; idx < items.length; idx++) {
                            addArrayItem(kanji, "meaning", items[idx]);
                          }
                        }
                        return true;
                      }
                    }}
                    onRemove={(idx) => removeArrayItem(kanji, "meaning", idx)}
                    value={meaning}
                    placeholder="例： open"
                    required
                  />

                  <ArrayField
                    name="音読み"
                    onAddNew={() => {
                      addArrayItem(kanji, "onyomi");
                    }}
                    onChange={(idx, v) =>
                      updateArrayField(kanji, "onyomi", idx, v)
                    }
                    onPaste={(i, pasted) => {
                      if (pasted.includes(",") || pasted.includes("、")) {
                        const items = pasted
                          .split(/,|、/)
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (items.length > 0) {
                          updateArrayField(kanji, "onyomi", i, items[0] ?? "");
                          // Add the rest:
                          for (let idx = 1; idx < items.length; idx++) {
                            addArrayItem(kanji, "onyomi", items[idx]);
                          }
                        }
                        return true;
                      }
                    }}
                    onRemove={(idx) => removeArrayItem(kanji, "onyomi", idx)}
                    value={onyomi}
                    placeholder="例：クウ"
                    required
                  />

                  <ArrayField
                    name="訓読み"
                    onAddNew={() => {
                      addArrayItem(kanji, "kunyomi");
                    }}
                    onChange={(idx, v) =>
                      updateArrayField(kanji, "kunyomi", idx, v)
                    }
                    onPaste={(i, pasted) => {
                      if (pasted.includes(",") || pasted.includes("、")) {
                        const items = pasted
                          .split(/,|、/)
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (items.length > 0) {
                          updateArrayField(kanji, "kunyomi", i, items[0] ?? "");
                          // Add the rest:
                          for (let idx = 1; idx < items.length; idx++) {
                            addArrayItem(kanji, "kunyomi", items[idx]);
                          }
                        }
                        return true;
                      }
                    }}
                    onRemove={(idx) => removeArrayItem(kanji, "kunyomi", idx)}
                    value={kunyomi}
                    placeholder="例：あけ.る"
                    required
                  />

                  <ArrayField
                    name="タグ"
                    onAddNew={() => {
                      addArrayItem(kanji, "tags");
                    }}
                    onChange={(idx, v) =>
                      updateArrayField(kanji, "tags", idx, v)
                    }
                    onPaste={(i, pasted) => {
                      if (pasted.includes(",") || pasted.includes("、")) {
                        const items = pasted
                          .split(/,|、/)
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (items.length > 0) {
                          updateArrayField(kanji, "tags", i, items[0] ?? "");
                          // Add the rest:
                          for (let idx = 1; idx < items.length; idx++) {
                            addArrayItem(kanji, "tags", items[idx]);
                          }
                        }
                        return true;
                      }
                    }}
                    onKeyDown={tagShortcutOKD((val) => {
                      for (const v of val) addArrayItem(kanji, "tags", v);
                    })}
                    onRemove={(idx) => removeArrayItem(kanji, "tags", idx)}
                    value={tags}
                    placeholder="e.g. endure"
                    required
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-row justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                setAllowForce(false);
              }}
              className="flex-1 cursor-pointer rounded-lg bg-slate-700 py-2 font-medium text-slate-300 hover:bg-slate-600"
            >
              取消
            </button>
            <div className="flex flex-1 flex-col">
              <button
                type="submit"
                onClick={allowForce ? handleForce : noop}
                className={cn(
                  "flex-1 cursor-pointer rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500",
                  allowForce &&
                    "border-red-400 bg-orange-600 hover:bg-orange-500",
                )}
              >
                {allowForce ? "強制保存" : "保存"}
              </button>
            </div>
          </div>
          {allowForce && (
            <>
              <div className="flex max-w-full items-center justify-center px-2 text-center text-orange-300">
                強制的に保存しますか？
                <br /> 漢字の無い単語無視する
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

const squishWords = (
  w: FlatRecord[],
  additionalTransform?: (fr: FlatRecord) => FlatRecord,
) => {
  let fW: (Omit<WordRecordData, "tags"> & { tags: string[] })[] = [];
  for (let fw of w) {
    if (additionalTransform) fw = additionalTransform(fw);
    const prevW = fW.find((q) => q.word === fw.word);
    const fwTags = [...fw.kEleInfo, ...fw.rEleInfo];
    if (prevW) {
      fW = fW.map((q) =>
        q.word === prevW.word
          ? {
              ...prevW,
              reading: pushIfNotIn(prevW.reading ?? [], fw.reading),
              meaning: pushIfNotIn(prevW.meaning ?? [], fw.meaning ?? []),
              tags: pushIfNotIn(prevW.tags, fwTags),
            }
          : q,
      );
    } else {
      fW.push({
        word: fw.word,
        reading: [...new Set(fw.reading)],
        meaning: [...new Set(fw.meaning)],
        tags: fwTags,
      });
    }
  }
  return fW;
};

export default function Seed() {
  // #region logic
  const searchParams = useSearchParams();
  const router = useRouter();

  const pageSize = 300;
  const initialPage = Number(searchParams.get("page")) || 0;
  const [page, setPageState] = useState(initialPage);

  const setPage: Dispatch<SetStateAction<number>> = (p) => {
    const pageNum = typeof p === "function" ? p(page) : p;
    setPageState(p);
    const params = new URLSearchParams(searchParams ?? undefined);
    if (pageNum === 0) {
      params.delete("page");
    } else {
      params.set("page", pageNum.toString());
    }
    router.replace(`?${params.toString()}`);
  };

  const [showOkuriganaDialog, setShowOkuriganaDialog] = useState(false);
  const [okuriganaChecked, setOkuriganaChecked] = useState<string[]>([]);

  const [selected, setSelected] = useState<string[]>([]);
  const [showKanjiDialog, setShowKanjiDialog] = useState(false);
  const [newKanjiList, setNewKanjiList] = useState<
    Omit<KanjiWithTag, "onyomi" | "kunyomi" | "meaning">[]
  >([]);
  const [showSavedPopup, setShowSavedPopup] = useState(false);
  const [removedTags, setRemovedTags] = useState<{ w: string; t: string[] }[]>(
    [],
  );
  const [addedTags, setAddedTags] = useState<{ w: string; t: string[] }[]>([]);

  const seedData = api.db.getSeedData.useQuery({
    slice: [page * pageSize, (page + 1) * pageSize],
  });
  const getKanjiQ = api.db.getKanji.useQuery(
    { limit: Number.MAX_SAFE_INTEGER },
    {
      staleTime: 1000 * 60,
    },
  );
  const getWordQ = api.db.getWords.useQuery(
    { limit: Number.MAX_SAFE_INTEGER },
    {
      staleTime: 1000 * 60,
    },
  );

  const [readingUpdates, setReadingUpdates] = useState<
    { ent_seq: string; reading: string[] }[]
  >([]);

  const seedDB = api.db.seed.useMutation();
  const dbUtils = api.useUtils();

  const flatRecords: FlatRecord[] = Array.isArray(seedData.data)
    ? seedData.data.flatMap(flattenDicEntry)
    : [];
  const groupedRecords = groupKanjiFlatRecords(
    flatRecords,
    new Map(readingUpdates.map(({ ent_seq, reading }) => [ent_seq, reading])),
  );

  const entSeqToFlatRec = new Map<string, FlatRecord>();
  flatRecords.forEach((fr) => entSeqToFlatRec.set(fr.ent_seq, fr));

  const selectedRecords = selected
    .map((seq) => entSeqToFlatRec.get(seq))
    .filter(Boolean) as FlatRecord[];

  const allSelectedKanji = uniqueKanjiFromWordsWithTags(
    selectedRecords.map((r) => ({
      tag: r.rEleInfo.map((z) => ({ name: z })),
      word: r.word,
    })),
  );

  const existingKanjiList = (getKanjiQ.data ?? []).map((k) => k.kanji);
  const missingKanji = allSelectedKanji
    .filter((q) => containsKanji(q.kanji))
    .filter((k) => !existingKanjiList.includes(k.kanji));

  const existingWordList =
    getWordQ.data?.map((q) => ({
      word: q.word,
      reading: [...q.rawReading, ...q.reading],
    })) ?? [];

  async function handleSaveToDb(
    kanjiInputs: KanjiInputData[],
    kanjiForced?: string[],
  ) {
    if (
      selectedRecords.length === 0 &&
      (kanjiInputs == null || kanjiInputs.length === 0)
    ) {
      return;
    }

    const finalWords = kanjiForced
      ? selectedRecords.filter((q) => {
          return !q.word.split("").find((k) => kanjiForced.includes(k));
        })
      : selectedRecords;
    const omittedWords = kanjiForced
      ? selectedRecords.filter((q) => {
          return !!q.word.split("").find((k) => kanjiForced.includes(k));
        })
      : [];

    const fW = squishWords(finalWords, (fw) => {
      console.log("squishing", {
        reading:
          readingUpdates.find((q) => q.ent_seq === fw.ent_seq)?.reading ??
          fw.reading,
        sreading: fw.sreading,
      });
      return {
        ...fw,
        reading:
          readingUpdates.find((q) => q.ent_seq === fw.ent_seq)?.reading ??
          fw.reading,
        sreading: fw.sreading,
        kEleInfo: [],
        rEleInfo: [
          ...fw.kEleInfo.filter((kele) => {
            return !removedTags
              .find((rt) => rt.w === fw.word)
              ?.t.includes(kele);
          }),
          ...fw.rEleInfo,
          ...(addedTags.find((at) => at.w === fw.word)?.t ?? []),
        ],
      };
    });
    await seedDB.mutateAsync({
      kanji: kanjiInputs.map((q) => ({
        kanji: q.kanji,
        meaning: q.meaning.map((v) => v.trim()).filter(isTruthy),
        onyomi: q.onyomi.map((v) => v.trim()).filter(isTruthy),
        kunyomi: q.kunyomi.map((v) => v.trim()).filter(isTruthy),
        tags: q.tags.map((v) => v.trim()).filter(isTruthy),
      })),
      words: fW.map((rec) => ({
        word: rec.word,
        reading: [...new Set(rec.reading)],
        meaning: [...new Set(rec.meaning)],
        tags: rec.tags,
      })),
    });
    await dbUtils.db.invalidate();
    setShowSavedPopup(true);
    setTimeout(() => setShowSavedPopup(false), 1600);
    setSelected(omittedWords.map((q) => q.ent_seq));
  }

  const totalItems = 218840;
  const maxPage = Math.floor(totalItems / pageSize) - 1;

  const handleOkuriugana = () => {
    const wordsWithNoOkurigana = selectedRecords.filter(
      (w) => !okuriganaChecked.includes(w.ent_seq),
    );
    for (const word of wordsWithNoOkurigana) {
      if (
        word.word.length === 1 ||
        word.reading.every((r) => r.includes("."))
      ) {
        setOkuriganaChecked((p) => [...p, word.word]);
      } else {
        setShowOkuriganaDialog(true);
      }
    }
  };

  // #endregion logic

  if (seedData.isLoading || getKanjiQ.isLoading || getWordQ.isLoading) {
    return (
      <div className="h-screen w-full bg-slate-900 bg-linear-to-br to-slate-950">
        {showSavedPopup && (
          <div
            key="savedpopup"
            className={cn(
              "animate-fade-in-out fixed top-6 left-1/2 z-50 -translate-x-1/2",
              "rounded-lg border-2 border-emerald-400 bg-emerald-700 px-6 py-3",
              "text-white shadow-lg transition-opacity",
            )}
          >
            保存しました
          </div>
        )}
        <div className="flex h-screen w-full items-center justify-center">
          <svg
            className="h-12 w-12 animate-spin text-blue-200"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth={4}
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span className="ml-4 text-xl font-bold tracking-wide text-blue-100">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex w-full flex-row flex-wrap justify-around gap-4 bg-slate-900 bg-linear-to-br to-slate-950 p-4 select-none"
      style={{ userSelect: "none" }}
    >
      <nav
        className="sticky top-4 left-0 z-30 flex flex-row items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/95 px-8 py-3 shadow-lg shadow-blue-900/40 backdrop-blur-sm"
        style={{ minWidth: 350, marginBottom: "1.3rem" }}
      >
        <Link
          className={cn(
            "ml-2 rounded-lg border-2 border-blue-900 bg-linear-to-r from-blue-950 to-blue-700",
            "px-4 py-2 font-semibold text-blue-100 shadow-md transition-all hover:from-blue-800",
            "cursor-pointer hover:to-blue-900 active:scale-95",
          )}
          href={"/db"}
          title="Go to DB page"
        >
          <span className="tracking-wider">DB</span>
        </Link>
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          disabled={page === 0}
          className={cn(
            "mx-1 rounded-full border border-slate-600 bg-blue-950 px-4 py-2 text-xl font-bold text-white",
            "shadow-sm transition hover:bg-blue-900 hover:shadow-md active:scale-95 disabled:cursor-not-allowed",
            "disabled:bg-slate-700 disabled:text-slate-400",
            "cursor-pointer",
          )}
          title="Previous Page"
          type="button"
        >
          &lt;
        </button>
        <span className="min-w-6 px-2 text-center text-lg font-bold text-blue-200 drop-shadow-sm">
          {page}/{maxPage}
        </span>
        <button
          onClick={() => setPage((prev) => Math.min(prev + 1, maxPage))}
          disabled={page >= maxPage}
          className={cn(
            "mx-1 rounded-full border border-slate-600 bg-blue-950 px-4 py-2 text-xl font-bold text-white",
            "shadow-sm transition hover:bg-blue-900 hover:shadow-md active:scale-95 disabled:cursor-not-allowed",
            "disabled:bg-slate-700 disabled:text-slate-400",
            "cursor-pointer",
          )}
          title="Next Page"
          type="button"
        >
          &gt;
        </button>
        {showSavedPopup && (
          <div
            key="savedpopup"
            className={cn(
              "animate-fade-in-out fixed top-6 left-1/2 z-50 -translate-x-1/2",
              "rounded-lg border-2 border-emerald-400 bg-emerald-700 px-6 py-3",
              "text-white shadow-lg transition-opacity",
            )}
          >
            保存しました
          </div>
        )}
        <button
          className={cn(
            "ml-2 rounded-lg border-2 border-green-800 bg-linear-to-br from-emerald-950 via-emerald-900",
            "to-emerald-800 px-4 py-2 font-semibold text-emerald-100 shadow-md transition-all hover:from-emerald-800",
            "hover:to-emerald-500 hover:shadow-lg active:scale-95",
            "cursor-pointer",
            missingKanji.length > 0 &&
              "border-lime-500 to-lime-400 hover:from-lime-400",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-slate-400",
            "disabled:bg-slate-700 disabled:text-slate-300 disabled:opacity-60",
          )}
          disabled={selectedRecords.length === 0}
          type="button"
          onClick={async () => {
            if (selected.some((t) => !okuriganaChecked.includes(t))) {
              handleOkuriugana();
            } else if (missingKanji.length > 0) {
              setNewKanjiList(missingKanji);
              setShowKanjiDialog(true);
            } else {
              handleSaveToDb([]);
            }
          }}
        >
          {seedDB.isPending ||
          getKanjiQ.isPending ||
          getWordQ.isPending ||
          seedData.isPending ? (
            <svg
              className="mx-auto h-5 w-5 animate-spin text-emerald-100"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
          ) : (
            "保存"
          )}
        </button>
        <button
          className={cn(
            "ml-2 rounded-lg border-2 border-purple-900 bg-linear-to-r",
            "from-purple-950 to-purple-700 px-3 py-2 font-semibold",
            "text-purple-200 shadow-md transition-all hover:from-purple-700",
            "text-base hover:to-purple-800 active:scale-95 sm:px-4",
            "cursor-pointer sm:py-2 sm:text-lg",
          )}

          onClick={() => {
            if (!flatRecords.length) return;
            const allSelectable = flatRecords
              .filter((fr) => fr.canSelect)
              .map((fr) => fr.ent_seq);

            const allSelected =
              allSelectable.length > 0 &&
              allSelectable.every((seq) => selected.includes(seq));

            if (allSelectable.length === 0) return;

            if (allSelected) {
              setSelected((prev) =>
                prev.filter((seq) => !allSelectable.includes(seq)),
              );
            } else if (selected.some((seq) => allSelectable.includes(seq))) {
              setSelected((prev) => {
                const newSelected = new Set(prev);
                allSelectable.forEach((seq) => {
                  if (newSelected.has(seq)) {
                    newSelected.delete(seq);
                  } else {
                    newSelected.add(seq);
                  }
                });
                return Array.from(newSelected);
              });
            } else {
              setSelected((prev) =>
                Array.from(new Set([...prev, ...allSelectable])),
              );
            }
          }}
          title="Select/deselect/toggle all selectable entries on this page"
          type="button"
        >
          <span className="tracking-wider">全部</span>
        </button>
        <button
          className={cn(
            "ml-2 rounded-lg border-2 border-yellow-900 bg-linear-to-r from-yellow-950 to-yellow-700",
            "px-4 py-2 font-semibold text-yellow-100 shadow-md transition-all hover:from-yellow-800",
            "cursor-pointer hover:to-yellow-900 active:scale-95",
          )}
          onClick={() => {
            const kanjiSelectable = flatRecords
              .filter(
                (fr) =>
                  fr.canSelect &&
                  containsKanji(
                    (fr.word ?? "").replace(/\s*\([^)]+\)\s*/g, ""),
                  ),
              )
              .map((fr) => fr.ent_seq);
            if (kanjiSelectable.length === 0) return;
            setSelected((prev) =>
              Array.from(new Set([...prev, ...kanjiSelectable])),
            );
          }}
          title="Select all selectable entries on this page whose word contains kanji"
          type="button"
        >
          <span className="tracking-wider">漢字</span>
        </button>
      </nav>

      <KanjiMeaningInputDialog
        open={showKanjiDialog}
        kanjis={newKanjiList}
        onClose={() => setShowKanjiDialog(false)}
        onSubmit={(kanjiInput, forced) => {
          setShowKanjiDialog(false);
          handleSaveToDb(kanjiInput, forced);
        }}
      />

      <OkuriganaInputDialog
        onFinish={(early) => {
          setTimeout(() => setShowOkuriganaDialog(false), 0);
          if (!early) {
            if (missingKanji.length > 0) {
              setNewKanjiList(missingKanji);
              setShowKanjiDialog(true);
            } else {
              handleSaveToDb([]);
            }
          }
        }}
        canClose
        updateReading={(ent_seq, reading) => {
          setReadingUpdates((prev) => {
            const nP = [...prev];
            return prev.find((q) => q.ent_seq === ent_seq)
              ? prev.map((q) =>
                  q.ent_seq === ent_seq ? { ent_seq, reading } : q,
                )
              : [...prev, { ent_seq, reading }];
          });
          setOkuriganaChecked((p) => [...new Set([...p, ent_seq])]);
        }}
        words={selectedRecords
          .filter((w) => !okuriganaChecked.includes(w.ent_seq))
          .map((w) => ({ reading: w.reading, word: w.word, id: w.ent_seq }))}
        open={showOkuriganaDialog}
      />

      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {groupedRecords.map((group, i) => {
          const normalizeIterationMark = (str: string) => {
            return str.replace(/([\p{sc=Han}])々/gu, "$1$1");
          };
          const thisNormWord = normalizeIterationMark(group.word ?? "");
          const shouldSkip = groupedRecords.some(
            (other) =>
              other !== group &&
              normalizeIterationMark(other.word ?? "") === thisNormWord,
          );
          if (shouldSkip) return null;
          if ("readings" in group) {
            const selectedEntSeqs = group.ent_seq_arr.filter((entSeq) =>
              selected.includes(entSeq),
            );

            const handleClickReading = (
              reading: string,
              readingIdx: number,
            ) => {
              const entSeq = group.ent_seq_arr[readingIdx];
              if (typeof entSeq !== "string") return;
              const isSelected = selected.includes(entSeq);

              setSelected((prev) => {
                if (isSelected) {
                  return prev.filter((x) => x !== entSeq);
                } else {
                  return [...prev, entSeq];
                }
              });
            };
            return (
              <div
                key={group.id}
                data-groupid={group.id}
                data-can-select={group.canSelect ? "true" : "false"}
                className={cn(
                  "relative flex min-h-8 flex-1 flex-col items-stretch rounded-2xl border bg-linear-to-br from-slate-950 to-slate-900 transition duration-150",
                  selectedEntSeqs.length > 0
                    ? "border-yellow-400 bg-linear-to-br from-yellow-950 via-yellow-900 to-yellow-900 ring-2 ring-yellow-800"
                    : "",
                  existingWordList.find((w) => {
                    return (
                      w.word === group.word &&
                      !!group.readings.find((r) => w.reading.includes(r))
                    );
                  })
                    ? "border-green-400 bg-linear-to-br from-green-950 via-green-950 to-green-900 ring-2 ring-green-800"
                    : "border-slate-800 hover:shadow-lg",
                )}
              >
                <div className="flex min-w-0 flex-row items-start gap-2 px-6 pt-5 pb-3">
                  <div
                    className="min-w-0 flex-1"
                    onMouseDown={(e) => {
                      if (e.buttons & 0b100) {
                        e.preventDefault();
                        existingWordList.forEach((w) => {
                          if (w.word === group.word)
                            console.log(
                              w.word,
                              group.word === w.word,
                              group.readings,
                              w.reading,
                              w.reading.map((r) =>
                                getFullWordRading(w.word, r),
                              ),
                            );
                        });
                      }
                    }}
                  >
                    <KanjiWordDisplay
                      word={group.word}
                      readings={group.readings}
                      kEleInfo={group.kEleInfo}
                      rEleInfos={group.rEleInfos}
                      meanings={group.meanings}
                      addedTags={addedTags.find((q) => q.w === group.word)?.t}
                      addTag={(_t) => {
                        const t = _t.trim().toLowerCase();
                        if (!t) return;
                        const tag = `${t.trim().toLowerCase()}`;
                        console.log("adding tag", tag);
                        if (addedTags.find((q) => q.w === group.word)) {
                          setAddedTags((prev) =>
                            prev.map((atw) => {
                              return atw.w === group.word
                                ? {
                                    ...atw,
                                    t: atw.t.includes(tag)
                                      ? atw.t.filter((z) => z !== tag)
                                      : [...atw.t, tag],
                                  }
                                : atw;
                            }),
                          );
                        } else {
                          setAddedTags((prev) => [
                            ...prev,
                            { w: group.word, t: [tag] },
                          ]);
                        }
                      }}
                      removedTags={
                        removedTags.find((q) => q.w === group.word)?.t
                      }
                      toggleExistingTag={(tag) => {
                        if (removedTags.find((q) => q.w === group.word)) {
                          setRemovedTags((prev) =>
                            prev.map((rtw) => {
                              return rtw.w === group.word
                                ? {
                                    ...rtw,
                                    t: rtw.t.includes(tag)
                                      ? rtw.t.filter((z) => z !== tag)
                                      : [...rtw.t, tag],
                                  }
                                : rtw;
                            }),
                          );
                        } else {
                          setRemovedTags((p) => [
                            ...p,
                            { w: group.word, t: [tag] },
                          ]);
                        }
                      }}
                      inDB={existingWordList.filter((w) => {
                        return (
                          w.word === group.word &&
                          !!group.readings.find((r) => w.reading.includes(r))
                        );
                      })}
                      nth={i}
                      canSelect={group.canSelect}
                      selectedEntSeqs={selected}
                      entSeqArr={group.ent_seq_arr}
                      onClickReading={
                        group.canSelect ? handleClickReading : undefined
                      }
                    />
                  </div>
                </div>
                {selectedEntSeqs.length > 0 && (
                  <span className="absolute top-2 right-3 z-10 rounded-full border border-green-300 bg-green-600 px-3 py-1 text-xs font-bold text-white shadow-inner">
                    {selectedEntSeqs.length >= 2
                      ? `✓ ×${selectedEntSeqs.length}`
                      : "✓"}
                  </span>
                )}
              </div>
            );
          } else {
            const isSelected = selected.includes(group.ent_seq);

            const handleClick = group.canSelect
              ? (e: React.MouseEvent<HTMLDivElement>) => {
                  e.stopPropagation();
                  if (isSelected) {
                    setSelected((prev) =>
                      prev.filter((x) => x !== group.ent_seq),
                    );
                  } else {
                    setSelected((prev) =>
                      prev.includes(group.ent_seq)
                        ? prev
                        : [...prev, group.ent_seq],
                    );
                  }
                }
              : undefined;

            return (
              <KanaOnlyRecord
                key={group.id}
                nth={i}
                word={group.word}
                reading={group.reading}
                kEleInfo={group.kEleInfo}
                rEleInfo={group.rEleInfo}
                meaning={group.meaning}
                tags={[
                  ...(group.kEleInfo ?? []),
                  ...(group.rEleInfo ?? []),
                ].map((q) => ({ name: q }))}
                isSelected={isSelected}
                onClick={handleClick}
                data-seq={group.ent_seq}
                data-can-select={group.canSelect ? "true" : "false"}
              />
            );
          }
        })}
      </div>
    </div>
  );
}
