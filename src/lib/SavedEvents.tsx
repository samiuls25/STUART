import { supabase } from "./supabase";

export async function getSavedEventIds(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No user authenticated for getSavedEventIds");
      return [];
    }

    const { data, error } = await supabase
      .from("saved_events")
      .select("event_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching saved events:", error);
      return [];
    }

    return data?.map((row) => row.event_id) || [];
  } catch (error) {
    console.error("Unexpected error in getSavedEventIds:", error);
    return [];
  }
}

export async function saveEvent(eventId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("saved_events")
    .insert({ user_id: user.id, event_id: eventId });

  if (error) {
    console.error("Error saving event:", error);
    return false;
  }

  return true;
}

export async function unsaveEvent(eventId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("saved_events")
    .delete()
    .eq("user_id", user.id)
    .eq("event_id", eventId);

  if (error) {
    console.error("Error unsaving event:", error);
    return false;
  }

  return true;
}