CREATE INDEX "idx_ttk_tag" ON "tagToKanji" ("tag");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_ttk" ON "tagToKanji" ("kanji","tag");--> statement-breakpoint
CREATE INDEX "idx_tts_tag" ON "tagToSentence" ("tag");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_tts" ON "tagToSentence" ("sentence","tag");--> statement-breakpoint
CREATE INDEX "idx_ttw_tag" ON "tagToWord" ("tag");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_ttw" ON "tagToWord" ("word","tag");--> statement-breakpoint
CREATE INDEX "idx_wtk_word" ON "wordToKanji" ("word");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_wtk" ON "wordToKanji" ("kanji","word");