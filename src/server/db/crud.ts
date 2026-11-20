import {
  reading as wordToReading,
  tagToKanji,
  tagToWord,
  tag,
  customtag,
  word,
} from "@/drizzle/schema";
import type { DrizzleClient } from ".";
import { eq, sql } from "drizzle-orm";
import {
  dedupe,
  isInRange,
  isTagInInput,
  isTruthy,
  type UnpackSet,
} from "~/lib/utils";
import {
  isTrainingRange,
  type CardWord,
  type GameData,
  type HoleCard,
  type HoleQuestion,
  type NoAnswerCard,
  type TrainingRange,
  type WholeCard,
  type WholeQuestion,
} from "~/lib/game";
import type { SessionScope } from "~/lib/sessionScope";
import { extractTags } from "~/lib/tags";

import chalk from "chalk";

export const setWordTags = async (
  db: DrizzleClient,
  word: string,
  tags: string[],
) => {
  return await db.transaction(async (tx) => {
    await tx.delete(tagToWord).where(eq(tagToWord.word, word));
    const newTags = dedupe(
      tags.map((tag) => ({ word, tag })),
      (a, b) => a.word === b.word && b.tag === a.tag,
    );
    if (newTags.length) {
      await tx
        .insert(tag)
        .values(newTags.map((t) => ({ name: t.tag })))
        .onConflictDoNothing();
      await tx.insert(tagToWord).values(newTags);
    }
  });
};

export const setKanjiTags = async (
  db: DrizzleClient,
  kanji: string,
  tags: string[],
) => {
  return await db.transaction(async (tx) => {
    await tx.delete(tagToKanji).where(eq(tagToKanji.kanji, kanji));
    const newTags = dedupe(
      tags.map((tag) => ({ kanji, tag })),
      (a, b) => a.kanji === b.kanji && b.tag === a.tag,
    );
    if (newTags.length) {
      await tx
        .insert(tag)
        .values(newTags.map((t) => ({ name: t.tag })))
        .onConflictDoNothing();
      await tx.insert(tagToKanji).values(newTags);
    }
  });
};

export const setWordReading = async (
  db: DrizzleClient,
  word: string,
  reading: string[],
) => {
  return await db.transaction(async (tx) => {
    await tx.delete(wordToReading).where(eq(wordToReading.word, word));
    const newReadings = dedupe(
      reading.map((reading) => ({ word, reading })),
      (a, b) => a.word === b.word && b.reading === a.reading,
    );
    if (newReadings.length) await tx.insert(wordToReading).values(newReadings);
  });
};

const buildTagFilter = (wTags: string[], kTags: string[]) => {
  const conditions = [
    wTags.length ? { tag: { name: { in: wTags } } } : undefined,
    kTags.length ? { kanji: { tag: { name: { in: kTags } } } } : undefined,
  ].filter(isTruthy);

  return conditions.length ? { OR: conditions } : undefined;
};

const buildWordFilter = (words: string[], kanji: string[]) => {
  const filters = [
    ...(words.length ? [{ word: { in: words } }] : []),
    ...(kanji.length
      ? [{ RAW: (t: typeof word) => sql`${t.word} ~ ${`[${kanji.join("")}]`}` }]
      : []),
  ];
  if (filters.length === 0) return undefined;
  return filters.length === 1 ? filters[0] : { OR: filters };
};

export const getWordsFromCustomRange = async (
  db: DrizzleClient,
  range: TrainingRange,
  wTags: string[],
  kTags: string[],
  limit?: number,
  page = 0,
): Promise<CardWord[]> => {
  const words = await db.query.word.findMany({
    columns: { word: true, meaning: true },
    with: {
      kanji: {
        with: {
          tag: true,
        },
        columns: {
          kanji: true,
          kunyomi: true,
          meaning: true,
          onyomi: true,
        },
      },
      tag: { columns: { name: true } },
      reading: {
        columns: {
          reading: true,
        },
      },
    },
    where: {
      ...buildWordFilter(range.word, range.kanji),
      ...buildTagFilter(wTags, kTags),
    },
    limit,
    offset: page * (limit ?? 0) || undefined,
    orderBy: { reading: { raw: "asc(min)" }, word: "asc" },
  });

  return words.map((w) => ({
    kanji: w.kanji.map((k) => ({
      kanji: k.kanji,
      onyomi: k.onyomi ?? [],
      kunyomi: k.kunyomi ?? [],
      meaning: k.meaning ?? [],
      tags: k.tag?.map((t) => t.name) ?? [],
    })),
    meaning: w.meaning ?? [],
    reading: w.reading.map((r) => r.reading).filter(isTruthy),
    tags: w.tag.map((t) => t.name),
    word: w.word,
  }));
};

export const getWordsWithTags = async (
  db: DrizzleClient,
  wTags: string[],
  kTags: string[],
  limit?: number,
  page = 0,
): Promise<CardWord[]> => {
  const words = await db.query.word.findMany({
    columns: {
      word: true,
      meaning: true,
    },
    with: {
      kanji: {
        columns: {
          kanji: true,
          kunyomi: true,
          meaning: true,
          onyomi: true,
        },
        with: { tag: true },
      },
      reading: {
        columns: {
          reading: true,
        },
      },
      tag: { columns: { name: true } },
    },
    where: {
      ...buildTagFilter(wTags, kTags),
    },
    limit,
    offset: (limit ?? 0) * page || undefined,
    orderBy: { reading: { raw: "asc(min)" }, word: "asc" },
  });

  return words.map((w) => ({
    kanji: w.kanji.map((k) => ({
      kanji: k.kanji,
      onyomi: k.onyomi ?? [],
      kunyomi: k.kunyomi ?? [],
      meaning: k.meaning ?? [],
      tags: k.tag.map(({ name }) => name),
    })),
    word: w.word,
    meaning: w.meaning ?? [],
    reading: w.reading.map((r) => r.reading).filter(isTruthy),
    tags: w.tag.map(({ name: tag }) => tag),
  }));
};

export const getAllWords = async (
  db: DrizzleClient,
  limit?: number,
  page = 0,
): Promise<CardWord[]> => {
  return await getWordsWithTags(db, [], [], limit, page);
};

export const getWordCards = async (db: DrizzleClient, scope: ParsedScope) => {
  const len = scope.length === "all" ? undefined : scope.length;

  return scope.customrange
    ? await getWordsFromCustomRange(
        db,
        scope.customrange,
        scope.wTags,
        scope.kTags,
        len,
      )
    : await getWordsWithTags(db, scope.wTags, scope.kTags, len);
};

export type GameDataWithoutAnswers = {
  hole: Omit<HoleCard, "possibleAnswers">[];
  whole: Omit<WholeCard, "possibleAnswers">[];
  // sentence: SentenceCard[]
};

export const getCardsWithoutAnswers = async (
  db: DrizzleClient,
  scope: ParsedScope,
): Promise<GameDataWithoutAnswers> => {
  const gameData: GameDataWithoutAnswers = {
    whole: [],
    hole: [],
  };

  const { kTags, modes } = scope;

  const cards = (await getWordCards(db, scope)).filter(
    (c) => c.meaning.length && c.reading.length,
  );

  for (const mode of modes) {
    if (mode === "word_whole") {
      for (const card of cards) {
        const question: WholeQuestion = {
          meaning: card.meaning,
          reading: card.reading,
        };
        gameData.whole.push({
          word: card,
          question,
        });
      }
    } else if (mode === "word_hole") {
      for (const card of cards) {
        let i = -1;
        const wordChars = [...card.word];
        for (const char of wordChars) {
          i++;
          const kanji = card.kanji.find((z) => z.kanji === char);
          if (!kanji) continue;
          if (!isInRange(char, scope.customrange?.kanji)) {
            console.log(
              chalk.red("Thrown out bc not in range"),
              scope.customrange,
            );
            continue;
          }
          if (kTags.length && !kanji.tags.some((t) => isTagInInput(t, kTags))) {
            console.log(
              chalk.red("Thrown out kanji bc of tags "),
              kanji.tags,
              kTags,
              kanji.tags.map((kt) => isTagInInput(kt, kTags)),
            );
            continue;
          }
          const w = [...card.word];
          w.splice(i, 1, "〇");
          const question: HoleQuestion = {
            meaning: card.meaning,
            reading: card.reading,
            holedWord: w.join(""),
          };
          gameData.hole.push({
            word: card,
            question,
          });
        }
      }
    }
  }

  return gameData;
};

export const findPossibleAnswersForHole = async (
  db: DrizzleClient,
  q: HoleCard["question"],
): Promise<string[]> => {
  // TODO LATER
  return [];
};

export const findPossibleAnswersForWhole = async (
  db: DrizzleClient,
  q: WholeCard["question"],
): Promise<string[]> => {
  const answ = await db.query.word.findMany({
    where: {
      AND: [
        { reading: { reading: { in: q.reading } } },
        { meaning: { arrayContains: q.meaning } },
      ],
    },
    columns: {
      word: true,
    },
  });
  return answ.map((q) => q.word);
};

/** This scope is for ease of use in-db so that we don't have to
 * - dedupe tags
 * - fetch for customrange
 * - destructure the modes set
 * everytime we want to work with the scope given from the front-end.
 * It is run once on every query that passes the scope as its first step */
type ParsedScope = {
  modes: UnpackSet<SessionScope["modes"]>[];
  kTags: string[];
  wTags: string[];
  length: SessionScope["length"];
  customrange?: TrainingRange;
};

export const getCustomRangeData = async (
  db: DrizzleClient,
  cr: string,
): Promise<TrainingRange> => {
  const [d] = await db
    .select({ scope: customtag.scope })
    .from(customtag)
    .where(eq(customtag.tag, cr));
  if (!d) throw new Error(`Could not find custom range with id ${cr}`); // handled in-ui if it throws
  if (!isTrainingRange(d.scope))
    throw new Error(`DB returned invalid training range for tag '${cr}'`);
  return d.scope;
};

export const getParsedScopeSync = (
  scope: Omit<SessionScope, "customrange"> & {
    customrange?: { word: string[]; kanji: string[] };
  },
): ParsedScope => {
  return {
    modes: [...scope.modes],
    kTags: [
      ...new Set(
        scope.tags
          .filter((q) => q.startsWith("k"))
          .flatMap((z) => extractTags(z))
          .map((q) => `(${q})`),
      ),
    ],
    wTags: [
      ...new Set(
        scope.tags
          .filter((q) => q.startsWith("w"))
          .flatMap((z) => extractTags(z))
          .map((q) => `(${q})`),
      ),
    ],
    length: scope.length,
    customrange: scope.customrange,
  };
};

export const getParsedScope = async (
  db: DrizzleClient,
  scope: SessionScope,
): Promise<ParsedScope> => {
  return getParsedScopeSync({
    ...scope,
    customrange: scope.customrange
      ? await getCustomRangeData(db, scope.customrange)
      : undefined,
  });
};
