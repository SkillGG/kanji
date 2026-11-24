import { useEffect, useRef, useState, type HTMLAttributes } from "react";

type Point = [number, number];
type LineSegment = { start: Point; end: Point; angle: number | null };

const ANGLE_THRESHOLD = (1 * Math.PI) / 180; // 10 degrees in radians
const MIN_DIST = 10; // px before locking segment angle (prevents jitter)

// Shortest angular difference in radians [0, PI]
const getAngleDiff = (a1: number, a2: number) => {
  let diff = Math.abs(a1 - a2) % (2 * Math.PI);
  return diff > Math.PI ? 2 * Math.PI - diff : diff;
};

export function DrawCanvas({
  size = { x: 600, y: 600 },
  stroke = 3.5,
  updateProbableAnswer,
  canDraw,
  idxRefresh,
  ...rest
}: {
  size?: { x: number; y: number };
  stroke?: number;
  idxRefresh: number;
  updateProbableAnswer: (s: string) => void;
  canDraw: boolean;
} & HTMLAttributes<HTMLCanvasElement>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [lines, setLines] = useState<LineSegment[]>([]);

  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    setLines([]);
    setHistory([]);
  }, [idxRefresh]);

  // Redraw committed green lines whenever `lines` updates and user isn't mid-stroke
  useEffect(() => {
    if (drawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size.x, size.y);
    ctx.strokeStyle = "green";
    ctx.lineWidth = stroke;
    ctx.lineCap = "round";

    for (const line of lines) {
      ctx.beginPath();
      ctx.moveTo(line.start[0], line.start[1]);
      ctx.lineTo(line.end[0], line.end[1]);
      ctx.stroke();
    }
  }, [lines, drawing, size.x, size.y, stroke]);

  const popHistory = () => {
    const lHis = history[history.length - 1] ?? 1;
    setHistory((p) => p.slice(0, -1));
    setLines((prev) => prev.slice(0, -lHis));
  };

  return (
    <canvas
      {...rest}
      ref={canvasRef}
      width={size.x}
      height={size.y}
      tabIndex={0}
      onKeyDown={(e) => {
        console.log("(canvas, okd)", e.code);
        if (!canDraw) {
          return;
        }
        if (e.code === "KeyR") {
          setLines([]);
          setHistory([]);
        } else if (e.code === "KeyZ" && e.ctrlKey) {
          popHistory();
        }
      }}
      onPointerDown={(e) => {
        console.log("(canvas, opd)", e.pointerType, e.pointerId, e.buttons);

        if (!canDraw) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        const { offsetX: x, offsetY: y } = e.nativeEvent;
        setLines((prev) => [
          ...prev,
          { start: [x, y], end: [x, y], angle: null },
        ]);
        setHistory((p) => [...p, 1]);
        setDrawing(true);

        ctx.strokeStyle = "red";
        ctx.lineWidth = stroke;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y);
      }}
      onPointerMove={(ev) => {
        if (!canDraw) return;
        if (!drawing) return;
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        const { offsetX: x, offsetY: y } = ev.nativeEvent;
        const nextPt: Point = [x, y];

        ctx.lineTo(x, y);
        ctx.stroke();

        const cur = lines[lines.length - 1];
        if (!cur) return;

        const dx = x - cur.start[0];
        const dy = y - cur.start[1];
        const dist = Math.hypot(dx, dy);

        if (dist < MIN_DIST) {
          setLines((prev) => [...prev.slice(0, -1), { ...cur, end: nextPt }]);
          return;
        }

        const currentAngle = Math.atan2(dy, dx);

        if (cur.angle === null) {
          setLines((prev) => [
            ...prev.slice(0, -1),
            { ...cur, end: nextPt, angle: currentAngle },
          ]);
          return;
        }

        if (getAngleDiff(cur.angle, currentAngle) > ANGLE_THRESHOLD) {
          setLines((prev) => [
            ...prev,
            { start: cur.end, end: nextPt, angle: null },
          ]);
          setHistory((prev) => [
            ...prev.slice(0, -1),
            (prev[prev.length - 1] ?? 1) + 1,
          ]);
          return;
        }

        setLines((prev) => [...prev.slice(0, -1), { ...cur, end: nextPt }]);
      }}
      onPointerUp={() => setDrawing(false)}
    />
  );
}
