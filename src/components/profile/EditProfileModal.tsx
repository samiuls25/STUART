import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProfileModal = ({ isOpen, onClose }: EditProfileModalProps) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // populate with metadata where available
    const meta: any = (user as any)?.user_metadata ?? {};
    setName(meta.full_name || user?.email?.split("@")[0] || "");
    setBio(meta.bio || "");
    setPreview(meta.avatar_url || null);
  }, [isOpen, user]);

  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setAvatarFile(f);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return null;
    const fileExt = file.name.split(".").pop();
    const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
    if (uploadError) {
      console.error("Upload failed", uploadError);
      return null;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      let avatarUrl = (user as any)?.user_metadata?.avatar_url ?? null;

      if (avatarFile) {
        const uploaded = await uploadAvatar(avatarFile);
        if (uploaded) avatarUrl = uploaded;
      }

      // Update profiles table (if exists)
      await supabase.from("profiles").upsert({ id: user.id, name, avatar_url: avatarUrl, bio });

      // Update auth user metadata so UI that reads user metadata updates
      await supabase.auth.updateUser({ data: { full_name: name, avatar_url: avatarUrl, bio } });

      onClose();
    } catch (err) {
      console.error("Failed to save profile", err);
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
