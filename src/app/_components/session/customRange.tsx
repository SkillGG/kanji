import { cn } from "cn";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { isTrainingRange, type Training, type TrainingRange } from "~/lib/game";
import { useDebounce } from "~/lib/hooks";
import { isValidRangeId } from "~/lib/sessionScope";
import { getFullTagName } from "~/lib/tags";
import { RANDOM_NUMS, randomBase64, toggleMultiple } from "~/lib/utils";
import { api } from "~/trpc/react";

const WORDSPERPAGE = 150;
const KANJIPERPAGE = 150;

const ERR_TOAST = (msg: ReactNode) => {
  return { msg, className: "border-red-400 bg-red-700", delay: 1500 };
};

export function CustomRange({
  range,
  updateRange,
}: {
  range: TrainingRange;
  updateRange: (ptr: Training) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [forceSkeletons, setForceSkeletons] = useState(false);

  const [_kanjiSearch, setKanjiSearch] = useState("");
  const [_wordSearch, setWordSearch] = useState("");
  const { value: kanjiSearch } = useDebounce(_kanjiSearch, { delay: 800 });
  const { value: wordSearch } = useDebounce(_wordSearch, { delay: 800 });
  const [kanjiPage, setKanjiPage] = useState(0);
  const [wordPage, setWordPage] = useState(0);
  // const [sentenceSearch, setSentenceSearch] = useState("");
  // const [sentencePage, setSentencePage] = useState(0);

  const [chosen, setChosen] = useState<TrainingRange>({
    kanji: [],
    word: [],
  });

  const { data: kanjiTags, isLoading: isKanjiTagLoading } =
    api.session.getKanjiTags.useQuery();
  const { data: wordTags, isLoading: isWordTagLoading } =
    api.session.getWordTags.useQuery();

  const { data: kanji, isLoading: isKanjiLoading } = api.db.getKanji.useQuery({
    limit: KANJIPERPAGE,
    page: kanjiPage,
    search: kanjiSearch.trim() ? kanjiSearch.trim() : undefined,
  });

  const { data: words, isLoading: isWordsLoading } = api.db.getWords.useQuery({
    limit: WORDSPERPAGE,
    page: wordPage,
    search: wordSearch.trim() ? wordSearch.trim() : undefined,
  });

  const { data: wordCount = 0 } = api.db.countWords.useQuery({
    search: !!wordSearch ? wordSearch : undefined,
  });
  const { data: kanjiCount = 0 } = api.db.countKanji.useQuery({
    search: !!kanjiSearch ? kanjiSearch : undefined,
  });

  const [expandTags, setExpandTags] = useState({ word: false, kanji: false });

  const [_id, setId] = useState("");
  const { value: id, holding: isDebouncingID } = useDebounce(_id, {
    delay: 700,
  });
  const {
    data: idInDB,
    isPending: checkingID,
    isFetching: checkingID_f,
    isEnabled: validId,
  } = api.session.checkCustomTagId.useQuery(id, {
    enabled: isValidRangeId(id),
  });
  const { isPending: waitingForSave, mutateAsync: saveCustomTagToDB } =
    api.session.saveCustomTag.useMutation();
  const { isPending: waitingForLoad, mutateAsync: loadCustomTagFromDB } =
    api.session.getCustomTagData.useMutation();

  const [sessionId, setSessionId] = useState("");

  const { data: userCustomTags } =
    api.session.getUserCustomTags.useQuery(sessionId);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem("uid", sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    const id = localStorage.getItem("uid");
    if (id) {
      setSessionId(id);
    }
  }, []);

  const [toast, setToast] = useState<{
    msg: ReactNode;
    delay?: number;
    className?: string;
  } | null>(null);

  useEffect(() => {
    if (toast && toast.msg) {
      const t = setTimeout(() => setToast(null), toast.delay ?? 1000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    if (_kanjiSearch === "fss") {
      setForceSkeletons((p) => !p);
      setKanjiSearch("");
    }
  }, [_kanjiSearch]);

  const utils = api.useUtils();

  const [canConfirm, setCanConfirm] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          dialogRef.current?.showModal();
        }}
        className="mx-2 cursor-pointer rounded-md bg-slate-700 px-2 py-1 text-sm transition-opacity group-hover:opacity-100 hover:bg-slate-600"
      >
        Custom
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
        onClose={() => {
          setExpandTags({ kanji: false, word: false });
          setKanjiPage(0);
          setWordPage(0);
          setWordSearch("");
          setKanjiSearch("");
          setId("");
          setCanConfirm(false);
        }}
        className="m-auto max-h-[90vh] w-full max-w-[90vw] rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <h2 className="mb-4 text-center text-xl font-bold text-slate-100">
          Custom training range
        </h2>
        <div
          onContextMenu={() => setSessionId("")}
          className="absolute top-2 right-3 text-gray-300 opacity-15"
        >
          {sessionId}
        </div>
        {toast && (
          <div
            className={cn(
              "absolute top-2 right-0 left-0 mx-auto w-min",
              "border border-green-300 bg-green-600",
              "px-6 py-2 text-nowrap text-white",
              "rounded-xl",
              toast.className,
            )}
            onClick={() => setToast(null)}
          >
            {toast.msg}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="space-y-4"
        >
          {/* Kanji */}
          <div>
            <div className="my-2 flex justify-center">
              <nav
                className="flex flex-row items-center gap-3 rounded-lg text-sm text-nowrap"
                aria-label="Word Pagination"
              >
                <button
                  type="button"
                  className="cursor-pointer rounded border px-3 py-1 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={kanjiPage <= 0}
                  onClick={() => setKanjiPage((p) => p - 1)}
                  title="Previous page"
                >
                  &lt;
                </button>
                <span className="min-w-8 px-2 text-center text-lg font-semibold tracking-wider text-blue-200">
                  {kanjiPage + 1} / {Math.ceil(kanjiCount / KANJIPERPAGE)}
                </span>
                <button
                  type="button"
                  className="cursor-pointer rounded border border-slate-600 bg-slate-800 px-3 py-1 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    kanjiPage + 1 >= Math.ceil(kanjiCount / KANJIPERPAGE)
                  }
                  onClick={() => setKanjiPage((p) => p + 1)}
                  title="Next page"
                >
                  &gt;
                </button>
                <input
                  type="text"
                  className={cn(
                    "ml-4 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-white",
                    "placeholder-slate-400 focus:border-blue-400 focus:outline-none",
                    "min-w-16",
                  )}
                  placeholder="検索"
                  value={_kanjiSearch ?? ""}
                  onChange={(e) => {
                    setKanjiSearch(e.target.value);
                    setKanjiPage(0);
                  }}
                />
                <div className="flex max-h-56 w-full max-w-[50%] flex-wrap justify-between gap-1 overflow-y-scroll text-sm">
                  {kanjiTags
                    ?.filter((_, i) => (expandTags.kanji ? true : i < 5))
                    .map((kt) => (
                      <button
                        type="button"
                        className={cn(
                          "rounded-xl border border-gray-400 bg-gray-900 px-2 text-white",
                          "cursor-pointer hover:bg-gray-700",
                        )}
                        onClick={async () => {
                          const kanjis = kt.kanji.map((q) => q.kanji);
                          console.log(kanjis);
                          if (kanjis.length) {
                            setChosen((prev) => {
                              return {
                                ...prev,
                                kanji: toggleMultiple(prev.kanji, kanjis),
                              };
                            });
                            setCanConfirm(false);
                          }
                        }}
                        key={`k${kt.name}`}
                      >
                        {getFullTagName(kt.name, true)}
                      </button>
                    ))}
                  <button
                    type="button"
                    className={cn(
                      "rounded-xl border border-gray-400 bg-gray-900 px-2 text-white",
                      "cursor-pointer hover:bg-gray-700",
                    )}
                    onClick={() =>
                      setExpandTags((prev) => ({ ...prev, kanji: !prev.kanji }))
                    }
                  >
                    {expandTags.kanji ? "<" : ">"}
                  </button>
                </div>
              </nav>
            </div>
            {!forceSkeletons && !isKanjiLoading ? (
              <div className="my-1">
                {kanji?.map((q) => {
                  return (
                    <button
                      type="button"
                      key={`toggle_${q.kanji}`}
                      onClick={() => {
                        setChosen((prev) => {
                          return {
                            ...prev,
                            kanji: toggleMultiple(prev.kanji, [q.kanji]),
                          };
                        });
                        setCanConfirm(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.code === "Space" || e.code === "Enter") {
                          setChosen((prev) => ({
                            ...prev,
                            kanji: toggleMultiple(prev.kanji, [q.kanji]),
                          }));
                          setCanConfirm(false);
                          e.preventDefault();
                        }
                      }}
                      className={cn(
                        "mx-1 cursor-pointer rounded-xl border border-slate-700 px-2 text-nowrap text-white hover:bg-slate-700",
                        chosen.kanji.includes(q.kanji) &&
                          "border-green-500 bg-green-800",
                      )}
                    >
                      {q.kanji}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {[...Array(KANJIPERPAGE)].map((_, i) => (
                  <Skeleton
                    key={`kskelet_${i}`}
                    className="mx-1 inline-block h-7.5 w-8 rounded-xl border border-slate-700 bg-slate-800 px-2"
                  />
                ))}
              </div>
            )}
          </div>
          {/* Words */}
          <div>
            <div className="my-2 flex justify-center">
              <nav
                className="flex flex-row items-center gap-3 rounded-lg text-sm text-nowrap"
                aria-label="Word Pagination"
              >
                <button
                  type="button"
                  className="cursor-pointer rounded border px-3 py-1 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={wordPage <= 0}
                  onClick={() => setWordPage((p) => p - 1)}
                  title="Previous page"
                >
                  &lt;
                </button>
                <span className="min-w-8 px-2 text-center text-lg font-semibold tracking-wider text-blue-200">
                  {wordPage + 1} / {Math.ceil(wordCount / WORDSPERPAGE)}
                </span>
                <button
                  type="button"
                  className="cursor-pointer rounded border border-slate-600 bg-slate-800 px-3 py-1 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={wordPage + 1 >= Math.ceil(wordCount / WORDSPERPAGE)}
                  onClick={() => setWordPage((p) => p + 1)}
                  title="Next page"
                >
                  &gt;
                </button>
                <input
                  type="text"
                  className={cn(
                    "ml-4 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-white",
                    "placeholder-slate-400 focus:border-blue-400 focus:outline-none",
                    "min-w-16",
                  )}
                  placeholder="検索"
                  value={_wordSearch ?? ""}
                  onChange={(e) => {
                    setWordSearch(e.target.value);
                    setWordPage(0);
                  }}
                />
                <div className="flex max-h-56 w-full max-w-[50%] flex-wrap justify-between gap-1 overflow-y-scroll text-sm">
                  {wordTags
                    ?.filter((_, i) => (expandTags.word ? true : i < 5))
                    .map((wt) => (
                      <button
                        type="button"
                        className={cn(
                          "rounded-xl border border-gray-400 bg-gray-900 px-2 text-white",
                          "cursor-pointer hover:bg-gray-700",
                        )}
                        onClick={async () => {
                          const words = wt.word.map((q) => q.word);
                          if (words.length) {
                            setChosen((prev) => {
                              return {
                                ...prev,
                                word: toggleMultiple(prev.word, words),
                              };
                            });
                            setCanConfirm(false);
                          }
                        }}
                        key={`w${wt.name}`}
                      >
                        {getFullTagName(wt.name, true)}
                      </button>
                    ))}
                  <button
                    type="button"
                    className={cn(
                      "rounded-xl border border-gray-400 bg-gray-900 px-2 text-white",
                      "cursor-pointer hover:bg-gray-700",
                    )}
                    onClick={() =>
                      setExpandTags((prev) => ({ ...prev, word: !prev.word }))
                    }
                  >
                    {expandTags.word ? "<" : ">"}
                  </button>
                </div>
              </nav>
            </div>
            {!forceSkeletons && !isWordsLoading ? (
              <div className="flex flex-wrap gap-1">
                {words?.map((q) => {
                  return (
                    <button
                      type="button"
                      key={`wtoggle_${q.word}`}
                      onClick={() => {
                        setChosen((prev) => {
                          return {
                            ...prev,
                            word: toggleMultiple(prev.word, [q.word]),
                          };
                        });
                        setCanConfirm(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.code === "Space" || e.code === "Enter") {
                          e.preventDefault();
                          setChosen((prev) => ({
                            ...prev,
                            word: toggleMultiple(prev.word, [q.word]),
                          }));
                          setCanConfirm(false);
                        }
                      }}
                      className={cn(
                        "mx-1 cursor-pointer rounded-xl border border-slate-700 px-2 text-nowrap text-white hover:bg-slate-700",
                        chosen.word.includes(q.word) &&
                          "border-green-500 bg-green-800",
                      )}
                    >
                      {q.word}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {[...Array(WORDSPERPAGE - 6)].map((_, i) => {
                  return (
                    <Skeleton
                      key={`skelet_${i}`}
                      className="mx-1 h-7.5 rounded-xl border border-slate-700 bg-slate-800 px-2"
                      style={{
                        width: `${(RANDOM_NUMS[i] ?? RANDOM_NUMS[0]) * 7 + 15}px`,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
          {/* Sentences */}

          <div className="flex justify-around gap-1">
            <input
              className={cn(
                "w-[50%] border-b border-white",
                "text-white placeholder:text-gray-500 placeholder:opacity-40",
              )}
              value={_id}
              onChange={(e) => {
                setId(e.currentTarget.value);
                setCanConfirm(false);
              }}
              minLength={3}
              pattern="[a-zA-Z0-9]"
              placeholder="Training Range ID"
            />
            <div
              className="flex justify-around gap-1"
              onContextMenu={(e) => {
                e.preventDefault();
                if (!sessionId) {
                  console.warn("No sessionID!");
                  return;
                }
                setToast({
                  msg: (
                    <Fragment key={"sessionId_toast"}>
                      <span className="text-center text-xl">
                        Registered ranges
                      </span>
                      <ul className="ml-5 list-disc">
                        {userCustomTags?.map((uct) => (
                          <>
                            <li key={`user_${sessionId}_${uct.tag}`}>
                              {uct.tag}
                            </li>
                          </>
                        ))}
                      </ul>
                    </Fragment>
                  ),
                });
              }}
            >
              <button
                type="button"
                disabled={
                  isDebouncingID ||
                  checkingID ||
                  checkingID_f ||
                  !idInDB ||
                  !validId ||
                  waitingForSave
                }
                className={cn(
                  "cursor-pointer rounded-xl border border-emerald-300 bg-emerald-700 px-2 py-1 hover:bg-emerald-600",
                  "disabled:cursor-default disabled:border-gray-700 disabled:bg-gray-500",
                )}
                onClick={async () => {
                  const sessId = sessionId || randomBase64(16);
                  if (!sessionId) {
                    setSessionId(sessId);
                  }
                  const result = await saveCustomTagToDB({
                    id: id,
                    range: chosen,
                    sessionID: sessId,
                  });
                  if (result) {
                    setToast(ERR_TOAST(result.message));
                  } else {
                    setToast({ msg: "Saved" });
                    setCanConfirm(true);
                    await utils.session.invalidate();
                  }
                }}
              >
                {isDebouncingID || checkingID_f
                  ? "..."
                  : waitingForSave
                    ? "Saving"
                    : "Save"}
              </button>
              <button
                type="button"
                disabled={
                  isDebouncingID ||
                  checkingID ||
                  checkingID_f ||
                  idInDB ||
                  !validId ||
                  waitingForLoad
                }
                className={cn(
                  "cursor-pointer rounded-xl border border-cyan-300 bg-cyan-700 px-2 py-1 hover:bg-cyan-600",
                  "disabled:pointer-events-none disabled:cursor-default disabled:border-gray-700 disabled:bg-gray-500",
                )}
                onClick={async () => {
                  const data = await loadCustomTagFromDB({
                    id: id,
                    sessionID: sessionId,
                  });
                  if (!data) {
                    setToast(
                      ERR_TOAST(
                        "Could not find the current ID connected with to your user!",
                      ),
                    );
                    return;
                  } else {
                    if (!isTrainingRange(data.scope)) {
                      console.log(data.scope);
                      throw "Invalid scope retuerned from DB!";
                    }
                    setChosen(data.scope);
                    setCanConfirm(true);
                    setSessionId(data.sessionID);
                  }
                }}
              >
                {isDebouncingID || checkingID_f
                  ? "..."
                  : waitingForLoad
                    ? "Loading"
                    : "Load"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setToast(ERR_TOAST("Not implemented yet"));
                }}
                className="cursor-pointer rounded-xl border border-green-300 bg-green-700 px-2 py-1 hover:bg-green-600"
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => {
                  setToast(ERR_TOAST("Not implemented yet"));
                }}
                className="cursor-pointer rounded-xl border border-emerald-300 bg-emerald-700 px-2 py-1 hover:bg-emerald-600"
              >
                Import
              </button>
            </div>
          </div>
          <div className="flex justify-evenly gap-8">
            <div className="grow text-gray-500 opacity-50">
              (Kanji: {chosen.kanji.length} / Words: {chosen.word.length})
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isValidRangeId(id)) {
                  setToast(ERR_TOAST("Did not provide range id!"));
                  return;
                }
                if (chosen.kanji.length + chosen.word.length === 0) {
                  setToast(ERR_TOAST("Training range is empty!"));
                  return;
                }
                updateRange({ id: _id, ...chosen });
                dialogRef.current?.close();
              }}
              disabled={
                !canConfirm ||
                isDebouncingID ||
                checkingID ||
                checkingID_f ||
                idInDB ||
                !validId ||
                waitingForSave
              }
              className={cn(
                "w-full basis-24 cursor-pointer rounded-xl border border-green-300 bg-green-700 px-2 py-1 hover:bg-green-600",
                "disabled:border-gray-300 disabled:bg-gray-700",
              )}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => {
                setToast(null);
                dialogRef.current?.close();
              }}
              className="w-full basis-24 cursor-pointer rounded-xl border border-orange-300 bg-orange-700 px-2 py-1 hover:bg-orange-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
