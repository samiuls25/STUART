export interface BadgeDefinition {
    id: string;
    name: string;
    icon: string;
    description: string;
    category: "social" | "explorer" | "vibe" | "special";
    maxLevel: number;
  }

  /** Live breakdown shown in the badge detail dialog (not persisted). */
  export interface BadgeContribution {
    label: string;
    value: number;
  }

  export interface Badge extends BadgeDefinition {
    level: number;
    progress: number;
    unlocked: boolean;
    unlockedAt?: string;
    /** How this badge is calculated (short explainer). */
    contributorHint?: string;
    /** Counts that feed into this badge right now. */
    contributions?: BadgeContribution[];
  }
  
  export interface Memory {
    id: string;
    eventName: string;
    location: string;
    date: string;
    time: string;
    attendees: Attendee[];
    photos: Photo[];
    heroImage: string;
  }
  
  export interface Attendee {
    id: string;
    name: string;
    avatar?: string;
  }
  
  export interface Photo {
    id: string;
    url: string;
    uploadedBy: string;
    uploadedAt: string;
  }
  
  export const badgeDefinitions: BadgeDefinition[] = [
    {
      id: "night-pulse",
      name: "Night Pulse",
      icon: "🌙",
      description: "For those who thrive after dark",
      category: "vibe",
      maxLevel: 5,
    },
    {
      id: "urban-explorer",
      name: "Urban Explorer",
      icon: "🏙️",
      description: "Discovering hidden city gems",
      category: "explorer",
      maxLevel: 5,
    },
    {
      id: "sunlit-lounger",
      name: "Sunlit Lounger",
      icon: "☀️",
      description: "Parks, patios, and perfect weather",
      category: "vibe",
      maxLevel: 5,
    },
    {
      id: "whimsical-wanderer",
      name: "Whimsical Wanderer",
      icon: "🦋",
      description: "Embracing spontaneous adventures",
      category: "explorer",
      maxLevel: 5,
    },
    {
      id: "social-butterfly",
      name: "Social Butterfly",
      icon: "🎉",
      description: "Always bringing friends together",
      category: "social",
      maxLevel: 5,
    },
    {
      id: "culture-vulture",
      name: "Culture Vulture",
      icon: "🎭",
      description: "Museums, galleries, and performances",
      category: "explorer",
      maxLevel: 5,
    },
    {
      id: "early-bird",
      name: "Early Bird",
      icon: "🌅",
      description: "Morning coffee runs and sunrise walks",
      category: "vibe",
      maxLevel: 5,
    },
    {
      id: "group-guru",
      name: "Group Guru",
      icon: "👥",
      description: "Master of coordinating hangouts",
      category: "social",
      maxLevel: 5,
    },
    {
      id: "memory-archivist",
      name: "Memory Archivist",
      icon: "📔",
      description: "Creating memories from your nights out",
      category: "special",
      maxLevel: 5,
    },
    {
      id: "memory-circle",
      name: "Memory Circle",
      icon: "📸",
      description: "Showing up in saved memories (yours and shared)",
      category: "social",
      maxLevel: 5,
    },
    {
      id: "friend-circle",
      name: "Friend Circle",
      icon: "🤝",
      description: "Growing your crew on STUART",
      category: "social",
      maxLevel: 5,
    },
    {
      id: "invite-all-star",
      name: "Invite All-Star",
      icon: "✉️",
      description: "Joining hangouts other people started",
      category: "social",
      maxLevel: 5,
    },
    {
      id: "saved-spotlight",
      name: "Saved Spotlight",
      icon: "⭐",
      description: "Curating events you save for later",
      category: "explorer",
      maxLevel: 5,
    },
  ];

  // User's earned badges - starts empty, populated based on user participation
  export const badges: Badge[] = [];
  
  export const memories: Memory[] = [];
  