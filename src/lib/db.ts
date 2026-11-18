import { QueryBuilder } from "drizzle-orm/pg-core";

export const WORDSPERPAGE = 4 * 7;
export const KANJIPERPAGE = 3 * 8;

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

export const qb = new QueryBuilder();
