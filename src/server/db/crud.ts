import {
  reading as wordToReading,
  tagToKanji,
  tagToWord,
  tag,
  customtag,
  word,
} from "@/drizzle/schema";
import type { DrizzleClient } from ".";
import {
  and,
  arrayContains,
  asc,
  eq,
  exists,
  inArray,
  like,
  or,
  sql,
} from "drizzle-orm";
import {
  dedupe,
  inArrTOE,
  isInRange,
  isTagInInput,
  isTruthy,
  randomizeArray,
  type UnpackSet,
} from "~/lib/utils";
import {
  HOLE_WILDCARD,
  isTrainingRange,
  type CardWord,
  type GameCard,
  type GameData,
  type HoleCard,
  type HoleQuestion,
  type NoAnswerCard,
  type TrainingRange,
  type WholeCard,
  type WholeQuestion,
} from "~/lib/game";
import type { Seed, SessionScope } from "~/lib/sessionScope";
import { extractTags } from "~/lib/tags";

import chalk from "chalk";
import { containsKanji } from "~/lib/jp";

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

type FullDBWordRecord = {
  word: string;
  meaning: string[];
  kanji: {
    tag: { name: string }[];
    kanji: string;
    kunyomi: string[] | null;
    onyomi: string[] | null;
    meaning: string[] | null;
  }[];
  tag: { name: string }[];
  reading: { reading?: string; raw?: string }[];
};

type FullWordRecord = {
  word: string;
  meaning: string[];
  kanji: {
    kanji: string;
    kunyomi: string[];
    onyomi: string[];
    meaning: string[];
    tag: string[];
  }[];
  tag: string[];
  reading: string[];
};

const parseDBWordRecords = (words: FullDBWordRecord[]): FullWordRecord[] => {
  return words.map((w) => ({
    kanji: w.kanji.map((k) => ({
      kanji: k.kanji,
      onyomi: k.onyomi ?? [],
      kunyomi: k.kunyomi ?? [],
      meaning: k.meaning ?? [],
      tag: k.tag?.map((t) => t.name) ?? [],
    })),
    meaning: w.meaning ?? [],
    reading: w.reading.map((r) => r.reading ?? r.raw ?? "").filter(isTruthy),
    tag: w.tag.map((t) => t.name),
    word: w.word,
  }));
};

export const getWords = async (
  db: DrizzleClient,
  tags?: { words: string[]; kanji: string[] },
  range?: TrainingRange,
  limit?: number,
  page = 0,
) => {
  const where = range
    ? {
        ...buildWordFilter(range.word, range.kanji),
        ...buildTagFilter(tags?.words ?? [], tags?.kanji ?? []),
      }
    : { ...buildTagFilter(tags?.words ?? [], tags?.kanji ?? []) };
  const words: FullDBWordRecord[] = await db.query.word.findMany({
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
    where,
    limit,
    offset: page * (limit ?? 0) || undefined,
    orderBy: { reading: { raw: "asc(min)" }, word: "asc" },
  });

  return parseDBWordRecords(words);
};

export const getAllWords = async (
  db: DrizzleClient,
  limit?: number,
  page = 0,
): Promise<CardWord[]> => {
  return await getWords(db, undefined, undefined, limit, page);
};

export const getWordCards = async (db: DrizzleClient, scope: ParsedScope) => {
  const len = scope.length === "all" ? undefined : scope.length;

  return await getWords(
    db,
    { words: scope.wTags, kanji: scope.kTags },
    scope.customrange,
    len,
  );
};

export type WholeCardNoA = Omit<WholeCard, "possibleAnswers">;
export type HoleCardNoA = Omit<HoleCard, "possibleAnswers">;

export type GameDataWithoutAnswers = {
  cards: (WholeCardNoA | HoleCardNoA)[];
};

export const wordsToCards = (cards: FullWordRecord[], scope: ParsedScope) => {
  const { kTags, modes } = scope;
  const gameData: GameDataWithoutAnswers = {
    cards: [],
  };

  for (const mode of modes) {
    if (mode === "word_whole") {
      for (const card of cards) {
        const question: WholeQuestion = {
          meaning: card.meaning,
          reading: card.reading,
        };
        gameData.cards.push({
          word: card,
          question,
          type: "whole",
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
          if (kTags.length && !kanji.tag.some((t) => isTagInInput(t, kTags))) {
            console.log(
              chalk.red("Thrown out kanji bc of tags "),
              kanji.tag,
              kTags,
              kanji.tag.map((kt) => isTagInInput(kt, kTags)),
            );
            continue;
          }
          const w = [...card.word].toSpliced(i, 1, HOLE_WILDCARD);
          const question: HoleQuestion = {
            meaning: card.meaning,
            reading: card.reading,
            holedWord: w.join(""),
          };
          gameData.cards.push({
            word: card,
            question,
            type: "hole",
          });
        }
      }
    }
  }

  return gameData;
};

export const getCardsWithoutAnswers = async (
  db: DrizzleClient,
  scope: ParsedScope,
): Promise<GameDataWithoutAnswers> => {
  const gameData: GameDataWithoutAnswers = {
    cards: [],
  };

  const { kTags, modes } = scope;

  const cards = (await getWordCards(db, scope)).filter(
    (c) => c.meaning.length && c.reading.length,
  );

  return wordsToCards(cards, scope);
};

export const RANDOM_WORD_BATCH_SIZE = 10;
export const getRandomCards = async (
  db: DrizzleClient,
  scope: ParsedScope,
  seed: Seed,
  page: number,
  page_size = RANDOM_WORD_BATCH_SIZE,
): Promise<{
  cards: GameCard[];
  hasNext: boolean;
  statistics: {
    requested: number;
    words: number;
    wordsLeft: number;
  };
}> => {
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
          raw: true,
        },
      },
    },
    where: scope.customrange
      ? {
          ...buildWordFilter(scope.customrange.word, scope.customrange.kanji),
          ...buildTagFilter(scope.wTags, scope.kTags),
        }
      : { ...buildTagFilter(scope.wTags, scope.kTags) },
    orderBy: (t) => [sql`md5(${t.word} || ${seed})`, asc(t.word)],
    limit: page_size + 1,
    offset: page * page_size,
  });

  const wordsLeft = await db.query.word.findMany({
    columns: {},
    extras: {
      exist: sql`1`,
    },
    where: scope.customrange
      ? {
          ...buildWordFilter(scope.customrange.word, scope.customrange.kanji),
          ...buildTagFilter(scope.wTags, scope.kTags),
        }
      : { ...buildTagFilter(scope.wTags, scope.kTags) },
    limit: undefined,
    offset: page * (page_size + 1),
  });

  const requestedWords = words.slice(0, page_size);

  const c = wordsToCards(parseDBWordRecords(requestedWords), scope);

  const filledCards = await findPossibleAnswers(db, scope, c.cards);

  const randCards = randomizeArray(
    filledCards,
    (c) => (c.type === "hole" ? c.question.holedWord : c.word.word),
    seed,
  );

  return {
    cards: randCards,
    hasNext: words.length > page_size,
    statistics: {
      words: words.length,
      wordsLeft: wordsLeft.length,
      requested: page_size,
    },
  };
};

export const findPossibleAnswers = async (
  db: DrizzleClient,
  scope: ParsedScope,
  cards: (WholeCardNoA | HoleCardNoA)[],
): Promise<GameCard[]> => {
  const holeCards = cards.filter((c) => c.type === "hole");
  const wholeCards = cards.filter((c) => c.type === "whole");

  // holeCards.forEach((hc) => {
  //   console.log(chalk.blue(`(hole) [${hc.question.reading.join(",")}]`));
  // });

  const [hole, whole] = await Promise.all([
    holeCards.length
      ? db.query.word.findMany({
          columns: { word: true, meaning: true },
          with: { reading: { columns: { raw: true } } },
          where: {
            OR: holeCards.map((hc) => ({
              AND: [
                {
                  word: {
                    like: hc.question.holedWord.replace(HOLE_WILDCARD, "_"),
                  },
                },
                { reading: { raw: { in: hc.question.reading } } },
                { meaning: { arrayOverlaps: hc.question.meaning } },
              ],
            })),
          },
        })
      : Promise.resolve([]),
    wholeCards.length
      ? db.query.word.findMany({
          columns: {
            meaning: true,
            word: true,
          },
          with: {
            reading: { columns: { raw: true } },
          },
          where: {
            OR: wholeCards.map((wc) => ({
              AND: [
                { reading: { raw: { in: wc.question.reading } } },
                { meaning: { arrayContains: wc.question.meaning } },
              ],
            })),
          },
        })
      : Promise.resolve([]),
  ]);

  // console.log(chalk.green("Custoim scope: "), scope.customrange);

  // console.log("Hole:", hole.length);

  const holes = holeCards.map<HoleCard>((hc) => {
    return {
      ...hc,
      possibleAnswers: dedupe(
        hole
          .filter((q) => {
            const readingsMatch = hc.question.reading.every(
              (z) => !!q.reading.some(({ raw }) => z === raw),
            );
            const wordHoleMatch = new RegExp(
              `^${hc.question.holedWord.replace(HOLE_WILDCARD, ".")}$`,
              "u",
            ).exec(q.word);
            const meaningsMatch = hc.question.meaning.some((z) =>
              q.meaning.includes(z),
            );
            // if (readingsMatch)
            //   console.log(
            //     chalk.italic(
            //       chalk.blueBright(
            //         `(hole) ${hc.question.holedWord}(${hc.question.reading.join(",").substring(0, 10)})(${hc.question.meaning
            //           .join(",")
            //           .substring(0, 10)})=>${q.word}(${q.reading
            //           .map((r) => r.raw)
            //           .join(", ")
            //           .substring(0, 10)})(${q.meaning
            //           .join(", ")
            //           .substring(0, 10)})`,
            //       ),
            //     ),
            //     readingsMatch,
            //     wordHoleMatch,
            //     [...q.word][[...hc.question.holedWord].indexOf(HOLE_WILDCARD)],
            //   );
            return readingsMatch && wordHoleMatch && meaningsMatch;
          })
          .flatMap(
            (q) =>
              [...q.word][[...hc.question.holedWord].indexOf(HOLE_WILDCARD)],
          )
          .filter(isTruthy)
          // .map((q) => {
          //   console.log(
          //     chalk.yellow(`(hole) ${hc.question.holedWord} matched on ${q}`),
          //   );
          //   return q;
          // })
          .filter(
            (q) => containsKanji(q) && inArrTOE(q, scope.customrange?.kanji),
          ),
      ),
    };
  });

  const wholes = wholeCards.map<WholeCard>((wc) => {
    return {
      ...wc,
      possibleAnswers: dedupe(
        whole
          .filter(
            (q) =>
              wc.question.reading.every((r) =>
                q.reading.some((z) => z.raw === r),
              ) && wc.question.meaning.every((z) => q.meaning.includes(z)),
          )
          .map((pa) => pa.word)
          .filter(isTruthy)
          .map((q) => {
            // console.log(
            //   chalk.yellow(`(whole) ${wc.word.word} matched on ${q}`),
            // );
            return q;
          })
          .filter((q) => inArrTOE(q, scope.customrange?.word)),
      ),
    };
  });

  const emptyAnswers = [...holes, ...wholes].filter(
    (q) => q.possibleAnswers.length === 0,
  );

  if (emptyAnswers.length) {
    emptyAnswers.forEach((ea) => {
      console.log(
        chalk.red(`(${ea.type}):`),
        ea.word.word,
        hole.filter((q) => q.word === ea.word.word),
        whole.filter((q) => q.word === ea.word.word),
      );
    });
    throw "Found words with no answers!";
  }

  return [...holes, ...wholes];
};

export const findPossibleAnswersForHole = async (
  db: DrizzleClient,
  scope: ParsedScope,
  q: HoleCard["question"],
): Promise<string[]> => {
  const wc_pos = [...q.holedWord].indexOf(HOLE_WILDCARD);

  if (wc_pos < 0) return [];

  const words = await db
    .select({ word: word.word })
    .from(word)
    .where(
      and(
        like(word.word, `${q.holedWord.replace(HOLE_WILDCARD, "_")}`),
        exists(
          db
            .select()
            .from(wordToReading)
            .where(
              and(
                eq(wordToReading.word, word.word),
                inArray(wordToReading.reading, q.reading),
              ),
            ),
        ),
      ),
    );

  return [
    ...new Set(
      words
        .flatMap((w) => {
          return [...w.word][wc_pos];
        })
        .filter(isTruthy)
        .filter(
          (q) => containsKanji(q) && inArrTOE(q, scope.customrange?.kanji),
        ),
    ),
  ];
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
export type ParsedScope = {
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
