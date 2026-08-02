import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Close, Event, Schedule, LocationOn, Description } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { useDataStore } from "../../store/dataStore";
import { CustomCalendarEvent } from "../../store/slices/calendarSlice";

interface AddCustomEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export const AddCustomEventModal: React.FC<AddCustomEventModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
}) => {
  const { addCustomEvent } = useDataStore();

  const todayStr = new Date().toISOString().split("T")[0];
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CustomCalendarEvent["type"]>("quiz");
  const [date, setDate] = useState(defaultDate || todayStr);
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addCustomEvent({
      title: title.trim(),
      type,
      date,
      time: time.trim() || undefined,
      venue: venue.trim() || undefined,
      description: description.trim() || undefined,
    });

    // Reset & close
    setTitle("");
    setTime("");
    setVenue("");
    setDescription("");
    onClose();
  };

  const types: { id: CustomCalendarEvent["type"]; label: string; color: string }[] = [
    { id: "quiz", label: "Quiz", color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
    { id: "assessment", label: "Assessment", color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
    { id: "event", label: "Event", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
    { id: "task", label: "Task", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    { id: "note", label: "Note", color: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="w-full max-w-lg bg-(--bg-surface) border-2 border-(--border-dim) rounded-3xl p-6 shadow-2xl flex flex-col gap-6 relative"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-(--bg-main) hover:bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) border border-(--border-dim) transition-all"
            >
              <Close className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex flex-col gap-1 pr-8">
              <h3 className="text-xl font-black font-expanded text-(--text-main)">
                Add Custom Event
              </h3>
              <p className="text-xs font-medium text-(--text-muted)">
                Add quizzes, assessments, tasks, or reminders directly to your calendar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Event Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-(--text-muted)">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CAT 1 Quiz / Lab Assessment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-(--bg-main) border-2 border-(--border-dim) focus:border-(--accent-base) text-sm font-bold text-(--text-main) outline-none transition-all"
                />
              </div>

              {/* Type Pills */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-(--text-muted)">
                  Category Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {types.map((t) => {
                    const isSelected = type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setType(t.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-black font-mono border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-(--accent-base) text-(--text-inverse) border-(--accent-base) shadow-xs"
                            : "bg-(--bg-main) text-(--text-muted) border-(--border-dim) hover:text-(--text-main)"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-(--text-muted)">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-(--bg-main) border-2 border-(--border-dim) focus:border-(--accent-base) text-xs font-mono font-bold text-(--text-main) outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-(--text-muted)">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-(--bg-main) border-2 border-(--border-dim) focus:border-(--accent-base) text-xs font-mono font-bold text-(--text-main) outline-none"
                  />
                </div>
              </div>

              {/* Venue & Description */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-(--text-muted)">
                    Venue (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SJT 401 / Online"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-(--bg-main) border-2 border-(--border-dim) focus:border-(--accent-base) text-xs font-bold text-(--text-main) outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-(--text-muted)">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Additional details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-(--bg-main) border-2 border-(--border-dim) focus:border-(--accent-base) text-xs font-medium text-(--text-main) outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 mt-2 pt-3 border-t-2 border-(--border-dim)">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase text-(--text-muted) hover:bg-(--bg-highlight) transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-(--accent-base) text-(--text-inverse) text-xs font-black uppercase tracking-wider shadow-sm hover:opacity-90 transition-all cursor-pointer"
                >
                  Save Event
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
