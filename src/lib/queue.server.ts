import { createHash, timingSafeEqual } from "node:crypto";
import { useSession } from "@tanstack/react-start/server";

type GateSession = { unlocked?: boolean };

function getSessionConfig() {
  const sessionSecret = process.env["SESSION_SECRET"];
  if (!sessionSecret) throw new Error("SESSION_SECRET is not set");

  return {
    password: sessionSecret,
    name: "responses-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export function passwordMatches(input: string, expected: string) {
  const inputHash = createHash("sha256").update(input, "utf8").digest();
  const expectedHash = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(inputHash, expectedHash);
}

export async function unlockResponsesSession() {
  const session = await useSession<GateSession>(getSessionConfig());
  await session.update({ unlocked: true });
}

export async function isResponsesUnlocked() {
  const session = await useSession<GateSession>(getSessionConfig());
  return session.data.unlocked === true;
}