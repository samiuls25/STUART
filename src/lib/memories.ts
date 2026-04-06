import { supabase } from "./supabase";

export interface MemoryPhoto {
  id: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface MemoryAttendee {
  id: string;
  name: string;
  avatar?: string;
}

export interface Memory {
  id: string;
  eventName: string;
  location: string;
  date: string;
  time: string;
  sortTimestamp: number;
  attendees: MemoryAttendee[];
  photos: MemoryPhoto[];
  heroImage: string;
}

export interface MemoryUsageSummary {
  memoryCount: number;
  photoCount: number;
  legacyHeroPhotoCount: number;
}

interface MemoryRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  event_id: string | null;
  hangout_id: string | null;
  location: string | null;
  memory_date: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

interface MemoryPhotoRow {
  id: string;
  memory_id: string;
  photo_url?: string | null;
  url?: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
  display_order?: number | null;
}

interface MemoryAttendeeRow {
  memory_id: string;
  user_id: string;
  is_owner?: boolean | null;
  created_at?: string | null;
}

interface MemoryAttendeeMembershipRow {
  memory_id: string;
  is_owner?: boolean | null;
}

interface CreateMemoryInput {
  title: string;
  description?: string;
  location?: string;
  memoryDate?: string;
  eventId?: string;
  hangoutId?: string;
  prefillImageUrl?: string;
}

const MEMORY_PHOTOS_BUCKET = (import.meta.env.VITE_MEMORY_PHOTOS_BUCKET as string | undefined) || "memory-photos";
const MAX_MEMORY_PHOTOS_PER_MEMORY = 8;
const MAX_UPLOAD_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.82;
const FALLBACK_HERO_IMAGE = "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&q=80";
const DEFAULT_MEMORY_SOFT_CAP = 120;
const DEFAULT_PHOTO_SOFT_CAP = 600;
const DEFAULT_WARNING_RATIO = 0.8;

const missingTableCodes = new Set(["42P01", "PGRST205"]);
const duplicateValueCodes = new Set(["23505"]);

const isMissingTableError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  if (candidate.code && missingTableCodes.has(candidate.code)) return true;
  return (candidate.message || "").toLowerCase().includes("does not exist");
};

const isDuplicateValueError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string };
  return Boolean(candidate.code && duplicateValueCodes.has(candidate.code));
};

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return "Unknown date";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTimeLabel = (value: string | null | undefined) => {
  if (!value) return "Shared memory";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Shared memory";
  return parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

const toSortTimestamp = (memoryDate: string | null, createdAt: string) => {
  if (memoryDate) {
    const parsedMemoryDate = Date.parse(`${memoryDate}T12:00:00`);
    if (!Number.isNaN(parsedMemoryDate)) return parsedMemoryDate;
  }

  const parsedCreatedAt = Date.parse(createdAt);
  if (!Number.isNaN(parsedCreatedAt)) return parsedCreatedAt;

  return 0;
};

const isSyntheticHeroPhotoId = (memoryId: string, photoId: string) => photoId === `${memoryId}-hero`;

const extractStoragePathFromPublicUrl = (url: string): string | null => {
  if (!url) return null;

  const publicPrefix = `/storage/v1/object/public/${MEMORY_PHOTOS_BUCKET}/`;
  const signedPrefix = `/storage/v1/object/sign/${MEMORY_PHOTOS_BUCKET}/`;

  let startIndex = url.indexOf(publicPrefix);
  let prefixLength = publicPrefix.length;

  if (startIndex < 0) {
    startIndex = url.indexOf(signedPrefix);
    prefixLength = signedPrefix.length;
  }

  if (startIndex < 0) {
    return null;
  }

  const rawPath = url.slice(startIndex + prefixLength).split("?")[0];
  if (!rawPath) return null;

  return decodeURIComponent(rawPath);
};

const normalizePhotoRowUrl = (row: MemoryPhotoRow) => row.photo_url || row.url || "";

const parsePositiveIntEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const parseRatioEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 1) return fallback;
  return parsed;
};

async function setMemoryHeroImage(memoryId: string, url: string | null): Promise<void> {
  const { error } = await supabase
    .from("memories")
    .update({ image_url: url })
    .eq("id", memoryId);

  if (error) {
    throw error;
  }
}

async function fetchOrderedMemoryPhotoRows(memoryId: string): Promise<Array<{ id: string; photo_url: string | null }>> {
  const { data, error } = await supabase
    .from("memory_photos")
    .select("id,photo_url,display_order")
    .eq("memory_id", memoryId)
    .order("display_order", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error("Memory photos are not enabled yet. Run docs/db/memories_phase1.sql first.");
    }
    throw error;
  }

  return ((data as Array<{ id: string; photo_url: string | null }> | null) || []);
}

async function persistMemoryPhotoOrder(memoryId: string, orderedPhotoIds: string[]): Promise<void> {
  // Two-pass update avoids temporary unique (memory_id, display_order) collisions.
  for (let idx = 0; idx < orderedPhotoIds.length; idx += 1) {
    const { error } = await supabase
      .from("memory_photos")
      .update({ display_order: -(idx + 1) })
      .eq("memory_id", memoryId)
      .eq("id", orderedPhotoIds[idx]);

    if (error) {
      throw error;
    }
  }

  for (let idx = 0; idx < orderedPhotoIds.length; idx += 1) {
    const { error } = await supabase
      .from("memory_photos")
      .update({ display_order: idx })
      .eq("memory_id", memoryId)
      .eq("id", orderedPhotoIds[idx]);

    if (error) {
      throw error;
    }
  }
}

const compressImageFile = async (file: File): Promise<Blob> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image uploads are supported.");
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    throw new Error(`Files larger than ${Math.round(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024))} MB are not supported.`);
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not process image for upload.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", IMAGE_QUALITY);
  });

  if (!blob) {
    throw new Error("Failed to compress image for upload.");
  }

  return blob;
};

const mapMemoryRowsToUi = (
  rows: MemoryRow[],
  profileMap: Map<string, ProfileRow>,
  photoRowsByMemory: Map<string, MemoryPhoto[]>,
  attendeeRowsByMemory: Map<string, MemoryAttendee[]>
): Memory[] => {
  return rows.map((row) => {
    const ownerProfile = profileMap.get(row.user_id);
    const photos = photoRowsByMemory.get(row.id) || [];
    const attendees = attendeeRowsByMemory.get(row.id) || [];

    const fallbackPhoto = row.image_url
      ? [
          {
            id: `${row.id}-hero`,
            url: row.image_url,
            uploadedBy: ownerProfile?.name || "You",
            uploadedAt: row.created_at,
          },
        ]
      : [];

    const resolvedPhotos = photos.length > 0 ? photos : fallbackPhoto;
    const heroImage = resolvedPhotos[0]?.url || FALLBACK_HERO_IMAGE;
    const resolvedAttendees =
      attendees.length > 0
        ? attendees
        : [
            {
              id: row.user_id,
              name: ownerProfile?.name || "You",
              avatar: ownerProfile?.avatar_url || undefined,
            },
          ];

    return {
      id: row.id,
      eventName: row.title || "Memory",
      location: row.location || "New York",
      date: formatDateLabel(row.memory_date || undefined),
      time: formatTimeLabel(row.created_at),
      sortTimestamp: toSortTimestamp(row.memory_date, row.created_at),
      attendees: resolvedAttendees,
      photos: resolvedPhotos,
      heroImage,
    };
  });
};

async function fetchMemoryPhotos(memoryIds: string[]): Promise<Map<string, MemoryPhoto[]>> {
  const map = new Map<string, MemoryPhoto[]>();
  if (memoryIds.length === 0) return map;

  const { data, error } = await supabase
    .from("memory_photos")
    .select("id,memory_id,photo_url,uploaded_by,created_at,display_order")
    .in("memory_id", memoryIds)
    .order("display_order", { ascending: true });

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn("Unable to fetch memory photos", error);
    }
    return map;
  }

  const photoRows = (data as MemoryPhotoRow[] | null) || [];
  const uploaderIds = [
    ...new Set(
      photoRows
        .map((row) => row.uploaded_by)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let currentUserId: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id || null;
  } catch {
    currentUserId = null;
  }

  const uploaderNameMap = new Map<string, string>();
  if (uploaderIds.length > 0) {
    const { data: uploaderProfiles, error: uploaderProfilesError } = await supabase
      .from("profiles")
      .select("id,name")
      .in("id", uploaderIds);

    if (!uploaderProfilesError) {
      ((uploaderProfiles as Array<{ id: string; name: string | null }> | null) || []).forEach((row) => {
        if (row.name) {
          uploaderNameMap.set(row.id, row.name);
        }
      });
    }
  }

  photoRows.forEach((row) => {
    const url = normalizePhotoRowUrl(row);
    if (!url) return;

    const uploaderLabel = row.uploaded_by
      ? uploaderNameMap.get(row.uploaded_by)
        || (row.uploaded_by === currentUserId ? "You" : "Friend")
      : "You";

    const list = map.get(row.memory_id) || [];
    list.push({
      id: row.id,
      url,
      uploadedBy: uploaderLabel,
      uploadedAt: row.created_at || new Date().toISOString(),
    });
    map.set(row.memory_id, list);
  });

  return map;
}

async function fetchMemoryAttendees(memoryIds: string[]): Promise<Map<string, MemoryAttendee[]>> {
  const map = new Map<string, MemoryAttendee[]>();
  if (memoryIds.length === 0) return map;

  const { data, error } = await supabase
    .from("memory_attendees")
    .select("memory_id,user_id,is_owner,created_at")
    .in("memory_id", memoryIds)
    .order("is_owner", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn("Unable to fetch memory attendees", error);
    }
    return map;
  }

  const attendeeRows = (data as MemoryAttendeeRow[] | null) || [];
  if (attendeeRows.length === 0) {
    return map;
  }

  const profileIds = [...new Set(attendeeRows.map((row) => row.user_id))];
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,avatar_url")
    .in("id", profileIds);

  const attendeeProfileMap = new Map<string, ProfileRow>();
  if (!profileError) {
    ((profileRows as ProfileRow[] | null) || []).forEach((row) => {
      attendeeProfileMap.set(row.id, row);
    });
  }

  attendeeRows.forEach((row) => {
    const profile = attendeeProfileMap.get(row.user_id);
    const list = map.get(row.memory_id) || [];
    list.push({
      id: row.user_id,
      name: profile?.name || "Friend",
      avatar: profile?.avatar_url || undefined,
    });
    map.set(row.memory_id, list);
  });

  return map;
}

async function mapMemoryRowsWithRelations(memoryRows: MemoryRow[]): Promise<Memory[]> {
  const memories = memoryRows || [];
  if (memories.length === 0) {
    return [];
  }

  const memoryIds = memories.map((row) => row.id);
  const profileIds = [...new Set(memories.map((row) => row.user_id))];

  const [photoMap, attendeeMap, profileRowsResult] = await Promise.all([
    fetchMemoryPhotos(memoryIds),
    fetchMemoryAttendees(memoryIds),
    supabase.from("profiles").select("id,name,avatar_url").in("id", profileIds),
  ]);

  const profileMap = new Map<string, ProfileRow>();
  if (!profileRowsResult.error) {
    ((profileRowsResult.data as ProfileRow[] | null) || []).forEach((row) => {
      profileMap.set(row.id, row);
    });
  }

  return mapMemoryRowsToUi(memories, profileMap, photoMap, attendeeMap);
}

async function fetchSharedMemoryRowsForUser(
  currentUserId: string,
  ownerUserId?: string
): Promise<MemoryRow[]> {
  const { data: attendeeRows, error: attendeeError } = await supabase
    .from("memory_attendees")
    .select("memory_id,is_owner")
    .eq("user_id", currentUserId);

  if (attendeeError) {
    if (isMissingTableError(attendeeError)) {
      return [];
    }
    throw attendeeError;
  }

  const sharedMemoryIds = [
    ...new Set(
      (((attendeeRows as MemoryAttendeeMembershipRow[] | null) || [])
        .filter((row) => !row.is_owner)
        .map((row) => row.memory_id))
    ),
  ];

  if (sharedMemoryIds.length === 0) {
    return [];
  }

  let query = supabase
    .from("memories")
    .select("id,user_id,title,description,image_url,event_id,hangout_id,location,memory_date,created_at")
    .in("id", sharedMemoryIds)
    .neq("user_id", currentUserId);

  if (ownerUserId) {
    query = query.eq("user_id", ownerUserId);
  }

  const { data: memoryRows, error: memoryError } = await query
    .order("memory_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (memoryError) {
    throw memoryError;
  }

  return (memoryRows as MemoryRow[] | null) || [];
}

export async function fetchMemoriesForCurrentUser(): Promise<Memory[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const [ownedMemories, sharedMemories] = await Promise.all([
    fetchMemoriesForUser(user.id),
    fetchSharedMemoriesForCurrentUser(),
  ]);

  const mergedById = new Map<string, Memory>();
  [...ownedMemories, ...sharedMemories].forEach((memory) => {
    mergedById.set(memory.id, memory);
  });

  return [...mergedById.values()].sort((a, b) => b.sortTimestamp - a.sortTimestamp);
}

export async function fetchMemoriesForUser(userId: string): Promise<Memory[]> {
  if (!userId) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: memoryRows, error: memoryError } = await supabase
    .from("memories")
    .select("id,user_id,title,description,image_url,event_id,hangout_id,location,memory_date,created_at")
    .eq("user_id", userId)
    .order("memory_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (memoryError) {
    throw memoryError;
  }

  return mapMemoryRowsWithRelations((memoryRows as MemoryRow[] | null) || []);
}

export async function fetchSharedMemoriesForCurrentUser(): Promise<Memory[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const sharedRows = await fetchSharedMemoryRowsForUser(user.id);
  return mapMemoryRowsWithRelations(sharedRows);
}

export async function fetchSharedMemoriesWithUser(ownerUserId: string): Promise<Memory[]> {
  if (!ownerUserId) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const sharedRows = await fetchSharedMemoryRowsForUser(user.id, ownerUserId);
  return mapMemoryRowsWithRelations(sharedRows);
}

export async function createMemory(input: CreateMemoryInput): Promise<{ id: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to create memories.");
  }

  const prefillImageUrl = input.prefillImageUrl?.trim() || null;

  const payload = {
    user_id: user.id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    memory_date: input.memoryDate || new Date().toISOString().slice(0, 10),
    event_id: input.eventId || null,
    hangout_id: input.hangoutId || null,
    image_url: prefillImageUrl,
  };

  const { data, error } = await supabase
    .from("memories")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    throw error || new Error("Failed to create memory.");
  }

  const { error: attendeeInsertError } = await supabase.from("memory_attendees").insert({
    memory_id: data.id,
    user_id: user.id,
    added_by: user.id,
    is_owner: true,
  });

  if (attendeeInsertError && !isMissingTableError(attendeeInsertError)) {
    console.warn("Failed to add owner attendee row for memory", attendeeInsertError);
  }

  if (prefillImageUrl) {
    const { error: prefillPhotoInsertError } = await supabase.from("memory_photos").insert({
      memory_id: data.id,
      photo_url: prefillImageUrl,
      uploaded_by: user.id,
      display_order: 0,
    });

    if (prefillPhotoInsertError && !isMissingTableError(prefillPhotoInsertError)) {
      console.warn("Failed to add prefilled memory photo row", prefillPhotoInsertError);
    }
  }

  return { id: data.id };
}

export async function uploadPhotosToMemory(memoryId: string, files: File[]): Promise<MemoryPhoto[]> {
  if (!memoryId) {
    throw new Error("Memory id is required.");
  }

  if (!files || files.length === 0) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to upload photos.");
  }

  const limitedFiles = files.slice(0, MAX_MEMORY_PHOTOS_PER_MEMORY);

  let existingPhotoCount = 0;
  let supportsPhotoTable = true;
  const { data: existingRows, error: existingError } = await supabase
    .from("memory_photos")
    .select("id", { count: "exact", head: false })
    .eq("memory_id", memoryId);

  if (existingError) {
    supportsPhotoTable = !isMissingTableError(existingError);
    if (!isMissingTableError(existingError)) {
      console.warn("Unable to count existing memory photos", existingError);
    }

    // Fallback to the legacy single-image field if the table doesn't exist yet.
    const { data: legacyRow } = await supabase
      .from("memories")
      .select("image_url")
      .eq("id", memoryId)
      .maybeSingle();

    existingPhotoCount = legacyRow?.image_url ? 1 : 0;
  } else {
    existingPhotoCount = existingRows?.length || 0;
  }

  if (existingPhotoCount + limitedFiles.length > MAX_MEMORY_PHOTOS_PER_MEMORY) {
    throw new Error(`You can upload up to ${MAX_MEMORY_PHOTOS_PER_MEMORY} photos per memory.`);
  }

  if (!supportsPhotoTable && existingPhotoCount + limitedFiles.length > 1) {
    throw new Error("This memory schema currently supports one photo per memory. Please run the memory_photos migration to enable multi-photo uploads.");
  }

  const filesToUpload = supportsPhotoTable ? limitedFiles : limitedFiles.slice(0, 1);

  const uploaded: MemoryPhoto[] = [];

  for (let index = 0; index < filesToUpload.length; index += 1) {
    const file = filesToUpload[index];
    const blob = await compressImageFile(file);
    const path = `${user.id}/${memoryId}/${Date.now()}-${index}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(MEMORY_PHOTOS_BUCKET)
      .upload(path, blob, {
        upsert: false,
        contentType: "image/jpeg",
        cacheControl: "3600",
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = supabase.storage
      .from(MEMORY_PHOTOS_BUCKET)
      .getPublicUrl(path);

    const photoUrl = publicData.publicUrl;

    uploaded.push({
      id: path,
      url: photoUrl,
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
    });

    if (supportsPhotoTable) {
      const { error: photoInsertError } = await supabase.from("memory_photos").insert({
        memory_id: memoryId,
        photo_url: photoUrl,
        uploaded_by: user.id,
        display_order: existingPhotoCount + index,
      });

      if (photoInsertError && !isMissingTableError(photoInsertError)) {
        throw photoInsertError;
      }
    }
  }

  if (uploaded.length > 0) {
    const { error: memoryUpdateError } = await supabase
      .from("memories")
      .update({ image_url: uploaded[0].url })
      .eq("id", memoryId)
      .is("image_url", null);

    if (memoryUpdateError) {
      console.warn("Failed to set memory hero image", memoryUpdateError);
    }
  }

  return uploaded;
}

export async function createMemoryWithPhotos(
  input: CreateMemoryInput,
  files: File[]
): Promise<{ id: string; uploadedPhotos: number }> {
  const created = await createMemory(input);
  const uploaded = await uploadPhotosToMemory(created.id, files);

  return {
    id: created.id,
    uploadedPhotos: uploaded.length,
  };
}

export async function addMemoryAttendee(memoryId: string, userId: string): Promise<void> {
  if (!memoryId || !userId) {
    throw new Error("Memory and attendee ids are required.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to edit memory attendees.");
  }

  const { error } = await supabase.from("memory_attendees").insert({
    memory_id: memoryId,
    user_id: userId,
    added_by: user.id,
    is_owner: false,
  });

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error("Memory attendees are not enabled yet. Run docs/db/memories_phase1.sql first.");
    }
    if (isDuplicateValueError(error)) {
      return;
    }
    throw error;
  }
}

export async function removeMemoryAttendee(memoryId: string, userId: string): Promise<void> {
  if (!memoryId || !userId) {
    throw new Error("Memory and attendee ids are required.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to edit memory attendees.");
  }

  const { data: existingRow, error: existingError } = await supabase
    .from("memory_attendees")
    .select("is_owner")
    .eq("memory_id", memoryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    if (isMissingTableError(existingError)) {
      throw new Error("Memory attendees are not enabled yet. Run docs/db/memories_phase1.sql first.");
    }
    throw existingError;
  }

  if (!existingRow) {
    return;
  }

  if (existingRow.is_owner) {
    throw new Error("Memory owner cannot be removed from attendees.");
  }

  const { error: deleteError } = await supabase
    .from("memory_attendees")
    .delete()
    .eq("memory_id", memoryId)
    .eq("user_id", userId);

  if (deleteError) {
    throw deleteError;
  }
}

export async function deleteMemory(memoryId: string): Promise<void> {
  if (!memoryId) {
    throw new Error("Memory id is required.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to delete memories.");
  }

  const { data: memoryRow, error: memoryReadError } = await supabase
    .from("memories")
    .select("id,image_url")
    .eq("id", memoryId)
    .maybeSingle();

  if (memoryReadError) {
    throw memoryReadError;
  }

  if (!memoryRow) {
    return;
  }

  const storagePaths = new Set<string>();

  const legacyPath = extractStoragePathFromPublicUrl(memoryRow.image_url || "");
  if (legacyPath) {
    storagePaths.add(legacyPath);
  }

  const { data: photoRows, error: photoRowsError } = await supabase
    .from("memory_photos")
    .select("photo_url")
    .eq("memory_id", memoryId);

  if (photoRowsError && !isMissingTableError(photoRowsError)) {
    throw photoRowsError;
  }

  if (!photoRowsError) {
    ((photoRows as Array<{ photo_url: string | null }> | null) || []).forEach((row) => {
      const photoPath = extractStoragePathFromPublicUrl(row.photo_url || "");
      if (photoPath) {
        storagePaths.add(photoPath);
      }
    });
  }

  if (storagePaths.size > 0) {
    const { error: storageDeleteError } = await supabase.storage
      .from(MEMORY_PHOTOS_BUCKET)
      .remove([...storagePaths]);

    if (storageDeleteError) {
      throw storageDeleteError;
    }
  }

  const { error: deleteError } = await supabase
    .from("memories")
    .delete()
    .eq("id", memoryId);

  if (deleteError) {
    throw deleteError;
  }
}

export async function deleteMemoryPhoto(memoryId: string, photoId: string): Promise<void> {
  if (!memoryId || !photoId) {
    throw new Error("Memory and photo ids are required.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to delete photos.");
  }

  if (isSyntheticHeroPhotoId(memoryId, photoId)) {
    const { data: memoryRow, error: memoryReadError } = await supabase
      .from("memories")
      .select("image_url")
      .eq("id", memoryId)
      .maybeSingle();

    if (memoryReadError) {
      throw memoryReadError;
    }

    const path = extractStoragePathFromPublicUrl(memoryRow?.image_url || "");
    if (path) {
      const { error: storageDeleteError } = await supabase.storage
        .from(MEMORY_PHOTOS_BUCKET)
        .remove([path]);

      if (storageDeleteError) {
        throw storageDeleteError;
      }
    }

    await setMemoryHeroImage(memoryId, null);
    return;
  }

  const { data: photoRow, error: photoReadError } = await supabase
    .from("memory_photos")
    .select("id,photo_url")
    .eq("memory_id", memoryId)
    .eq("id", photoId)
    .maybeSingle();

  if (photoReadError) {
    if (isMissingTableError(photoReadError)) {
      throw new Error("Memory photos are not enabled yet. Run docs/db/memories_phase1.sql first.");
    }
    throw photoReadError;
  }

  if (!photoRow) {
    return;
  }

  const path = extractStoragePathFromPublicUrl(photoRow.photo_url || "");
  if (path) {
    const { error: storageDeleteError } = await supabase.storage
      .from(MEMORY_PHOTOS_BUCKET)
      .remove([path]);

    if (storageDeleteError) {
      throw storageDeleteError;
    }
  }

  const { error: deleteRowError } = await supabase
    .from("memory_photos")
    .delete()
    .eq("memory_id", memoryId)
    .eq("id", photoId);

  if (deleteRowError) {
    throw deleteRowError;
  }

  const remainingRows = await fetchOrderedMemoryPhotoRows(memoryId);
  if (remainingRows.length > 0) {
    await persistMemoryPhotoOrder(memoryId, remainingRows.map((row) => row.id));
    await setMemoryHeroImage(memoryId, remainingRows[0].photo_url || null);
  } else {
    await setMemoryHeroImage(memoryId, null);
  }
}

export async function reorderMemoryPhotos(memoryId: string, orderedPhotoIds: string[]): Promise<void> {
  if (!memoryId) {
    throw new Error("Memory id is required.");
  }

  if (!orderedPhotoIds || orderedPhotoIds.length <= 1) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to reorder photos.");
  }

  const currentRows = await fetchOrderedMemoryPhotoRows(memoryId);
  const currentIds = currentRows.map((row) => row.id);

  if (currentIds.length !== orderedPhotoIds.length) {
    throw new Error("Photo reorder request is out of date. Please refresh and try again.");
  }

  const currentSet = new Set(currentIds);
  const orderedSet = new Set(orderedPhotoIds);
  if (currentSet.size !== orderedSet.size || [...currentSet].some((id) => !orderedSet.has(id))) {
    throw new Error("Photo reorder request is invalid for this memory.");
  }

  await persistMemoryPhotoOrder(memoryId, orderedPhotoIds);

  const nextHeroId = orderedPhotoIds[0];
  const nextHeroUrl = currentRows.find((row) => row.id === nextHeroId)?.photo_url || null;
  await setMemoryHeroImage(memoryId, nextHeroUrl);
}

export const memoryUploadConfig = {
  maxPhotosPerMemory: MAX_MEMORY_PHOTOS_PER_MEMORY,
  maxRawFileSizeMb: Math.round(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024)),
  bucket: MEMORY_PHOTOS_BUCKET,
};

export const memoryMonitoringConfig = {
  memorySoftCap: parsePositiveIntEnv(
    import.meta.env.VITE_MEMORY_USER_SOFT_CAP as string | undefined,
    DEFAULT_MEMORY_SOFT_CAP
  ),
  photoSoftCap: parsePositiveIntEnv(
    import.meta.env.VITE_MEMORY_PHOTO_SOFT_CAP as string | undefined,
    DEFAULT_PHOTO_SOFT_CAP
  ),
  warningRatio: parseRatioEnv(
    import.meta.env.VITE_MEMORY_SOFT_CAP_WARNING_RATIO as string | undefined,
    DEFAULT_WARNING_RATIO
  ),
};

export function summarizeMemoryUsage(memories: Memory[]): MemoryUsageSummary {
  let photoCount = 0;
  let legacyHeroPhotoCount = 0;

  memories.forEach((memory) => {
    memory.photos.forEach((photo) => {
      if (isSyntheticHeroPhotoId(memory.id, photo.id)) {
        legacyHeroPhotoCount += 1;
      }
      photoCount += 1;
    });
  });

  return {
    memoryCount: memories.length,
    photoCount,
    legacyHeroPhotoCount,
  };
}
