import { cn } from "cn";
import { type HoleCard, type HoleQuestion } from "~/lib/game";
import { JapaneseRuby } from "../../ruby";
import { DrawCanvas } from "./gameCanvas";
import { useEffect, useState } from "react";
import { KanjiStrokeOrderFont } from "~/app/fonts/kso";

const GRIDSIZE = 900;

export const HoleGame = ({
  question,
  answer,
  setPoints,
}: {
  question: HoleQuestion;
  answer: HoleCard["possibleAnswers"];
  setPoints: (n: number) => void;
}) => {
  const [ans, setAns] = useState(answer);
  const [showAnswer, setShowAnswer] = useState(false);
  const [curAnswerToShow, setCurAnswerToShow] = useState<string>(
    answer[0] ?? "",
  );

  const [stopAnswerCycle, setStopAnswerCycle] = useState(false);

  useEffect(() => {
    if (answer && answer.some((a) => !ans.includes(a))) setAns(answer);
  }, [answer]);

  useEffect(() => {
    if (ans.length > 1 && !stopAnswerCycle) {
      // set timers
      const cIdx = ans.indexOf(curAnswerToShow);
      if (cIdx >= 0) {
        const nIdx = cIdx + 1 >= ans.length ? 0 : cIdx + 1;
        const st = setTimeout(() => {
          setCurAnswerToShow((p) => ans[nIdx] ?? p);
        }, 3000);
        return () => {
          clearTimeout(st);
        };
      }
    } else if (!stopAnswerCycle) {
      const a0 = ans[0];
      if (a0) setCurAnswerToShow(a0);
    }
  }, [ans, showAnswer, curAnswerToShow, stopAnswerCycle]);

  const submit = (pts: number) => {
    setPoints(pts);
    setShowAnswer(false);
    setStopAnswerCycle(false);
  };

  return (
    <>
      <div
        className={cn(
          `flex items-center justify-center bg-slate-600 px-5 py-5 text-xl md:text-2xl`,
        )}
      >
        <JapaneseRuby
          reading={question.reading[0] ?? ""}
          text={question.holedWord}
          styleGenerator={() => ({ bottom: { fontSize: "200%" } })}
        />
      </div>
      <div
        className={cn(`relative flex items-center justify-center bg-slate-600`)}
      >
        <DrawCanvas
          updateProbableAnswer={(s) => {}}
          size={{ x: 300, y: 300 }}
          canDraw={!showAnswer}
          idxRefresh={ans.indexOf(curAnswerToShow)}
        />

        <svg
          width={300}
          height={300}
          viewBox={`0 0 ${GRIDSIZE} ${GRIDSIZE}`}
          className={cn(
            `pointer-events-none absolute top-0 right-0 h-75 w-75 fill-white`,
          )}
          tabIndex={-1}
        >
          {[...new Array(9)].map((_, i) => {
            const x = i % 3;
            const y = Math.floor(i / 3);
            return (
              <rect
                x={(x * GRIDSIZE) / 3}
                y={(y * GRIDSIZE) / 3}
                width={GRIDSIZE / 3}
                height={GRIDSIZE / 3}
                stroke="black"
                strokeWidth={1}
                fill="none"
                id={`${x}/${y}`}
                key={`canvas_grid_${x}/${y}`}
              />
            );
          })}

          {showAnswer && (
            <text
              className={cn(`opacity-25`)}
              x="50%"
              y="50%"
              textAnchor="middle"
              fontSize="600pt"
              dominantBaseline="central"
              fontFamily={KanjiStrokeOrderFont.style.fontFamily}
            >
              {curAnswerToShow}
            </text>
          )}
        </svg>
      </div>
      <div className={cn(`flex justify-center`)}>
        {!showAnswer && (
          <button
            onClick={() => {
              setShowAnswer((p) => !p);
              const a0 = ans[0];
              if (a0) setCurAnswerToShow(a0);
            }}
            className={cn(
              `cursor-pointer rounded-xl border border-green-500 bg-green-300 px-2 py-2 text-black`,
              "hover:bg-emerald-500",
            )}
          >
            Show answer
          </button>
        )}
        {showAnswer && ans.length > 1 && (
          <div className="mx-2 flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setStopAnswerCycle(true);
                const ansIdx = ans.indexOf(curAnswerToShow);
                if (ansIdx < 0) return;
                const nIdx = ansIdx === 0 ? ans.length - 1 : ansIdx - 1;
                setCurAnswerToShow((p) => ans[nIdx] ?? p);
              }}
              className={cn(
                `rounded-l-md border border-blue-500 px-2 py-2`,
                `cursor-pointer bg-cyan-500 hover:bg-blue-500`,
              )}
            >
              &lt;
            </button>
            {ans.indexOf(curAnswerToShow) + 1} / {ans.length}
            <button
              onClick={() => {
                setStopAnswerCycle(true);
                const ansIdx = ans.indexOf(curAnswerToShow);
                if (ansIdx < 0) return;
                const nIdx = ansIdx === ans.length - 1 ? 0 : ansIdx + 1;
                setCurAnswerToShow((p) => ans[nIdx] ?? p);
              }}
              className={cn(
                `rounded-r-md border border-blue-500 px-2 py-2`,
                `cursor-pointer bg-cyan-500 hover:bg-blue-500`,
              )}
            >
              &gt;
            </button>
          </div>
        )}
        {showAnswer && (
          <div>
            <button
              className={cn(
                `rounded-l-md border-3 border-red-500 px-2 py-2`,
                `cursor-pointer bg-rose-500 hover:bg-red-400`,
                `border-r-0`,
              )}
              title={"Select as bad answer (1)"}
              onClick={() => submit(0)}
            >
              Bad
            </button>
            <button
              className={cn(
                `border-y-3 border-orange-500 px-2 py-2`,
                `cursor-pointer bg-orange-500 hover:bg-orange-400`,
              )}
              title={"Select as okay answer (2)"}
              onClick={() => submit(1)}
            >
              Okay
            </button>
            <button
              className={cn(
                `rounded-r-md border-3 border-emerald-500 px-2 py-2`,
                `cursor-pointer bg-emerald-500 hover:bg-green-400`,
                `border-l-0`,
              )}
              title={"Select as good answer (3)"}
              onClick={() => submit(2)}
            >
              Good
            </button>
          </div>
        )}
      </div>
    </>
  );
};
