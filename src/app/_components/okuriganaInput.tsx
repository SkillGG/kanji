import { cn } from "cn";
import { useState, useEffect, Fragment } from "react";
import { autoGuessReading, containsKanji } from "~/lib/jp";

const redot = (arr: string[]): string[] => {
  const narr = [...arr];
  for (let i = narr.length - 1; i >= 0; i--) {
    const t = narr[i];
    const p = narr[i - 1];
    if (t) return narr;
    if (p) return narr;
    // console.log("Redotting", narr, i);
    narr.splice(i, 1);
  }
  console.log("Redoted ", arr.join("."), narr.join("."));
  return narr;
};

const autoOkurigana = (word: string, read: string): string[] =>
  redot(autoGuessReading(word, read));

export function OkuriganaInputDialog({
  open,
  words,
  updateReading,
  onFinish,
  canClose,
}: {
  open: boolean;
  words: { word: string; reading: string[]; id: string }[];
  updateReading: (id: string, r: string[]) => void;
  onFinish: (closedEarly?: boolean) => void;
  canClose?: boolean;
}) {
  const [allWords, setAllWords] = useState([...words]);

  const [curWordIdx, setCurWord] = useState(0);

  const [done, setDone] = useState(false);
  const [curReading, setCurReading] = useState<string[]>([]);

  const finish = (r?: string) => {
    setDone(true);
    onFinish(false);
  };

  const [cursor, setCursor] = useState<{ on: [number, number]; len: number }>({
    on: [0, 0],
    len: 0,
  });

  const curWord = allWords[curWordIdx];

  const onNextClick = () => {
    setTimeout(() => {
      setCurWord((p) => p + 1);
      resetCursor();
    }, 0);
    if (curWord) updateReading(curWord.id, [redot(curReading).join(".")]);
  };

  const onPrevClick = () => {
    if (curWordIdx > 0) {
      setTimeout(() => {
        setCurWord((p) => p - 1);
        resetCursor();
      }, 0);
      if (curWord) updateReading(curWord.id, [redot(curReading).join(".")]);
    }
  };

  let crStartPos = -1;

  const isInCursor = (r: number, k: number, segmentwise?: boolean): boolean =>
    cursor.on[0] === r &&
    (segmentwise || (cursor.on[1] <= k && cursor.on[1] + cursor.len > k));

  const isCursorOn = (r: number, k: number): boolean =>
    cursor.on[0] === r && cursor.on[1] === k;

  const resetCursor = () => setCursor({ on: [0, 0], len: 0 });

  const dragCursorTo = (segment: number, char: number) => {
    setCursor((prev) => {
      if (prev.on[0] !== segment) {
        return prev;
      }
      if (prev.on[1] > char) {
        return prev;
      }
      return {
        on: [segment, prev.on[1]],
        len: char - (prev.on[1] ?? 0) + 1,
      };
    });
  };

  const moveCursorTo = (segment: number, char: number) => {
    setCursor({ on: [segment, char], len: 1 });
  };

  const removeOnCursor = () => {
    setCurReading((p) => {
      return redot(
        p.map((r, ri) => {
          return r
            .split("")
            .filter((_, ki) => !isInCursor(ri, ki, true))
            .join("");
        }),
      );
    });
    setTimeout(moveCursorNextSegment);
  };

  const removeSingleAsABlock = () => {
    setCurReading((p) => {
      const seg = cursor.on[0];
      const spl = p[seg];
      if (!spl) return p;
      const cursorCutout: string[] = [];
      const [start, end] = [cursor.on[1], cursor.on[1] + (cursor.len || 1)];
      cursorCutout.push(spl.substring(0, start), "-", spl.substring(end));

      return redot(
        p.flatMap((r, ri) => {
          return seg === ri
            ? cursorCutout.filter(Boolean).map((q) => (q === "-" ? "" : q))
            : r;
        }),
      );
    });
    const c = cursor.on[0];
    setTimeout(() => setCursor({ on: [c + 1, 0], len: 0 }));
  };

  const splitOnCursor = () => {
    setCurReading((prev) => {
      const ri = cursor.on[0];
      const nP = [...prev];
      const txt = nP[cursor.on[0]];
      if (!txt) return nP;
      const cursorCutout: string[] = [];
      const [start, end] = [cursor.on[1], cursor.on[1] + (cursor.len || 1)];
      cursorCutout.push(
        txt.substring(0, start),
        txt.substring(start, end),
        txt.substring(end),
      );
      const swap = cursorCutout.filter(Boolean);
      nP.splice(ri, swap.length, ...swap);
      return redot(nP);
    });
    const c = cursor.on[0];
    setTimeout(() => {
      setCursor({ on: [c + 1, 0], len: 0 });
    }, 0);
  };

  const reset = (noAuto?: boolean) => {
    if (curWord) {
      const cwr = curWord.reading[0];
      if (cwr)
        setCurReading(
          redot(noAuto ? cwr.split(".") : autoOkurigana(curWord.word, cwr)),
        );
    }
    setTimeout(resetCursor);
  };

  const moveCursorNextSegment = (s?: number) => {
    const now = s ?? cursor.on[0];
    if (curReading.length - 1 <= now) {
      resetCursor();
      return;
    }
    for (let i = now + 1; i <= curReading.length; i++) {
      if (!!curReading[i]) {
        setCursor({ on: [i, 0], len: 0 });
        return;
      }
    }
    resetCursor();
  };

  const moveCursorPrevSegment = (toLast?: boolean, s?: number) => {
    const now = s ?? cursor.on[0];
    for (let i = now - 1; i >= 0; i--) {
      const pSeg = curReading[i];
      if (pSeg) {
        setCursor({ on: [i, toLast ? pSeg.length - 1 : 0], len: 0 });
        return;
      }
    }
    const lastSeg = curReading[curReading.length - 1];
    if (lastSeg)
      setCursor({
        on: [curReading.length - 1, toLast ? lastSeg.length - 1 : 0],
        len: 0,
      });
  };

  const moveCursorRight = () => {
    let newSeg = cursor.on[0];
    let newPos = cursor.on[1] + 1;
    const seg = curReading[newSeg];
    if (!seg) {
      resetCursor();
      return;
    }

    if (seg.length <= newPos) moveCursorNextSegment();
    else setCursor({ on: [newSeg, newPos], len: 0 });
  };

  const moveCursorLeft = () => {
    let newSeg = cursor.on[0];
    let newPos = cursor.on[1] - 1;

    if (newPos < 0) moveCursorPrevSegment(true);
    else setCursor({ on: [newSeg, newPos], len: 0 });
  };

  // #region effects
  useEffect(() => {
    if (curWordIdx >= allWords.length) {
      finish("oob");
      return;
    }
    const cW = allWords[curWordIdx];

    if (!cW) {
      finish("n CW");
      return;
    }
    const read = cW.reading[0];
    if (!read) {
      setCurWord((p) => p + 1);
      return;
    }
    setCurReading(redot(autoOkurigana(cW.word, read)));
  }, [curWordIdx]);

  useEffect(() => {
    if (open) {
      setAllWords([...words]);
      setCurWord(0);
      setDone(false);
      resetCursor();
      if (words.length > 0) {
        const cW = words[0];
        if (cW && cW.reading.length > 0) {
          const cWr = cW.reading[0];
          if (cWr) setCurReading(redot(autoOkurigana(cW.word, cWr)));
        }
      }
    }
    // @ts-ignore
    window.containsKanji = containsKanji;
  }, [open]);

  useEffect(() => {
    function handleKeyEvents(e: KeyboardEvent) {
      // console.log("Okurigana captured event!", e.code);
      switch (e.code) {
        case "Enter":
        case "Tab":
          onNextClick();
          resetCursor();
          e.preventDefault();
          break;
        case "KeyX":
          removeOnCursor();
          setTimeout(() => onNextClick(), 100);
          e.preventDefault();
          break;
        case "KeyQ":
          e.preventDefault();
          if (e.shiftKey) removeSingleAsABlock();
          else removeOnCursor();
          break;
        case "KeyS":
          removeSingleAsABlock();
          break;
        case "KeyR":
          e.preventDefault();
          reset(e.shiftKey);
          break;
        case "Space":
          e.preventDefault();
          splitOnCursor();
          break;
        case "ArrowRight":
          if (e.shiftKey) setCursor((p) => ({ ...p, len: p.len + 1 }));
          else moveCursorRight();
          break;
        case "ArrowLeft":
          if (e.shiftKey) setCursor((p) => ({ ...p, len: p.len - 1 }));
          else moveCursorLeft();
          break;
        case "KeyA":
          moveCursorPrevSegment();
          break;
        case "KeyD":
          moveCursorNextSegment();
          break;
        case "Escape":
          if (canClose) onFinish();
          break;
        case "Digit1":
        case "Digit2":
        case "Digit3":
        case "Digit4":
        case "Digit5":
        case "Digit6":
          const n = /(\d)/g.exec(e.code);
          if (!n) break;
          const num = Number(n[1]);
          if (!num) break;
          setCursor((p) => ({ ...p, len: num }));
          break;
        case "Backspace":
          onPrevClick();
          break;
        default:
          break;
      }
      // TODO Add keyboard shortcuts
    }
    if (open) {
      window.addEventListener("keydown", handleKeyEvents);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyEvents);
    };
  }, [open, cursor, curReading]);

  // #endregion

  if (!open) return null;
  if (done) return null;

  // console.log(curReading);
  return (
    <div
      className="fixed top-0 left-0 z-50 flex h-screen w-screen items-center justify-center bg-black/70 text-white select-none"
      onMouseDown={(e) => {
        if (canClose) onFinish(true);
      }}
      style={{ backdropFilter: "blur(2px)" }}
    >
      <div
        className="relative max-w-[90vw] min-w-97.5 rounded-2xl border-2 border-emerald-800 bg-slate-900 p-8 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {!curWord ? (
          <div className={cn(`w-full text-center text-xl text-white`)}>
            Saving
          </div>
        ) : (
          <>
            <div
              className={cn(`absolute top-2 right-2 text-xs text-slate-100/60`)}
            >
              {curReading.map((r, i) =>
                i === curReading.length - 1 ? (
                  r
                ) : (
                  <Fragment key={`reading_${r + i}_${curWord}`}>
                    {r}
                    <span className={cn(`text font-bold text-red-500`)}>.</span>
                  </Fragment>
                ),
              )}
            </div>
            <div
              className={cn(
                `absolute top-4 -right-10 flex w-10 flex-col overflow-hidden rounded-r-xl border border-l-0 border-blue-500 bg-slate-500 py-1`,
              )}
            >
              <button
                className={cn(
                  `cursor-pointer border-b-2 border-black bg-slate-500/40 hover:bg-slate-700/60`,
                )}
                onClick={() => {
                  splitOnCursor();
                }}
                title="Split (Space)"
              >
                Sp
              </button>
              <button
                className={cn(
                  `cursor-pointer border-b-2 border-black bg-slate-500/40 hover:bg-slate-700/60`,
                )}
                onClick={() => {
                  removeOnCursor();
                }}
                title="Remove (q)"
              >
                Rm
              </button>
              <button
                className={cn(
                  `cursor-pointer bg-slate-500/40 hover:bg-slate-700/60`,
                )}
                onClick={() => {
                  removeSingleAsABlock();
                }}
                title="Cut [Split + Remove] (s)"
              >
                Cut
              </button>
            </div>
            <div
              className={cn("grid grid-flow-col text-white")}
              style={{
                gridTemplateColumns: `repeat(${curWord.word.length}, minmax(0, 1fr))`,
              }}
            >
              {curReading.map((rPart, ri, rArr) => {
                const isLast = rArr.length - 1 === ri;
                crStartPos++;
                return (
                  <div
                    key={`reading_${curWord.word}_${rPart}_${ri}`}
                    className={cn(`row-1 flex justify-center`)}
                    style={{
                      gridColumn: isLast
                        ? `${crStartPos + 1} / span ${curWord.word.length - crStartPos}`
                        : `${crStartPos + 1} / span 1`,
                    }}
                  >
                    {rPart.split("").map((kana, ki, kArr) => {
                      return (
                        <div
                          key={`reading_${curWord.word}_${curReading.join("")}_${ki}`}
                          onMouseDown={(e) => {
                            if (e.buttons & 0b01) moveCursorTo(ri, ki);
                            if (e.buttons & 0b100) {
                              e.preventDefault();
                              removeOnCursor();
                            }
                          }}
                          className={cn(
                            "border border-white px-2",
                            ki === 0 && `ml-1 rounded-l-sm`,
                            ki === kArr.length - 1 && "mr-1 rounded-r-sm",
                            isCursorOn(ri, ki) &&
                              "border-l-4 border-l-yellow-500",
                            isInCursor(ri, ki) &&
                              "border-yellow-500 bg-yellow-500/10",
                          )}
                          onMouseEnter={(e) => {
                            if ((e.buttons & 0b01) > 0) {
                              dragCursorTo(ri, ki);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            splitOnCursor();
                          }}
                        >
                          {kana}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {curWord.word.split("").map((k, ki) => {
                return (
                  <div
                    className={cn(
                      `border border-slate-100 p-2 text-center text-2xl`,
                      "row-start-2",
                    )}
                    key={`kanji_${k}_${ki}`}
                  >
                    {k}
                  </div>
                );
              })}
            </div>
            <div className={cn(`mt-2 flex justify-end gap-2`)}>
              <button
                className={cn(
                  `cursor-pointer rounded-xl border border-orange-400 bg-orange-800/30 px-4 py-2 text-xl hover:bg-orange-200/20`,
                  `block`,
                )}
                title={"Go to previous okurigana check (Enter)"}
                onClick={onPrevClick}
              >
                Prev
              </button>
              <button
                className={cn(
                  `cursor-pointer rounded-xl border border-green-400 bg-emerald-800/30 px-4 py-2 text-xl hover:bg-emerald-200/20`,
                  `block`,
                )}
                title={"Go to next okurigana check (Enter)"}
                onClick={onNextClick}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
