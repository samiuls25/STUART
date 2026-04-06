import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { getFriends, type Friend } from "../../lib/friends";
import { createGroup, type UserGroup, updateGroup } from "../../lib/groups";
import { useToast } from "../../hooks/use-toast";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (group: UserGroup) => void;
  initialGroup?: UserGroup | null;
  defaultMemberIds?: string[];
}

const CreateGroupModal = ({
  isOpen,
  onClose,
  onSaved,
  initialGroup,
  defaultMemberIds,
}: CreateGroupModalProps) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditMode = Boolean(initialGroup);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setSelectedMemberIds([]);
      return;
    }

    setName(initialGroup?.name || "");
    setDescription(initialGroup?.description || "");
    if (initialGroup) {
      setSelectedMemberIds(initialGroup.members.filter((member) => member.role !== "admin").map((member) => member.userId));
    } else {
      setSelectedMemberIds([...new Set(defaultMemberIds ?? [])]);
    }
  }, [defaultMemberIds, initialGroup, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoadingFriends(true);

    getFriends()
      .then((rows) => {
        if (!mounted) return;
        setFriends(rows);
      })
      .catch((error) => {
        console.error("Failed to load friends for group editor", error);
        if (mounted) setFriends([]);
      })
      .finally(() => {
        if (mounted) setLoadingFriends(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const selectableFriends = useMemo(
    () => friends.filter((friend) => !friend.isBlocked),
    [friends]
  );

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSave = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      toast({
        title: "Group name required",
        description: "Please name your group before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: normalizedName,
        description,
        memberIds: selectedMemberIds,
      };

      const group = initialGroup
        ? await updateGroup({ groupId: initialGroup.id, ...payload })
        : await createGroup(payload);

      toast({
        title: initialGroup ? "Group updated" : "Group created",
        description: `${group.name} is ready to use.`,
      });

      onSaved?.(group);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save group.";
      toast({
        title: "Could not save group",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Group" : "Create Group"}</DialogTitle>
          <DialogDescription>
            Build reusable friend groups for hangouts, memories, and event suggestions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Group Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Weekend Crew"
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="People I usually plan outings with"
              rows={3}
              maxLength={240}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Members ({selectedMemberIds.length})</label>
            <div className="rounded-lg border border-border max-h-64 overflow-y-auto divide-y divide-border/60">
              {loadingFriends ? (
                <div className="p-4 text-sm text-muted-foreground">Loading friends...</div>
              ) : selectableFriends.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No friends available yet.</div>
              ) : (
                selectableFriends.map((friend) => {
                  const isSelected = selectedMemberIds.includes(friend.id);
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => toggleMember(friend.id)}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-muted/40 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-medium text-foreground">
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
                          ) : (
                            friend.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{friend.name}</p>
                          <p className="text-xs text-muted-foreground">{friend.email}</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded border ${isSelected ? "border-primary bg-primary" : "border-border"}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isEditMode ? "Save Changes" : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;