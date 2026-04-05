let supportsIsPublicColumnCache: boolean | null = null;
let inFlightSupportCheck: Promise<boolean> | null = null;

const HANGOUTS_IS_PUBLIC_TOKEN = '"rowFilter.hangouts.is_public"';

export async function hasHangoutsIsPublicColumn(): Promise<boolean> {
  if (supportsIsPublicColumnCache !== null) {
    return supportsIsPublicColumnCache;
  }

  if (inFlightSupportCheck) {
    return inFlightSupportCheck;
  }

  inFlightSupportCheck = (async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

    if (!supabaseUrl || !supabaseAnonKey) {
      supportsIsPublicColumnCache = false;
      return false;
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });

      if (!response.ok) {
        supportsIsPublicColumnCache = false;
        return false;
      }

      const openApiText = await response.text();
      const supports = openApiText.includes(HANGOUTS_IS_PUBLIC_TOKEN);
      supportsIsPublicColumnCache = supports;
      return supports;
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
