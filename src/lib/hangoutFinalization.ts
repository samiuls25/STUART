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
  durationMinutes: number;
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

const parseTimeToMinutes = (time: string) => {
  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
};

const intersectSets = (base: Set<string>, candidate: Set<string>) => {
  const next = new Set<string>();
  base.forEach((id) => {
    if (candidate.has(id)) {
      next.add(id);
    }
  });
  return next;
};

const compareSlots = (a: SlotAggregate, b: SlotAggregate) => {
  if (b.votes !== a.votes) return b.votes - a.votes;
  if (b.durationMinutes !== a.durationMinutes) return b.durationMinutes - a.durationMinutes;
  if (b.preferredVotes !== a.preferredVotes) return b.preferredVotes - a.preferredVotes;
  if (b.weight !== a.weight) return b.weight - a.weight;
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
  return a.endTime.localeCompare(b.endTime);
};

export function scoreAvailabilitySlots(participants: ParticipantAvailability[]): SlotAggregate[] {
  const activeParticipants = participants.filter((participant) => participant.status !== "no");
  const slotMap = new Map<string, {
    date: string;
    startTime: string;
    endTime: string;
    startMinutes: number;
    endMinutes: number;
    participantPreferences: Map<string, AvailabilityPreference>;
  }>();

  activeParticipants.forEach((participant) => {
    (participant.availabilitySubmitted || []).forEach((slot) => {
      const { date, time: startTime } = extractDateTime(slot.start);
      const { time: endTime } = extractDateTime(slot.end);

      const startMinutes = parseTimeToMinutes(startTime);
      const endMinutes = parseTimeToMinutes(endTime);

      if (!date || !startTime || !endTime || startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return;
      }

      const key = buildSlotKey(date, startTime, endTime);
      const existing = slotMap.get(key) || {
        date,
        startTime,
        endTime,
        startMinutes,
        endMinutes,
        participantPreferences: new Map<string, AvailabilityPreference>(),
      };

      const currentPreference = existing.participantPreferences.get(participant.friendId);
      const incomingWeight = PREFERENCE_WEIGHT[slot.preference] || 0;
      const currentWeight = currentPreference ? (PREFERENCE_WEIGHT[currentPreference] || 0) : 0;
      if (!currentPreference || incomingWeight > currentWeight) {
        existing.participantPreferences.set(participant.friendId, slot.preference);
      }

      slotMap.set(key, existing);
    });
  });

  const slotsByDate = new Map<string, Array<{
    date: string;
    startTime: string;
    endTime: string;
    startMinutes: number;
    endMinutes: number;
    participantPreferences: Map<string, AvailabilityPreference>;
  }>>();

  slotMap.forEach((slot) => {
    const list = slotsByDate.get(slot.date) || [];
    list.push(slot);
    slotsByDate.set(slot.date, list);
  });

  const rankedWindows: SlotAggregate[] = [];

  slotsByDate.forEach((dateSlots, date) => {
    const orderedSlots = [...dateSlots].sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return a.endMinutes - b.endMinutes;
    });

    for (let startIndex = 0; startIndex < orderedSlots.length; startIndex += 1) {
      const firstSlot = orderedSlots[startIndex];
      let participantIds = new Set(firstSlot.participantPreferences.keys());
      let preferredIds = new Set(
        [...firstSlot.participantPreferences.entries()]
          .filter(([, preference]) => preference === "preferred")
          .map(([friendId]) => friendId)
      );
      let availableIds = new Set(
        [...firstSlot.participantPreferences.entries()]
          .filter(([, preference]) => preference !== "if-needed")
          .map(([friendId]) => friendId)
      );

      let endTime = firstSlot.endTime;
      let endMinutes = firstSlot.endMinutes;
      let durationMinutes = firstSlot.endMinutes - firstSlot.startMinutes;

      for (let endIndex = startIndex; endIndex < orderedSlots.length; endIndex += 1) {
        if (endIndex > startIndex) {
          const candidateSlot = orderedSlots[endIndex];

          // Build only uninterrupted windows (e.g. 6-7, 7-8, 8-9).
          if (candidateSlot.startMinutes !== endMinutes) {
            break;
          }

          participantIds = intersectSets(participantIds, new Set(candidateSlot.participantPreferences.keys()));

          preferredIds = intersectSets(
            preferredIds,
            new Set(
              [...candidateSlot.participantPreferences.entries()]
                .filter(([, preference]) => preference === "preferred")
                .map(([friendId]) => friendId)
            )
          );

          availableIds = intersectSets(
            availableIds,
            new Set(
              [...candidateSlot.participantPreferences.entries()]
                .filter(([, preference]) => preference !== "if-needed")
                .map(([friendId]) => friendId)
            )
          );

          endTime = candidateSlot.endTime;
          durationMinutes += candidateSlot.endMinutes - candidateSlot.startMinutes;
          endMinutes = candidateSlot.endMinutes;
        }

        const votes = participantIds.size;
        if (votes === 0) {
          break;
        }

        const preferredVotes = preferredIds.size;
        const availableVotes = Math.min(availableIds.size, votes);
        const ifNeededVotes = Math.max(0, votes - availableVotes);
        const weight = (votes * durationMinutes) + (preferredVotes * 20) + (availableVotes * 10);

        rankedWindows.push({
          key: buildSlotKey(date, firstSlot.startTime, endTime),
          date,
          startTime: firstSlot.startTime,
          endTime,
          votes,
          preferredVotes,
          availableVotes,
          ifNeededVotes,
          weight,
          durationMinutes,
        });
      }
    }
  });

  return rankedWindows.sort(compareSlots);
}

export function suggestBestTimeSlot(participants: ParticipantAvailability[]): SlotAggregate | null {
  const ranked = scoreAvailabilitySlots(participants);
  if (ranked.length === 0) {
    return null;
  }
  return ranked[0];
}

export type { ParticipantAvailability, SlotAggregate };
