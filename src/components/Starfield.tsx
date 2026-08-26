import { useMemo } from "react";

type Star = {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
};

function makeStars(count: number, seedStart: number): Star[] {
  // Deterministic pseudo-random so SSR and client match.
  let seed = seedStart;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    left: rand() * 100,
    top: rand() * 100,
    size: 1 + rand() * 2.2,
    delay: rand() * 6,
    duration: 2.6 + rand() * 4.5,
    opacity: 0.35 + rand() * 0.55,
  }));
}

export function Starfield() {
  const stars = useMemo(() => makeStars(140, 20260826), []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className="star-twinkle absolute rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            ["--star-opacity" as string]: String(s.opacity),
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
