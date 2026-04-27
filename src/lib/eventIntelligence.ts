import { supabase } from "./supabase";

export async function trackEventView(eventId: string, source = "explore"): Promise<void> {
  if (!eventId) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase.from("event_views").insert({
    user_id: user.id,
    event_id: eventId,
    source,
  });

  if (error) {
    console.error("Failed to track event view", error);
  }
}
