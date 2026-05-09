/**
 * Rich link previews (Discord, Slack, iMessage, etc.) read HTML meta tags and do not run the SPA.
 * This handler runs only for common crawler user-agents and only for share-related URLs.
 *
 * Netlify env (production): SUPABASE_URL, SUPABASE_ANON_KEY (same project as the app).
 */

type EdgeConfig = { path: string | string[] };
type EdgeContext = { next: () => Promise<Response> };

function edgeEnv(): { get(name: string): string | undefined } | undefined {
  return (globalThis as unknown as { Deno?: { env: { get(name: string): string | undefined } } }).Deno?.env;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PREVIEW_UA =
  /Discordbot|facebookexternalhit|Twitterbot|Slackbot|LinkedInBot|Embedly|WhatsApp|Pinterest|vkShare|TelegramBot|OpenGraph|Googlebot/i;

function wantsRichPreview(request: Request): boolean {
  const ua = request.headers.get("user-agent") || "";
  return PREVIEW_UA.test(ua);
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/\n/g, " ");
}

function applyShareMeta(
  html: string,
  opts: { title: string; description: string; canonicalUrl: string }
): string {
  const title = escapeAttr(opts.title);
  const description = escapeAttr(opts.description);
  const canonical = escapeAttr(opts.canonicalUrl);

  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  out = out.replace(
    /<meta property="og:title" content="[^"]*"/i,
    `<meta property="og:title" content="${title}"`
  );
  out = out.replace(
    /<meta property="og:description" content="[^"]*"/i,
    `<meta property="og:description" content="${description}"`
  );
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*"/i,
    `<meta name="twitter:title" content="${title}"`
  );
  out = out.replace(
    /<meta name="twitter:description" content="[^"]*"/i,
    `<meta name="twitter:description" content="${description}"`
  );

  if (!/property="og:url"/i.test(out)) {
    out = out.replace(
      /<meta property="og:type"[^>]*>/i,
      (m) => `${m}\n    <meta property="og:url" content="${canonical}" />`
    );
  } else {
    out = out.replace(/<meta property="og:url" content="[^"]*"/i, `<meta property="og:url" content="${canonical}"`);
  }

  out = out.replace(/<link rel="canonical" href="[^"]*"/i, `<link rel="canonical" href="${canonical}"`);

  return out;
}

async function fetchHtmlShell(origin: string): Promise<string | null> {
  const res = await fetch(new URL("/index.html", origin).toString());
  if (!res.ok) return null;
  return await res.text();
}

async function resolveFriendInvite(
  supabaseUrl: string,
  anonKey: string,
  token: string
): Promise<{ name: string } | null> {
  const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/resolve_friend_invite_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ p_token: token }),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ issuer_name?: string }>;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const name = rows[0]?.issuer_name?.trim();
  if (!name) return null;
  return { name };
}

async function fetchPublicHangoutTitle(
  supabaseUrl: string,
  anonKey: string,
  hangoutId: string
): Promise<string | null> {
  const base = supabaseUrl.replace(/\/$/, "");
  const res = await fetch(
    `${base}/rest/v1/hangouts?id=eq.${encodeURIComponent(hangoutId)}&select=title,status,is_public&limit=1`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{
    title?: string;
    status?: string;
    is_public?: boolean | null;
  }>;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0];
  if (!row?.title?.trim()) return null;
  if (row.is_public !== true || row.status !== "confirmed") return null;
  return row.title.trim();
}

export default async function handler(request: Request, context: EdgeContext): Promise<Response> {
  if (!wantsRichPreview(request)) {
    return context.next();
  }

  const url = new URL(request.url);
  const origin = url.origin;
  const fullCanonical = url.toString();

  if (url.pathname === "/hangouts" && !url.searchParams.get("hangout")) {
    return context.next();
  }
  if (url.pathname === "/profile" && !url.searchParams.get("memory")) {
    return context.next();
  }

  const supabaseUrl = edgeEnv()?.get("SUPABASE_URL")?.trim();
  const anonKey = edgeEnv()?.get("SUPABASE_ANON_KEY")?.trim();

  const shell = await fetchHtmlShell(origin);
  if (!shell) {
    return context.next();
  }

  let title = "STUART | Discover Events & Plan with Friends";
  let description =
    "Discover local events and plan activities with friends using our smart event discovery platform.";

  if (url.pathname.startsWith("/invite/friend/")) {
    const token = decodeURIComponent(url.pathname.slice("/invite/friend/".length)).trim();
    if (token.length >= 16 && supabaseUrl && anonKey) {
      const resolved = await resolveFriendInvite(supabaseUrl, anonKey, token);
      if (resolved) {
        title = `${resolved.name} invited you on STUART`;
        description = "Open the link to add them as a friend and plan hangouts together.";
      } else {
        title = "Friend invite | STUART";
        description = "This invite link is invalid or has expired. Ask your friend for a new link.";
      }
    } else {
      title = "Friend invite | STUART";
      description =
        token.length < 16
          ? "This invite link doesn’t look valid."
          : "This invite link is invalid or has expired. Ask your friend for a new link.";
    }
  } else if (url.pathname === "/hangouts") {
    const hangoutId = url.searchParams.get("hangout")?.trim() || "";
    if (!UUID_RE.test(hangoutId)) {
      title = "Hangout | STUART";
      description = "This hangout link doesn’t look valid. Open STUART to see your hangouts.";
    } else if (supabaseUrl && anonKey) {
      const hangTitle = await fetchPublicHangoutTitle(supabaseUrl, anonKey, hangoutId);
      if (hangTitle) {
        title = `${hangTitle} | STUART`;
        description = "Open the link to view this hangout and respond on STUART.";
      } else {
        title = "Hangout | STUART";
        description =
          "This hangout may be private, not confirmed yet, or no longer available. Open STUART to check your invites.";
      }
    } else {
      title = "Hangout | STUART";
      description = "Open the link to view this hangout on STUART.";
    }
  } else if (url.pathname === "/profile") {
    const memoryId = url.searchParams.get("memory")?.trim() || "";
    if (!UUID_RE.test(memoryId)) {
      title = "Memory | STUART";
      description = "This memory link doesn’t look valid. Open STUART to view memories on your profile.";
    } else {
      title = "Shared memory | STUART";
      description =
        "Someone shared a memory with you. Sign in and open your Profile to view it if you have access.";
    }
  } else {
    return context.next();
  }

  const html = applyShareMeta(shell, { title, description, canonicalUrl: fullCanonical });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

export const config: EdgeConfig = {
  path: ["/invite/friend/*", "/hangouts", "/profile"],
};
