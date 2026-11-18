import { KanjiEditDialog, WordEditDialog } from "./editDialogs";
import { getFullTagName } from "~/lib/tags";
import { cn } from "cn";
import { JapaneseRuby } from "../ruby";

export type Tag = { name: string };

export type KanjiRecordData = {
  kanji: string;
  meaning?: string[] | null;
  onyomi?: string[] | null;
  kunyomi?: string[] | null;
  tags?: Tag[] | null;
};

export type WordRecordData = {
  word: string;
  reading?: string[];
  meaning?: string[] | null;
  tags?: Tag[] | null;
};

export function TagChips({ tags }: { tags?: Tag[] | null }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {tags.map((tag, i) => (
        <span
          key={`tag-chip-${tag}-${i}`}
          className="rounded-full border border-purple-700 bg-purple-900/60 px-2 py-0.5 text-xs font-medium text-purple-300"
          title={getFullTagName(tag.name)}
        >
          {getFullTagName(tag.name).length <= "Abbreviation".length
            ? getFullTagName(tag.name)
            : getFullTagName(tag.name, true).length <= "Abbreviation".length
              ? getFullTagName(tag.name, true)
              : tag.name.replace(/^\((.*?)\)$/, "$1")}
        </span>
      ))}
    </div>
  );
}

export function KanjiRecord({
  kanji,
  kunyomi,
  nth,
  onyomi,
  meaning,
  tags,
  update,
}: KanjiRecordData & { nth: number; update(): void }) {
  const hasKunyomi = kunyomi && kunyomi.length > 0;
  const hasOnyomi = onyomi && onyomi.length > 0;
  const hasMeanings = meaning && meaning.length > 0;

  return (
    <div
      className={cn(
        "group relative flex max-h-128 w-full grow basis-64 items-center gap-4 overflow-y-auto rounded-lg border border-slate-700",
        "bg-slate-900 p-4 shadow-lg shadow-black/20 transition-shadow hover:shadow-xl hover:shadow-black/30",
      )}
    >
      <KanjiEditDialog
        data={{
          kanji,
          onyomi: onyomi ?? [],
          kunyomi: kunyomi ?? [],
          meaning,
          tags,
        }}
        update={update}
      />

      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-3xl font-bold text-slate-100">
        {kanji}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {hasMeanings && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 rounded bg-blue-900/60 px-2 py-0.5 text-xs font-medium text-blue-400">
              意味
            </span>
            <div className="flex flex-wrap gap-2">
              {meaning.map((m, i) => (
                <span key={`meaning-${i}`} className="text-sm text-slate-400">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
        {hasKunyomi && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 rounded bg-emerald-900/60 px-2 py-0.5 text-xs font-medium text-emerald-400">
              訓
            </span>
            <div className="flex flex-wrap gap-2">
              {kunyomi!.map((r, i) => (
                <span key={`kun-${i}`} className="text-sm text-slate-300">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
        {hasOnyomi && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 rounded bg-amber-900/60 px-2 py-0.5 text-xs font-medium text-amber-400">
              音
            </span>
            <div className="flex flex-wrap gap-2">
              {onyomi!.map((r, i) => (
                <span key={`on-${i}`} className="text-sm text-slate-300">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
        <TagChips tags={tags} />
      </div>
    </div>
  );
}

export function WordRecord({
  word,
  reading,
  meaning,
  nth,
  tags,
  update,
  canEdit,
}: WordRecordData & {
  nth: number;
  update(): void;
  canEdit?: boolean;
}) {
  const hasMeaning = !!meaning && meaning.length;

  const baseReading = reading?.[0] ?? "";

  return (
    <div className="group relative flex w-full grow basis-50 items-center gap-4 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-lg shadow-black/20 transition-shadow hover:shadow-xl hover:shadow-black/30">
      {canEdit && (
        <WordEditDialog
          data={{ word, reading, meaning, tags }}
          update={update}
        />
      )}
      <JapaneseRuby
        reading={baseReading}
        text={word}
        className={cn(`text-2xl font-medium text-slate-100`)}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        {hasMeaning && (
          <div className="mt-1 flex flex-wrap gap-1">
            {meaning.map((m) => (
              <span
                key={word + "_" + m}
                className="rounded-sm border border-blue-700 bg-blue-900/60 px-2 py-0.5 text-xs font-medium text-blue-400"
              >
                {m}
              </span>
            ))}
          </div>
        )}
        <TagChips
          tags={[
            ...(tags || []),
            ...(reading?.filter((_, i) => i >= 1).map((t) => ({ name: t })) ??
              []),
          ]}
        />
      </div>
    </div>
  );
}
