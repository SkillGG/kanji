import type { Metadata } from "next";
import { KanjiRecord, WordRecord } from "../_components/db/records";
import { api, HydrateClient } from "~/trpc/server";
import { AddKanjiRecord, AddWordRecord } from "../_components/db/addRecords";
import Link from "next/link";
import { DBList } from "../_components/db/list";
import { KANJIPERPAGE, WORDSPERPAGE } from "~/lib/db";
import { cn } from "cn";

export type WordWithTag = {
  word: string;
  meaning: string[];
  reading: string[];
  tags: { name: string }[];
};

export type KanjiWithTag = {
  kanji: string;
  onyomi: string[];
  kunyomi: string[];
  meaning: string[];
  tags: { name: string }[];
};

export const metadata: Metadata = {
  title: "Kanji Database",
};

export default async function DBPage() {
  return (
    <HydrateClient>
      <Link
        href={"/"}
        className={cn(
          "absolute top-5 left-5 cursor-pointer rounded-xl border-2 border-slate-900 text-slate-200",
          "grid aspect-square w-8 items-center text-center",
          "hover:border-slate-300 hover:bg-slate-500",
        )}
      >
        &lt;
      </Link>
      <DBList />
    </HydrateClient>
  );
}
