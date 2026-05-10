import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Clock,
  Users,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ExternalLink,
  Link2,
} from "lucide-react";
import type { Friend } from "../../lib/friends";
import { getFriends } from "../../lib/friends";
import { useAuth } from "../../lib/AuthContext";
import {
  addMemoryAttendee,
  deleteMemory,
  deleteMemoryPhoto,
  memoryUploadConfig,
  normalizeAlbumUrlForMemory,
  removeMemoryAttendee,
  reorderMemoryPhotos,
  updateMemoryAlbumUrl,
  uploadPhotosToMemory,
  type Memory,
} from "../../lib/memories";
import { useToast } from "../../hooks/use-toast";
import { trackAnalytics } from "../../lib/analytics";
import { Input } from "../ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface MemoryCardProps {
  memory: Memory;
  compact?: boolean;
  displayMode?: "default" | "gallery";
  allowDelete?: boolean;
  editable?: boolean;
  /** When set to this memory's id, opens the expanded view once (e.g. `/profile?memory=…`). */
  deepLinkMemoryId?: string | null;
  /** When this memory opens from `/profile?memory=…`, parent clears the query param so the modal does not reopen on remount. */
  onDeepLinkConsumed?: () => void;
  onMemoryUpdated?: () => void | Promise<void>;
}

function MemoryAlbumLinkRow({ href }: { href: string }) {
  return (
    <div className="mb-6">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ExternalLink className="w-4 h-4 shrink-0" />
        Open full album
      </a>
      <p className="mt-1 text-xs text-muted-foreground">Opens in a new tab.</p>
    </div>
  );
}

const MemoryCard = ({
  memory,
  compact = false,
  displayMode = "default",
  allowDelete = true,
  editable = true,
  deepLinkMemoryId = null,
  onDeepLinkConsumed,
  onMemoryUpdated,
}: MemoryCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEditAlbumLink = Boolean(editable && user?.id && memory.ownerUserId === user.id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>("");
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [isAddingAttendee, setIsAddingAttendee] = useState(false);
  const [attendeeActionId, setAttendeeActionId] = useState<string | null>(null);
  const [isDeletingMemory, setIsDeletingMemory] = useState(false);
  const [isReorderingPhotos, setIsReorderingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [showDeleteMemoryConfirm, setShowDeleteMemoryConfirm] = useState(false);
  const [showDeletePhotoConfirm, setShowDeletePhotoConfirm] = useState(false);
  const [pendingDeletePhotoId, setPendingDeletePhotoId] = useState<string | null>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [albumDraft, setAlbumDraft] = useState("");
  const [savingAlbum, setSavingAlbum] = useState(false);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);
  const defaultUploadInputRef = useRef<HTMLInputElement | null>(null);
  const deepLinkExpandedRef = useRef(false);
  const openedViaDeepLinkRef = useRef(false);
  const prevIsExpandedRef = useRef(false);

  const galleryPhotos = useMemo(
    () =>
      memory.photos.length > 0
        ? memory.photos
        : [
            {
              id: `${memory.id}-hero`,
              url: memory.heroImage,
              uploadedBy: "You",
              uploadedAt: new Date().toISOString(),
            },
          ],
    [memory.heroImage, memory.id, memory.photos]
  );

  const attendeeSummary =
    memory.attendees.length > 0
      ? memory.attendees.map((attendee) => attendee.name.split(" ")[0]).join(", ")
      : "you";

  const addableFriends = useMemo(
    () => friends.filter((friend) => !memory.attendees.some((attendee) => attendee.id === friend.id)),
    [friends, memory.attendees]
  );

  const isSyntheticPhoto = (photoId: string) => photoId === `${memory.id}-hero`;

  const currentSelectedPhoto = galleryPhotos[currentPhotoIndex] || null;
  const galleryContainsSynthetic = galleryPhotos.some((photo) => isSyntheticPhoto(photo.id));
  const canReorderPhotos = galleryPhotos.length > 1 && !galleryContainsSynthetic;
  const remainingPhotoSlots = Math.max(0, memoryUploadConfig.maxPhotosPerMemory - galleryPhotos.length);
  const pendingDeletePhoto = pendingDeletePhotoId
    ? galleryPhotos.find((photo) => photo.id === pendingDeletePhotoId) || null
    : null;

  const getReorderedIdsAndTargetIndex = (direction: "left" | "right") => {
    if (!canReorderPhotos) return null;

    const sourceIndex = currentPhotoIndex;
    const targetIndex = direction === "left" ? sourceIndex - 1 : sourceIndex + 1;
    if (targetIndex < 0 || targetIndex >= galleryPhotos.length) return null;

    const ids = galleryPhotos.map((photo) => photo.id);
    [ids[sourceIndex], ids[targetIndex]] = [ids[targetIndex], ids[sourceIndex]];

    return { ids, targetIndex };
  };

  useEffect(() => {
    if (!isExpanded || !editable) return;

    let mounted = true;

    const loadFriends = async () => {
      setLoadingFriends(true);
      try {
        const friendRows = await getFriends();
        if (mounted) {
          setFriends(friendRows);
        }
      } catch (error) {
        console.warn("Unable to fetch friends for memory attendees", error);
      } finally {
        if (mounted) {
          setLoadingFriends(false);
        }
      }
    };

    loadFriends();

    return () => {
      mounted = false;
    };
  }, [editable, isExpanded]);

  useEffect(() => {
    if (!isExpanded || !editable) return;
    setAlbumDraft(memory.albumUrl ?? "");
  }, [isExpanded, editable, memory.id, memory.albumUrl]);

  useEffect(() => {
    if (!deepLinkMemoryId || deepLinkMemoryId !== memory.id || deepLinkExpandedRef.current) return;
    deepLinkExpandedRef.current = true;
    openedViaDeepLinkRef.current = true;
    setIsExpanded(true);
    // Do not clear ?memory= here: React Strict Mode remounts before paint; clearing the URL
    // drops deepLinkMemoryId so the remounted card never opens. Clear when the modal closes instead.
  }, [deepLinkMemoryId, memory.id]);

  useEffect(() => {
    const wasExpanded = prevIsExpandedRef.current;
    prevIsExpandedRef.current = isExpanded;
    if (!wasExpanded || isExpanded || !openedViaDeepLinkRef.current) return;
    openedViaDeepLinkRef.current = false;
    deepLinkExpandedRef.current = false;
    onDeepLinkConsumed?.();
  }, [isExpanded, onDeepLinkConsumed]);

  useEffect(() => {
    if (addableFriends.length === 0) {
      setSelectedFriendId("");
      return;
    }

    if (!addableFriends.some((friend) => friend.id === selectedFriendId)) {
      setSelectedFriendId(addableFriends[0].id);
    }
  }, [addableFriends, selectedFriendId]);

  const handleAddAttendee = async () => {
    if (!editable) return;
    if (!selectedFriendId) return;

    setIsAddingAttendee(true);
    try {
      const { inserted } = await addMemoryAttendee(memory.id, selectedFriendId);
      if (inserted) {
        trackAnalytics("memory_attendees_added", {
          memory_id: memory.id,
          peers_added: 1,
          source: "memory_card",
        });
        toast({
          title: "Attendee added",
          description: "Friend added to this memory.",
        });
      } else {
        toast({
          title: "Already tagged",
          description: "That friend is already listed on this memory.",
        });
      }
      await onMemoryUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add attendee.";
      toast({
        title: "Could not add attendee",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAddingAttendee(false);
    }
  };

  const handleRemoveAttendee = async (attendeeId: string) => {
    if (!editable) return;
    setAttendeeActionId(attendeeId);
    try {
      await removeMemoryAttendee(memory.id, attendeeId);
      trackAnalytics("memory_attendee_removed", { memory_id: memory.id });
      toast({
        title: "Attendee removed",
        description: "Friend removed from this memory.",
      });
      await onMemoryUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove attendee.";
      toast({
        title: "Could not remove attendee",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAttendeeActionId(null);
    }
  };

  const handleDeleteMemory = () => {
    if (!editable || !allowDelete) return;

    setShowDeleteMemoryConfirm(true);
  };

  const confirmDeleteMemory = async () => {
    setShowDeleteMemoryConfirm(false);

    setIsDeletingMemory(true);
    try {
      await deleteMemory(memory.id);
      toast({
        title: "Memory deleted",
        description: "The memory and its photos were removed.",
      });
      setIsExpanded(false);
      await onMemoryUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete memory.";
      toast({
        title: "Could not delete memory",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingMemory(false);
    }
  };

  const handleDeleteSelectedPhoto = () => {
    if (!editable) return;
    if (!currentSelectedPhoto) return;

    setPendingDeletePhotoId(currentSelectedPhoto.id);
    setShowDeletePhotoConfirm(true);
  };

  const confirmDeleteSelectedPhoto = async () => {
    if (!pendingDeletePhotoId) return;
    setShowDeletePhotoConfirm(false);

    const selectedId = pendingDeletePhotoId;
    setPendingDeletePhotoId(null);

    setDeletingPhotoId(selectedId);
    try {
      await deleteMemoryPhoto(memory.id, selectedId);
      toast({
        title: "Photo deleted",
        description: "The photo was removed from this memory.",
      });
      setCurrentPhotoIndex((prev) => Math.max(prev - 1, 0));
      await onMemoryUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete photo.";
      toast({
        title: "Could not delete photo",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleAddPhotos = async (incoming: FileList | null) => {
    if (!editable || !incoming || incoming.length === 0) return;

    const imageFiles = Array.from(incoming).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast({
        title: "No valid photos selected",
        description: "Please choose image files only.",
      });
      return;
    }

    const oversized = imageFiles.find(
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

    if (remainingPhotoSlots <= 0) {
      toast({
        title: "Photo limit reached",
        description: `You can upload up to ${memoryUploadConfig.maxPhotosPerMemory} photos per memory.`,
      });
      return;
    }

    const filesToUpload = imageFiles.slice(0, remainingPhotoSlots);
    if (filesToUpload.length < imageFiles.length) {
      toast({
        title: "Photo limit reached",
        description: `Only ${filesToUpload.length} more photo${filesToUpload.length === 1 ? "" : "s"} can be added to this memory.`,
      });
    }

    setIsUploadingPhotos(true);
    try {
      const uploaded = await uploadPhotosToMemory(memory.id, filesToUpload);
      toast({
        title: "Photos added",
        description: `${uploaded.length} photo${uploaded.length === 1 ? "" : "s"} uploaded successfully.`,
      });
      await onMemoryUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload photos.";
      toast({
        title: "Could not upload photos",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleReorderSelectedPhoto = async (direction: "left" | "right") => {
    if (!editable) return;

    const reordered = getReorderedIdsAndTargetIndex(direction);
    if (!reordered) return;

    setIsReorderingPhotos(true);
    try {
      await reorderMemoryPhotos(memory.id, reordered.ids);
      setCurrentPhotoIndex(reordered.targetIndex);
      await onMemoryUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reorder photos.";
      toast({
        title: "Could not reorder photos",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsReorderingPhotos(false);
    }
  };

  const handleSaveAlbumLink = async () => {
    if (!editable || !canEditAlbumLink) return;
    const trimmed = albumDraft.trim();
    if (trimmed && !normalizeAlbumUrlForMemory(trimmed)) {
      toast({
        title: "Invalid album link",
        description: "Use an https:// or http:// URL under 2048 characters.",
        variant: "destructive",
      });
      return;
    }

    setSavingAlbum(true);
    try {
      await updateMemoryAlbumUrl(memory.id, albumDraft);
      toast({
        title: "Album link saved",
        description: trimmed ? "Your gallery link is updated." : "Link removed from this memory.",
      });
      await onMemoryUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save album link.";
      toast({
        title: "Could not save link",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSavingAlbum(false);
    }
  };

  const handleClearAlbumLink = async () => {
    if (!editable || !canEditAlbumLink) return;
    setSavingAlbum(true);
    try {
      await updateMemoryAlbumUrl(memory.id, "");
      setAlbumDraft("");
      toast({
        title: "Album link removed",
        description: "You can add a new link anytime.",
      });
      await onMemoryUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove album link.";
      toast({
        title: "Could not remove link",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSavingAlbum(false);
    }
  };

  const renderAlbumLinkSection = () => {
    if (canEditAlbumLink) {
      return (
        <div className="mb-6 space-y-2 rounded-xl border border-border bg-muted/20 p-4">
          <label className="text-sm font-medium text-foreground">Album link (optional)</label>
          <Input
            type="url"
            inputMode="url"
            value={albumDraft}
            onChange={(e) => setAlbumDraft(e.target.value)}
            placeholder="https://photos.google.com/..."
            maxLength={2048}
            autoComplete="off"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSaveAlbumLink()}
              disabled={savingAlbum}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
            >
              {savingAlbum ? "Saving..." : "Save link"}
            </button>
            {memory.albumUrl ? (
              <button
                type="button"
                onClick={() => void handleClearAlbumLink()}
                disabled={savingAlbum}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                Clear link
              </button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
          Share a Google Photos / Drive / other gallery link if you have more pictures than the in-app limit. Use Save after editing.
          </p>
          {memory.albumUrl ? <MemoryAlbumLinkRow href={memory.albumUrl} /> : null}
        </div>
      );
    }
    if (memory.albumUrl) {
      return <MemoryAlbumLinkRow href={memory.albumUrl} />;
    }
    return null;
  };

  const handleCopyMemoryDeepLink = async () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/profile?memory=${memory.id}`;
    try {
      await navigator.clipboard.writeText(url);
      trackAnalytics("memory_share_link_copied", { memory_id: memory.id });
      toast({
        title: "Link copied",
        description: "Opens your Profile to this memory when someone is signed in and can see it.",
      });
    } catch {
      toast({
        title: "Couldn't copy",
        description: url,
        variant: "destructive",
      });
    }
  };

  const renderShareDeepLinkBlock = () => (
    <div className="mb-8 rounded-xl border border-border/70 bg-muted/15 px-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
          Copy a link that jumps to this memory on your profile. Recipients must be signed in and already able to see this memory.
        </p>
        <button
          type="button"
          onClick={() => void handleCopyMemoryDeepLink()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Copy link
        </button>
      </div>
    </div>
  );

  const renderDeleteMemoryBlock = () =>
    allowDelete && editable ? (
      <div className="mb-8 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
        <button
          type="button"
          onClick={handleDeleteMemory}
          disabled={isDeletingMemory}
          className="inline-flex items-center gap-2 text-sm font-medium text-destructive hover:opacity-90 disabled:opacity-60"
        >
          <Trash2 className="w-4 h-4" />
          {isDeletingMemory ? "Deleting memory..." : "Delete memory"}
        </button>
      </div>
    ) : null;

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev + 1) % galleryPhotos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length);
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
      >
        <img
          src={memory.heroImage}
          alt={memory.eventName}
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{memory.eventName}</p>
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{memory.date}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Camera className="w-3 h-3" />
          {galleryPhotos.length}
        </div>
      </motion.div>
    );
  }

  if (displayMode === "gallery") {
    const isTall = memory.photos.length > 2;
    return (
      <>
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          onClick={() => setIsExpanded(true)}
          className={`group relative w-full overflow-hidden rounded-2xl border border-border shadow-sm hover:shadow-lg transition-shadow text-left ${isTall ? "h-80" : "h-60"}`}
        >
          <img
            src={memory.heroImage}
            alt={memory.eventName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/55 text-white text-xs flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {galleryPhotos.length}
          </div>

          <div className="absolute bottom-0 inset-x-0 p-3">
            <p className="text-white font-semibold text-sm truncate">{memory.eventName}</p>
            <p className="text-white/80 text-xs truncate">{memory.date}</p>
          </div>
        </motion.button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsExpanded(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-card rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsExpanded(false)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="relative h-72 bg-black">
                  <img
                    src={galleryPhotos[currentPhotoIndex]?.url || memory.heroImage}
                    alt={`Photo ${currentPhotoIndex + 1}`}
                    className="w-full h-full object-contain"
                  />

                  {galleryPhotos.length > 1 && (
                    <>
                      <button
                        onClick={prevPhoto}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                    {currentPhotoIndex + 1} / {galleryPhotos.length}
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(85vh-18rem)]">
                  <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                    {memory.eventName}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-600 dark:text-neutral-300 mb-6">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 shrink-0" />
                      {memory.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 shrink-0" />
                      {memory.date} at {memory.time}
                    </span>
                  </div>

                  {renderShareDeepLinkBlock()}
                  {renderDeleteMemoryBlock()}

                  {renderAlbumLinkSection()}

                  <div className="mb-8">
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Who was there ({memory.attendees.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {memory.attendees.length > 0 ? (
                        memory.attendees.map((attendee, index) => (
                          <div
                            key={attendee.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                              {attendee.avatar ? (
                                <img
                                  src={attendee.avatar}
                                  alt={attendee.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-medium text-primary">
                                  {attendee.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-foreground">{attendee.name}</span>
                            {editable && index > 0 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAttendee(attendee.id)}
                                disabled={attendeeActionId === attendee.id}
                                className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground">
                          Just you
                        </div>
                      )}
                    </div>

                    {editable && (
                      <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <select
                          value={selectedFriendId}
                          onChange={(e) => setSelectedFriendId(e.target.value)}
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground sm:flex-1"
                          disabled={loadingFriends || addableFriends.length === 0}
                        >
                          {addableFriends.length === 0 ? (
                            <option value="">No more friends to add</option>
                          ) : (
                            addableFriends.map((friend) => (
                              <option key={friend.id} value={friend.id}>
                                {friend.name}
                              </option>
                            ))
                          )}
                        </select>

                        <button
                          type="button"
                          onClick={handleAddAttendee}
                          disabled={isAddingAttendee || !selectedFriendId || addableFriends.length === 0}
                          className="h-10 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          Add friend
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/10 p-4 sm:p-5">
                    <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Shared Photos ({galleryPhotos.length})
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {galleryPhotos.map((photo, index) => (
                        <button
                          key={photo.id}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`relative aspect-square rounded-lg overflow-hidden ${index === currentPhotoIndex ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                        >
                          <img
                            src={photo.url}
                            alt={`Photo by ${photo.uploadedBy}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>

                    {editable && (
                      <div className="mt-6 pt-5 border-t border-border/70 space-y-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => galleryUploadInputRef.current?.click()}
                            disabled={isUploadingPhotos || remainingPhotoSlots <= 0}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                            {isUploadingPhotos ? "Uploading..." : "Add Photos"}
                          </button>
                          <input
                            ref={galleryUploadInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              void handleAddPhotos(event.target.files);
                              event.currentTarget.value = "";
                            }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {Math.max(remainingPhotoSlots, 0)} slot{remainingPhotoSlots === 1 ? "" : "s"} left
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleReorderSelectedPhoto("left")}
                            disabled={!canReorderPhotos || isReorderingPhotos || currentPhotoIndex === 0}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Move Left
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorderSelectedPhoto("right")}
                            disabled={!canReorderPhotos || isReorderingPhotos || currentPhotoIndex >= galleryPhotos.length - 1}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Move Right
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteSelectedPhoto}
                            disabled={!currentSelectedPhoto || deletingPhotoId === currentSelectedPhoto?.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                            {deletingPhotoId === currentSelectedPhoto?.id ? "Deleting..." : "Delete Selected"}
                          </button>
                        </div>
                      </div>
                    )}

                    {editable && !canReorderPhotos && galleryContainsSynthetic && (
                      <p className="mt-4 text-xs text-muted-foreground">
                        Reordering is available for multi-photo memories saved in memory_photos.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AlertDialog open={showDeleteMemoryConfirm} onOpenChange={setShowDeleteMemoryConfirm}>
          <AlertDialogContent className="max-w-md rounded-2xl">
            <AlertDialogTitle className="text-destructive">Delete Memory?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>This memory and all uploaded photos will be permanently removed.</p>
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-sm text-foreground">
                    <strong>{memory.eventName}</strong>
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Memory</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void confirmDeleteMemory();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Memory
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showDeletePhotoConfirm}
          onOpenChange={(open) => {
            setShowDeletePhotoConfirm(open);
            if (!open) {
              setPendingDeletePhotoId(null);
            }
          }}
        >
          <AlertDialogContent className="max-w-md rounded-2xl">
            <AlertDialogTitle className="text-destructive">Delete Selected Photo?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>This photo will be removed from the memory.</p>
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-sm text-foreground">
                    {pendingDeletePhoto ? `Photo by ${pendingDeletePhoto.uploadedBy}` : "Selected photo"}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Photo</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void confirmDeleteSelectedPhoto();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Photo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        onClick={() => setIsExpanded(true)}
        className="relative bg-card rounded-2xl border border-border overflow-hidden cursor-pointer group shadow-sm hover:shadow-lg transition-shadow"
      >
        {/* Hero Image */}
        <div className="relative h-40 overflow-hidden">
          <img
            src={memory.heroImage}
            alt={memory.eventName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Photo Count Badge */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
            <Camera className="w-3 h-3" />
            {galleryPhotos.length}
          </div>

          {/* Date Badge — always dark text on light pill so dark-mode theme tokens don't wash out */}
          <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-white/95 backdrop-blur-sm text-xs font-semibold text-neutral-900 shadow-sm ring-1 ring-black/10">
            {memory.date}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            {memory.eventName}
          </h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300 mb-3">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {memory.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" />
              {memory.time}
            </span>
          </div>

          {/* Attendees */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {memory.attendees.slice(0, 4).map((attendee, index) => (
                <div
                  key={attendee.id}
                  className="w-7 h-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center"
                  style={{ zIndex: memory.attendees.length - index }}
                >
                  {attendee.avatar ? (
                    <img
                      src={attendee.avatar}
                      alt={attendee.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-medium text-primary">
                      {attendee.name.charAt(0)}
                    </span>
                  )}
                </div>
              ))}
              {memory.attendees.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    +{memory.attendees.length - 4}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              with {attendeeSummary}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-card rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Photo Gallery */}
              <div className="relative h-72 bg-black">
                <img
                  src={galleryPhotos[currentPhotoIndex]?.url || memory.heroImage}
                  alt={`Photo ${currentPhotoIndex + 1}`}
                  className="w-full h-full object-contain"
                />

                {galleryPhotos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Photo Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                  {currentPhotoIndex + 1} / {galleryPhotos.length}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-18rem)]">
                <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                  {memory.eventName}
                </h2>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-600 dark:text-neutral-300 mb-6">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 shrink-0" />
                    {memory.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 shrink-0" />
                    {memory.date} at {memory.time}
                  </span>
                </div>

                {renderShareDeepLinkBlock()}
                {renderDeleteMemoryBlock()}

                {renderAlbumLinkSection()}

                {/* Attendees Section */}
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Who was there ({memory.attendees.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {memory.attendees.length > 0 ? (
                      memory.attendees.map((attendee, index) => (
                        <div
                          key={attendee.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            {attendee.avatar ? (
                              <img
                                src={attendee.avatar}
                                alt={attendee.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-medium text-primary">
                                {attendee.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-foreground">{attendee.name}</span>
                          {editable && index > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAttendee(attendee.id)}
                              disabled={attendeeActionId === attendee.id}
                              className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground">
                        Just you
                      </div>
                    )}
                  </div>

                  {editable && (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedFriendId}
                        onChange={(e) => setSelectedFriendId(e.target.value)}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground sm:flex-1"
                        disabled={loadingFriends || addableFriends.length === 0}
                      >
                        {addableFriends.length === 0 ? (
                          <option value="">No more friends to add</option>
                        ) : (
                          addableFriends.map((friend) => (
                            <option key={friend.id} value={friend.id}>
                              {friend.name}
                            </option>
                          ))
                        )}
                      </select>

                      <button
                        type="button"
                        onClick={handleAddAttendee}
                        disabled={isAddingAttendee || !selectedFriendId || addableFriends.length === 0}
                        className="h-10 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Add friend
                      </button>
                    </div>
                  )}
                </div>

                {/* Photo Thumbnails */}
                <div className="rounded-xl border border-border/80 bg-muted/10 p-4 sm:p-5">
                  <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Shared Photos ({galleryPhotos.length})
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {galleryPhotos.map((photo, index) => (
                      <button
                        key={photo.id}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`relative aspect-square rounded-lg overflow-hidden ${index === currentPhotoIndex ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                      >
                        <img
                          src={photo.url}
                          alt={`Photo by ${photo.uploadedBy}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  {editable && (
                    <div className="mt-6 pt-5 border-t border-border/70 space-y-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => defaultUploadInputRef.current?.click()}
                          disabled={isUploadingPhotos || remainingPhotoSlots <= 0}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                          {isUploadingPhotos ? "Uploading..." : "Add Photos"}
                        </button>
                        <input
                          ref={defaultUploadInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            void handleAddPhotos(event.target.files);
                            event.currentTarget.value = "";
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {Math.max(remainingPhotoSlots, 0)} slot{remainingPhotoSlots === 1 ? "" : "s"} left
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleReorderSelectedPhoto("left")}
                          disabled={!canReorderPhotos || isReorderingPhotos || currentPhotoIndex === 0}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Move Left
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderSelectedPhoto("right")}
                          disabled={!canReorderPhotos || isReorderingPhotos || currentPhotoIndex >= galleryPhotos.length - 1}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Move Right
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteSelectedPhoto}
                          disabled={!currentSelectedPhoto || deletingPhotoId === currentSelectedPhoto?.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletingPhotoId === currentSelectedPhoto?.id ? "Deleting..." : "Delete Selected"}
                        </button>
                      </div>
                    </div>
                  )}

                  {editable && !canReorderPhotos && galleryContainsSynthetic && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Reordering is available for multi-photo memories saved in memory_photos.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={showDeleteMemoryConfirm} onOpenChange={setShowDeleteMemoryConfirm}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogTitle className="text-destructive">Delete Memory?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>This memory and all uploaded photos will be permanently removed.</p>
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm text-foreground">
                  <strong>{memory.eventName}</strong>
                </p>
              </div>
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Memory</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void confirmDeleteMemory();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Memory
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDeletePhotoConfirm}
        onOpenChange={(open) => {
          setShowDeletePhotoConfirm(open);
          if (!open) {
            setPendingDeletePhotoId(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogTitle className="text-destructive">Delete Selected Photo?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>This photo will be removed from the memory.</p>
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm text-foreground">
                  {pendingDeletePhoto ? `Photo by ${pendingDeletePhoto.uploadedBy}` : "Selected photo"}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Photo</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void confirmDeleteSelectedPhoto();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MemoryCard;
