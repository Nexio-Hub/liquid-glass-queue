import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import glassBg from "@/assets/glass-bg.jpg";

type PopupState = "idle" | "waiting" | "success" | "closing";

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

function Index() {
  const [value, setValue] = useState("");
  const [popup, setPopup] = useState<PopupState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setPopup("waiting");
    timerRef.current = setTimeout(() => {
      setPopup("success");
    }, 5000);
  };

  const closePopup = () => {
    if (popup === "closing") return;
    setPopup("closing");
    setTimeout(() => {
      setPopup("idle");
      setValue("");
    }, 420);
  };

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

      {popup !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 ${popup === "closing" ? "animate-fade-out" : "animate-fade-in"}`}
            style={{
              background: "oklch(0.15 0.03 264 / 0.35)",
              backdropFilter: "blur(8px)",
            }}
            onClick={popup === "success" ? closePopup : undefined}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={popup === "waiting" ? "Putting you in the queue" : "Success"}
            className={`glass-panel relative w-full max-w-sm rounded-4xl px-7 py-9 text-center ${popup === "closing" ? "animate-exit" : "animate-enter"}`}
          >
            {popup === "waiting" ? (
              <div className="flex flex-col items-center">
                <Spinner />
                <p className="mt-6 text-lg font-semibold text-foreground">
                  Putting you in the queue...
                </p>
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
