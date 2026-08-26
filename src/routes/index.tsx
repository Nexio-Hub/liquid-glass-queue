import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import spaceBg from "@/assets/space-bg.jpg";
import { Starfield } from "@/components/Starfield";
import { supabase } from "@/integrations/supabase/client";
import {
  unlockResponses,
  listResponses,
  markResponseViewed,
  deleteResponse,
} from "@/lib/queue.functions";

type PopupState = "idle" | "waiting" | "success" | "already" | "responses";

type ResponseRow = {
  id: string;
  answer: string;
  viewed: boolean;
  created_at: string;
};

const COOLDOWN_MS = 5 * 60 * 60 * 1000; // 5 hours
const STORAGE_KEY = "queue-entered-at";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liquid Glass Queue — Join the Waitlist" },
      {
        name: "description",
        content:
          "Join the queue on a starlit Liquid Glass page, then unlock the private Responses panel with your password.",
      },
      { property: "og:title", content: "Liquid Glass Queue — Join the Waitlist" },
      {
        property: "og:description",
        content:
          "Join the queue on a starlit Liquid Glass page, then unlock the private Responses panel with your password.",
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

  // Password gate
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [tab, setTab] = useState<"new" | "viewed">("new");

  const unlockFn = useServerFn(unlockResponses);
  const listFn = useServerFn(listResponses);
  const markFn = useServerFn(markResponseViewed);
  const deleteFn = useServerFn(deleteResponse);

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

  useEffect(() => {
    if (!inQueue) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [inQueue]);

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
    const answer = value.trim();
    if (!answer) return;
    if (inQueue) {
      setPopup("already");
      setVisible(true);
      return;
    }
    setPopup("waiting");
    setVisible(true);
    void supabase.from("queue_responses").insert({ answer });
    timerRef.current = setTimeout(() => {
      const t = Date.now();
      setEnteredAt(t);
      setNow(t);
      localStorage.setItem(STORAGE_KEY, String(t));
      setPopup("success");
    }, 5000);
  };

  const refreshRows = async () => {
    const data = (await listFn({})) as ResponseRow[];
    setRows(data);
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || unlocking) return;
    setUnlocking(true);
    setPasswordError(false);
    try {
      const res = await unlockFn({ data: { password } });
      if (!res.ok) {
        setPasswordError(true);
        return;
      }
      await refreshRows();
      setTab("new");
      setPopup("responses");
      setVisible(true);
      setPassword("");
    } catch {
      setPasswordError(true);
    } finally {
      setUnlocking(false);
    }
  };

  const handleMark = async (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, viewed: true } : r)),
    );
    await markFn({ data: { id } });
  };

  const handleDelete = async (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await deleteFn({ data: { id } });
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
  const canClose = popup !== "waiting";
  const newRows = rows.filter((r) => !r.viewed);
  const viewedRows = rows.filter((r) => r.viewed);
  const shown = tab === "new" ? newRows : viewedRows;

  return (
    <div className="relative min-h-screen w-full">
      {/* Space background + twinkling stars */}
      <img
        src={spaceBg}
        alt=""
        aria-hidden="true"
        width={1920}
        height={1280}
        className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover"
      />
      <Starfield />

      <main className="relative z-10">
        {/* Queue section */}
        <section className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
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
        </section>

        {/* Password section */}
        <section className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-md text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Admin Access
            </h2>
            <p className="mt-3 text-base font-medium text-muted-foreground">
              Enter the password to view the responses.
            </p>

            <form
              onSubmit={handleUnlock}
              className="glass-panel mt-8 rounded-4xl p-6 sm:p-8"
            >
              <label htmlFor="password-input" className="sr-only">
                Insert Password
              </label>
              <input
                id="password-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="Insert Password"
                className="glass-input w-full rounded-2xl px-5 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-[color:var(--ring)] focus:shadow-[0_0_0_3px_oklch(0.6_0.19_255/0.25)]"
              />
              {passwordError && (
                <p className="mt-3 text-sm font-semibold text-destructive">
                  Incorrect password
                </p>
              )}
              <button
                type="submit"
                disabled={unlocking}
                className="glass-button mt-5 w-full rounded-2xl px-5 py-3.5 text-base font-semibold hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
              >
                {unlocking ? "Unlocking..." : "Unlock"}
              </button>
            </form>
          </div>
        </section>
      </main>

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className={`absolute inset-0 ${visible ? "glass-bg-enter" : "glass-bg-exit"}`}
            style={{
              background: "oklch(0.08 0.02 264 / 0.55)",
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
                  : popup === "responses"
                    ? "Responses"
                    : "Success"
            }
            className={`glass-panel-popup relative w-full ${popup === "responses" ? "max-w-lg" : "max-w-sm"} rounded-4xl px-7 py-9 text-center ${visible ? "glass-popup-enter" : "glass-popup-exit"}`}
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
            ) : popup === "responses" ? (
              <div className="flex flex-col">
                <h3 className="text-2xl font-semibold text-foreground">
                  Responses
                </h3>

                <div className="mt-5 flex gap-2">
                  {(["new", "viewed"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold capitalize ${
                        tab === t ? "glass-button" : "glass-button-ghost"
                      }`}
                    >
                      {t} ({t === "new" ? newRows.length : viewedRows.length})
                    </button>
                  ))}
                </div>

                <div className="mt-5 max-h-[46vh] space-y-3 overflow-y-auto pr-1 text-left">
                  {shown.length === 0 ? (
                    <p className="py-8 text-center text-base font-medium text-muted-foreground">
                      Nothing here yet.
                    </p>
                  ) : (
                    shown.map((r) => (
                      <div
                        key={r.id}
                        className="glass-panel rounded-3xl px-5 py-4"
                      >
                        <p className="break-words text-base font-medium text-foreground">
                          {r.answer}
                        </p>
                        <div className="mt-3 flex gap-2">
                          {!r.viewed && (
                            <button
                              type="button"
                              onClick={() => handleMark(r.id)}
                              className="glass-button flex-1 rounded-xl px-3 py-2 text-sm font-semibold hover:brightness-110 active:scale-[0.98]"
                            >
                              Mark as Read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            className="glass-button-danger flex-1 rounded-xl px-3 py-2 text-sm font-semibold hover:brightness-110 active:scale-[0.98]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={closePopup}
                  className="glass-button-ghost mt-6 w-full rounded-2xl px-5 py-3 text-base font-semibold active:scale-[0.98]"
                >
                  Close
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
      <rect x="10.8" y="5.5" width="2.4" height="8" rx="1.2" fill="#fff" />
      <circle cx="12" cy="17" r="1.5" fill="#fff" />
    </svg>
  );
}
