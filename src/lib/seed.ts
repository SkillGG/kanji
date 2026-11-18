import type { KanjiWithTag } from "./db";

export function containsKanji(str: string): boolean {
  return /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(str);
}

export function uniqueKanjiFromWords(words: string[]): string[] {
  const chars = [...new Set<string>(words.flatMap((q) => [...q]))].filter((c) =>
    containsKanji(c),
  );
  chars.sort();
  return chars;
}

export function uniqueKanjiFromWordsWithTags(
  words: { word: string; tag: { name: string }[] }[],
): Omit<KanjiWithTag, "onyomi" | "kunyomi" | "meaning">[] {
  const all: Omit<KanjiWithTag, "onyomi" | "kunyomi" | "meaning">[] = [];
  for (const w of words) {
    for (const k of uniqueKanjiFromWords([w.word])) {
      all.push({ kanji: k, tags: w.tag });
    }
  }
  return all;
}
