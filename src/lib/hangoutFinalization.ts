import { TimeRange } from "../data/friends";

type AvailabilityPreference = TimeRange["preference"];

interface ParticipantAvailability {
  friendId: string;
  status: "invited" | "yes" | "no" | "maybe" | "pending-availability";
  availabilitySubmitted?: TimeRange[];
}

interface SlotAggregate {
  key: string;
  date: string;
  startTime: string;
  endTime: string;
  votes: number;
  preferredVotes: number;
  availableVotes: number;
  ifNeededVotes: number;
  weight: number;
}

const PREFERENCE_WEIGHT: Record<AvailabilityPreference, number> = {
  preferred: 3,
  available: 2,
  "if-needed": 1,
};

const extractDateTime = (isoDateTime: string) => {
  const [date, timeWithSeconds] = isoDateTime.split("T");
  const time = (timeWithSeconds || "").slice(0, 5);
  return { date: date || "", time };
};

const buildSlotKey = (date: string, startTime: string, endTime: string) =>
  `${date}|${startTime}|${endTime}`;

const compareSlots = (a: SlotAggregate, b: SlotAggregate) => {
  if (b.weight !== a.weight) return b.weight - a.weight;
  if (b.preferredVotes !== a.preferredVotes) return b.preferredVotes - a.preferredVotes;
  if (b.votes !== a.votes) return b.votes - a.votes;
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
  return a.endTime.localeCompare(b.endTime);
};

export function scoreAvailabilitySlots(participants: ParticipantAvailability[]): SlotAggregate[] {
  const activeParticipants = participants.filter((participant) => participant.status !== "no");
  const slotMap = new Map<string, SlotAggregate>();

  activeParticipants.forEach((participant) => {
    (participant.availabilitySubmitted || []).forEach((slot) => {
      const { date, time: startTime } = extractDateTime(slot.start);
      const { time: endTime } = extractDateTime(slot.end);

      if (!date || !startTime || !endTime) {
        return;
      }

      const key = buildSlotKey(date, startTime, endTime);
      const existing = slotMap.get(key) || {
        key,
        date,
        startTime,
        endTime,
        votes: 0,
        preferredVotes: 0,
        availableVotes: 0,
        ifNeededVotes: 0,
        weight: 0,
      };

      existing.votes += 1;
      existing.weight += PREFERENCE_WEIGHT[slot.preference] || 0;

      if (slot.preference === "preferred") {
        existing.preferredVotes += 1;
      } else if (slot.preference === "available") {
        existing.availableVotes += 1;
      } else if (slot.preference === "if-needed") {
        existing.ifNeededVotes += 1;
      }

      slotMap.set(key, existing);
    });
  });

  return [...slotMap.values()].sort(compareSlots);
}

export function suggestBestTimeSlot(participants: ParticipantAvailability[]): SlotAggregate | null {
  const ranked = scoreAvailabilitySlots(participants);
  if (ranked.length === 0) {
    return null;
  }
  return ranked[0];
}

export type { ParticipantAvailability, SlotAggregate };
