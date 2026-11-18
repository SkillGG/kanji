import React, { useRef, useState, type ReactElement } from "react";
import { api } from "~/trpc/react";
import { SpinnerOrText } from "../spinnerOn";
import { tagShortcuts } from "~/lib/tags";
import { isTruthy, noop, toggleMultiple } from "~/lib/utils";

type KeyboardEventInfo = {
  code: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  caps: boolean;
};

const checkSuperState = (key: boolean | undefined, state: boolean) => {
  if (typeof key === "undefined") {
    return key && !state;
  } else {
    return key !== state;
  }
};

export function tagShortcutOKD(toggle: (v: string[]) => void) {
  return ({ code, alt, shift, ctrl, caps }: KeyboardEventInfo) => {
    let added = false;
    for (const ts of tagShortcuts) {
      if (
        checkSuperState(ts.alt, alt) ||
        checkSuperState(ts.ctrl, ctrl) ||
        checkSuperState(ts.shift, shift) ||
        checkSuperState(ts.caps, caps)
      )
        continue;
      let expArr = ts.code.exec(code);
      do {
        if (!expArr) break;
        const val = ts.extract(expArr);
        for (const v of val) {
          if (v) {
            toggle([v]);
            added = true;
          }
        }
        expArr = ts.code.exec(code);
      } while (expArr);
    }
    return added;
  };
}

export function ArrayField<T extends string = string>({
  name,
  value: arr,
  onAddNew,
  onRemove,
  onPaste,
  onChange,
  onKeyDown,
  placeholder,
  addInfo,
  required,
}: {
  name: string;
  value: T[];
  onAddNew(): void;
  onPaste(idx: number, val: string): boolean | void;
  onRemove(idx: number): void;
  onChange(idx: number, v: string): void;
  onKeyDown?: (keyInfo: KeyboardEventInfo) => boolean;
  placeholder?: string;
  addInfo?: ReactElement;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLDivElement>(null);

  const focusLastInput = () => {
    setTimeout(() => {
      if (inputRef.current) {
        const inps = inputRef.current.querySelectorAll(
          "div[data-field='arrayinput']",
        );
        const lastInp = [...inps][inps.length - 1];
        lastInp?.querySelector("input")?.focus();
      }
    }, 10);
  };

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">
          {name}
        </label>
        <div className="space-y-2" ref={inputRef}>
          {addInfo}
          {arr.map((val, i) => (
            <div key={i} className="flex gap-2" data-field="arrayinput">
              <input
                required={required && i === 0}
                type="text"
                value={val}
                onChange={(e) => onChange(i, e.currentTarget.value)}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                placeholder={placeholder}
                onKeyDown={(e) => {
                  console.log(e.code);
                  if (e.code === "Escape") {
                    onRemove(i);
                    e.preventDefault();
                    e.stopPropagation();
                    focusLastInput();
                  } else if (e.code === "Comma" && e.ctrlKey) {
                    onAddNew();
                    focusLastInput();
                  } else {
                    const stop = onKeyDown?.({
                      alt: e.altKey,
                      code: e.code,
                      ctrl: e.ctrlKey,
                      shift: e.shiftKey,
                      caps: e.getModifierState("CapsLock"),
                    });
                    if (stop) {
                      e.preventDefault();
                      focusLastInput();
                    }
                  }
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text").trim();
                  const prevent = onPaste(i, pasted);
                  if (prevent) e.preventDefault();
                  else {
                    e.preventDefault();
                    onChange(i, pasted);
                  }
                  focusLastInput();
                }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  onRemove(i);
                  focusLastInput();
                }}
                className="rounded-lg bg-red-900/50 px-3 py-2 text-red-400 hover:bg-red-900/70"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={(e) => {
              onAddNew();
              focusLastInput();
            }}
            tabIndex={-1}
            className="w-full rounded-lg border border-dashed border-slate-500 py-2 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-300"
          >
            +
          </button>
        </div>
      </div>
    </>
  );
}

export function AddKanjiRecord() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [kanji, setKanji] = useState<string>("");
  const [onyomi, setOnyomi] = useState<string[]>([""]);
  const [kunyomi, setKunyomi] = useState<string[]>([""]);
  const [meanings, setMeanings] = useState<string[]>([""]);
  const [tags, setTags] = useState<string[]>([""]);

  const utils = api.useUtils();

  const addKanji = api.db.addKanji.useMutation({
    onSuccess: () => {
      dialogRef.current?.close();
      window.location.reload();
      setKanji("");
      setOnyomi([""]);
      setKunyomi([""]);
      setMeanings([""]);
      setTags([""]);
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
      <button
        className="group relative flex w-full grow basis-64 cursor-pointer items-center gap-4 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-lg shadow-black/20 transition-shadow hover:shadow-xl hover:shadow-black/30"
        onClick={() => dialogRef.current?.showModal()}
      >
        + 追加
      </button>

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
          漢字追加
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addKanji.mutate({
              kanji,
              onyomi: onyomi.filter((r) => !!r),
              kunyomi: kunyomi.filter((r) => !!r),
              meaning: meanings.filter((r) => !!r),
              tag: tags.filter((r) => !!r),
            });
            utils.db.getKanji.invalidate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              漢字
            </label>
            <input
              type="text"
              value={kanji}
              onChange={(e) => setKanji(e.target.value)}
              placeholder="例：忍"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <ArrayField
            name="意味"
            value={meanings}
            onAddNew={() => addArrayItem(setMeanings)}
            onChange={(idx, v) => updateArrayField(setMeanings, idx, v)}
            onRemove={(i) => removeArrayItem(setMeanings, i)}
            placeholder="例：to kill"
            onPaste={noop}
          />

          <ArrayField
            name="音読み"
            value={onyomi}
            onAddNew={() => addArrayItem(setOnyomi)}
            onChange={(idx, v) => updateArrayField(setOnyomi, idx, v)}
            onRemove={(i) => removeArrayItem(setOnyomi, i)}
            placeholder="例：サツ"
            onPaste={noop}
          />

          <ArrayField
            name="訓読み"
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
            onAddNew={() => addArrayItem(setTags)}
            onChange={(idx, v) => updateArrayField(setTags, idx, v)}
            onRemove={(i) => removeArrayItem(setTags, i)}
            placeholder="例：N1"
            onPaste={noop}
            onKeyDown={tagShortcutOKD((tags) =>
              setTags((p) => toggleMultiple(p, tags)),
            )}
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="flex-1 rounded-lg bg-slate-700 py-2 font-medium text-slate-300 hover:bg-slate-600"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={addKanji.isPending}
              className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              決定
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function AddWordRecord() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [word, setWord] = useState<string>("");
  const [reading, setReading] = useState<string[]>([""]);
  const [meaning, setMeaning] = useState<string[]>([""]);
  const [tags, setTag] = useState<string[]>([""]);

  const utils = api.useUtils();

  const addWord = api.db.addWord.useMutation({
    onSuccess: () => {
      dialogRef.current?.close();
      setWord("");
      setReading([""]);
      setMeaning([""]);
      setTag([""]);
      utils.db.getWords.invalidate();
    },
  });

  return (
    <>
      <button
        className="group relative flex w-full grow basis-64 cursor-pointer items-center gap-4 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-lg shadow-black/20 transition-shadow hover:shadow-xl hover:shadow-black/30"
        onClick={() => dialogRef.current?.showModal()}
        disabled={addWord.isPending}
      >
        <SpinnerOrText loading={addWord.isPending} text={<>+ 追加</>} />
      </button>
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
        <h2 className="mb-4 text-xl font-bold text-slate-100">言葉追加</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await addWord.mutateAsync({
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
              言葉
            </label>
            <input
              type="text"
              value={word}
              required
              minLength={1}
              onChange={(e) => setWord(e.target.value)}
              placeholder="例：食べる"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
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
            placeholder="e.g. v5"
            onChange={(idx, v) =>
              setTag((p) => p.map((el, i) => (i === idx ? v : el)))
            }
            onAddNew={() => setTag((p) => [...p, ""])}
            onRemove={(idx) => setTag((p) => p.filter((_, i) => i !== idx))}
            onPaste={noop}
            onKeyDown={tagShortcutOKD((tags) =>
              setTag((p) => toggleMultiple(p, tags)),
            )}
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="flex-1 rounded-lg bg-slate-700 py-2 font-medium text-slate-300 hover:bg-slate-600"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={addWord.isPending}
              className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <SpinnerOrText loading={addWord.isPending} text="決定" />
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
