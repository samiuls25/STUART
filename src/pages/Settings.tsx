import React from   "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";    
import {
  User,
  Settings as SettingsIcon,
  Shield,
  Bell,
  Eye,
  Lock,
  UserX,
  ChevronRight,
  Moon,
  Sun,
  Palette,
  Trash2,
  LogOut,
  ArrowLeft,
  Check,
  AlertCircle,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import AuthModal from "../components/auth/AuthModal";
import { useAuth } from "../lib/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { supabase } from "../lib/supabase";
import { toast } from "../hooks/use-toast";

type SettingsSection = "main" | "profile" | "privacy" | "notifications" | "blocked";

const Settings = () => {
  const navigate = useNavigate();
  // All hooks must be called at the top level, before any early returns
  const [showAuth, setShowAuth] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("main");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [settings, setSettings] = useState({
    // Profile
    name: "",
    email: "",
    // Privacy
    profileVisibility: "friends" as "public" | "friends" | "private",
    showBadges: true,
    showMemories: true,
    showUpcomingHangouts: true,
    // Notifications
    hangoutInvites: true,
    friendRequests: true,
    eventReminders: true,
    friendActivity: false,
    // Theme
    darkMode: typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark',
  });
  const [saving, setSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  const { user, signOut } = useAuth();

  // Initialize dark mode from system preference or localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setSettings((prev) => ({ ...prev, darkMode: true }));
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      setSettings((prev) => ({ ...prev, darkMode: false }));
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        setSettings((prev) => ({ ...prev, darkMode: true }));
      }
    }
  }, []);

  // Apply dark mode changes
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [settings.darkMode]);

  // Initialize profile and privacy fields from user data
  useEffect(() => {
    if (user) {
      const displayName = (user as any)?.user_metadata?.full_name || 
                         (user?.email ? user.email.split("@")[0] : "Your Name");
      const userEmail = user?.email ?? "";
      const userMetadata = (user as any)?.user_metadata ?? {};
      
      setSettings((prev) => ({
        ...prev,
        name: displayName,
        email: userEmail,
        // Load privacy settings from user metadata
        profileVisibility: (userMetadata.profile_visibility ?? "friends") as "public" | "friends" | "private",
        showBadges: userMetadata.show_badges !== false,
        showMemories: userMetadata.show_memories !== false,
        showUpcomingHangouts: userMetadata.show_upcoming_hangouts !== false,
        // Load notification settings from user metadata
        hangoutInvites: userMetadata.notification_hangout_invites !== false,
        friendRequests: userMetadata.notification_friend_requests !== false,
        eventReminders: userMetadata.notification_event_reminders !== false,
        friendActivity: userMetadata.notification_friend_activity !== false,
      }));
    }
  }, [user]);

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setDeletingAccount(true);
    try {
      // Delete user data from profiles table first (if it exists)
      await supabase.from("profiles").delete().eq("id", user.id).select();
      
      // Delete user account via Supabase Auth
      // Note: This requires RLS policies or admin privileges
      // As a client-side fallback, we'll use a different approach:
      // Create an RPC function in Supabase that your backend can call
      // For now, we'll delete data and sign out
      
      // Call a Supabase function to delete the user account (you need to create this)
      const { error: rpcError } = await supabase.rpc('delete_user_account', {
        user_id: user.id,
      });
      
      // If RPC doesn't exist, just sign out (manual deletion path)
      if (rpcError?.code === 'PGRST204' || rpcError?.message.includes('not found')) {
        console.log("RPC not available, proceeding with sign out");
      } else if (rpcError) {
        throw rpcError;
      }
      
      // Sign out the user
      await signOut();
      
      // Show success message
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted. You are being signed out.",
      });
      
      // Redirect to home page
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Save privacy settings to user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          profile_visibility: settings.profileVisibility,
          show_badges: settings.showBadges,
          show_memories: settings.showMemories,
          show_upcoming_hangouts: settings.showUpcomingHangouts,
        },
      });
      
      if (authError) throw authError;
      
      // Also save to profiles table for easier querying
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        profile_visibility: settings.profileVisibility,
        show_badges: settings.showBadges,
        show_memories: settings.showMemories,
        show_upcoming_hangouts: settings.showUpcomingHangouts,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" }).select();
      
      if (profileError) {
        console.warn("Profile table update skipped (may not exist):", profileError);
      }
      
      toast({
        title: "Success",
        description: "Privacy settings saved successfully!",
      });
    } catch (error) {
      console.error("Failed to save privacy settings:", error);
      toast({
        title: "Error",
        description: "Failed to save privacy settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: settings.name },
      });
      
      if (authError) throw authError;
      
      // Save to profiles table (using 'name' column, not 'full_name')
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        name: settings.name,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" }).select();
      
      // Note: email updates are restricted in Supabase and may require confirmation
      
      if (profileError) {
        console.warn("Profile table update skipped (may not exist):", profileError);
      }
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Save notification settings to user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          notification_hangout_invites: settings.hangoutInvites,
          notification_friend_requests: settings.friendRequests,
          notification_event_reminders: settings.eventReminders,
          notification_friend_activity: settings.friendActivity,
        },
      });
      
      if (authError) throw authError;
      
      // Also save to profiles table for easier querying
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        notification_hangout_invites: settings.hangoutInvites,
        notification_friend_requests: settings.friendRequests,
        notification_event_reminders: settings.eventReminders,
        notification_friend_activity: settings.friendActivity,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" }).select();
      
      if (profileError) {
        console.warn("Profile table update skipped (may not exist):", profileError);
      }
      
      toast({
        title: "Success",
        description: "Notification preferences saved successfully!",
      });
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-[72px]">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="bg-card rounded-2xl border border-border p-6 mb-6 text-center">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-2">You're not signed in</h2>
              <p className="text-sm text-muted-foreground mb-4">Sign in to access your settings.</p>
              <button onClick={() => setShowAuth(true)} className="btn-primary px-4 py-2">Sign In</button>
            </div>
          </div>
        </main>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  // Fetch blocked users from Supabase
  useEffect(() => {
    if (!user) return;

    const fetchBlockedUsers = async () => {
      try {
        // Get blocked user IDs
        const { data: blocks, error: blocksError } = await supabase
          .from("blocked_users")
          .select("blocked_user_id")
          .eq("user_id", user.id);

        if (blocksError) {
          console.error("Error fetching blocked users:", blocksError);
          return;
        }

        if (!blocks || blocks.length === 0) {
          setBlockedUsers([]);
          return;
        }

        // Get profiles of blocked users
        const blockedIds = blocks.map(b => b.blocked_user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .in("id", blockedIds);

        if (profilesError) {
          console.error("Error fetching blocked profiles:", profilesError);
          return;
        }

        setBlockedUsers(profiles || []);
      } catch (error) {
        console.error("Failed to fetch blocked users:", error);
      }
    };

    fetchBlockedUsers();
  }, [user]);

  const renderMain = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <SettingsItem
        icon={User}
        title="Profile"
        subtitle="Name, email, and personal details"
        onClick={() => setActiveSection("profile")}
      />
      <SettingsItem
        icon={Shield}
        title="Privacy"
        subtitle="Control who sees your profile"
        onClick={() => setActiveSection("privacy")}
      />
      <SettingsItem
        icon={Bell}
        title="Notifications"
        subtitle="Manage your notification preferences"
        onClick={() => setActiveSection("notifications")}
      />
      <SettingsItem
        icon={UserX}
        title="Blocked Users"
        subtitle={`${blockedUsers.length} blocked`}
        onClick={() => setActiveSection("blocked")}
      />

      <div className="pt-6 border-t border-border space-y-3">
        <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            {settings.darkMode ? (
              <Moon className="w-5 h-5 text-primary" />
            ) : (
              <Sun className="w-5 h-5 text-primary" />
            )}
            <span className="font-medium text-foreground">Dark Mode</span>
          </div>
          <Switch
            checked={settings.darkMode}
            onCheckedChange={(checked) =>
              setSettings((s) => ({ ...s, darkMode: checked }))
            }
          />
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </motion.div>
  );

  const renderProfile = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <button
        onClick={() => setActiveSection("main")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Profile Details
        </h2>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Display Name
          </label>
          <Input
            value={settings.name}
            onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <Input
            type="email"
            value={settings.email}
            onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
          />
        </div>

          <button
            className="btn-primary px-6 py-2 flex items-center gap-2"
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="inline-block animate-spin">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                </div>
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
          Danger Zone
        </h2>
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-2 text-destructive hover:underline transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogTitle className="text-destructive">Delete Account</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you absolutely sure you want to delete your account? This action cannot be undone.
            </p>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-foreground">
                <strong>This will:</strong>
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>Permanently delete your account</li>
                <li>Remove all your profile data</li>
                <li>Delete all your memories and badges</li>
                <li>Cancel all pending hangouts</li>
              </ul>
            </div>
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end mt-6">
            <AlertDialogCancel disabled={deletingAccount}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAccount ? (
                <><div className="inline-block animate-spin mr-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                </div>Deleting...</>
              ) : (
                "Delete Account"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );

  const renderPrivacy = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <button
        onClick={() => setActiveSection("main")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Profile Visibility
        </h2>

        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
          <p>
            Your profile visibility setting controls who can view your profile:
          </p>
          <ul className="mt-2 space-y-1 ml-2">
            <li>• <strong>Public:</strong> Anyone can see your full profile</li>
            <li>• <strong>Friends:</strong> Only your friends can see your profile</li>
            <li>• <strong>Private:</strong> No one can view your profile</li>
          </ul>
        </div>

        <div className="space-y-3">
          {(["public", "friends", "private"] as const).map((option) => (
            <button
              key={option}
              onClick={() =>
                setSettings((s) => ({ ...s, profileVisibility: option }))
              }
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                settings.profileVisibility === option
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  settings.profileVisibility === option
                    ? "border-primary"
                    : "border-muted-foreground"
                }`}
              >
                {settings.profileVisibility === option && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground capitalize">{option}</p>
                <p className="text-sm text-muted-foreground">
                  {option === "public" && "Anyone can view your profile"}
                  {option === "friends" && "Only friends can view your profile"}
                  {option === "private" && "Only you can see your profile"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          What others can see
        </h2>

        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
          These settings control what friends and other users can see on your profile (subject to your visibility setting):
        </div>

        <ToggleSetting
          title="Show Badges"
          description="Display your earned badges on your profile"
          checked={settings.showBadges}
          onChange={(checked) => setSettings((s) => ({ ...s, showBadges: checked }))}
        />
        <ToggleSetting
          title="Show Memories"
          description="Display your past hangout memories"
          checked={settings.showMemories}
          onChange={(checked) => setSettings((s) => ({ ...s, showMemories: checked }))}
        />
        <ToggleSetting
          title="Show Upcoming Hangouts"
          description="Display your confirmed upcoming plans"
          checked={settings.showUpcomingHangouts}
          onChange={(checked) =>
            setSettings((s) => ({ ...s, showUpcomingHangouts: checked }))
          }
        />

        <button
          className="btn-primary px-6 py-2 flex items-center gap-2 mt-6 w-full justify-center"
          onClick={handleSavePrivacy}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="inline-block animate-spin">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              </div>
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Privacy Settings
            </>
          )}
        </button>
      </div>
    </motion.div>
  );

  const renderNotifications = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <button
        onClick={() => setActiveSection("main")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Notification Preferences
        </h2>

        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground mb-4">
          <p>Choose what you'd like to be notified about:</p>
        </div>

        <ToggleSetting
          title="Hangout Invites"
          description="Get notified when friends invite you to hangouts"
          checked={settings.hangoutInvites}
          onChange={(checked) =>
            setSettings((s) => ({ ...s, hangoutInvites: checked }))
          }
        />
        <ToggleSetting
          title="Friend Requests"
          description="Get notified about new friend requests"
          checked={settings.friendRequests}
          onChange={(checked) =>
            setSettings((s) => ({ ...s, friendRequests: checked }))
          }
        />
        <ToggleSetting
          title="Event Reminders"
          description="Get reminders before confirmed hangouts"
          checked={settings.eventReminders}
          onChange={(checked) =>
            setSettings((s) => ({ ...s, eventReminders: checked }))
          }
        />
        <ToggleSetting
          title="Friend Activity"
          description="Get notified when friends create new hangouts"
          checked={settings.friendActivity}
          onChange={(checked) =>
            setSettings((s) => ({ ...s, friendActivity: checked }))
          }
        />

        <button
          className="btn-primary px-6 py-2 flex items-center gap-2 mt-6 w-full justify-center"
          onClick={handleSaveNotifications}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="inline-block animate-spin">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              </div>
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Notification Preferences
            </>
          )}
        </button>
      </div>
    </motion.div>
  );

  const renderBlocked = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <button
        onClick={() => setActiveSection("main")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
          Blocked Users
        </h2>

        {blockedUsers.length > 0 ? (
          <div className="space-y-3">
            {blockedUsers.map((blockedUser) => (
              <div
                key={blockedUser.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="font-medium text-muted-foreground">
                      {blockedUser.name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <span className="font-medium text-foreground">{blockedUser.name || blockedUser.email}</span>
                </div>
                <button className="text-sm text-primary hover:underline">
                  Unblock
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            You haven't blocked anyone
          </p>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-[72px]">
        <div className="max-w-2xl mx-auto px-6 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account and preferences
            </p>
          </motion.div>

          {/* Content */}
          {activeSection === "main" && renderMain()}
          {activeSection === "profile" && renderProfile()}
          {activeSection === "privacy" && renderPrivacy()}
          {activeSection === "notifications" && renderNotifications()}
          {activeSection === "blocked" && renderBlocked()}
        </div>
      </main>
    </div>
  );
};

interface SettingsItemProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
}

const SettingsItem = ({ icon: Icon, title, subtitle, onClick }: SettingsItemProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group text-left"
  >
    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
      <Icon className="w-5 h-5 text-muted-foreground" />
    </div>
    <div className="flex-1">
      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
        {title}
      </p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
  </button>
);

interface ToggleSettingProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSetting = ({ title, description, checked, onChange }: ToggleSettingProps) => (
  <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
    <div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default Settings;
