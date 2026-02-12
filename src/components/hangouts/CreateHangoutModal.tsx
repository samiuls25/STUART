import React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, UserPlus, Search, Check, Clock, MapPin, Calendar, Users, Sparkles, AlertCircle } from "lucide-react";
import { friends, activityTypes, Friend, Hangout, TimeRange } from "../../data/friends";
import { Input } from ".././ui/input";
import { Textarea } from ".././ui/textarea";
import { Switch } from ".././ui/switch";
import AvailabilityHeatmap from ".././availability/AvailabilityHeatmap.tsx";

interface CreateHangoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (hangout: Partial<Hangout>) => void;
}

const CreateHangoutModal = ({ isOpen, onClose, onCreate }: CreateHangoutModalProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState<string>("chill");
  const [schedulingMode, setSchedulingMode] = useState<"set" | "heatmap">("set");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [heatmapSlots, setHeatmapSlots] = useState<Record<string, number>>({});
  const [locationName, setLocationName] = useState("");
  const [isFlexibleLocation, setIsFlexibleLocation] = useState(true);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [highlightedFriends, setHighlightedFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFriends = friends.filter(
    (f) =>
      !f.isBlocked &&
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
    // Remove from highlighted if deselected
    if (selectedFriends.includes(id)) {
      setHighlightedFriends((prev) => prev.filter((f) => f !== id));
    }
  };

  const toggleHighlight = (id: string) => {
    if (!selectedFriends.includes(id)) return;
    setHighlightedFriends((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    const hangout: Partial<Hangout> = {
      title,
      description,
      activityType: activityType as Hangout["activityType"],
      proposedTimeRange: {
        date,
        startTime,
        endTime,
      },
      location: locationName
        ? {
            name: locationName,
            isFlexible: isFlexibleLocation,
          }
        : undefined,
      invitedFriends: selectedFriends,
      highlightedFriends,
      status: "pending",
    };
    onCreate?.(hangout);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setActivityType("chill");
    setSchedulingMode("set");
    setDate("");
    setStartTime("");
    setEndTime("");
    setHeatmapSlots({});
    setLocationName("");
    setIsFlexibleLocation(true);
    setSelectedFriends([]);
    setHighlightedFriends([]);
    setSearchQuery("");
  };

  const toggleHeatmapSlot = (key: string) => {
    setHeatmapSlots((prev) => {
      const current = prev[key] || 0;
      if (current === 0) return { ...prev, [key]: 1 };
      return { ...prev, [key]: 0 };
    });
  };

  const canProceedStep1 = title.trim() && activityType;
  const canProceedStep2 = schedulingMode === "heatmap"
    ? (date && Object.values(heatmapSlots).some((v) => v > 0))
    : (date && startTime && endTime);
  const canCreate = selectedFriends.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal Container - centering wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg max-h-[85vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">Create Hangout</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Step {step} of 3</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-1 px-6 py-3">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Activity Details */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        What's the plan?
                      </label>
                      <Input
                        placeholder="e.g., Coffee catch-up, Park walk, Game night..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Description (optional)
                      </label>
                      <Textarea
                        placeholder="Add some details about the hangout..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        Activity type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {activityTypes.map((type) => (
                          <button
                            key={type.id}
                            onClick={() => setActivityType(type.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              activityType === type.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/30"
                            }`}
                          >
                            <span className="text-xl">{type.icon}</span>
                            <span className="text-sm font-medium text-foreground">
                              {type.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Time & Location */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Scheduling Mode Toggle */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        How do you want to schedule?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSchedulingMode("set")}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                            schedulingMode === "set"
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                          Set date & time
                        </button>
                        <button
                          onClick={() => setSchedulingMode("heatmap")}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                            schedulingMode === "heatmap"
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          <Users className="w-4 h-4" />
                          Let friends vote
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        {schedulingMode === "heatmap" ? "Starting date" : "Date"}
                      </label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>

                    {schedulingMode === "set" ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            Start time
                          </label>
                          <Input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            End time
                          </label>
                          <Input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      date && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Select your preferred time slots
                          </label>
                          <div className="rounded-xl border border-border p-3 bg-muted/20">
                            <AvailabilityHeatmap
                              startDate={date}
                              numDays={7}
                              selectedSlots={heatmapSlots}
                              onToggleSlot={toggleHeatmapSlot}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Your friends will see this and add their own availability. Overlapping times will be highlighted.
                          </p>
                        </div>
                      )
                    )}

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Location (optional)
                      </label>
                      <Input
                        placeholder="e.g., Central Park, Blue Bottle Coffee..."
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                      />
                      {locationName && (
                        <div className="flex items-center justify-between mt-3 p-3 rounded-lg bg-muted/50">
                          <span className="text-sm text-muted-foreground">Location is flexible</span>
                          <Switch
                            checked={isFlexibleLocation}
                            onCheckedChange={setIsFlexibleLocation}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Invite Friends */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Selected Count */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {selectedFriends.length} friend{selectedFriends.length !== 1 ? "s" : ""} selected
                      </span>
                      {highlightedFriends.length > 0 && (
                        <span className="flex items-center gap-1 text-primary">
                          <Sparkles className="w-3.5 h-3.5" />
                          {highlightedFriends.length} highlighted
                        </span>
                      )}
                    </div>

                    {/* Highlight Info */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 text-sm">
                      <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">
                        <span className="text-foreground font-medium">Highlight friends</span> to make this hangout stand out in their feed. Perfect for close friends you really want to join.
                      </p>
                    </div>

                    {/* Friends List */}
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                      {filteredFriends.map((friend) => {
                        const isSelected = selectedFriends.includes(friend.id);
                        const isHighlighted = highlightedFriends.includes(friend.id);

                        return (
                          <div
                            key={friend.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              isSelected
                                ? isHighlighted
                                  ? "border-primary bg-primary/5"
                                  : "border-primary/50 bg-primary/5"
                                : "border-border hover:border-primary/30"
                            }`}
                          >
                            <button
                              onClick={() => toggleFriend(friend.id)}
                              className="flex items-center gap-3 flex-1"
                            >
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                  <span className="font-heading font-bold text-primary">
                                    {friend.name.charAt(0)}
                                  </span>
                                </div>
                                {isSelected && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="text-left">
                                <p className="font-medium text-foreground">{friend.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {friend.hangoutsTogether} hangouts together
                                </p>
                              </div>
                            </button>

                            {isSelected && (
                              <button
                                onClick={() => toggleHighlight(friend.id)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isHighlighted
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                                title={isHighlighted ? "Remove highlight" : "Highlight friend"}
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex items-center justify-between">
              <button
                onClick={() => {
                  if (step === 1) {
                    onClose();
                    resetForm();
                  } else {
                    setStep((s) => (s - 1) as 1 | 2 | 3);
                  }
                }}
                className="px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
              >
                {step === 1 ? "Cancel" : "Back"}
              </button>

              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                  disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                  className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={!canCreate}
                  className="btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Hangout
                </button>
              )}
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateHangoutModal;
