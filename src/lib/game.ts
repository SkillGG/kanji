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
  tags: string[];
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
  tags: string[];
};

export type Card<Q> = {
  question: Q;
  possibleAnswers: string[];
};

export type WholeQuestion = {
  meaning: string[];
  reading: string[];
};
export type WholeCard = Card<WholeQuestion> & { word: CardWord };

export type NoAnswerCard<Q extends WholeCard | HoleCard> = Omit<
  Q,
  "possibleAnswers"
>;

export type HoleQuestion = {
  holedWord: string;
  meaning: string[];
  reading: string[];
};
export type HoleCard = Card<HoleQuestion> & { word: CardWord };

export type GameData = {
  whole: WholeCard[];
  hole: HoleCard[];
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
