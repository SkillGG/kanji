import {
  serial as int_ai,
  text as str,
  integer as int,
  decimal as float,
  pgTable as table,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { SQL, sql } from "drizzle-orm";

const cascadeAll = { onDelete: "cascade", onUpdate: "cascade" } as const;
// const cascadeDelete = { onDelete: "cascade" } as const;

export const tag = table("tag", {
  name: str().primaryKey(),
});

export const kanji = table("kanji", {
  kanji: str().primaryKey(),
  onyomi: str().array(),
  kunyomi: str().array(),
  meaning: str().array().default([]),
});

export const sentence = table("sentence", {
  id: str().primaryKey(),
  text: str().notNull(),
});

export const sentenceanswer = table("sentenceanswer", {
  id: int_ai().primaryKey(),
  sentence: str()
    .notNull()
    .references(() => sentence.id, cascadeAll),
  answer: str().notNull(),
  relevance: float().notNull(),
});

export const word = table("word", {
  word: str().primaryKey(),
  meaning: str().array().notNull().default([]),
});

export const reading = table(
  "reading",
  {
    reading: str().notNull(),
    word: str()
      .notNull()
      .references(() => word.word, cascadeAll),
    raw: str()
      .notNull()
      .generatedAlwaysAs(
        (): SQL => sql`get_raw_reading(${reading.word}, ${reading.reading})`,
      ),
  },
  (t) => [
    primaryKey({ columns: [t.word, t.reading] }),
    index("reading_raw_idx").on(t.raw),
  ],
);

export const customtag = table("customtag", {
  tag: str().primaryKey(),
  sessionID: str().notNull(),
  scope: jsonb().notNull(),
});

export const tagToWord = table("tagToWord", {
  relid: int_ai().primaryKey(),
  word: str()
    .notNull()
    .references(() => word.word, cascadeAll),
  tag: str()
    .notNull()
    .references(() => tag.name, cascadeAll),
});

export const tagToKanji = table("tagToKanji", {
  relid: int_ai().primaryKey(),
  tag: str()
    .notNull()
    .references(() => tag.name, cascadeAll),
  kanji: str()
    .notNull()
    .references(() => kanji.kanji, cascadeAll),
});

export const tagToSentence = table("tagToSentence", {
  relid: int_ai().primaryKey(),
  tag: str()
    .notNull()
    .references(() => tag.name, cascadeAll),
  sentence: str()
    .notNull()
    .references(() => sentence.id, cascadeAll),
});

export const wordToKanji = table("wordToKanji", {
  relid: int_ai().primaryKey(),
  word: str()
    .notNull()
    .references(() => word.word, cascadeAll),
  kanji: str()
    .notNull()
    .references(() => kanji.kanji, cascadeAll),
});
