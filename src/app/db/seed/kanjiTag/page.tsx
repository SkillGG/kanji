"use client";

import { cn } from "cn";
import { useEffect, useState } from "react";
import { tagShortcutOKD } from "~/app/_components/db/addRecords";
import { extractTags } from "~/lib/tags";
import { toggleMultiple } from "~/lib/utils";
import { api } from "~/trpc/react";

const COMMON_TAGS: {
  name: string;
  tag: string;
}[] = [
  { name: "N1", tag: "(n1)" },
  { name: "N2", tag: "(n2)" },
  { name: "N3", tag: "(n3)" },
  { name: "N4", tag: "(n4)" },
  { name: "N5", tag: "(n5)" },
  { name: "g1", tag: "(g1)" },
  { name: "g2", tag: "(g2)" },
  { name: "g3", tag: "(g3)" },
  { name: "g4", tag: "(g4)" },
  { name: "g5", tag: "(g5)" },
  { name: "g6", tag: "(g6)" },
  { name: "jh", tag: "(jh)" },
  { name: "hs", tag: "(hs)" },
  { name: "joyo", tag: "(joyo)" },
];

const TAG_CONFLICTS = [
  ["g1", "g2", "g3", "g4", "g5", "g6", "jh", "hs"],
  ["joyo", "hyougai"],
  ["N1", "N2", "N3", "N4", "N5"],
];

const isTagConflict = (tags: string[]) => {
  for (const tg of TAG_CONFLICTS) {
    const conflicts = tags.filter((t) =>
      extractTags(t).some((e) => tg.includes(e)),
    );
    if (conflicts.length > 1) return conflicts;
  }
  return false;
};

export default function Home() {
  const getKanji = api.db.getKanji.useQuery({
    limit: 9999,
    page: 0,
    nosort: true,
  });
  const updateKanji = api.db.updateKanjiMany.useMutation();

  const kanji = getKanji.data;

  const [kanjiTags, setKanjiTags] = useState<
    { kanji: string; tag: string[] }[]
  >([]);

  const [newtag, setNewtag] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!kanji) return;
    const sorted = kanji.toSorted((a, b) => {
      return a.tag.length > 0 && b.tag.length > 0
        ? 0
        : a.tag.length === 0 && b.tag.length === 0
          ? 0
          : a.tag.length === 0 && b.tag.length > 0
            ? 1
            : -1;
    });
    setKanjiTags(
      sorted.map((q) => ({ kanji: q.kanji, tag: q.tag.map((z) => z.name) })),
    );
    setNewtag(Object.fromEntries(sorted.map((q) => [q.kanji, ""])));
  }, [kanji]);

  const [done, setDone] = useState<string[]>([]);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const st = setTimeout(() => setCopied(false), 1000);
      return () => {
        clearTimeout(st);
      };
    }
  }, [copied]);

  const utils = api.useUtils();

  if (getKanji.isFetching) {
    return <>Loading...</>;
  }

  if (!kanji) {
    return <>No kanji in the DB</>;
  }

  const save = async () => {
    const kanjiThatHadChanges = done
      .map((z) => kanjiTags.find((kt) => kt.kanji === z))
      .filter((q) => !!q)
      .filter((kt) => {
        const og = kanji.find((k) => k.kanji === kt.kanji);
        if (!og) throw new Error(`Invalid kanji ${kt}`);
        let ogT = [...og.tag];
        const nT = [...kt.tag];
        if (ogT.length !== nT.length) return true;
        for (const t of nT) {
          ogT = ogT.filter((q) => q.name !== t);
        }
        return !!ogT.length;
      });

    if (kanjiThatHadChanges.length > 0) {
      console.log("Mutating", kanjiThatHadChanges);
      await updateKanji.mutateAsync(
        kanjiThatHadChanges.map((k) => {
          return { kanji: k.kanji, tags: k.tag };
        }),
      );
      await utils.db.invalidate();
    }
  };

  const markDone = (kanji: string) => {
    setDone((prev) => {
      let v = Infinity;
      const uncheckedPrevKanji: string[] = [];
      const kidx = kanjiTags.findIndex((z) => z.kanji === kanji);
      for (const { kanji: ck } of kanjiTags) {
        if (prev.includes(ck)) continue;
        if (kanjiTags.findIndex((z) => z.kanji === ck) < kidx)
          uncheckedPrevKanji.push(ck);
      }
      return prev.includes(kanji)
        ? prev.filter((k, i) => {
            if (k === kanji) {
              v = i;
            }
            return k !== kanji && i < v;
          })
        : [...prev, ...uncheckedPrevKanji, kanji];
    });
  };
  return (
    <div className="px-15 pt-4">
      <div className="fixed top-2 right-1 grid gap-2">
        <button
          onClick={() => save()}
          className="cursor-pointer rounded-xl border border-green-800 bg-green-200 px-2 py-2"
        >
          {updateKanji.isPending ? "..." : "Save"}
        </button>
        <button
          onClick={async () => {
            const num = Number(prompt("How many?", `5`));
            if (!num) return;
            const sIdx = kanjiTags.findIndex((q) => !done.includes(q.kanji));
            const toCopy = kanjiTags
              .slice(sIdx, sIdx + num)
              .map((q) => q.kanji)
              .join("");
            setCopied(true);
            await navigator.clipboard.writeText(toCopy);
          }}
          className="cursor-pointer rounded-xl border border-cyan-800 bg-cyan-200 px-2 py-2"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mx-2 grid grid-cols-2 gap-2">
        {kanjiTags.map(({ kanji, tag }) => {
          const tagConflict = isTagConflict(tag);
          return (
            <div
              key={kanji}
              onClick={(e) => {
                markDone(kanji);
              }}
              className={cn(
                "flex flex-row rounded border bg-white p-2",
                tagConflict && "border-red-400 bg-orange-500/20",
              )}
            >
              <div className="shrink">
                <span className="font-bold">
                  {kanji}{" "}
                  <input
                    tabIndex={-1}
                    type="checkbox"
                    id={`${kanji}_odne`}
                    checked={done.includes(kanji)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => {
                      markDone(kanji);
                    }}
                  />
                </span>
              </div>
              <div className="mb-2 flex grow flex-wrap items-center justify-end-safe gap-2">
                <label
                  className="flex items-center gap-1 text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tag.map((ut) => (
                    <span
                      key={`${kanji}_unc_${ut}`}
                      className={cn(
                        tagConflict &&
                          tagConflict.includes(ut) &&
                          "text-red-400 underline decoration-red-400",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setKanjiTags((prev) => {
                          return prev.map((q) =>
                            q.kanji === kanji
                              ? {
                                  ...q,
                                  tag: q.tag.filter((t) => t !== ut),
                                }
                              : q,
                          );
                        });
                      }}
                    >
                      {COMMON_TAGS.find((t) => t.tag === ut)?.name || ut}
                    </span>
                  ))}
                  <input
                    onClick={(e) => e.stopPropagation()}
                    type="text"
                    className="rounded border p-1 text-xs"
                    value={newtag[kanji] ?? ""}
                    onChange={({ currentTarget: { value } }) => {
                      setNewtag((prev) => {
                        return { ...prev, [kanji]: value };
                      });
                    }}
                    onKeyDown={(e) => {
                      console.log(e.code);
                      const prevent = tagShortcutOKD((tags) => {
                        setKanjiTags((prev) => {
                          return prev.map((q) =>
                            q.kanji === kanji
                              ? {
                                  ...q,
                                  tag: toggleMultiple(q.tag, tags),
                                }
                              : q,
                          );
                        });
                      })({
                        alt: e.altKey,
                        code: e.code,
                        ctrl: e.ctrlKey,
                        caps: e.getModifierState("CapsLock"),
                        shift: e.shiftKey,
                      });
                      if (prevent) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      if (e.code === "Enter") {
                        setKanjiTags((prev) => {
                          const _ntk = newtag[kanji]?.trim();
                          if (_ntk) {
                            const ntgs = _ntk
                              .split(" ")
                              .map(
                                (ntk) =>
                                  `${ntk.startsWith("(") ? "" : "("}${ntk}${ntk.endsWith(")") ? "" : ")"}`,
                              );
                            return prev.map((q) =>
                              q.kanji === kanji
                                ? {
                                    kanji: kanji,
                                    tag: toggleMultiple(q.tag, ntgs),
                                  }
                                : q,
                            );
                          }
                          return prev;
                        });
                        setNewtag((prev) => {
                          return { ...prev, [kanji]: "" };
                        });
                      }
                      if (
                        e.code === "Backspace" &&
                        e.currentTarget.value === ""
                      ) {
                        setNewtag((prev) => ({ ...prev, [kanji]: "" }));
                        setKanjiTags((prev) => {
                          return prev.map((q) => {
                            const nt = [...q.tag];
                            nt.pop();
                            return q.kanji === kanji ? { ...q, tag: nt } : q;
                          });
                        });
                      }
                      if (e.code === "Tab") {
                        markDone(kanji);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
