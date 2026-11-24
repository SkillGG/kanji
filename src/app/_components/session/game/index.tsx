"use client";

import { cn } from "cn";
import { Fragment, useEffect, useState } from "react";
import { scopeToSearchParams, type SessionScope } from "~/lib/sessionScope";
import { api } from "~/trpc/react";
import { Spinner } from "~/app/_components/spinnerOn";
import { parseServerSearchParams, randomInt } from "~/lib/utils";
import type {
  CardSessionStats,
  GameCard,
  GameData,
  HoleCard,
  WholeCard,
} from "~/lib/game";
import { HoleGame } from "./hole";
import { useRouter } from "next/navigation";
import { WholeGame } from "./whole";

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
  const router = useRouter();

  const [page, setPage] = useState(scope.gameData?.cardPage ?? 0);

  const [seed, setSeed] = useState(scope.gameData?.seed ?? "");
  const [canFetchNext, setCanFetchNext] = useState(false);

  // avoid rerender on router.replace
  const [sessionScope] = useState<SessionScope>(() => ({
    length: scope.length,
    modes: scope.modes,
    tags: scope.tags,
    customrange: scope.customrange,
  }));

  const { isLoading: loading, data: gameData } =
    api.game.consumeGameData.useQuery(
      {
        scope: sessionScope,
        seed,
        page,
      },
      { staleTime: 60000 },
    );

  const [game, setGame] = useState<GameData | null>(null);
  const [done, setDone] = useState<{ card: GameCard; score: number }[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(
    scope.gameData?.cardIdx ?? 0,
  );

  const utils = api.useUtils();

  const [stats, setStats] = useState<CardSessionStats | null>(null);

  useEffect(() => {
    if (!gameData) {
      return;
    }
    if (game) {
      // game state changed mid-game
      // setCurrentCardIndex(0);
      console.warn("Game state changed mid-game");
    } else {
      console.log("First page load");
      setGame(gameData);
      setStats((p) => (!p ? gameData.stats : { ...p, ...gameData.stats }));
      // avoid refetch if the seed was set first time
      utils.game.consumeGameData.setData(
        { scope: sessionScope, seed: gameData.seed, page },
        gameData,
      );
      setSeed(gameData.seed);
      setCanFetchNext(gameData.hasNext);
    }
  }, [gameData]);

  useEffect(() => {
    if (!gameData || !canFetchNext) return;
    // prefetch if we're getting close to the end of the current cards
    if (currentCardIndex >= gameData.cards.length - 3 && gameData.hasNext) {
      utils.game.consumeGameData.prefetch(
        {
          scope,
          seed,
          page: page + 1,
        },
        { staleTime: 60000 },
      );
    }
  }, [gameData, currentCardIndex, page, seed, scope, utils, canFetchNext]);

  useEffect(() => {
    console.log("seed, page or cci changed");
    const sssp = scopeToSearchParams({
      length: scope.length,
      modes: scope.modes,
      tags: scope.tags,
      customrange: scope.customrange,
      gameData: seed
        ? {
            seed,
            cardIdx: currentCardIndex,
            cardPage: page,
          }
        : undefined,
    });
    router.replace(`?${sssp}`);
  }, [seed, page, currentCardIndex]);

  if (loading) {
    return <GameLoading scope={scope} />;
  } else console.log(gameData);

  if (!gameData)
    return (
      <>
        <div
          className={cn(
            `text-md absolute top-5 flex items-center justify-center border-red-500 bg-red-500/50`,
          )}
        >
          Could not load the data!
        </div>
        <GameLoading scope={scope} />
      </>
    );

  const curCard = gameData.cards[currentCardIndex];

  if (!curCard)
    return (
      <>
        <div
          className={cn(
            `text-md absolute top-5 flex items-center justify-center border-red-500 bg-red-500/50`,
          )}
        >
          Could not load card data!
        </div>
        <GameLoading scope={scope} />
      </>
    );

  const nextCard = () => {
    setStats((p) =>
      p
        ? {
            ...p,
            cardsFinished: (p.cardsFinished ?? currentCardIndex) + 1,
          }
        : p,
    );
    if (currentCardIndex === gameData.cards.length - 1) {
      if (gameData.hasNext) {
        setPage((p) => p + 1);
        setCurrentCardIndex(0);
      } else {
        // do finish page sequence
        return;
      }
    } else {
      setCurrentCardIndex((p) => p + 1);
    }
  };
  console.log(stats);
  return (
    <>
      <nav className={cn(`absolute top-0 w-full`)}>
        <div>
          {stats?.cardsFinished ?? 1} / {scope.length}
        </div>
      </nav>
      <div
        className={cn(
          `m-0 flex h-screen items-center justify-center gap-2 p-0`,
        )}
      >
        <div
          className={cn(
            "grid grid-rows-2 gap-3 rounded-xl border border-white bg-slate-700 p-5 text-wrap",
          )}
        >
          {curCard.type === "hole" ? (
            <HoleGame
              question={curCard.question}
              answer={curCard.possibleAnswers}
              setPoints={(score) => {
                setDone((p) => [...p, { card: curCard, score }]);
                nextCard();
              }}
            />
          ) : (
            <WholeGame
              answer={curCard.possibleAnswers}
              question={curCard.question}
              setPoints={(score) => {
                setDone((p) => [...p, { card: curCard, score }]);
                nextCard();
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};
