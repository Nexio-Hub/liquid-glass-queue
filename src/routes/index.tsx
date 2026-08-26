import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import glassBg from "@/assets/glass-bg.jpg";

type PopupState = "idle" | "waiting" | "success" | "already";

const COOLDOWN_MS = 5 * 60 * 60 * 1000; // 5 hours
const STORAGE_KEY = "queue-entered-at";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liquid Glass Queue" },
      {
        name: "description",
        content: "An Apple Liquid Glass themed queue signup template.",
      },
      { property: "og:title", content: "Liquid Glass Queue" },
      {
        property: "og:description",
        content: "An Apple Liquid Glass themed queue signup template.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function formatCountdown(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Index() {
  const [value, setValue] = useState("");
  const [popup, setPopup] = useState<PopupState>("idle");
  const [visible, setVisible] = useState(false);
  const [enteredAt, setEnteredAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore queue state on load
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const t = parseInt(stored, 10);
    if (!isNaN(t) && Date.now() - t < COOLDOWN_MS) {
      setEnteredAt(t);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const inQueue = enteredAt !== null;
  const remainingMs = enteredAt
    ? Math.max(0, COOLDOWN_MS - (now - enteredAt))
    : 0;

  // Live countdown tick while in queue
  useEffect(() => {
    if (!inQueue) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [inQueue]);

  // Clear cooldown when it expires
  useEffect(() => {
    if (inQueue && remainingMs === 0) {
      setEnteredAt(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [inQueue, remainingMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    if (inQueue) {
      setPopup("already");
      setVisible(true);
      return;
    }
    setPopup("waiting");
    setVisible(true);
    timerRef.current = setTimeout(() => {
      const t = Date.now();
      setEnteredAt(t);
      setNow(t);
      localStorage.setItem(STORAGE_KEY, String(t));
      setPopup("success");
    }, 5000);
  };

  const closePopup = () => {
    if (!visible) return;
    setVisible(false);
    setTimeout(() => {
      setPopup("idle");
      setValue("");
    }, 420);
  };

  const showPopup = popup !== "idle";
  const canClose = popup === "success" || popup === "already";

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background image + tint */}
      <img
        src={glassBg}
        alt=""
        aria-hidden="true"
        width={1920}
        height={1280}
        className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover"
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, oklch(0.97 0.02 250 / 35%) 0%, oklch(0.97 0.01 250 / 55%) 100%)",
        }}
      />

      {/* Centered content */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Title1
          </h1>
          <p className="mt-3 text-lg font-medium text-muted-foreground">
            Subtext1
          </p>

          <form
            onSubmit={handleSubmit}
            className="glass-panel mt-10 rounded-4xl p-6 sm:p-8"
          >
            <label htmlFor="queue-input" className="sr-only">
              Textbox1
            </label>
            <input
              id="queue-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Textbox1"
              className="glass-input w-full rounded-2xl px-5 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-[color:var(--ring)] focus:shadow-[0_0_0_3px_oklch(0.6_0.19_255/0.25)]"
            />
            <button
              type="submit"
              className="glass-button mt-5 w-full rounded-2xl px-5 py-3.5 text-base font-semibold hover:brightness-110 active:scale-[0.98]"
            >
              Button1
            </button>
          </form>
        </div>
      </main>

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 ${visible ? "glass-bg-enter" : "glass-bg-exit"}`}
            style={{
              background: "oklch(0.15 0.03 264 / 0.35)",
              backdropFilter: "blur(8px)",
            }}
            onClick={canClose && visible ? closePopup : undefined}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              popup === "waiting"
                ? "Putting you in the queue"
                : popup === "already"
                  ? "Already in the queue"
                  : "Success"
            }
            className={`glass-panel-popup relative w-full max-w-sm rounded-4xl px-7 py-9 text-center ${visible ? "glass-popup-enter" : "glass-popup-exit"}`}
          >
            {popup === "waiting" ? (
              <div className="flex flex-col items-center">
                <Spinner />
                <p className="mt-6 text-lg font-semibold text-foreground">
                  Putting you in the queue...
                </p>
              </div>
            ) : popup === "already" ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-3">
                  <ExclamationIcon />
                  <p className="text-left text-lg font-semibold leading-snug text-foreground">
                    You're already in the queue!
                  </p>
                </div>
                <p className="mt-3 text-base font-medium text-muted-foreground">
                  Come back in {formatCountdown(remainingMs)}
                </p>
                <button
                  type="button"
                  onClick={closePopup}
                  className="glass-button mt-7 w-full rounded-2xl px-5 py-3.5 text-base font-semibold hover:brightness-110 active:scale-[0.98]"
                >
                  OK
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-3">
                  <ClockIcon />
                  <p className="text-left text-lg font-semibold leading-snug text-foreground">
                    You've been successfully put in the queue!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePopup}
                  className="glass-button mt-8 w-full rounded-2xl px-5 py-3.5 text-base font-semibold hover:brightness-110 active:scale-[0.98]"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--primary)] border-t-transparent"
      style={{ backdropFilter: "blur(4px)" }}
    />
  );
}

function ClockIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-primary"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" fill="var(--primary)" />
      <path
        d="M12 6.5v6"
        stroke="var(--primary-foreground)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.6" r="1.4" fill="var(--primary-foreground)" />
    </svg>
  );
}
