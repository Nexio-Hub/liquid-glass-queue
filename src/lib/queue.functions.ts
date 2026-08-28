import { createServerFn } from "@tanstack/react-start";
import {
  isResponsesUnlocked,
  passwordMatches,
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
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: rows, error } = await supabaseAdmin
      .from("queue_responses")
      .select("id, answer, viewed, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: rows ?? [] };
  });

export const listResponses = createServerFn({ method: "POST" }).handler(
  async () => {
    if (!(await isResponsesUnlocked())) {
      return { ok: false as const, rows: [] };
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("queue_responses")
      .select("id, answer, viewed, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: data ?? [] };
  },
);

export const markResponseViewed = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data }) => {
    if (!(await isResponsesUnlocked())) return { ok: false as const };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("queue_responses")
      .update({ viewed: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteResponse = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data }) => {
    if (!(await isResponsesUnlocked())) return { ok: false as const };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("queue_responses")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
