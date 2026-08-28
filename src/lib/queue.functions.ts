import { createServerFn } from "@tanstack/react-start";
import {
  getQueueResponses,
  isResponsesUnlocked,
  passwordMatches,
  removeQueueResponse,
  setQueueResponseViewed,
  unlockResponsesSession,
} from "./queue.server";

export const unlockResponses = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => ({
    password: String(data?.password ?? ""),
  }))
  .handler(async ({ data }) => {
    const expected = process.env["SITE_PASSWORD"];
    if (!expected) throw new Error("SITE_PASSWORD is not set");
    if (!data.password || !passwordMatches(data.password, expected)) {
      return { ok: false as const };
    }
    await unlockResponsesSession();
    return { ok: true as const, rows: await getQueueResponses() };
  });

export const listResponses = createServerFn({ method: "POST" }).handler(
  async () => {
    if (!(await isResponsesUnlocked())) {
      return { ok: false as const, rows: [] };
    }
    return { ok: true as const, rows: await getQueueResponses() };
  },
);

export const markResponseViewed = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data }) => {
    if (!(await isResponsesUnlocked())) return { ok: false as const };
    await setQueueResponseViewed(data.id);
    return { ok: true as const };
  });

export const deleteResponse = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data }) => {
    if (!(await isResponsesUnlocked())) return { ok: false as const };
    await removeQueueResponse(data.id);
    return { ok: true as const };
  });
