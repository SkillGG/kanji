ALTER TABLE "customtag" ALTER COLUMN "sessionID" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customtag" ALTER COLUMN "scope" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sentence" ALTER COLUMN "text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sentenceanswer" ALTER COLUMN "sentence" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sentenceanswer" ALTER COLUMN "relevance" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tagToKanji" ALTER COLUMN "tag" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tagToKanji" ALTER COLUMN "kanji" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tagToSentence" ALTER COLUMN "tag" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tagToSentence" ALTER COLUMN "sentence" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tagToWord" ALTER COLUMN "word" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tagToWord" ALTER COLUMN "tag" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "word" ALTER COLUMN "meaning" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wordToKanji" ALTER COLUMN "word" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wordToKanji" ALTER COLUMN "kanji" SET NOT NULL;