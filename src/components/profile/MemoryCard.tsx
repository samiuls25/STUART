import React from "react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Users, Camera, X, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { Friend } from "../../lib/friends";
import { getFriends } from "../../lib/friends";
import { addMemoryAttendee, deleteMemory, deleteMemoryPhoto, removeMemoryAttendee, reorderMemoryPhotos, type Memory } from "../../lib/memories";
import { useToast } from "../../hooks/use-toast";

interface MemoryCardProps {
  memory: Memory;
  compact?: boolean;
  displayMode?: "default" | "gallery";
  allowDelete?: boolean;
  editable?: boolean;
  onMemoryUpdated?: () => void | Promise<void>;
}

const MemoryCard = ({ memory, compact = false, displayMode = "default", allowDelete = true, editable = true, onMemoryUpdated }: MemoryCardProps) => {
  const { toast } = useToast();
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
      await addMemoryAttendee(memory.id, selectedFriendId);
      toast({
        title: "Attendee added",
        description: "Friend added to this memory.",
      });
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

  const handleDeleteMemory = async () => {
    if (!editable || !allowDelete) return;

    const confirmed = window.confirm("Delete this memory and all of its uploaded photos? This cannot be undone.");
    if (!confirmed) return;

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

  const handleDeleteSelectedPhoto = async () => {
    if (!editable) return;
    if (!currentSelectedPhoto) return;

    const confirmed = window.confirm("Delete this photo from the memory?");
    if (!confirmed) return;

    setDeletingPhotoId(currentSelectedPhoto.id);
    try {
      await deleteMemoryPhoto(memory.id, currentSelectedPhoto.id);
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
          <p className="text-xs text-muted-foreground">{memory.date}</p>
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

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {memory.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {memory.date} at {memory.time}
                    </span>
                  </div>

                  {allowDelete && editable && (
                    <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                      <button
                        type="button"
                        onClick={handleDeleteMemory}
                        disabled={isDeletingMemory}
                        className="inline-flex items-center gap-2 text-sm text-destructive hover:opacity-90 disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />
                        {isDeletingMemory ? "Deleting memory..." : "Delete memory"}
                      </button>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Shared Photos ({galleryPhotos.length})
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {galleryPhotos.map((photo, index) => (
                        <button
                          key={photo.id}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`relative aspect-square rounded-lg overflow-hidden ${index === currentPhotoIndex ? "ring-2 ring-primary" : ""}`}
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
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleReorderSelectedPhoto("left")}
                          disabled={!canReorderPhotos || isReorderingPhotos || currentPhotoIndex === 0}
                          className="px-3 py-1.5 rounded-md border border-border text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Move Left
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderSelectedPhoto("right")}
                          disabled={!canReorderPhotos || isReorderingPhotos || currentPhotoIndex >= galleryPhotos.length - 1}
                          className="px-3 py-1.5 rounded-md border border-border text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Move Right
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteSelectedPhoto}
                          disabled={!currentSelectedPhoto || deletingPhotoId === currentSelectedPhoto?.id}
                          className="px-3 py-1.5 rounded-md border border-destructive/30 text-sm text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingPhotoId === currentSelectedPhoto?.id ? "Deleting Photo..." : "Delete Selected Photo"}
                        </button>
                      </div>
                    )}

                    {editable && !canReorderPhotos && galleryContainsSynthetic && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Reordering is available for multi-photo memories saved in memory_photos.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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

          {/* Date Badge */}
          <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-foreground">
            {memory.date}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            {memory.eventName}
          </h3>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {memory.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
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
                  <span className="text-[10px] font-medium text-primary">
                    {attendee.name.charAt(0)}
                  </span>
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

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {memory.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {memory.date} at {memory.time}
                  </span>
                </div>

                {allowDelete && editable && (
                  <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                    <button
                      type="button"
                      onClick={handleDeleteMemory}
                      disabled={isDeletingMemory}
                      className="inline-flex items-center gap-2 text-sm text-destructive hover:opacity-90 disabled:opacity-60"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeletingMemory ? "Deleting memory..." : "Delete memory"}
                    </button>
                  </div>
                )}

                {/* Attendees Section */}
                <div className="mb-6">
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
                            <span className="text-xs font-medium text-primary">
                              {attendee.name.charAt(0)}
                            </span>
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
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Shared Photos ({galleryPhotos.length})
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {galleryPhotos.map((photo, index) => (
                      <button
                        key={photo.id}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`relative aspect-square rounded-lg overflow-hidden ${index === currentPhotoIndex ? "ring-2 ring-primary" : ""}`}
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleReorderSelectedPhoto("left")}
                        disabled={!canReorderPhotos || isReorderingPhotos || currentPhotoIndex === 0}
                        className="px-3 py-1.5 rounded-md border border-border text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Move Left
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorderSelectedPhoto("right")}
                        disabled={!canReorderPhotos || isReorderingPhotos || currentPhotoIndex >= galleryPhotos.length - 1}
                        className="px-3 py-1.5 rounded-md border border-border text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Move Right
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSelectedPhoto}
                        disabled={!currentSelectedPhoto || deletingPhotoId === currentSelectedPhoto?.id}
                        className="px-3 py-1.5 rounded-md border border-destructive/30 text-sm text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingPhotoId === currentSelectedPhoto?.id ? "Deleting Photo..." : "Delete Selected Photo"}
                      </button>
                    </div>
                  )}

                  {editable && !canReorderPhotos && galleryContainsSynthetic && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Reordering is available for multi-photo memories saved in memory_photos.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MemoryCard;
