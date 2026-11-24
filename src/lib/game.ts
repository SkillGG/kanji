export const HOLE_WILDCARD = "〇";

export type TagType = "kanji" | "word" | "sentence";
export type Tag = {
  name: string;
  type: TagType[];
  _count: {
    all: number;
    kanji: number;
    words: number;
    sentences: number;
  };
};

export type CardKanji = {
  tag: string[];
  kanji: string;
  onyomi: string[];
  kunyomi: string[];
  meaning: string[];
  words: Omit<CardWord, "kanji">[];
};

export type CardWord = {
  kanji: Omit<CardKanji, "words">[];
  meaning: string[];
  word: string;
  reading: string[];
  tag: string[];
};

export type Card<Q, T extends "hole" | "whole"> = {
  question: Q;
  possibleAnswers: string[];
  type: T;
  word: CardWord;
};

export type WholeQuestion = {
  meaning: string[];
  reading: string[];
};
export type WholeCard = Card<WholeQuestion, "whole">;

export type HoleQuestion = {
  holedWord: string;
  meaning: string[];
  reading: string[];
};
export type HoleCard = Card<HoleQuestion, "hole">;

export type GameCard = WholeCard | HoleCard;

export type NoAnswerCard<Q extends WholeCard | HoleCard> = Omit<
  Q,
  "possibleAnswers"
>;

export type GameData = {
  cards: GameCard[];
};

export type Training = {
  id: string;
} & TrainingRange;

export type TrainingRange = {
  word: string[];
  kanji: string[];
};

export const isStringArray = (o: unknown): o is string[] => {
  return Array.isArray(o) && o.every((q) => typeof q === "string");
};

export const isTrainingRange = (o: unknown): o is TrainingRange => {
  return (
    !!o &&
    typeof o === "object" &&
    "kanji" in o &&
    "word" in o &&
    isStringArray(o.kanji) &&
    isStringArray(o.word)
  );
};

export type CardSessionStats = {
  requested: number;
  words: number;
  wordsLeft: number;
  allCardsInScope?: number;
  cardsFinished?: number;
};
