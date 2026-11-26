"use client";

import { AddKanjiRecord, AddWordRecord } from "./addRecords";
import { KanjiRecord, WordRecord } from "./records";
import { WORDSPERPAGE, KANJIPERPAGE } from "~/lib/db";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { SpinnerOrText } from "../spinnerOn";
import { cn } from "cn";
import { useDebounce } from "~/lib/hooks";

export const DBList = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [_wpage, setWpage] = useState(
    () => +(searchParams.get("wpage") ?? 0) || 0,
  );
  const [_kpage, setKpage] = useState(
    () => +(searchParams.get("kpage") ?? 0) || 0,
  );
  const [wpp, setWpp] = useState(
    () => +(searchParams.get("wpp") ?? 0) || WORDSPERPAGE,
  );
  const [kpp, setKpp] = useState(
    () => +(searchParams.get("kpp") ?? 0) || KANJIPERPAGE,
  );
  const [_kanjiSearch, setKanjiSearch] = useState("");
  const [_wordSearch, setWordSearch] = useState("");

  const { value: wordSearch } = useDebounce(_wordSearch, { delay: 500 });
  const { value: kanjiSearch } = useDebounce(_kanjiSearch, { delay: 500 });
  const { value: wpage } = useDebounce(_wpage, { delay: 50 });
  const { value: kpage } = useDebounce(_kpage, { delay: 50 });

  useEffect(() => {
    const newWpage = +(searchParams.get("wpage") ?? 0) || 0;
    const newKpage = +(searchParams.get("kpage") ?? 0) || 0;
    const newWpp = +(searchParams.get("wpp") ?? 0) || WORDSPERPAGE;
    const newKpp = +(searchParams.get("kpp") ?? 0) || KANJIPERPAGE;
    const newKanjiSearch = searchParams.get("qk") ?? "";
    const newWordSearch = searchParams.get("qw") ?? "";
    setWpage(newWpage);
    setKpage(newKpage);
    setWpp(newWpp);
    setKpp(newKpp);
    setKanjiSearch(newKanjiSearch);
    setWordSearch(newWordSearch);
  }, [searchParams]);

  useEffect(() => {
    const nParams = new URLSearchParams([...searchParams.entries()]);
    const toggleParam = (
      k: string,
      v: string | number,
      def?: string | number,
    ) => {
      nParams.set(k, `${v}`);
      if ((def !== undefined && def === v) || (def === undefined && !v))
        nParams.delete(k);
    };
    toggleParam("kpage", _kpage);
    toggleParam("wpage", _wpage);
    toggleParam("kpp", kpp, KANJIPERPAGE);
    toggleParam("wpp", wpp, WORDSPERPAGE);
    toggleParam("qk", kanjiSearch);
    toggleParam("qw", wordSearch);
    router.replace(`?${nParams}`);
  }, [_kpage, _wpage, kpp, wpp, kanjiSearch, wordSearch]);

  const { data: wordCount = 0 } = api.db.countWords.useQuery({
    search: wordSearch ? wordSearch : undefined,
  });
  const { data: kanjiCount = 0 } = api.db.countKanji.useQuery({
    search: !!kanjiSearch ? kanjiSearch : undefined,
  });
  const {
    data: words = [],
    isFetching: fetchingWords,
    isPending: pendingWords,
  } = api.db.getWords.useQuery({
    limit: wpp,
    page: wpage < 0 ? 0 : wpage,
    search: !!wordSearch ? wordSearch : undefined,
  });
  const {
    data: kanji = [],
    isFetching: fetchingKanji,
    isPending: penidngKanji,
  } = api.db.getKanji.useQuery({
    limit: kpp,
    page: kpage < 0 ? 0 : kpage,
    search: !!kanjiSearch ? kanjiSearch : undefined,
  });

  const utils = api.useUtils();

  useEffect(() => {
    if (wpage > 0)
      utils.db.getWords.prefetch({
        limit: wpp,
        page: wpage - 1,
        search: !!wordSearch ? wordSearch : undefined,
      });
    utils.db.getWords.prefetch({
      limit: wpp,
      page: wpage + 1,
      search: !!wordSearch ? wordSearch : undefined,
    });
  }, [wpage, wordSearch, wpp]);

  useEffect(() => {
    if (kpage > 0)
      utils.db.getKanji.prefetch({
        limit: kpp,
        page: kpage - 1,
        search: !!kanjiSearch ? kanjiSearch : undefined,
      });
    utils.db.getKanji.prefetch({
      limit: kpp,
      page: kpage + 1,
      search: !!kanjiSearch ? kanjiSearch : undefined,
    });
  }, [kpage, kanjiSearch, kpp]);

  return (
    <main className="flex max-h-screen min-h-screen w-full gap-4 bg-slate-800 p-4 text-white">
      <section className="flex w-1/2 max-w-1/2 flex-col border-r-2 border-slate-700 px-4">
        <div className="pb-4 text-center text-2xl font-bold text-slate-100">
          言葉
        </div>
        <div className="mb-4">{<AddWordRecord />}</div>
        <div className="flex h-full max-h-[85vh] flex-wrap gap-3 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
          <SpinnerOrText
            loading={fetchingWords || pendingWords}
            text={words.map((w, i) => {
              return (
                <WordRecord
                  key={w.word}
                  nth={i}
                  word={w.word}
                  meaning={w.meaning}
                  reading={w.reading}
                  tags={w.tag}
                  canEdit
                  update={() => utils.db.getWords.invalidate()}
                />
              );
            })}
            spinnerStyle={{ className: "w-50 h-50 text-center" }}
            className="grid w-full justify-center"
          />
        </div>
        <div className="mt-4 flex justify-center">
          <nav
            className="flex flex-row items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-5 py-2 shadow-md"
            aria-label="Word Pagination"
          >
            <button
              className="cursor-pointer rounded border border-slate-600 bg-slate-800 px-3 py-1 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={_wpage <= 0}
              onClick={() => setWpage((p) => p - 1)}
              title="Previous page"
            >
              &lt;
            </button>
            <span className="min-w-8 px-2 text-center text-lg font-semibold tracking-wider text-blue-200">
              <input
                onClick={(e) => {
                  e.currentTarget.select();
                }}
                className={cn(
                  `inline border-blue-500 text-center outline-none`,
                  `focus:border-b active:border-b`,
                )}
                style={{ width: `${`${_wpage + 1}`.length}em` }}
                value={_wpage < 0 ? "" : _wpage + 1}
                onChange={(e) => {
                  const iVal = parseInt(e.currentTarget.value);
                  if (
                    !isNaN(iVal) &&
                    iVal <= Math.ceil(wordCount / WORDSPERPAGE)
                  ) {
                    setWpage(iVal - 1);
                  } else {
                    setWpage(-1);
                  }
                }}
              />
              / {Math.ceil(wordCount / WORDSPERPAGE)}
            </span>
            <button
              className="cursor-pointer rounded border border-slate-600 bg-slate-800 px-3 py-1 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={_wpage + 1 >= Math.ceil(wordCount / WORDSPERPAGE)}
              onClick={() => setWpage((p) => p + 1)}
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
                setWpage(0);
              }}
            />
          </nav>
        </div>
      </section>

      <section className="flex w-1/2 max-w-1/2 flex-col px-4">
        <div className="pb-4 text-center text-2xl font-bold text-slate-100">
          漢字
        </div>
        <div className="mb-4">{<AddKanjiRecord />}</div>
        <div className="flex h-full max-h-[85vh] flex-wrap gap-3 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
          <SpinnerOrText
            loading={fetchingKanji || penidngKanji}
            text={kanji.map((k, i) => {
              return (
                <KanjiRecord
                  key={k.kanji}
                  nth={i}
                  kanji={k.kanji}
                  kunyomi={k.kunyomi}
                  meaning={k.meaning}
                  onyomi={k.onyomi}
                  tags={k.tag}
                  update={() => utils.db.getKanji.invalidate()}
                />
              );
            })}
            spinnerStyle={{ className: "w-50 h-50 text-center" }}
            className="grid w-full justify-center"
          />
        </div>
        <div className="mt-4 flex justify-center">
          <nav
            className="flex flex-row items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-5 py-2 shadow-md"
            aria-label="Kanji Pagination"
          >
            <button
              className="cursor-pointer rounded border border-slate-600 bg-slate-800 px-3 py-1 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={_kpage <= 0}
              onClick={() => {
                setKpage((p) => --p);
              }}
              title="Previous page"
            >
              &lt;
            </button>
            <span className="min-w-8 px-2 text-center text-lg font-semibold tracking-wider text-blue-200">
              <input
                onClick={(e) => {
                  e.currentTarget.select();
                }}
                className={cn(
                  `inline border-blue-500 text-center outline-none`,
                  `focus:border-b active:border-b`,
                )}
                style={{ width: `${`${_kpage + 1}`.length}em` }}
                value={_kpage < 0 ? "" : _kpage + 1}
                onChange={(e) => {
                  const iVal = parseInt(e.currentTarget.value);
                  if (
                    !isNaN(iVal) &&
                    iVal <= Math.ceil(kanjiCount / KANJIPERPAGE)
                  ) {
                    setKpage(iVal - 1);
                  } else {
                    setKpage(-1);
                  }
                }}
              />
              / {Math.ceil(kanjiCount / KANJIPERPAGE)}
            </span>
            <button
              className="cursor-pointer rounded border border-slate-600 bg-slate-800 px-3 py-1 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={_kpage + 1 >= Math.ceil(kanjiCount / KANJIPERPAGE)}

              onClick={() => setKpage((p) => ++p)}
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
                setKpage(0);
              }}
            />
          </nav>
        </div>
      </section>
    </main>
  );
};
