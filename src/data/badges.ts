export interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    category: "social" | "explorer" | "vibe" | "special";
    level: number;
    maxLevel: number;
    progress: number;
    unlocked: boolean;
    unlockedAt?: string;
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
  
  export const badges: Badge[] = [
    {
      id: "night-pulse",
      name: "Night Pulse",
      icon: "🌙",
      description: "For those who thrive after dark",
      category: "vibe",
      level: 2,
      maxLevel: 5,
      progress: 65,
      unlocked: true,
      unlockedAt: "Dec 2024",
    },
    {
      id: "urban-explorer",
      name: "Urban Explorer",
      icon: "🏙️",
      description: "Discovering hidden city gems",
      category: "explorer",
      level: 3,
      maxLevel: 5,
      progress: 80,
      unlocked: true,
      unlockedAt: "Nov 2024",
    },
    {
      id: "sunlit-lounger",
      name: "Sunlit Lounger",
      icon: "☀️",
      description: "Parks, patios, and perfect weather",
      category: "vibe",
      level: 1,
      maxLevel: 5,
      progress: 40,
      unlocked: true,
      unlockedAt: "Dec 2024",
    },
    {
      id: "whimsical-wanderer",
      name: "Whimsical Wanderer",
      icon: "🦋",
      description: "Embracing spontaneous adventures",
      category: "explorer",
      level: 2,
      maxLevel: 5,
      progress: 55,
      unlocked: true,
      unlockedAt: "Oct 2024",
    },
    {
      id: "social-butterfly",
      name: "Social Butterfly",
      icon: "🎉",
      description: "Always bringing friends together",
      category: "social",
      level: 4,
      maxLevel: 5,
      progress: 90,
      unlocked: true,
      unlockedAt: "Sep 2024",
    },
    {
      id: "culture-vulture",
      name: "Culture Vulture",
      icon: "🎭",
      description: "Museums, galleries, and performances",
      category: "explorer",
      level: 1,
      maxLevel: 5,
      progress: 25,
      unlocked: true,
      unlockedAt: "Dec 2024",
    },
    {
      id: "early-bird",
      name: "Early Bird",
      icon: "🌅",
      description: "Morning coffee runs and sunrise walks",
      category: "vibe",
      level: 0,
      maxLevel: 5,
      progress: 15,
      unlocked: false,
    },
    {
      id: "group-guru",
      name: "Group Guru",
      icon: "👥",
      description: "Master of coordinating hangouts",
      category: "social",
      level: 0,
      maxLevel: 5,
      progress: 30,
      unlocked: false,
    },
  ];
  
  export const memories: Memory[] = [
    {
      id: "1",
      eventName: "Jazz Night at Blue Note",
      location: "Greenwich Village",
      date: "Dec 15, 2024",
      time: "9:00 PM",
      heroImage: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80",
      attendees: [
        { id: "1", name: "Sarah M." },
        { id: "2", name: "Mike T." },
        { id: "3", name: "Emma L." },
      ],
      photos: [
        { id: "1", url: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&q=80", uploadedBy: "Sarah M.", uploadedAt: "Dec 15" },
        { id: "2", url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&q=80", uploadedBy: "Mike T.", uploadedAt: "Dec 15" },
      ],
    },
    {
      id: "2",
      eventName: "Central Park Picnic",
      location: "Central Park",
      date: "Dec 10, 2024",
      time: "2:00 PM",
      heroImage: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&q=80",
      attendees: [
        { id: "1", name: "Sarah M." },
        { id: "4", name: "Alex K." },
      ],
      photos: [
        { id: "3", url: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=400&q=80", uploadedBy: "Alex K.", uploadedAt: "Dec 10" },
      ],
    },
    {
      id: "3",
      eventName: "Comedy Cellar Night",
      location: "Greenwich Village",
      date: "Dec 5, 2024",
      time: "8:30 PM",
      heroImage: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800&q=80",
      attendees: [
        { id: "2", name: "Mike T." },
        { id: "3", name: "Emma L." },
        { id: "5", name: "Jordan P." },
        { id: "6", name: "Chris R." },
      ],
      photos: [
        { id: "4", url: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=400&q=80", uploadedBy: "Emma L.", uploadedAt: "Dec 5" },
        { id: "5", url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&q=80", uploadedBy: "Jordan P.", uploadedAt: "Dec 5" },
        { id: "6", url: "https://images.unsplash.com/photo-1485178575877-1a13bf489dfe?w=400&q=80", uploadedBy: "Chris R.", uploadedAt: "Dec 6" },
      ],
    },
  ];
  