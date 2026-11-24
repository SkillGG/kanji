import type { KanjiRecordData } from "~/app/_components/db/records";
import { isTruthy, type Solid } from "~/lib/utils";

import { load } from "cheerio";
const jSaveFetch = async (site: string) => {
  let headers = new Headers({
    "User-Agent": "MY-UA-STRING",
  });

  return fetch(site, {
    method: "GET",
    headers: headers,
  });
};

const getJishoPage = (kanjis: string[]) => {
  return `https://jisho.org/search/${encodeURIComponent(`${kanjis.join(",")} #kanji`)}`;
};

const GRADES = {
  "grade 1": "g1",
  "grade 2": "g2",
  "grade 3": "g3",
  "grade 4": "g4",
  "grade 5": "g5",
  "grade 6": "g6",
  "junior high": "jh",
  "high school": "hs",
} as const;

export const getChunkedKanjiData = async (
  kanji: string[],
  chunkNum: number,
  chunkSize: number,
): Promise<Solid<KanjiRecordData>[]> => {
  const currentChunk = kanji.slice(
    chunkNum * chunkSize,
    (chunkNum + 1) * chunkSize,
  );

  const site = await (await jSaveFetch(getJishoPage(currentChunk))).text();

  const $ = load(site);

  return $(".kanji.details")
    .toArray()
    .map((el) => {
      const e = $(el);
      const i = e.find(`[data-area-name="print"].character`).text().trim();
      const meaning = e
        .find(".kanji-details--section .kanji-details__main-meanings")
        .text()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const kunyomi = e
        .find(
          ".kanji-details--section .kun_yomi .kanji-details__main-readings-list",
        )
        .text()
        .split(/,|、/g)
        .map((s) => s.trim())
        .filter(Boolean);
      const onyomi = e
        .find(
          ".kanji-details--section .on_yomi .kanji-details__main-readings-list",
        )
        .text()
        .split(/,|、/g)
        .map((s) => s.trim())
        .filter(Boolean);

      const n = e
        .find(".jlpt strong")
        .text()
        .trim()
        .match(/(N\d)/i)?.[1]
        ?.toLowerCase();
      const g = e
        .find(".grade strong")
        .text()
        .trim()
        .match(/((?:grade \d)|(?:junior high)|(?:high school))/)?.[1]
        ?.toLowerCase();

      const grade = g ? GRADES[g as keyof typeof GRADES] : undefined;

      return {
        kanji: i,
        kunyomi,
        meaning,
        onyomi,
        tags: [n ? `(${n})` : null, grade ? `(${grade})` : null]
          .filter(isTruthy)
          .map((t) => ({ name: t })),
      };
    });
};
