import { readFile } from "fs/promises";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export type DicEntry = {
  ent_seq: string;
  k_ele: { word: string[]; info: string[] }[];
  r_ele: { readings: string[]; info: string[] }[];
  sense: { pos: string[]; glos: string[]; info: string[] }[];
};

import KanjiData from ".assets/jmdict.json";
import { containsKanji } from "~/lib/seed";
import { KANJIPERPAGE, qb, WORDSPERPAGE } from "~/lib/db";
import {
  dedupe,
  getFullWordRading,
  hasDefinedProp,
  isTruthy,
  type Solid,
} from "~/lib/utils";
import {
  kanji,
  reading,
  tag,
  tagToKanji,
  tagToWord,
  word,
  wordToKanji,
} from "@/drizzle/schema";
import {
  and,
  arrayContains,
  count,
  EmptyFilter,
  eq,
  exists,
  ilike,
  inArray,
  like,
  or,
  sql,
} from "drizzle-orm";
import { setKanjiTags, setWordReading, setWordTags } from "~/server/db/crud";
import { getChunkedKanjiData } from "./external";
import type { KanjiRecordData } from "~/app/_components/db/records";

const wT = word;
const kT = kanji;

const WordSearch = (str: string | undefined, word: typeof wT = wT) => {
  if (!str) return undefined;
  const pattern = `%${str.trim().replace(/([%_])/g, "\\$1")}%`;
  if (pattern === "%%") return undefined;
  return or(
    exists(
      qb
        .select()
        .from(wordToKanji)
        .where(
          and(
            eq(wordToKanji.word, word.word),
            ilike(wordToKanji.kanji, pattern),
          ),
        ),
    ), // { kanji: { some: { kanji: { contains: str } } } },
    ilike(word.word, pattern), // { word: { contains: str } },
    sql`exists( select 1 from unnest(${word.meaning}) as m where m ilike ${pattern})`, // { meaning: { hasSome: [str] } },

    exists(
      qb
        .select()
        .from(tagToWord)
        .where(
          and(eq(word.word, tagToWord.word), ilike(tagToWord.tag, pattern)),
        ),
    ), // { tags: { some: { name: { contains: str } } } }
    exists(
      qb
        .select()
        .from(reading)
        .where(and(eq(reading.word, word.word), ilike(reading.raw, pattern))), // { reading: { hasSome: [str] } },
    ),
  );
};

const KanjiSearch = (str: string | undefined, kanji: typeof kT = kT) => {
  if (!str) return undefined;
  const safeStr = str.trim().replace(/([%_])/g, "\\$1");
  if (!safeStr) return undefined;
  const pattern = `%${safeStr}%`;
  return or(
    eq(kanji.kanji, safeStr),
    exists(
      sql` select 1 from unnest(${kanji.kunyomi}) as k where k ilike ${pattern}`,
    ),
    exists(
      sql` select 1 from unnest(${kanji.onyomi}) as o where o ilike ${pattern}`,
    ),
    exists(
      sql` select 1 from unnest(${kanji.meaning}) as m where m ilike ${pattern}`,
    ),
    exists(
      qb
        .select()
        .from(tagToKanji)
        .where(
          and(
            eq(tagToKanji.kanji, kanji.kanji), // as though join on tTK.kanji = kanji.kanji
            ilike(tagToKanji.tag, pattern),
          ),
        ),
    ),
  );
};

let cachedSeedData: DicEntry[] | null = null;

const jaCollator = new Intl.Collator("ja");

const getSortedSeedData = () => {
  if (!cachedSeedData) {
    cachedSeedData = [...(KanjiData as DicEntry[])].sort((a, b) => {
      const aReading = a.r_ele?.[0]?.readings[0] ?? "";
      const bReading = b.r_ele?.[0]?.readings[0] ?? "";
      return jaCollator.compare(aReading, bReading);
    });
  }
  return cachedSeedData;
};

export const dbRouter = createTRPCRouter({
  countWords: publicProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(
      async ({ ctx, input }) =>
        await ctx.db.$count(word, WordSearch(input?.search)),
    ),
  countKanji: publicProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(
      async ({ ctx, input }) =>
        await ctx.db.$count(kanji, KanjiSearch(input?.search)),
    ),
  getWords: publicProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        page: z.number().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input: { limit, page, search } }) => {
      const offset = (page ?? 0) * (limit ?? WORDSPERPAGE) || undefined;
      return (
        await ctx.db.query.word.findMany({
          where: search?.trim()
            ? { RAW: (t) => WordSearch(search?.trim(), t) ?? sql`true` }
            : EmptyFilter,
          with: {
            tag: true,
            reading: { columns: { reading: true, raw: true } },
          },
          orderBy: { reading: { raw: "asc(min)" }, word: "asc" },
          limit,
          offset,
        })
      ).map((w) => ({
        ...w,
        reading: w.reading.map((r) => r.reading),
        rawReading: w.reading.map((r) => r.raw),
      }));
    }),
  getKanji: publicProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        page: z.number().optional(),
        search: z.string().optional(),
        nosort: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input: { limit, page, search, nosort } }) => {
      const offset = (page ?? 0) * (limit ?? KANJIPERPAGE) || undefined;
      return await ctx.db.query.kanji.findMany({
        where: search?.trim()
          ? { RAW: (t) => KanjiSearch(search?.trim(), t) ?? sql`true` }
          : EmptyFilter,
        with: { tag: true },
        orderBy: !!nosort ? undefined : { kanji: "asc" },
        limit,
        offset,
      });
    }),

  updateKanji: publicProcedure
    .input(
      z.object({
        kanji: z.string(),
        meaning: z.string().array().optional().nullable(),
        onyomi: z.string().array(),
        kunyomi: z.string().array(),
        tags: z.string().array(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        await tx
          .update(kanji)
          .set({
            kunyomi: input.kunyomi,
            meaning: input.meaning,
            onyomi: input.onyomi,
          })
          .where(eq(kanji.kanji, input.kanji));

        await setKanjiTags(tx, input.kanji, input.tags);
      });
    }),
  updateKanjiMany: publicProcedure
    .input(
      z.array(
        z.object({
          kanji: z.string(),
          meaning: z.string().array().optional().nullable(),
          onyomi: z.string().array().optional(),
          kunyomi: z.string().array().optional(),
          words: z.string().array().optional(),
          sentences: z.string().array().optional(),
          tags: z.string().array().optional(),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.length) return;

      return await ctx.db.transaction(async (tx) => {
        // update kanjis
        await tx
          .insert(kanji)
          .values(
            input.map((i) => ({
              kanji: i.kanji,
              kunyomi: i.kunyomi ?? null,
              onyomi: i.onyomi ?? null,
              meaning: i.meaning ?? null,
            })),
          )
          .onConflictDoUpdate({
            target: kanji.kanji,
            set: {
              kunyomi: sql`coalesce(excluded.kunyomi, ${kanji.kunyomi})`,
              onyomi: sql`coalesce(excluded.onyomi, ${kanji.onyomi})`,
              meaning: sql`coalesce(excluded.meaning, ${kanji.meaning})`,
            },
          });

        // update tags
        const tagUpdates = input.filter((i) => hasDefinedProp(i, "tags"));
        if (tagUpdates.length) {
          const uniqueTags = dedupe(tagUpdates.flatMap((i) => i.tags));

          if (uniqueTags.length > 0) {
            await tx
              .insert(tag)
              .values(uniqueTags.map((name) => ({ name })))
              .onConflictDoNothing();
          }

          await tx.delete(tagToKanji).where(
            inArray(
              tagToKanji.kanji,
              tagUpdates.map((i) => i.kanji),
            ),
          );

          const tagLinks = tagUpdates.flatMap((i) =>
            dedupe(i.tags).map((t) => ({ kanji: i.kanji, tag: t })),
          );
          if (tagLinks.length > 0) {
            await tx.insert(tagToKanji).values(tagLinks);
          }
        }

        // update words
        const wordUpdates = input.filter((i) => hasDefinedProp(i, "words"));
        if (wordUpdates.length) {
          await tx.delete(wordToKanji).where(
            inArray(
              wordToKanji.kanji,
              wordUpdates.map((i) => i.kanji),
            ),
          );

          const wordLinks = wordUpdates.flatMap((i) =>
            dedupe(i.words).map((w) => ({ kanji: i.kanji, word: w })),
          );
          if (wordLinks.length) {
            await tx.insert(wordToKanji).values(wordLinks);
          }
        }
      });
    }),
  updateWordReadingMultiple: publicProcedure
    .input(z.object({ word: z.string(), reading: z.string().array() }).array())
    .mutation(async ({ ctx, input }) => {
      if (!input.length) return;
      await ctx.db.transaction(async (tx) => {
        // remove old readings
        await tx.delete(reading).where(
          inArray(
            reading.word,
            input.map((w) => w.word),
          ),
        );

        const readingInserts = dedupe(
          input
            .filter((q) => q.reading.length)
            .flatMap((w) =>
              w.reading.map((r) => ({ word: w.word, reading: r })),
            ),
          (a, b) => a.word === b.word && a.reading === b.reading,
        );

        if (readingInserts.length) {
          await tx.insert(reading).values(readingInserts);
        }
      });
    }),
  updateWord: publicProcedure
    .input(
      z.object({
        word: z.string(),
        reading: z.string().array(),
        meaning: z.string().array().optional().nullable(),
        tags: z.string().array(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        if (input.meaning !== undefined)
          // update word
          await tx
            .update(word)
            .set({
              meaning: input.meaning ?? [],
            })
            .where(eq(word.word, input.word));

        // update reading
        await setWordReading(tx, input.word, input.reading);

        // update tags
        await setWordTags(tx, input.word, input.tags);
      });
    }),
  addKanji: publicProcedure
    .input(
      z.object({
        kanji: z.string(),
        meaning: z.string().array(),
        onyomi: z.string().array(),
        kunyomi: z.string().array(),
        tag: z.string().array(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        await tx.insert(kanji).values({
          kanji: input.kanji,
          kunyomi: input.kunyomi,
          onyomi: input.onyomi,
          meaning: input.meaning,
        });
        await setKanjiTags(tx, input.kanji, input.tag);
      });
    }),
  addWord: publicProcedure
    .input(
      z.object({
        word: z.string(),
        reading: z.string().array(),
        meaning: z.string().array().optional().nullable(),
        tags: z.string().array(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        await tx
          .insert(word)
          .values({ word: input.word, meaning: input.meaning ?? [] });
        await setWordReading(tx, input.word, input.reading);
        await setWordTags(tx, input.word, input.tags);

        const kanjiToInsert = dedupe(
          [...input.word].filter((k) => containsKanji(k)),
        ).map((k) => ({ kanji: k, word: input.word }));
        if (kanjiToInsert.length)
          await tx.insert(wordToKanji).values(kanjiToInsert);
      });
    }),
  removeWord: publicProcedure
    .input(z.object({ word: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.delete(word).where(eq(word.word, input.word));
    }),
  removeKanji: publicProcedure
    .input(z.object({ kanji: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.delete(kanji).where(eq(kanji.kanji, input.kanji));
    }),
  seed: publicProcedure
    .input(
      z.object({
        words: z
          .object({
            word: z.string(),
            reading: z.string().array(),
            meaning: z.string().array(),
            tags: z.string().array(),
          })
          .array(),
        kanji: z
          .object({
            kanji: z.string(),
            meaning: z.string().array(),
            onyomi: z.string().array(),
            kunyomi: z.string().array(),
            tags: z.string().array(),
          })
          .array(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        // tags
        const allTags = dedupe([
          ...input.words.flatMap((w) => w.tags),
          ...input.kanji.flatMap((k) => k.tags ?? []),
        ]);

        if (allTags.length) {
          await tx
            .insert(tag)
            .values(allTags.map((name) => ({ name })))
            .onConflictDoNothing();
        }

        // kanji

        if (input.kanji.length) {
          await tx.insert(kanji).values(input.kanji).onConflictDoNothing();
        }

        // tagToKanji link
        const kanjiTagLinks = dedupe(
          input.kanji.flatMap((k) =>
            (k.tags ?? []).map((t) => ({ kanji: k.kanji, tag: t })),
          ),
          (a, b) => a.kanji === b.kanji && a.tag === b.tag,
        );
        if (kanjiTagLinks.length)
          await tx.insert(tagToKanji).values(kanjiTagLinks);

        // words

        const mergedWords = dedupe(
          input.words.map((w) => ({
            word: w.word,
            meaning: dedupe(w.meaning),
          })),
          (a, b) => a.word === b.word,
          (a, b) => ({
            word: a.word,
            meaning: dedupe([...a.meaning, ...b.meaning]),
          }),
        );

        const inserted = mergedWords.length
          ? await tx
              .insert(word)
              .values(mergedWords)
              .onConflictDoNothing()
              .returning({ word: word.word })
          : [];

        const insertedSet = new Set(inserted.map((r) => r.word));
        const failedWords = mergedWords
          .filter((w) => !insertedSet.has(w.word))
          .map((w) => w.word);

        const validWords = input.words.filter((w) => insertedSet.has(w.word));

        // readings

        const readingLinks = dedupe(
          validWords.flatMap((vw) =>
            vw.reading.map((reading) => ({ word: vw.word, reading })),
          ),
          (a, b) => a.word === b.word && a.reading === b.reading,
        );
        if (readingLinks.length) await tx.insert(reading).values(readingLinks);

        // tagToWord
        const tagLinks = dedupe(
          validWords.flatMap((vw) =>
            vw.tags.map((tag) => ({ word: vw.word, tag })),
          ),
          (a, b) => a.word === b.word && a.tag === b.tag,
        );
        if (tagLinks.length) await tx.insert(tagToWord).values(tagLinks);

        // wordToKanji
        const wtkLinks = validWords.flatMap((vw) =>
          [...new Set([...vw.word])]
            .filter((k) => containsKanji(k))
            .map((kanji) => ({ word: vw.word, kanji })),
        );
        if (wtkLinks.length) await tx.insert(wordToKanji).values(wtkLinks);

        return failedWords.length ? { failedWords } : "OK";
      });
    }),
  getSeedData: publicProcedure
    .input(z.object({ slice: z.tuple([z.number(), z.number()]) }))
    .query(({ input: { slice } }) => {
      return getSortedSeedData().slice(...slice);
    }),

  getKanjiJishoData: publicProcedure
    .input(z.array(z.string()))
    .mutation(async ({ input: kanjiToCheck }) => {
      const ktc = [...new Set(kanjiToCheck)];
      const data: Solid<KanjiRecordData>[] = [];
      const CHUNKSIZE = 10;
      let chunkNum = 0;

      while (chunkNum * CHUNKSIZE < ktc.length) {
        data.push(...(await getChunkedKanjiData(ktc, chunkNum, CHUNKSIZE)));
        chunkNum++;
      }

      return data;
    }),
});
