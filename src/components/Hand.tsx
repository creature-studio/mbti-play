import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CARD_MAP } from "../../shared/cards";
import { Card } from "./Card";
export function Hand({
  cards,
  selected,
  onSelect,
  onDrop,
  enabled,
}: {
  cards: string[];
  selected: number | null;
  onSelect: (i: number) => void;
  onDrop: (i: number, target: string) => void;
  enabled: boolean;
}) {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  const mobile = width < 700;
  const step = Math.min(
    mobile ? 66 : 112,
    ((mobile ? width : Math.min(width - 400, 950)) - 160) /
      Math.max(1, cards.length - 1),
  );
  return (
    <div
      className={`hand-fan ${!enabled ? "hand-waiting" : ""}`}
      aria-label="你的手牌"
    >
      {cards.map((id, i) => {
        const offset = i - (cards.length - 1) / 2;
        const picked = selected === i;
        return (
          <motion.button
            className={`hand-card ${picked ? "hand-selected" : ""}`}
            key={`${id}-${cards.slice(0, i).filter((c) => c === id).length}`}
            aria-label={`${CARD_MAP[id].name}，${CARD_MAP[id].description}`}
            aria-pressed={picked}
            initial={{ x: width / 2, y: 160, opacity: 0, rotate: 35 }}
            animate={{
              x: offset * step,
              y:
                Math.abs(offset) ** 1.6 * (mobile ? 4 : 5) -
                (picked ? (mobile ? 34 : 48) : 0),
              rotate: picked ? 0 : offset * (mobile ? 5 : 4),
              opacity: 1,
              scale: picked ? 1.05 : 1,
            }}
            transition={{ type: "spring", stiffness: 290, damping: 25 }}
            whileTap={{ scale: 0.97 }}
            whileHover={mobile ? undefined : { y: -26, rotate: 0, scale: 1.03 }}
            drag={enabled}
            dragSnapToOrigin
            dragMomentum={false}
            dragElastic={0.15}
            onDragStart={() => onSelect(i)}
            onDragEnd={(_e, info) => {
              // Motion reports page coordinates; drop zones use viewport coordinates.
              const point = {
                x: info.point.x - window.scrollX,
                y: info.point.y - window.scrollY,
              };
              const targets = [
                ...document.querySelectorAll<HTMLElement>("[data-drop-target]"),
              ];
              const found = targets.find((el) => {
                const r = el.getBoundingClientRect();
                return (
                  point.x >= r.left &&
                  point.x <= r.right &&
                  point.y >= r.top &&
                  point.y <= r.bottom
                );
              });
              if (found?.dataset.dropTarget)
                onDrop(i, found.dataset.dropTarget);
            }}
            onClick={() => onSelect(i)}
            style={{ zIndex: picked ? 30 : i + 1, touchAction: "none" }}
          >
            <Card card={CARD_MAP[id]} compact={mobile} />
          </motion.button>
        );
      })}
    </div>
  );
}
