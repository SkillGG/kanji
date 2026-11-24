import {
  generateSeed,
  isCorrectSeed,
  Seed,
  SessionScope,
} from "~/lib/sessionScope";
import { createTRPCRouter, publicProcedure } from "../trpc";
import z from "zod";
import type { CardSessionStats, GameData } from "~/lib/game";
import {
  getCardsWithoutAnswers,
  getParsedScope,
  getRandomCards,
  getWordCards,
} from "~/server/db/crud";

export const gameRouter = createTRPCRouter({
  consumeGameData: publicProcedure
    .input(
      z.object({
        scope: SessionScope,
        seed: z.string().optional(),
        page: z.number().default(0),
        getStats: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input: { scope, seed, page, getStats } }) => {
      const pScope = await getParsedScope(ctx.db, scope);
      const curSeed: Seed = isCorrectSeed(seed) ? seed : generateSeed();

      const { cards, hasNext, statistics } = await getRandomCards(
        ctx.db,
        pScope,
        curSeed,
        page,
      );

      const stats: CardSessionStats = {
        ...statistics,
      };
      if (getStats) {
        const { cards } = await getCardsWithoutAnswers(ctx.db, pScope);
        stats.allCardsInScope = cards.length;
      }

      return {
        cards,
        seed: curSeed,
        stats,
        hasNext,
      };
    }),
});
