import React from "react";
import { CloudOff } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { motion } from "framer-motion";

export const OfflineNotSynced = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 text-center"
    >
      <div className="bg-(--bg-surface) p-8 rounded-full border-4 border-(--border-main) shadow-(--brutal-shadow-sm)">
        <CloudOff size={64} className="text-(--text-muted) animate-pulse" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-(--text-main) tracking-tight">
          Not Synced
        </h2>
        <p className="text-(--text-muted) max-w-md mx-auto text-lg leading-relaxed">
          This data wasn't saved before you went offline. You'll need to reconnect to view it.
        </p>
      </div>
    </motion.div>
  );
};
