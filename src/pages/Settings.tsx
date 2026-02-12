import React from   "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";    
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
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { friends } from "../data/friends";

type SettingsSection = "main" | "profile" | "privacy" | "notifications" | "blocked";

const Settings = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>("main");

  // Mock settings state
  const [settings, setSettings] = useState({
    // Profile
    name: "Alex Johnson",
    email: "alex@example.com",
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
    darkMode: false,
  });

  const blockedFriends = friends.filter((f) => f.isBlocked);

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
        subtitle={`${blockedFriends.length} blocked`}
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

        <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl text-destructive hover:bg-destructive/10 transition-colors">
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

        <button className="btn-primary px-6 py-2">Save Changes</button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
          Danger Zone
        </h2>
        <button className="flex items-center gap-2 text-destructive hover:underline">
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>
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

        {blockedFriends.length > 0 ? (
          <div className="space-y-3">
            {blockedFriends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="font-medium text-muted-foreground">
                      {friend.name.charAt(0)}
                    </span>
                  </div>
                  <span className="font-medium text-foreground">{friend.name}</span>
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
