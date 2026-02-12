export interface Member {
    id: string;
    name: string;
    avatar?: string;
  }
  
  export interface SuggestedEvent {
    eventId: string;
    suggestedBy: string;
    votes: number;
  }
  
  export interface Group {
    id: string;
    name: string;
    description: string;
    emoji: string;
    color: string;
    members: Member[];
    suggestedEvents: SuggestedEvent[];
  }
  
  export const groups: Group[] = [
    {
      id: "1",
      name: "Weekend Warriors",
      description: "Friends who explore NYC every weekend",
      emoji: "🎉",
      color: "#004369",
      members: [
        { id: "1", name: "Alex" },
        { id: "2", name: "Jordan" },
        { id: "3", name: "Sam" },
        { id: "4", name: "Riley" },
      ],
      suggestedEvents: [
        { eventId: "1", suggestedBy: "Alex", votes: 3 },
        { eventId: "4", suggestedBy: "Jordan", votes: 2 },
      ],
    },
    {
      id: "2",
      name: "Jazz & Chill",
      description: "Live music lovers",
      emoji: "🎷",
      color: "#2D9596",
      members: [
        { id: "1", name: "Alex" },
        { id: "5", name: "Morgan" },
      ],
      suggestedEvents: [
        { eventId: "11", suggestedBy: "Morgan", votes: 2 },
      ],
    },
    {
      id: "3",
      name: "Work Squad",
      description: "Team outings and happy hours",
      emoji: "💼",
      color: "#E07C24",
      members: [
        { id: "1", name: "Alex" },
        { id: "6", name: "Taylor" },
        { id: "7", name: "Casey" },
        { id: "8", name: "Drew" },
        { id: "9", name: "Quinn" },
      ],
      suggestedEvents: [],
    },
  ];