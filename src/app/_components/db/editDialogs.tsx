import { api } from "~/trpc/react";
import { useEffect, useRef, useState } from "react";
import type { KanjiRecordData, WordRecordData } from "./records";
import { SpinnerOrText } from "../spinnerOn";
import { tagShortcutOKD, ArrayField } from "./addRecords";
import { isTruthy, noop, toggleMultiple } from "~/lib/utils";
import { cn } from "cn";

export function KanjiEditDialog({
  data,
  update,
}: {
  data: KanjiRecordData;
  update(): void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [onyomi, setOnyomi] = useState<string[]>(data.onyomi ?? []);
  const [kunyomi, setKunyomi] = useState<string[]>(data.kunyomi ?? []);
  const [meanings, setMeanings] = useState<string[]>(data.meaning ?? []);
  const [tags, setTags] = useState<string[]>(
    data.tags?.map(({ name }) => name) ?? [],
  );

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const tm = setTimeout(() => {
        setCopied(false);
      }, 1000);
      return () => {
        clearTimeout(tm);
      };
    }
  }, [copied]);

  const updateKanji = api.db.updateKanji.useMutation({
    onSuccess: () => {
      update();
    },
  });

  const removeKanji = api.db.removeKanji.useMutation({
    onSuccess: () => {
      update();
    },
  });

  const updateArrayField = (
    arraySetter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string,
  ) => {
    arraySetter((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addArrayItem = (
    arraySetter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    arraySetter((prev) => [...prev, ""]);
  };

  const removeArrayItem = (
    arraySetter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
  ) => {
    arraySetter((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="absolute top-2 right-2 flex gap-1 font-medium text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => {
            dialogRef.current?.showModal();
          }}
          className="cursor-pointer rounded-md bg-slate-700 px-2 py-1 text-[6.5pt] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-600"
        >
          変更
        </button>
        <button
          onClick={() => {
            void removeKanji.mutateAsync({ kanji: data.kanji });
          }}
          className="cursor-pointer rounded-md border border-red-700 bg-slate-700 px-2 py-1 text-[6.5pt] text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-600"
        >
          x
        </button>
      </div>
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          const rect = dialogRef.current?.getBoundingClientRect();
          if (!rect) return;

          const isInDialog =
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width;

          if (!isInDialog) {
            dialogRef.current?.close();
          }
        }}
        className="m-auto w-full max-w-md rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <h2 className="mb-4 text-center text-3xl font-bold text-slate-100">
          {data.kanji}
        </h2>

        <div className="absolute top-5 right-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(data.kanji);
              setCopied(true);
            }}
            className={cn(
              "rounded border border-slate-500 bg-slate-800 px-2 py-1 text-xs text-emerald-300",
              "cursor-pointer transition hover:bg-emerald-800",
            )}
            title="すべての漢字をコピー"
          >
            {copied ? "〇 コピー" : "コピー"}
          </button>
          <a
            href={`https://jisho.org/search/${encodeURIComponent(data.kanji)}%23kanji`}
            target="_blank"
            rel="noopener"
            aria-label={`Open all kanji in Jisho`}
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateKanji.mutate({
              kanji: data.kanji,
              onyomi: onyomi.filter((r) => r !== ""),
              kunyomi: kunyomi.filter((r) => r !== ""),
              meaning: meanings.filter((r) => r !== ""),
              tags: tags.map((r) => r.trim()).filter((r) => r.length > 0),
            });
          }}
          className="space-y-4"
        >
          <ArrayField
            name="Meaning"
            value={meanings}
            onAddNew={() => addArrayItem(setMeanings)}
            onChange={(idx, v) => updateArrayField(setMeanings, idx, v)}
            onRemove={(i) => removeArrayItem(setMeanings, i)}
            placeholder="例：to kill"
            onPaste={noop}
          />

          <ArrayField
            name="Onyomi"
            value={onyomi}
            onAddNew={() => addArrayItem(setOnyomi)}
            onChange={(idx, v) => updateArrayField(setOnyomi, idx, v)}
            onRemove={(i) => removeArrayItem(setOnyomi, i)}
            placeholder="例：サツ"
            onPaste={noop}
          />

          <ArrayField
            name="Kunyomi"
            value={kunyomi}
            onAddNew={() => addArrayItem(setKunyomi)}
            onChange={(idx, v) => updateArrayField(setKunyomi, idx, v)}
            onRemove={(i) => removeArrayItem(setKunyomi, i)}
            placeholder="例：ころ.す"
            onPaste={noop}
          />

          <ArrayField
            name="タグ"
            value={tags}
            placeholder="例：(v5)"
            onChange={(idx, v) =>
              setTags((p) => p.map((el, i) => (i === idx ? v : el)))
            }
            onAddNew={() => setTags((p) => [...p, ""])}
            onRemove={(idx) => setTags((p) => p.filter((_, i) => i !== idx))}

            onKeyDown={tagShortcutOKD((tags) => {
              setTags((prev) => toggleMultiple(prev, tags));
            })}
            onPaste={noop}
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="flex-1 rounded-lg bg-slate-700 py-2 font-medium text-slate-300 hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateKanji.isPending}
              className={cn(
                "flex-1 rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500",
                "cursor-pointer disabled:cursor-default disabled:bg-emerald-600/50",
              )}
            >
              <SpinnerOrText
                loading={updateKanji.isPending}
                spinnerStyle={{ className: cn("text-green-500 h-7 w-7") }}
                className="flex justify-center"
                text="Save"
              />
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function WordEditDialog({
  data,
  update,
}: {
  data: WordRecordData;
  update: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [word, setWord] = useState<string>(data.word);
  const [reading, setReading] = useState<string[]>(data.reading ?? []);
  const [meaning, setMeaning] = useState<string[]>(data.meaning ?? []);
  const [tags, setTags] = useState<string[]>(
    data.tags?.map(({ name }) => name) ?? [],
  );

  const updateWord = api.db.updateWord.useMutation({
    onSuccess: () => {
      dialogRef.current?.close();
      update();
    },
  });
  const removeWord = api.db.removeWord.useMutation({
    onSuccess: () => {
      update();
    },
  });

  return (
    <>
      <div className="absolute top-2 right-2 flex gap-1 font-medium text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => {
            dialogRef.current?.showModal();
          }}
          className="cursor-pointer rounded-md bg-slate-700 px-2 py-1 text-[6.5pt] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-600"
        >
          変更
        </button>
        <button
          onClick={() => {
            void removeWord.mutateAsync({ word: word });
          }}
          className="cursor-pointer rounded-md border border-red-700 bg-slate-700 px-2 py-1 text-[6.5pt] text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-600"
        >
          x
        </button>
      </div>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          const rect = dialogRef.current?.getBoundingClientRect();
          if (!rect) return;

          const isInDialog =
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width;

          if (!isInDialog) {
            dialogRef.current?.close();
          }
        }}
        className="m-auto w-full max-w-md rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <h2 className="mb-4 text-xl font-bold text-slate-100">Edit Word</h2>

        <form
          onSubmit={(e) => {
            if (!e.target.checkValidity()) {
              console.warn("Invalid data");
              return;
            }
            e.preventDefault();
            updateWord.mutate({
              word,
              reading: reading.filter(isTruthy),
              meaning: meaning.filter(isTruthy),
              tags: tags.filter(isTruthy),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Word
            </label>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g. 食べる"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              required={true}
              minLength={1}
            />
          </div>

          <ArrayField
            name="意味"
            value={meaning}
            placeholder="例：to fall"
            onChange={(idx, v) =>
              setMeaning((p) => p.map((el, i) => (i === idx ? v : el)))
            }
            onAddNew={() => setMeaning((p) => [...p, ""])}
            onRemove={(idx) => setMeaning((p) => p.filter((_, i) => i !== idx))}
            onPaste={noop}
          />

          <ArrayField
            name="読み"
            required
            value={reading}
            placeholder="例：お.ちる"
            onChange={(idx, v) =>
              setReading((p) => p.map((el, i) => (i === idx ? v : el)))
            }
            onAddNew={() => setReading((p) => [...p, ""])}
            onRemove={(idx) => setReading((p) => p.filter((_, i) => i !== idx))}
            addInfo={
              <p className="mt-1 text-xs text-slate-500">
                各文字の読みはドットで区切って入力してください。ルビが不要な文字はドットの間を空白にしてください。
              </p>
            }
            onPaste={noop}
          />

          <ArrayField
            name="タグ"
            value={tags}
            placeholder="例：(v5)"
            onChange={(idx, v) =>
              setTags((p) => p.map((el, i) => (i === idx ? v : el)))
            }
            onAddNew={() => setTags((p) => [...p, ""])}
            onRemove={(idx) => setTags((p) => p.filter((_, i) => i !== idx))}
            onPaste={noop}
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="flex-1 rounded-lg bg-slate-700 py-2 font-medium text-slate-300 hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateWord.isPending}
              className={cn(
                "flex-1 rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500",
                "cursor-pointer disabled:cursor-default disabled:bg-emerald-600/50",
              )}
            >
              <SpinnerOrText
                loading={updateWord.isPending}
                spinnerStyle={{ className: cn("text-green-500 h-7 w-7") }}
                className="flex justify-center"
                text="Save"
              />
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
