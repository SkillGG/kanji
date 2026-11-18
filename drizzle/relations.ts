import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  word: {
    reading: r.many.reading({
      from: r.word.word,
      to: r.reading.word,
    }),
    tag: r.many.tag({
      from: r.word.word.through(r.tagToWord.word),
      to: r.tag.name.through(r.tagToWord.tag),
    }),
    kanji: r.many.kanji({
      from: r.word.word.through(r.wordToKanji.word),
      to: r.kanji.kanji.through(r.wordToKanji.kanji),
    }),
  },
  kanji: {
    tag: r.many.tag({
      from: r.kanji.kanji.through(r.tagToKanji.kanji),
      to: r.tag.name.through(r.tagToKanji.tag),
    }),
  },
  tag: {
    word: r.many.word({
      from: r.tag.name.through(r.tagToWord.tag),
      to: r.word.word.through(r.tagToWord.word),
    }),
    kanji: r.many.kanji({
      from: r.tag.name.through(r.tagToKanji.tag),
      to: r.kanji.kanji.through(r.tagToKanji.kanji),
    }),
    sentence: r.many.sentence({
      from: r.tag.name.through(r.tagToSentence.tag),
      to: r.sentence.id.through(r.tagToSentence.sentence),
    }),
  },
  sentence: {
    tag: r.many.tag({
      from: r.sentence.id.through(r.tagToSentence.sentence),
      to: r.tag.name.through(r.tagToSentence.tag),
    }),
    answer: r.many.sentenceanswer({
      from: r.sentence.id,
      to: r.sentenceanswer.sentence,
    }),
  },
  sentenceanswer: {
    sentence: r.one.sentence({
      from: r.sentenceanswer.sentence,
      to: r.sentence.id,
    }),
  },
}));
