import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function LiveOnlineCounter({ count }: { count: number }) {
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    if (count === displayCount) return;

    const diff = count - displayCount;
    const step = diff / 10;

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      setDisplayCount((prev) =>
        frame >= 10 ? count : Math.round(prev + step)
      );
      if (frame >= 10) clearInterval(interval);
    }, 20);

    return () => clearInterval(interval);
  }, [count, displayCount]);

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="relative">
        {/* Glow background */}
        <div className="absolute inset-0 blur-2xl bg-green-500/30 rounded-full animate-pulse" />

        {/* Animated number */}
        <AnimatePresence mode="wait">
          <motion.div
            key={displayCount}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative text-6xl md:text-7xl font-extrabold 
                       bg-gradient-to-r from-green-400 to-emerald-500 
                       bg-clip-text text-transparent"
          >
            {displayCount.toLocaleString()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
        <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
        Users online right now
      </div>
    </div>
  );
}