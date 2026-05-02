import { supabase } from "./supabase";

let supportsIsPublicColumnCache: boolean | null = null;
let inFlightSupportCheck: Promise<boolean> | null = null;

const isMissingColumnCode = (code: string | undefined) =>
  code === "42703" || code === "PGRST204";

const isMissingColumnMessage = (message: string | undefined) => {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist")
    || lower.includes("column hangouts.is_public")
    || lower.includes("could not find")
  );
};

/**
 * Detect whether the `hangouts.is_public` column is present in the connected
 * Supabase project. Newer Supabase deployments return 401 on the bare
 * `/rest/v1/` OpenAPI endpoint, so we probe via a zero-row select instead -
 * that uses the standard PostgREST path the rest of the app already relies on.
 *
 * The result is cached for the lifetime of the page since schema doesn't
 * change at runtime.
 */
export async function hasHangoutsIsPublicColumn(): Promise<boolean> {
  if (supportsIsPublicColumnCache !== null) {
    return supportsIsPublicColumnCache;
  }

  if (inFlightSupportCheck) {
    return inFlightSupportCheck;
  }

  inFlightSupportCheck = (async () => {
    try {
      const { error } = await supabase
        .from("hangouts")
        .select("is_public")
        .limit(0);

      if (!error) {
        supportsIsPublicColumnCache = true;
        return true;
      }

      if (isMissingColumnCode(error.code) || isMissingColumnMessage(error.message)) {
        supportsIsPublicColumnCache = false;
        return false;
      }

      // Unrelated error (RLS / network / auth). Fall back to runtime row sniffing.
      supportsIsPublicColumnCache = false;
      return false;
    } catch {
      supportsIsPublicColumnCache = false;
      return false;
    }
  })();

  try {
    return await inFlightSupportCheck;
  } finally {
    inFlightSupportCheck = null;
  }
}
