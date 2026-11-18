import { useRef, useState } from "react";

export function DrawCanvas({
  size = { x: 600, y: 600 },
  stroke = 5,
}: {
  size?: { x: number; y: number };
  stroke?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const SIZE = [size.x, size.y] as const;
  const STROKE = stroke;

  const [drawing, setDrawing] = useState(false);

  const [history, setHistory] = useState<ImageData[]>([]);

  const popHistory = (ctx: CanvasRenderingContext2D) => {
    if (history.length > 0) {
      setHistory((prev) => {
        const nArr = [...prev];
        const old = nArr.pop();
        ctx.clearRect(0, 0, ...SIZE);
        if (old) ctx.putImageData(old, 0, 0);
        return [...nArr];
      });
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={SIZE[0]}
        height={SIZE[1]}
        className="border border-red-300"
        tabIndex={0}
        onKeyDown={(e) => {
          console.log(e.code);
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) return;
          if (e.code === "KeyR") {
            ctx.clearRect(0, 0, ...SIZE);
          } else if (e.code === "KeyZ" && e.ctrlKey) {
            popHistory(ctx);
          }
        }}
        onMouseDown={() => {
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) return;

          setHistory((p) => [...p, ctx.getImageData(0, 0, ...SIZE)]);

          setDrawing(true);
        }}
        onMouseMove={(ev) => {
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) return;

          const { offsetX: x, offsetY: y } = ev.nativeEvent;

          if (drawing) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = STROKE;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - ev.movementX, y - ev.movementY);
            ctx.closePath();
            ctx.stroke();
          }
        }}
        onMouseLeave={() => {
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) return;
          setDrawing(false);
          popHistory(ctx);
        }}
        onMouseUp={() => {
          setDrawing(false);
        }}
      ></canvas>
    </>
  );
}
