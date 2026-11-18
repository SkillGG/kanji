"use client";

import { cn } from "cn";
import { Fragment, useEffect, useState } from "react";
import { type SessionScope } from "~/lib/sessionScope";
import { api } from "~/trpc/react";
import { Spinner } from "../spinnerOn";
import { randomInt } from "~/lib/utils";
import type { GameData } from "~/lib/game";

const Splashes = ["Loading game content", "Thinking up tests"] as const;

const GameLoading = ({ scope }: { scope: SessionScope }) => {
  const [splash, setSplash] = useState("");
  const [dots, setDots] = useState("");

  useEffect(() => {
    setSplash(Splashes[randomInt(0, Splashes.length - 1)] ?? "");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDots((p) => (p.length === 3 ? "" : p + "."));
    }, 200);
    return () => {
      clearTimeout(t);
    };
  }, [dots]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div
        className={cn(
          "relative",
          "flex h-screen w-screen items-center justify-center rounded-xl px-2",
        )}
      >
        <Spinner spinnerStyle={{ className: "w-64 h-64" }} />
        <div className="absolute bottom-4 left-4 text-2xl">
          {splash}
          {dots}
        </div>
      </div>
    </main>
  );
};

export const Game = ({ scope }: { scope: SessionScope }) => {
  const { isLoading: loading, data: gameData } =
    api.game.getGameDataFromScope.useQuery({ scope });

  const [game, setGame] = useState<GameData | null>(null);

  useEffect(() => {
    if (!gameData) {
      return;
    }
    if (game) {
      // game state changed mid-game
      console.warn("Game state changed mid-game");
    } else {
      console.log("First load");
      setGame(gameData);
    }
  }, [gameData]);

  if (loading) {
    return <GameLoading scope={scope} />;
  } else console.log(gameData);
  return (
    <div className={cn(`flex gap-2`)}>
      <div
        className={cn("rounded-xl border border-white bg-slate-700 text-wrap")}
      >
        {gameData?.whole.map((z) => (
          <Fragment key={z.word.word}>
            {z.question.meaning.join(", ")} ({z.question.reading.join(",")})
            =&gt;
            {z.possibleAnswers.join(", ")}
            <br />
          </Fragment>
        ))}
      </div>
      <div
        className={cn("rounded-xl border border-white bg-slate-700 text-wrap")}
      >
        {gameData?.hole.map((z) => (
          <Fragment key={`${z.word.word}_${z.question.holedWord}`}>
            <ruby>
              {z.question.holedWord}
              <rt key={`rt_${z.word.word}`}>{z.word.reading[0] ?? ""}</rt>
            </ruby>
            [{z.question.meaning.join(", ")}] =&gt;
            {z.possibleAnswers.join(", ")}
            <br />
          </Fragment>
        ))}
      </div>
    </div>
  );
};
