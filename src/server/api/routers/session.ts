import {
  customtag,
  tag,
  tagToKanji,
  tagToSentence,
  tagToWord,
  word,
} from "@/drizzle/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Tag, TagType } from "~/lib/game";
import {
  isValidRangeId,
  type PoolCounts,
  type SessionMode,
} from "~/lib/sessionScope";
import { extractTags } from "~/lib/tags";
import { inArrTOE, isTruthy, type ServerError } from "~/lib/utils";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  getCardsWithoutAnswers,
  getParsedScope,
  getParsedScopeSync,
  getWordCards,
} from "~/server/db/crud";

export const sessionRouter = createTRPCRouter({
  saveCustomTag: publicProcedure
    .input(
      z.object({
        range: z.object({
          kanji: z.string().array(),
          word: z.string().array(),
        }),
        id: z.string(),
        sessionID: z.string(),
      }),
    )
    .mutation(
      async ({
        ctx,
        input: { id, range, sessionID },
      }): Promise<void | ServerError> => {
        if (!sessionID) return { message: "No sessionID!" };
        if (range.word.length + range.kanji.length === 0)
          return { message: "Empty scope!" };
        if (!isValidRangeId(id)) return { message: "Invalid range id" };
        const [inserted] = await ctx.db
          .insert(customtag)
          .values({ scope: range, tag: id, sessionID })
          .onConflictDoNothing()
          .returning({ tag: customtag.tag });
        if (!inserted) return { message: "Unable to insert into the DB!" };
      },
    ),
  checkCustomTagId: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return (await ctx.db.$count(customtag, eq(customtag.tag, input))) === 0;
    }),
  getCustomTagData: publicProcedure
    .input(z.object({ id: z.string(), sessionID: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tagFilter = eq(customtag.tag, input.id);
      const [ctd] = await ctx.db
        .select({ scope: customtag.scope, sessionID: customtag.sessionID })
        .from(customtag)
        .where(
          input.sessionID
            ? and(eq(customtag.sessionID, input.sessionID), tagFilter)
            : tagFilter,
        );
      return ctd;
    }),
  getUserCustomTags: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select({ tag: customtag.tag })
        .from(customtag)
        .where(eq(customtag.sessionID, input));
    }),
  getWordTags: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.tag.findMany({
      columns: {
        name: true,
      },
      with: {
        word: {
          columns: { word: true, meaning: true },
          with: { reading: { columns: { reading: true } } },
        },
      },
      where: {
        word: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }),
  getKanjiTags: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.tag.findMany({
      columns: {
        name: true,
      },
      with: {
        kanji: {
          columns: { kanji: true, kunyomi: true, onyomi: true, meaning: true },
        },
      },
      where: {
        kanji: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }),
  getSentenceTags: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.tag.findMany({
      columns: { name: true },
      with: { sentence: true },
      where: { sentence: true },
      orderBy: { name: "asc" },
    });
    // return await ctx.db.tag.findMany({
    //   select: {
    //     name: true,
    //     sentences: true,
    //   },
    //   where: {
    //     sentences: {
    //       some: {},
    //     },
    //   },
    // });
  }),
  getTags: publicProcedure.query(async ({ ctx }): Promise<Tag[]> => {
    const allTags = await ctx.db
      .select({
        name: tag.name,
        kanji: sql<number>`(select count(*)::int from ${tagToKanji} where ${tagToKanji.tag} = ${tag.name})`,
        words: sql<number>`(select count(*)::int from ${tagToWord} where ${tagToWord.tag} = ${tag.name})`,
        sentences: sql<number>`(select count(*)::int from ${tagToSentence} where ${tagToSentence.tag} = ${tag.name})`,
      })
      .from(tag)
      .orderBy(asc(tag.name));
    return allTags.map((t) => ({
      name: t.name,
      type: [
        t.kanji > 0 && "kanji",
        t.words > 0 && "word",
        t.sentences > 0 && "sentence",
      ].filter((q): q is TagType => !!q),
      _count: {
        kanji: t.kanji,
        words: t.words,
        sentences: t.sentences,
        all: t.kanji + t.sentences + t.words,
      },
    }));
  }),
  getPoolCounts: publicProcedure
    .input(
      z.object({
        tagIds: z.string().array(),
        range: z
          .object({
            kanji: z.string().array(),
            word: z.string().array(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PoolCounts> => {
      const exScope = getParsedScopeSync({
        length: "all",
        modes: new Set(["sentence", "word_hole", "word_whole"]),
        tags: input.tagIds,
        customrange: input.range,
      });
      const cards = await getCardsWithoutAnswers(ctx.db, exScope);

      return {
        word_whole: cards.whole.length,
        word_hole: cards.hole.length,
        sentence: 0,
        all: cards.hole.length + cards.whole.length,
      };
    }),
});
