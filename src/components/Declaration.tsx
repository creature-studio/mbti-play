import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Megaphone, Sparkles } from "lucide-react";
import type { Challenge, PublicPlayer } from "../../shared/types";
/** A short, non-blocking reveal. Challenge controls remain usable underneath. */
export function Declaration({
  challenge,
  players,
}: {
  challenge: Challenge | null;
  players: PublicPlayer[];
}) {
  const [show, setShow] = useState<{ name: string; goal: string } | null>(null);
  useEffect(() => {
    if (!challenge) {
      setShow(null);
      return;
    }
    const p = players.find((p) => p.id === challenge.player);
    if (!p) return;
    setShow({ name: p.name, goal: p.goal ?? p.current });
    const timer = setTimeout(() => setShow(null), 1800);
    return () => clearTimeout(timer);
  }, [challenge?.deadline]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="declaration-cinema"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 90, scale: 0.65, rotate: -10 }}
            animate={{ y: 0, scale: 1, rotate: -4 }}
            exit={{ y: -70, scale: 1.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 230, damping: 20 }}
          >
            <span className="declaration-by">
              <Megaphone size={18} />
              {show.name} 公开宣言
            </span>
            <h1>
              我不装了<span>！</span>
            </h1>
            <div className="declaration-letters">
              {show.goal.split("").map((l, i) => (
                <motion.b
                  key={i}
                  initial={{ rotateY: 90, y: 30 }}
                  animate={{ rotateY: 0, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.08, type: "spring" }}
                >
                  {l}
                </motion.b>
              ))}
            </div>
            <p>
              <Sparkles size={16} />
              最后的打断机会，现在开始。
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
