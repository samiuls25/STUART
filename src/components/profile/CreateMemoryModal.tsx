import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useToast } from "../../hooks/use-toast";
import { addMemoryAttendee, createMemoryWithPhotos, memoryUploadConfig, normalizeAlbumUrlForMemory } from "../../lib/memories";
import { fetchGroupsForCurrentUser, groupMemberIds, type UserGroup } from "../../lib/groups";
import { getFriends, type Friend } from "../../lib/friends";
import { useAuth } from "../../lib/AuthContext";

export interface CreateMemoryInitialValues {
  title?: string;
  description?: string;
  location?: string;
  memoryDate?: string;
  eventId?: string;
  hangoutId?: string;
  prefillImageUrl?: string;
}

interface CreateMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialValues?: CreateMemoryInitialValues | null;
}

type AttendeePrefillMode = "none" | "groups" | "friends";

const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);

const CreateMemoryModal = ({ isOpen, onClose, onCreated, initialValues }: CreateMemoryModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [memoryDate, setMemoryDate] = useState(() => getTodayIsoDate());
  const [files, setFiles] = useState<File[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [friendsForPicker, setFriendsForPicker] = useState<Friend[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [attendeePrefillMode, setAttendeePrefillMode] = useState<AttendeePrefillMode>("none");
  const [loadingSocialLists, setLoadingSocialLists] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [albumUrl, setAlbumUrl] = useState("");

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setLocation("");
      setMemoryDate(getTodayIsoDate());
      setFiles([]);
      setGroups([]);
      setFriendsForPicker([]);
      setSelectedGroups([]);
      setSelectedFriendIds([]);
      setAttendeePrefillMode("none");
      setSubmitting(false);
      setAlbumUrl("");
      return;
    }

    setTitle(initialValues?.title || "");
    setDescription(initialValues?.description || "");
    setLocation(initialValues?.location || "");
    setMemoryDate(initialValues?.memoryDate || getTodayIsoDate());
    setFiles([]);
    setSelectedGroups([]);
    setSelectedFriendIds([]);
    setAttendeePrefillMode("none");
    setAlbumUrl("");
    setSubmitting(false);
  }, [isOpen, initialValues]);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoadingSocialLists(true);

    Promise.all([fetchGroupsForCurrentUser(), getFriends()])
      .then(([groupRows, friendRows]) => {
        if (!mounted) return;
        setGroups(groupRows);
        setFriendsForPicker(friendRows);
      })
      .catch((error) => {
        console.error("Unable to load groups/friends for memory modal", error);
        if (mounted) {
          setGroups([]);
          setFriendsForPicker([]);
        }
      })
      .finally(() => {
        if (mounted) setLoadingSocialLists(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;

    const nextFiles = Array.from(incoming).filter((file) => file.type.startsWith("image/"));
    if (nextFiles.length === 0) {
      toast({
        title: "No valid photos selected",
        description: "Please select image files only.",
      });
      return;
    }

    const oversized = nextFiles.find(
      (file) => file.size > memoryUploadConfig.maxRawFileSizeMb * 1024 * 1024
    );

    if (oversized) {
      toast({
        title: "Photo too large",
        description: `Each photo must be under ${memoryUploadConfig.maxRawFileSizeMb} MB.`,
        variant: "destructive",
      });
      return;
    }

    setFiles((prev) => {
      const combined = [...prev, ...nextFiles];
      if (combined.length > memoryUploadConfig.maxPhotosPerMemory) {
        toast({
          title: "Photo limit reached",
          description: `You can upload up to ${memoryUploadConfig.maxPhotosPerMemory} photos per memory.`,
        });
      }
      return combined.slice(0, memoryUploadConfig.maxPhotosPerMemory);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast({
        title: "Add a title",
        description: "A memory title helps your feed stay searchable.",
      });
      return;
    }

    const trimmedAlbum = albumUrl.trim();
    const normalizedAlbum = normalizeAlbumUrlForMemory(trimmedAlbum || undefined);
    if (trimmedAlbum && !normalizedAlbum) {
      toast({
        title: "Invalid album link",
        description: "Use an https:// or http:// URL under 2048 characters.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const result = await createMemoryWithPhotos(
        {
          title: normalizedTitle,
          description,
          location,
          memoryDate,
          eventId: initialValues?.eventId,
          hangoutId: initialValues?.hangoutId,
          prefillImageUrl: initialValues?.prefillImageUrl,
          albumUrl: normalizedAlbum,
        },
        files
      );

      const ownerId = user?.id;

      let prefillAttendeeIds: string[] = [];
      if (attendeePrefillMode === "groups") {
        prefillAttendeeIds = [
          ...new Set(
            selectedGroups.flatMap((groupId) => {
              const group = groups.find((candidate) => candidate.id === groupId);
              return group ? groupMemberIds(group) : [];
            })
          ),
        ];
      } else if (attendeePrefillMode === "friends") {
        prefillAttendeeIds = [...new Set(selectedFriendIds)];
      }

      if (ownerId) {
        prefillAttendeeIds = prefillAttendeeIds.filter((id) => id && id !== ownerId);
      }

      if (prefillAttendeeIds.length > 0) {
        await Promise.allSettled(
          prefillAttendeeIds.map((memberId) => addMemoryAttendee(result.id, memberId))
        );
      }

      toast({
        title: "Memory saved",
        description:
          result.uploadedPhotos > 0
            ? `${result.uploadedPhotos} photo${result.uploadedPhotos > 1 ? "s" : ""} uploaded.`
            : "Your memory was created.",
      });

      onClose();
      onCreated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save memory.";
      toast({
        title: "Could not save memory",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Memory</DialogTitle>
          <DialogDescription>
            Capture highlights from hangouts, events, or everyday moments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sunday market with friends"
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Union Square"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Date</label>
              <Input
                type="date"
                value={memoryDate}
                onChange={(e) => setMemoryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What made this moment memorable?"
              rows={4}
              maxLength={600}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Album link <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </label>
            <Input
              type="url"
              inputMode="url"
              value={albumUrl}
              onChange={(e) => setAlbumUrl(e.target.value)}
              placeholder="https://photos.google.com/..."
              maxLength={2048}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Share a Google Photos / Drive / other gallery link if you have more pictures than the in-app limit.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Tag people now (optional)</label>
              <p className="text-xs text-muted-foreground">
                Pick either whole groups or individual friends, not both, to avoid overlapping invites.
              </p>
            </div>
            <div className="rounded-lg border border-border p-1 flex flex-wrap gap-1">
              {(["none", "groups", "friends"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setAttendeePrefillMode(mode);
                    if (mode !== "groups") setSelectedGroups([]);
                    if (mode !== "friends") setSelectedFriendIds([]);
                  }}
                  className={`flex-1 min-w-[6.5rem] rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    attendeePrefillMode === mode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {mode === "none" ? "Skip" : mode === "groups" ? "Groups" : "Friends"}
                </button>
              ))}
            </div>

            {attendeePrefillMode === "groups" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Groups</span>
                  {selectedGroups.length > 0 && (
                    <span className="text-xs text-muted-foreground">{selectedGroups.length} selected</span>
                  )}
                </div>
                <div className="rounded-lg border border-border divide-y divide-border/60 max-h-48 overflow-y-auto">
                  {loadingSocialLists ? (
                    <div className="p-3 text-sm text-muted-foreground">Loading groups...</div>
                  ) : groups.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No groups yet.</div>
                  ) : (
                    groups.map((group) => {
                      const selected = selectedGroups.includes(group.id);
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            setSelectedGroups((prev) =>
                              prev.includes(group.id) ? prev.filter((id) => id !== group.id) : [...prev, group.id]
                            );
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-muted/40 transition-colors ${selected ? "bg-primary/5" : ""}`}
                        >
                          <p className="text-sm text-foreground">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.members.length} members</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {attendeePrefillMode === "friends" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Friends
                  </span>
                  {selectedFriendIds.length > 0 && (
                    <span className="text-xs text-muted-foreground">{selectedFriendIds.length} selected</span>
                  )}
                </div>
                <div className="rounded-lg border border-border divide-y divide-border/60 max-h-48 overflow-y-auto">
                  {loadingSocialLists ? (
                    <div className="p-3 text-sm text-muted-foreground">Loading friends...</div>
                  ) : friendsForPicker.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No friends yet.</div>
                  ) : (
                    friendsForPicker.map((friend) => {
                      const selected = selectedFriendIds.includes(friend.id);
                      return (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => {
                            setSelectedFriendIds((prev) =>
                              prev.includes(friend.id) ? prev.filter((id) => id !== friend.id) : [...prev, friend.id]
                            );
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-muted/40 transition-colors ${selected ? "bg-primary/5" : ""}`}
                        >
                          <p className="text-sm text-foreground">{friend.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{friend.email}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Photos</label>
              <span className="text-xs text-muted-foreground">
                {files.length}/{memoryUploadConfig.maxPhotosPerMemory}
              </span>
            </div>

            {initialValues?.prefillImageUrl && (
              <p className="text-xs text-muted-foreground">
                This memory will start with the event cover photo. You can keep, replace, or delete it later.
              </p>
            )}

            <label className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 cursor-pointer hover:border-primary/40 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Add photos</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {previews.map((preview, index) => (
                  <div key={`${preview.file.name}-${index}`} className="relative group">
                    <img
                      src={preview.url}
                      alt={`Preview ${index + 1}`}
                      className="h-20 w-full rounded-md object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 rounded-full bg-background border border-border p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Memory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMemoryModal;
