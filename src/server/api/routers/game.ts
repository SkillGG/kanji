import { SessionScope } from "~/lib/sessionScope";
import { createTRPCRouter, publicProcedure } from "../trpc";
import z from "zod";
import { isInRange, isTagInInput } from "~/lib/utils";
import type {
  Card,
  GameData,
  HoleCard,
  HoleQuestion,
  NoAnswerCard,
  WholeCard,
  WholeQuestion,
} from "~/lib/game";
import {
  findPossibleAnswersForHole,
  findPossibleAnswersForWhole,
  getCardsWithoutAnswers,
  getParsedScope,
  getWordCards,
} from "~/server/db/crud";
import chalk from "chalk";

export const gameRouter = createTRPCRouter({
  getGameDataFromScope: publicProcedure
    .input(z.object({ scope: SessionScope }))
    .query(async ({ ctx, input: { scope } }) => {
      const pScope = await getParsedScope(ctx.db, scope);
      console.log(
        scope,
        chalk.red("Server got above scope scopes and parsed it"),
        pScope,
      );
      const gD = await getCardsWithoutAnswers(ctx.db, pScope);

      const [whole, hole /* sentences */] = await Promise.all([
        Promise.all(
          gD.whole.map(async (w): Promise<WholeCard> => ({
            ...w,
            possibleAnswers: await findPossibleAnswersForWhole(
              ctx.db,
              w.question,
            ),
          })),
        ),
        Promise.all(
          gD.hole.map(async (w): Promise<HoleCard> => ({
            ...w,
            possibleAnswers: await findPossibleAnswersForHole(
              ctx.db,
              w.question,
            ),
          })),
        ),
      ] as const);

      return { whole, hole };
    }),
});
