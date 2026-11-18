"use client";

import { cn } from "cn";
import { useState } from "react";
import { OkuriganaInputDialog } from "~/app/_components/okuriganaInput";
import { JapaneseRuby } from "~/app/_components/ruby";
import { Spinner, SpinnerOrText } from "~/app/_components/spinnerOn";
import { api } from "~/trpc/react";

export default function Home() {
  const {
    data: words,
    isLoading,
    isFetching,
    isPending,
  } = api.db.getWords.useQuery({
    limit: 9999,
    page: 0,
  });

  const utils = api.useUtils();

  const { isPending: mutatingWords, mutateAsync: updateWords } =
    api.db.updateWordReadingMultiple.useMutation({
      onSuccess: () => {
        utils.db.getWords.invalidate().then(() => {
          setOkuWords([]);
          setToUpdate([]);
        });
      },
    });

  const [okuOpen, setOkuOpen] = useState(false);

  const [okuWords, setOkuWords] = useState<
    { word: string; id: string; reading: string[] }[]
  >([]);
  const [toUpdate, setToUpdate] = useState<
    { word: string; oldReading: string; newReading: string }[]
  >([]);
  return (
    <div
      className={cn(
        `flex h-screen w-screen flex-wrap justify-around gap-5 pr-16 select-none`,
      )}
    >
      <button
        className={cn(
          `fixed right-1 bottom-5 rounded-xl border border-green-500 px-2 py-2`,
          "cursor-pointer bg-emerald-500/80 hover:bg-emerald-300",
          "disabled:cursor-default disabled:border-gray-500 disabled:bg-gray-400/50",
        )}
        disabled={mutatingWords}
        onClick={() => {
          const fWords: { word: string; reading: string[] }[] = [];
          for (const tu of toUpdate) {
            let fW = fWords.find((w) => w.word === tu.word);
            if (!fW) {
              const orW = words?.find((w) => w.word === tu.word);
              if (!orW) continue;
              fW = { word: orW.word, reading: orW.reading };
              fWords.push(fW);
            }
            fW.reading = fW.reading.map((r) =>
              r === tu.oldReading ? tu.newReading : r,
            );
          }
          updateWords(fWords);
        }}
      >
        <SpinnerOrText
          loading={mutatingWords}
          text="Save"
          spinnerStyle={{ className: "w-7.5 h-7.5 text-green-500" }}
        />
      </button>
      <OkuriganaInputDialog
        canClose
        open={okuOpen}
        words={okuWords}
        onFinish={() => {
          setOkuWords([]);
          setOkuOpen(false);
        }}
        updateReading={(id, r) => {
          if (r.length > 1) return;
          const newReading = r[0];
          if (!newReading) return;
          setToUpdate((prev) => {
            const [word, oReading] = id.split("|");
            if (!word || !oReading) return prev;
            if (oReading === newReading)
              return prev.filter(
                (p) => !(p.word === word && p.oldReading === oReading),
              );

            const pW = prev.find(
              (w) => w.word === word && w.oldReading === oReading,
            );
            return pW
              ? prev.map((p) =>
                  p.word === word ? { ...p, newReading: newReading } : p,
                )
              : [
                  ...prev,
                  { word, oldReading: oReading, newReading: newReading },
                ];
          });
        }}
      />
      {isLoading && (
        <div className={cn(`flex h-screen w-full justify-center align-middle`)}>
          <Spinner
            spinnerText="Loading"
            spinnerStyle={{ className: "w-64 h-64" }}
          />
        </div>
      )}
      {!isLoading &&
        words?.map((w, i) => {
          return (
            <div
              key={`${w.word}_${w.reading}`}
              className={cn(
                `flex w-full basis-[49%] justify-around rounded-xl border border-black/50 py-2`,
                w.word.length > 1 &&
                  w.reading.some((q) => !q.includes(".")) &&
                  "border-red-500 bg-red-500/20",
                toUpdate.find((tu) => tu.word === w.word) &&
                  "border-purple-500 bg-purple-500/20",
              )}
              onClick={() => {
                setOkuWords(
                  words
                    .filter((_, xi) => xi >= i)
                    .flatMap((xw) =>
                      xw.reading.map((r) => ({
                        reading: [r],
                        word: xw.word,
                        id: `${xw.word}|${r}`,
                      })),
                    ),
                );
                setOkuOpen(true);
              }}
            >
              {w.reading.map((r) => {
                const changed = toUpdate.find(
                  (x) => x.word === w.word && r === x.oldReading,
                );
                return (
                  <JapaneseRuby
                    key={`${w.word}_r_${r}`}
                    reading={changed ? changed.newReading : r}
                    text={w.word}
                  />
                );
              })}
            </div>
          );
        })}
    </div>
  );
}
