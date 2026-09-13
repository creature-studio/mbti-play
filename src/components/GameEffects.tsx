import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GameState } from "../../shared/types";
import { CARD_MAP } from "../../shared/cards";
import { Card } from "./Card";
type Flight = {
  id: number;
  card: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  attack: boolean;
};
/** Screen-space animation layer: measures once per authoritative play, never on each frame. */
export function GameEffects({ event }: { event: GameState["animation"] }) {
  const [flight, setFlight] = useState<Flight | null>(null);
  const last = useRef(event?.id);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!event || event.id === last.current) return;
    last.current = event.id;
    const fromEl = document.querySelector<HTMLElement>(
        `[data-drop-target="${CSS.escape(event.from)}"]`,
      ),
      toEl = document.querySelector<HTMLElement>(
        `[data-drop-target="${CSS.escape(event.to)}"]`,
      );
    if (!fromEl || !toEl) return;
    const from = fromEl.getBoundingClientRect(),
      to = toEl.getBoundingClientRect();
    setFlight({
      id: event.id,
      card: event.card,
      from: { x: from.left + from.width / 2, y: from.top + from.height / 2 },
      to: { x: to.left + to.width / 2, y: to.top + to.height / 2 },
      attack: event.from !== event.to,
    });
    const t = setTimeout(() => setFlight(null), 1100);
    return () => clearTimeout(t);
  }, [event?.id]);
  return (
    <div className="effects-layer" aria-hidden="true">
      <AnimatePresence>
        {flight && (
          <div key={flight.id}>
            <motion.div
              className="card-flight last-card"
              initial={{
                x: flight.from.x - 36,
                y: flight.from.y - 52,
                scale: 0.35,
                rotate: -22,
                opacity: 0,
              }}
              animate={{
                x: flight.to.x - 36,
                y: flight.to.y - 52,
                scale: [0.35, 1, 0.3],
                rotate: [-22, 12, -8],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: reduced ? 0.1 : 0.7,
                ease: [0.2, 0.8, 0.3, 1],
              }}
            >
              <Card card={CARD_MAP[flight.card]} compact />
            </motion.div>
            <motion.div
              className={`impact-ring ${flight.attack ? "impact-attack" : ""}`}
              style={{ left: flight.to.x, top: flight.to.y }}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.3, 1.7], opacity: [0, 0.8, 0] }}
              transition={{ delay: 0.38, duration: reduced ? 0.1 : 0.65 }}
            />
            {!reduced &&
              Array.from({ length: 7 }, (_, i) => (
                <motion.i
                  className={`impact-particle ${flight.attack ? "impact-attack" : ""}`}
                  key={i}
                  style={{ left: flight.to.x, top: flight.to.y }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
                  animate={{
                    x: Math.cos((i / 7) * Math.PI * 2) * 78,
                    y: Math.sin((i / 7) * Math.PI * 2) * 60,
                    opacity: [0, 1, 0],
                    scale: 0,
                    rotate: i * 90,
                  }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                />
              ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
