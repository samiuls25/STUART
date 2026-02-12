import { useState } from "react";
import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
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
import BadgeCard from "../components/profile/BadgeCard";
import MemoryCard from "../components/profile/MemoryCard";
import { groups } from "../data/groups";
import { badges, memories } from "../data/badges";

// Mock user data
const user = {
  name: "Alex Johnson",
  email: "alex@example.com",
  avatar: null,
  joinedDate: "December 2024",
  savedCount: 4,
  groupsCount: groups.length,
  friendsCount: 12,
  hangoutsCount: memories.length,
  level: 7,
  xp: 2450,
  nextLevelXp: 3000,
};

type TabType = "overview" | "badges" | "memories";

const Profile = () => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const unlockedBadges = badges.filter((b) => b.unlocked);
  const topBadges = unlockedBadges.slice(0, 3);

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
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    <span className="font-heading text-3xl font-bold text-primary">
                      {user.name.charAt(0)}
                    </span>
                  )}
                </div>
                {/* Level Badge */}
                <div className="absolute -bottom-2 -right-2 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg">
                  Lvl {user.level}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-heading text-2xl font-bold text-foreground">
                    {user.name}
                  </h1>
                  {/* Top Badges Preview */}
                  <div className="flex gap-1">
                    {topBadges.map((badge) => (
                      <span key={badge.id} className="text-lg" title={badge.name}>
                        {badge.icon}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Member since {user.joinedDate}
                </p>

                {/* XP Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {user.xp} XP
                    </span>
                    <span>{user.nextLevelXp - user.xp} XP to Level {user.level + 1}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(user.xp / user.nextLevelXp) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    />
                  </div>
                </div>
              </div>

              <button className="btn-secondary py-2 px-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{user.hangoutsCount}</p>
                <p className="text-sm text-muted-foreground">Hangouts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{user.savedCount}</p>
                <p className="text-sm text-muted-foreground">Saved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{user.groupsCount}</p>
                <p className="text-sm text-muted-foreground">Groups</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{user.friendsCount}</p>
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
                    <button
                      onClick={() => setActiveTab("badges")}
                      className="text-sm text-primary hover:underline"
                    >
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
                    <button
                      onClick={() => setActiveTab("memories")}
                      className="text-sm text-primary hover:underline"
                    >
                      View all →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {memories.slice(0, 2).map((memory) => (
                      <MemoryCard key={memory.id} memory={memory} />
                    ))}
                  </div>
                </div>

                {/* Quick Links */}
                <div className="space-y-3">
                  <ProfileLink
                    to="/saved"
                    icon={Heart}
                    title="Saved Events"
                    subtitle={`${user.savedCount} events saved`}
                  />
                  <ProfileLink
                    to="/friends"
                    icon={Users}
                    title="Your Friends"
                    subtitle={`${user.friendsCount} friends`}
                  />
                  <ProfileLink
                    to="/hangouts"
                    icon={Calendar}
                    title="Your Hangouts"
                    subtitle="Plan and manage hangouts"
                  />
                </div>

                {/* Sign Out */}
                <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors">
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {unlockedBadges.map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <BadgeCard badge={badge} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Locked Badges */}
                <div>
                  <h2 className="font-heading text-lg font-semibold text-muted-foreground mb-4">
                    Coming Soon
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {badges
                      .filter((b) => !b.unlocked)
                      .map((badge, index) => (
                        <motion.div
                          key={badge.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <BadgeCard badge={badge} />
                        </motion.div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "memories" && (
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Past Hangouts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {memories.map((memory, index) => (
                    <motion.div
                      key={memory.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <MemoryCard memory={memory} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
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
    <Link
      to={to}
      className="flex items-center gap-4 bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:bg-card-hover transition-all group"
    >
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
};

export default Profile;
