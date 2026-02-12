import React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Users, Camera, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Memory } from "../../data/badges";

interface MemoryCardProps {
  memory: Memory;
  compact?: boolean;
}

const MemoryCard = ({ memory, compact = false }: MemoryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev + 1) % memory.photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev - 1 + memory.photos.length) % memory.photos.length);
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
      >
        <img
          src={memory.heroImage}
          alt={memory.eventName}
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{memory.eventName}</p>
          <p className="text-xs text-muted-foreground">{memory.date}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Camera className="w-3 h-3" />
          {memory.photos.length}
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        onClick={() => setIsExpanded(true)}
        className="relative bg-card rounded-2xl border border-border overflow-hidden cursor-pointer group shadow-sm hover:shadow-lg transition-shadow"
      >
        {/* Hero Image */}
        <div className="relative h-40 overflow-hidden">
          <img
            src={memory.heroImage}
            alt={memory.eventName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Photo Count Badge */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
            <Camera className="w-3 h-3" />
            {memory.photos.length}
          </div>

          {/* Date Badge */}
          <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-foreground">
            {memory.date}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            {memory.eventName}
          </h3>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {memory.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {memory.time}
            </span>
          </div>

          {/* Attendees */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {memory.attendees.slice(0, 4).map((attendee, index) => (
                <div
                  key={attendee.id}
                  className="w-7 h-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center"
                  style={{ zIndex: memory.attendees.length - index }}
                >
                  <span className="text-[10px] font-medium text-primary">
                    {attendee.name.charAt(0)}
                  </span>
                </div>
              ))}
              {memory.attendees.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    +{memory.attendees.length - 4}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              with {memory.attendees.map(a => a.name.split(' ')[0]).join(', ')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-card rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Photo Gallery */}
              <div className="relative h-72 bg-black">
                <img
                  src={memory.photos[currentPhotoIndex]?.url || memory.heroImage}
                  alt={`Photo ${currentPhotoIndex + 1}`}
                  className="w-full h-full object-contain"
                />

                {memory.photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Photo Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                  {currentPhotoIndex + 1} / {memory.photos.length}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-18rem)]">
                <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                  {memory.eventName}
                </h2>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {memory.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {memory.date} at {memory.time}
                  </span>
                </div>

                {/* Attendees Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Who was there ({memory.attendees.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {memory.attendees.map((attendee) => (
                      <div
                        key={attendee.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {attendee.name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm text-foreground">{attendee.name}</span>
                      </div>
                    ))}
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">Add friend</span>
                    </button>
                  </div>
                </div>

                {/* Photo Thumbnails */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Shared Photos ({memory.photos.length})
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {memory.photos.map((photo, index) => (
                      <button
                        key={photo.id}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`relative aspect-square rounded-lg overflow-hidden ${index === currentPhotoIndex ? "ring-2 ring-primary" : ""}`}
                      >
                        <img
                          src={photo.url}
                          alt={`Photo by ${photo.uploadedBy}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                    <button className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Plus className="w-6 h-6" />
                      <span className="text-xs mt-1">Add</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MemoryCard;
