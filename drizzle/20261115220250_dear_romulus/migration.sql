CREATE TABLE "customtag" (
	"tag" text PRIMARY KEY,
	"sessionID" text,
	"scope" jsonb
);
--> statement-breakpoint
CREATE TABLE "kanji" (
	"kanji" text PRIMARY KEY,
	"onyomi" text[],
	"kunyomi" text[],
	"meaning" text[] DEFAULT '{}'::text[]
);
--> statement-breakpoint
CREATE TABLE "reading" (
	"reading" text,
	"word" text,
	"raw" text GENERATED ALWAYS AS (get_raw_reading("reading"."word", "reading"."reading")) STORED NOT NULL,
	CONSTRAINT "reading_pkey" PRIMARY KEY("word","reading"),
	CONSTRAINT "raw_len_check" CHECK ((length(raw) >= length(reading)))
);
--> statement-breakpoint
CREATE TABLE "sentence" (
	"id" text PRIMARY KEY,
	"text" text
);
--> statement-breakpoint
CREATE TABLE "sentenceanswer" (
	"id" serial PRIMARY KEY,
	"sentence" text,
	"answer" text NOT NULL,
	"relevance" numeric
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"name" text PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE "tagToKanji" (
	"relid" serial PRIMARY KEY,
	"tag" text,
	"kanji" text
);
--> statement-breakpoint
CREATE TABLE "tagToSentence" (
	"relid" serial PRIMARY KEY,
	"tag" text,
	"sentence" text
);
--> statement-breakpoint
CREATE TABLE "tagToWord" (
	"relid" serial,
	"word" text,
	"tag" text
);
--> statement-breakpoint
CREATE TABLE "word" (
	"word" text PRIMARY KEY,
	"meaning" text[] DEFAULT '{}'::text[]
);
--> statement-breakpoint
CREATE TABLE "wordToKanji" (
	"relid" serial PRIMARY KEY,
	"word" text,
	"kanji" text
);
--> statement-breakpoint
CREATE INDEX "reading_raw_idx" ON "reading" ("raw");--> statement-breakpoint
ALTER TABLE "reading" ADD CONSTRAINT "reading_word_word_word_fkey" FOREIGN KEY ("word") REFERENCES "word"("word");--> statement-breakpoint
ALTER TABLE "sentenceanswer" ADD CONSTRAINT "sentenceanswer_sentence_sentence_id_fkey" FOREIGN KEY ("sentence") REFERENCES "sentence"("id");--> statement-breakpoint
ALTER TABLE "tagToKanji" ADD CONSTRAINT "tagToKanji_tag_tag_name_fkey" FOREIGN KEY ("tag") REFERENCES "tag"("name");--> statement-breakpoint
ALTER TABLE "tagToKanji" ADD CONSTRAINT "tagToKanji_kanji_kanji_kanji_fkey" FOREIGN KEY ("kanji") REFERENCES "kanji"("kanji");--> statement-breakpoint
ALTER TABLE "tagToSentence" ADD CONSTRAINT "tagToSentence_tag_tag_name_fkey" FOREIGN KEY ("tag") REFERENCES "tag"("name");--> statement-breakpoint
ALTER TABLE "tagToSentence" ADD CONSTRAINT "tagToSentence_sentence_sentence_id_fkey" FOREIGN KEY ("sentence") REFERENCES "sentence"("id");--> statement-breakpoint
ALTER TABLE "tagToWord" ADD CONSTRAINT "tagToWord_word_word_word_fkey" FOREIGN KEY ("word") REFERENCES "word"("word");--> statement-breakpoint
ALTER TABLE "tagToWord" ADD CONSTRAINT "tagToWord_tag_tag_name_fkey" FOREIGN KEY ("tag") REFERENCES "tag"("name");--> statement-breakpoint
ALTER TABLE "wordToKanji" ADD CONSTRAINT "wordToKanji_word_word_word_fkey" FOREIGN KEY ("word") REFERENCES "word"("word");--> statement-breakpoint
ALTER TABLE "wordToKanji" ADD CONSTRAINT "wordToKanji_kanji_kanji_kanji_fkey" FOREIGN KEY ("kanji") REFERENCES "kanji"("kanji");