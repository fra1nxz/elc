import { useEffect, useRef } from "react";


export default function Snow() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {

    const canvas = ref.current!;

    const ctx = canvas.getContext("2d")!;

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let W = 0, H = 0, raf = 0;
    type Flake = { x: number; y: number; r: number; s: number; d: number };
    const flakes: Flake[] = [];
    const make = (anywhere: boolean): Flake => ({
      x: Math.random() * W, y: anywhere ? Math.random() * H : -5,
      r: Math.random() * 2 + 0.6, s: Math.random() * 0.8 + 0.3, d: Math.random() * Math.PI * 2,
    });
    const resize = () => {
      W = canvas.width = innerWidth; H = canvas.height = innerHeight;
      const n = Math.min(110, Math.round(W / 12));
      while (flakes.length < n) flakes.push(make(true));
      flakes.length = n;
    };
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(220,236,255,.7)";
      flakes.forEach((f, i) => {
        f.d += 0.01; f.y += f.s; f.x += Math.sin(f.d) * 0.4;
        if (f.y > H + 5) flakes[i] = make(false);
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    addEventListener("resize", resize);
    resize(); tick();
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="snow" aria-hidden="true" />;
}
