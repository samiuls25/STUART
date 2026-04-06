import { supabase } from "./supabase";

export interface GroupMember {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: "admin" | "member";
}

export interface UserGroup {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  members: GroupMember[];
}

interface GroupRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
}

interface GroupMemberRow {
  group_id: string;
  user_id: string;
  role: "admin" | "member";
}

interface ProfileRow {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

const setupIssueCodes = new Set(["42P01", "PGRST205", "PGRST202"]);

export const isGroupsSetupError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: string; message?: string; details?: string };
  if (candidate.code && setupIssueCodes.has(candidate.code)) return true;

  const message = `${candidate.message || ""} ${candidate.details || ""}`.toLowerCase();
  return message.includes("groups") && (message.includes("does not exist") || message.includes("not found"));
};

const getCurrentUserId = async (): Promise<string | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id || null;
};

export async function fetchGroupsForCurrentUser(): Promise<UserGroup[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data: groupRows, error: groupsError } = await supabase
    .from("groups")
    .select("id,owner_id,name,description")
    .order("name", { ascending: true });

  if (groupsError) {
    if (isGroupsSetupError(groupsError)) return [];
    throw groupsError;
  }

  const groups = (groupRows as GroupRow[] | null) || [];
  if (groups.length === 0) return [];

  const groupIds = groups.map((group) => group.id);

  const { data: membershipRows, error: membersError } = await supabase
    .from("group_members")
    .select("group_id,user_id,role")
    .in("group_id", groupIds);

  if (membersError) {
    if (isGroupsSetupError(membersError)) {
      return groups.map((group) => ({
        id: group.id,
        ownerId: group.owner_id,
        name: group.name,
        description: group.description || "",
        members: [],
      }));
    }
    throw membersError;
  }

  const members = (membershipRows as GroupMemberRow[] | null) || [];
  const profileIds = [...new Set(members.map((member) => member.user_id))];

  const profileMap = new Map<string, ProfileRow>();
  if (profileIds.length > 0) {
    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id,name,avatar_url")
      .in("id", profileIds);

    if (!profilesError) {
      ((profileRows as ProfileRow[] | null) || []).forEach((profile) => {
        profileMap.set(profile.id, profile);
      });
    }
  }

  return groups.map((group) => {
    const groupMembers = members
      .filter((member) => member.group_id === group.id)
      .map((member) => {
        const profile = profileMap.get(member.user_id);
        return {
          userId: member.user_id,
          name: profile?.name || "Friend",
          avatarUrl: profile?.avatar_url || undefined,
          role: member.role,
        } satisfies GroupMember;
      })
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return {
      id: group.id,
      ownerId: group.owner_id,
      name: group.name,
      description: group.description || "",
      members: groupMembers,
    } satisfies UserGroup;
  });
}

export async function createGroup(input: {
  name: string;
  description?: string;
  memberIds?: string[];
}): Promise<UserGroup> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in to create groups.");

  const normalizedName = input.name.trim();
  if (!normalizedName) {
    throw new Error("Group name is required.");
  }

  const { data: createdGroup, error: createError } = await supabase
    .from("groups")
    .insert({
      owner_id: userId,
      name: normalizedName,
      description: input.description?.trim() || null,
    })
    .select("id,owner_id,name,description")
    .single();

  if (createError || !createdGroup) {
    if (isGroupsSetupError(createError)) {
      throw new Error("Groups schema is not active yet. Please run the groups SQL in Supabase first.");
    }
    throw createError || new Error("Failed to create group.");
  }

  const uniqueMemberIds = [...new Set(input.memberIds || [])].filter((id) => id && id !== userId);

  const membershipRows = [
    {
      group_id: createdGroup.id,
      user_id: userId,
      role: "admin" as const,
    },
    ...uniqueMemberIds.map((memberId) => ({
      group_id: createdGroup.id,
      user_id: memberId,
      role: "member" as const,
    })),
  ];

  const { error: memberInsertError } = await supabase
    .from("group_members")
    .insert(membershipRows);

  if (memberInsertError && !isGroupsSetupError(memberInsertError)) {
    throw memberInsertError;
  }

  const groups = await fetchGroupsForCurrentUser();
  const created = groups.find((group) => group.id === createdGroup.id);
  if (!created) {
    return {
      id: createdGroup.id,
      ownerId: createdGroup.owner_id,
      name: createdGroup.name,
      description: createdGroup.description || "",
      members: [],
    };
  }

  return created;
}

export async function updateGroup(input: {
  groupId: string;
  name: string;
  description?: string;
  memberIds?: string[];
}): Promise<UserGroup> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in to update groups.");

  const normalizedName = input.name.trim();
  if (!normalizedName) {
    throw new Error("Group name is required.");
  }

  const { error: updateError } = await supabase
    .from("groups")
    .update({
      name: normalizedName,
      description: input.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.groupId)
    .eq("owner_id", userId);

  if (updateError) {
    if (isGroupsSetupError(updateError)) {
      throw new Error("Groups schema is not active yet. Please run the groups SQL in Supabase first.");
    }
    throw updateError;
  }

  const desiredMembers = [...new Set(input.memberIds || [])].filter((id) => id && id !== userId);

  const { data: currentRows, error: currentError } = await supabase
    .from("group_members")
    .select("user_id,role")
    .eq("group_id", input.groupId);

  if (currentError) {
    if (isGroupsSetupError(currentError)) {
      throw new Error("Group members table is not available yet.");
    }
    throw currentError;
  }

  const currentMembers = ((currentRows as Array<{ user_id: string; role: string }> | null) || [])
    .filter((row) => row.user_id !== userId)
    .map((row) => row.user_id);

  const membersToRemove = currentMembers.filter((id) => !desiredMembers.includes(id));
  const membersToAdd = desiredMembers.filter((id) => !currentMembers.includes(id));

  if (membersToRemove.length > 0) {
    const { error: removeError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", input.groupId)
      .in("user_id", membersToRemove);

    if (removeError && !isGroupsSetupError(removeError)) {
      throw removeError;
    }
  }

  if (membersToAdd.length > 0) {
    const { error: addError } = await supabase
      .from("group_members")
      .insert(
        membersToAdd.map((memberId) => ({
          group_id: input.groupId,
          user_id: memberId,
          role: "member" as const,
        }))
      );

    if (addError && !isGroupsSetupError(addError)) {
      throw addError;
    }
  }

  const groups = await fetchGroupsForCurrentUser();
  const updated = groups.find((group) => group.id === input.groupId);
  if (!updated) {
    throw new Error("Group not found after update.");
  }

  return updated;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in to delete groups.");

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("owner_id", userId);

  if (error) {
    if (isGroupsSetupError(error)) {
      throw new Error("Groups schema is not active yet. Please run the groups SQL in Supabase first.");
    }
    throw error;
  }
}

export const groupMemberIds = (group: UserGroup, excludeUserId?: string) => {
  return group.members
    .map((member) => member.userId)
    .filter((id) => id && id !== excludeUserId);
};
