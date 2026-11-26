import type { KanjiWithTag } from "./db";
import { escapeRegexPattern, isTruthy } from "./utils";

export function containsKanji(str: string): boolean {
  return /[\u3400-\u4DBF\u4E00-\u9FFF\u{20000}-\u{2CEAF}]/u.test(str);
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

export const KANA_RE = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;

export function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

const addDakuten = (ch: string): string =>
  (ch.normalize("NFD")[0]! + "\u3099").normalize("NFC");

export function normalizeWord(word: string): string {
  const chars = [...word];
  const out: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const prev = out[i - 1];

    if ((ch === "々" || ch === "ゝ" || ch === "ヽ") && prev) {
      out.push(prev);
    } else if ((ch === "ゞ" || ch === "ヾ") && prev) {
      out.push(addDakuten(prev));
    } else {
      out.push(ch);
    }
  }

  return out.join("");
}
export function autoGuessReading(word: string, reading: string): string[] {
  if (reading.includes(".")) return reading.split(".");

  const normReading = katakanaToHiragana(reading);
  const chars = [...normalizeWord(word)];

  const segments = chars
    .map((c) => ({ kana: !containsKanji(c), c }))
    .reduce<{ kana: boolean; c: string }[]>((p, n, i) => {
      const prev = p[p.length - 1];
      if (!prev) return [...p, n];
      if (!prev.kana && !n.kana) {
        return p;
      }
      return [...p, n];
    }, [])
    .filter(isTruthy);

  const pat = `^${segments.map((s) => (s.kana ? escapeRegexPattern(katakanaToHiragana(s.c)) : "(.+?)")).join("")}$`;
  const match = new RegExp(pat, "u").exec(normReading);
  if (!match) return [reading];

  let gIdx = 1;
  return segments.flatMap((s) => (!s.kana ? [match[gIdx++] ?? ""] : [""]));
}
