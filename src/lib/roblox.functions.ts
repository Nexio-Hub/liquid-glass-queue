import { createServerFn } from "@tanstack/react-start";

export const lookupRobloxUser = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string }) => ({
    username: String(data?.username ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    if (!data.username) return { found: false as const };

    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        usernames: [data.username],
        excludeBannedUsers: false,
      }),
    });
    if (!res.ok) return { found: false as const };
    const json = (await res.json()) as {
      data?: Array<{ id: number; name: string; displayName: string }>;
    };
    const user = json.data?.[0];
    if (!user) return { found: false as const };

    let avatarUrl: string | null = null;
    try {
      const thumb = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png&isCircular=true`,
      );
      if (thumb.ok) {
        const tj = (await thumb.json()) as {
          data?: Array<{ imageUrl?: string }>;
        };
        avatarUrl = tj.data?.[0]?.imageUrl ?? null;
      }
    } catch {
      avatarUrl = null;
    }

    return {
      found: true as const,
      id: user.id,
      name: user.name,
      displayName: user.displayName,
      avatarUrl,
    };
  });
