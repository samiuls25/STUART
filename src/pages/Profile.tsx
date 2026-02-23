import { useState, useEffect } from "react";
import React from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Settings,
  LogOut,
  Heart,
  Users,
  Calendar,
  ChevronRight,
  Trophy,
  Camera,
  Sparkles,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import AuthModal from "../components/auth/AuthModal";
import BadgeCard from "../components/profile/BadgeCard";
import MemoryCard from "../components/profile/MemoryCard";
import EditProfileModal from "../components/profile/EditProfileModal";
import { groups } from "../data/groups";
import { badges as localBadges, badgeDefinitions, memories as localMemories } from "../data/badges";
// ...existing code...
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { getFriends } from "../lib/friends";
import { getSavedEventIds } from "../lib/SavedEvents";

type TabType = "overview" | "badges" | "memories";

const Profile = () => {
  const navigate = useNavigate();
  // All hooks must be called at the top level, before any early returns
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [editing, setEditing] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [groupsCount, setGroupsCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [badges, setBadges] = useState(localBadges);
  const [memoriesState, setMemoriesState] = useState(localMemories);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [loadingMemories, setLoadingMemories] = useState(false);
  
  const { user, loading, signOut } = useAuth();

  // useEffect MUST be called before any early returns to maintain consistent hook order
  useEffect(() => {
    if (!user) return;
    
    let mounted = true;

    const fetchBadges = async () => {
      setLoadingBadges(true);
      try {
        const { data, error } = await supabase.from("badges").select("*");
        if (!error && data && mounted) setBadges(data as any);
      } catch (err) {
        setBadges([]);
        console.warn("Failed to fetch badges, using empty data", err);
      } finally {
        if (mounted) setLoadingBadges(false);
      }
    };

    const fetchMemories = async () => {
      setLoadingMemories(true);
      try {
        const { data, error } = await supabase.from("memories").select("*");
        if (!error && data && mounted) setMemoriesState(data as any);
      } catch (err) {
        setMemoriesState([]);
        console.warn("Failed to fetch memories, using empty data", err);
      } finally {
        if (mounted) setLoadingMemories(false);
      }
    };

    const fetchCounts = async () => {
      try {
        const friends = await getFriends();
        if (mounted) setFriendsCount(friends.length);

        const saved = await getSavedEventIds();
        if (mounted) setSavedCount(saved.length);

        // Fetch groups for user
        const { data: groups, error } = await supabase
          .from("groups")
          .select("id")
          .eq("owner_id", user.id);
        if (!error && groups && mounted) setGroupsCount(groups.length);
        else if (mounted) setGroupsCount(0);
      } catch (err) {
        if (mounted) setGroupsCount(0);
        console.warn("Failed to fetch counts", err);
      }
    };

    fetchBadges();
    fetchMemories();
    fetchCounts();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Early returns for loading and unauthenticated states
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-[72px]">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="bg-card rounded-2xl border border-border p-6 mb-6 animate-pulse">
              <div className="h-6 bg-muted rounded w-48 mb-4" />
              <div className="h-3 bg-muted rounded w-32 mb-2" />
              <div className="h-2 bg-muted rounded w-full mt-4" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-[72px]">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="bg-card rounded-2xl border border-border p-6 mb-6 text-center">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-2">You're not signed in</h2>
              <p className="text-sm text-muted-foreground mb-4">Sign in to view and edit your profile, badges, and memories.</p>
              <button onClick={() => setShowAuth(true)} className="btn-primary px-4 py-2">Sign In</button>
            </div>
          </div>
        </main>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  // Derive display fields from Supabase user metadata with safe fallbacks
  const displayName =
    (user as any)?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : "Your Name");
  const avatar = (user as any)?.user_metadata?.avatar_url ?? null;
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleString(undefined, { month: "long", year: "numeric" })
    : "Member";
  const xp = Number((user as any)?.user_metadata?.xp ?? 0);
  const level = Number((user as any)?.user_metadata?.level ?? 1);
  const nextLevelXp = Number((user as any)?.user_metadata?.nextLevelXp ?? (level + 1) * 500);

  const hangoutsCount = memoriesState.length;

  const unlockedBadges = badges.filter((b) => b.unlocked);
  const topBadges = unlockedBadges.slice(0, 3);
  
  // Get locked badges - badge definitions that user hasn't earned
  const earnedBadgeIds = new Set(badges.map((b) => b.id));
  const lockedBadges = badgeDefinitions.filter((def) => !earnedBadgeIds.has(def.id));

  const handleSignOut = async () => {
    try {
      await signOut();
      // Optionally navigate away here if you have a router history push
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-[72px]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card rounded-2xl border border-border p-6 mb-6"
          >
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt={displayName} className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    <span className="font-heading text-3xl font-bold text-primary">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Level Badge */}
                <div className="absolute -bottom-2 -right-2 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg">
                  Lvl {level}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-heading text-2xl font-bold text-foreground">{displayName}</h1>
                  {/* Top Badges Preview */}
                  <div className="flex gap-1">
                    {topBadges.map((badge) => (
                      <span key={badge.id} className="text-lg" title={badge.name}>
                        {badge.icon}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground break-all">{user?.email ?? "No email"}</p>
                <p className="text-sm text-muted-foreground mt-1">Member since {joinedDate}</p>

                {/* XP Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {xp} XP
                    </span>
                    <span>
                      {Math.max(0, nextLevelXp - xp)} XP to Level {level + 1}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (xp / Math.max(1, nextLevelXp)) * 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <>
                  <button onClick={() => setEditing(true)} className="btn-primary py-2 px-3 flex items-center gap-2" disabled={!user}>
                    <User className="w-4 h-4" />
                    <span>{user ? "Edit" : "Sign In"}</span>
                  </button>
                  <button onClick={() => user ? navigate("/settings") : setShowAuth(true)} className="btn-secondary py-2 px-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                  </button>
                </>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{hangoutsCount}</p>
                <p className="text-sm text-muted-foreground">Hangouts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{savedCount}</p>
                <p className="text-sm text-muted-foreground">Saved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{groupsCount}</p>
                <p className="text-sm text-muted-foreground">Groups</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{friendsCount}</p>
                <p className="text-sm text-muted-foreground">Friends</p>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { id: "overview" as TabType, label: "Overview", icon: User },
              { id: "badges" as TabType, label: "Badges", icon: Trophy },
              { id: "memories" as TabType, label: "Memories", icon: Camera },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Featured Badges */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      Your Badges
                    </h2>
                    <button onClick={() => setActiveTab("badges")} className="text-sm text-primary hover:underline">
                      View all →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unlockedBadges.map((badge) => (
                      <BadgeCard key={badge.id} badge={badge} compact />
                    ))}
                  </div>
                </div>

                {/* Recent Memories */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                      <Camera className="w-5 h-5 text-primary" />
                      Recent Memories
                    </h2>
                    <button onClick={() => setActiveTab("memories")} className="text-sm text-primary hover:underline">
                      View all →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loadingMemories ? (
                      <div className="col-span-1 md:col-span-2 py-6 text-center text-sm text-muted-foreground">Loading memories…</div>
                    ) : (
                      memoriesState.slice(0, 2).map((memory) => (
                        <MemoryCard key={memory.id} memory={memory} />
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Links */}
                <div className="space-y-3">
                  <ProfileLink to="/saved" icon={Heart} title="Saved Events" subtitle={`${savedCount} events saved`} />
                  <ProfileLink to="/friends" icon={Users} title="Your Friends" subtitle={`${friendsCount} friends`} />
                  <ProfileLink to="/hangouts" icon={Calendar} title="Your Hangouts" subtitle="Plan and manage hangouts" />
                </div>

                {/* Sign Out */}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            )}

            {activeTab === "badges" && (
              <div className="space-y-6">
                {/* Unlocked Badges */}
                <div>
                  <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Unlocked ({unlockedBadges.length})
                  </h2>
                  {unlockedBadges.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {unlockedBadges.map((badge, index) => (
                        <motion.div key={badge.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                          <BadgeCard badge={badge} />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No badges earned yet. Start attending hangouts to unlock badges!</p>
                  )}
                </div>

                {/* Locked Badges */}
                {lockedBadges.length > 0 && (
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-muted-foreground mb-4">Locked ({lockedBadges.length})</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {lockedBadges.map((badgeDef, index) => (
                        <motion.div 
                          key={badgeDef.id} 
                          initial={{ opacity: 0, y: 20 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ delay: index * 0.05 }}
                        >
                          <BadgeCard 
                            badge={{
                              ...badgeDef,
                              level: 0,
                              progress: 0,
                              unlocked: false,
                            }} 
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "memories" && (
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Past Hangouts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loadingMemories ? (
                    <div className="col-span-1 md:col-span-2 py-6 text-center text-sm text-muted-foreground">Loading memories…</div>
                  ) : (
                    memoriesState.map((memory, index) => (
                      <motion.div key={memory.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                        <MemoryCard memory={memory} />
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <EditProfileModal isOpen={editing} onClose={() => setEditing(false)} />
    </div>
  );
};

interface ProfileLinkProps {
  to: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}

const ProfileLink = ({ to, icon: Icon, title, subtitle }: ProfileLinkProps) => {
  return (
    <Link to={to} className="flex items-center gap-4 bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:bg-card-hover transition-all group">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
};

export default Profile;