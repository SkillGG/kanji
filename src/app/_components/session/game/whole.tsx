import { cn } from "cn";
import { type HoleCard, type WholeCard, type WholeQuestion } from "~/lib/game";
import { JapaneseRuby } from "../../ruby";
import { DrawCanvas } from "./gameCanvas";
import { useEffect, useState } from "react";
import { KanjiStrokeOrderFont } from "~/app/fonts/kso";

const GRIDSIZE = 900;

export const WholeGame = ({
  question,
  answer,
  setPoints,
}: {
  question: WholeQuestion;
  answer: WholeCard["possibleAnswers"];
  setPoints: (n: number) => void;
}) => {
  const [ans, setAns] = useState([...answer]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [curAnswerToShow, setCurAnswerToShow] = useState<string>(
    answer[0] ?? "",
  );

  const [stopAnswerCycle, setStopAnswerCycle] = useState(true);

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
    setStopAnswerCycle(true);
  };

  const GRIDX = GRIDSIZE;
  const GRIDY = GRIDSIZE / 3;
  const SVGCenterline = GRIDY / 2;
  const SVGFontSize = SVGCenterline - curAnswerToShow.length * 5;
  const SVGCapline = SVGCenterline * 0.56;
  const SVGBaseline = SVGCenterline * 1.44;

  return (
    <>
      <div
        className={cn(
          `flex flex-col items-center justify-center bg-slate-600 px-5 py-5 md:text-2xl`,
        )}
      >
        <div className={cn(`px-[25%] text-wrap`)}>
          <ol className={cn(`list-decimal`)}>
            {question.meaning.map((m) => (
              <li key={`${question.reading.join(",")}_mean_${m}`}>{m}</li>
            ))}
          </ol>
        </div>
        <div className={cn(`text-4xl`)}>{question.reading.join(", ")}</div>
      </div>
      <div>
        <div
          className={cn(
            `relative flex items-center justify-center bg-slate-600`,
          )}
        >
          <DrawCanvas
            updateProbableAnswer={(s) => {}}
            size={{ x: 900, y: 300 }}
            canDraw={!showAnswer}
            className={cn(showAnswer && "z-10")}
            idxRefresh={ans.indexOf(curAnswerToShow)}
          />

          <svg
            viewBox={`0 0 ${GRIDX} ${GRIDY}`}
            className={cn(`pointer-events-none absolute max-h-full w-full`)}
            preserveAspectRatio="none"
            tabIndex={-1}
          >
            <line
              x1={0}
              y1={SVGCapline + "px"}
              x2={GRIDSIZE}
              y2={SVGCapline + "px"}
              opacity={0.1}
              strokeDasharray={"10 15"}
              stroke="yellow"
              strokeWidth={2}
              fill="none"
            />

            <line
              x1={0}
              y1={SVGCenterline + "px"}
              x2={GRIDSIZE}
              y2={SVGCenterline + "px"}
              opacity={0.1}
              strokeDasharray={"10 15"}
              stroke="blue"
              strokeWidth={2}
              fill="none"
            />

            <line
              x1={0}
              y1={SVGBaseline + "px"}
              x2={GRIDSIZE}
              y2={SVGBaseline + "px"}
              opacity={0.1}
              strokeDasharray={"10 15"}
              stroke="yellow"
              strokeWidth={2}
              fill="none"
            />

            {showAnswer && (
              <text
                className={cn(`opacity-50`)}
                x="50%"
                y="50%"
                textAnchor="middle"
                fontSize={SVGFontSize + "px"}
                dominantBaseline="central"
                fontFamily={KanjiStrokeOrderFont.style.fontFamily}
              >
                {curAnswerToShow}
              </text>
            )}
          </svg>
        </div>
      </div>
      <div className={cn(`flex justify-center`)}>
        {!showAnswer && (
          <button
            onClick={() => {
              setShowAnswer((p) => !p);
              setStopAnswerCycle((p) => !p);
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
