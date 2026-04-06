import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { toast } from "../../hooks/use-toast";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (profile: { name: string; bio: string; avatarUrl: string | null }) => void;
}

const AVATAR_BUCKETS = Array.from(
  new Set(
    [
      import.meta.env.VITE_AVATAR_BUCKET as string | undefined,
      (import.meta.env.VITE_MEMORY_PHOTOS_BUCKET as string | undefined) || "memory-photos",
      "avatars",
    ].filter(Boolean) as string[]
  )
);

const EditProfileModal = ({ isOpen, onClose, onSaved }: EditProfileModalProps) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    let mounted = true;

    // populate with metadata where available
    const meta: any = (user as any)?.user_metadata ?? {};
    setName(meta.full_name || user?.email?.split("@")[0] || "");
    setBio(meta.bio || "");
    setPreview(meta.avatar_url || null);

    // Also hydrate from profiles table in case metadata is stale.
    supabase
      .from("profiles")
      .select("name,bio,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted || !data) return;
        if (data.name) setName(data.name);
        if (data.bio) setBio(data.bio);
        if (data.avatar_url) setPreview(data.avatar_url);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, user]);

  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && !f.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please pick an image file for your avatar.",
        variant: "destructive",
      });
      return;
    }
    setAvatarFile(f);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) throw new Error("You must be signed in to change your avatar.");
    const fileExt = file.name.split(".").pop() || "jpg";
    const safeExt = fileExt.replace(/[^a-zA-Z0-9]/g, "") || "jpg";

    let lastError: unknown = null;

    for (const bucket of AVATAR_BUCKETS) {
      const filePath = `${user.id}/avatars/${Date.now()}.${safeExt}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        lastError = uploadError;
        continue;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return data.publicUrl;
    }

    throw new Error(
      lastError instanceof Error ? lastError.message : "Avatar upload failed."
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const normalizedName = name.trim() || user.email?.split("@")[0] || "Your Name";
      const normalizedBio = bio.trim();
      let avatarUrl = (user as any)?.user_metadata?.avatar_url ?? null;

      if (avatarFile) {
        const uploaded = await uploadAvatar(avatarFile);
        avatarUrl = uploaded;
      }

      // Update profiles table (if exists)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          name: normalizedName,
          avatar_url: avatarUrl,
          bio: normalizedBio,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.warn("Profile table update skipped (may not exist):", profileError);
      }

      // Update auth user metadata so UI that reads user metadata updates
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: normalizedName, avatar_url: avatarUrl, bio: normalizedBio },
      });

      if (authError) throw authError;

      onSaved?.({ name: normalizedName, bio: normalizedBio, avatarUrl });

      toast({
        title: "Profile updated",
        description: "Your profile changes were saved.",
      });

      onClose();
    } catch (err) {
      console.error("Failed to save profile", err);
      toast({
        title: "Could not save profile",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal Container */}
          <div key="modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md pointer-events-auto"
            >
              <div className="bg-card rounded-2xl border border-border p-6 shadow-elevated max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-xl font-bold text-foreground">Edit Profile</h2>
                  <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-muted overflow-hidden flex items-center justify-center">
                      {preview ? (
                        <img src={preview} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-muted-foreground">No avatar</div>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-primary">
                      <Camera className="w-4 h-4" />
                      <span>Change avatar</span>
                      <input onChange={handleFile} type="file" accept="image/*" className="hidden" />
                    </label>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Full name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="input-field w-full" />
                  </div>

                  {/* Bio Textarea */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-field w-full h-24 resize-none" />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditProfileModal;
