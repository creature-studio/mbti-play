import { motion } from "motion/react";
import {
  ArrowUpRight,
  Sparkles,
  Shield,
  Zap,
  ScanEye,
  Orbit,
} from "lucide-react";
import { AXIS_LETTERS, TYPE_LABEL } from "../../shared/cards";
import type { Card as CardData } from "../../shared/types";
import { Artwork } from "./Artwork";
const icons = {
  shift: Orbit,
  attack: Zap,
  defense: Shield,
  strategy: ScanEye,
  special: Sparkles,
};
export function Card({
  card,
  hero = false,
  compact = false,
  back = false,
}: {
  card: CardData;
  hero?: boolean;
  compact?: boolean;
  back?: boolean;
}) {
  const Icon = icons[card.type];
  const e = card.effects.find((e) => e.kind === "move");
  const dir =
    e?.kind === "move"
      ? AXIS_LETTERS[e.axis][e.amount < 0 ? 0 : 1]
      : card.type === "defense"
        ? "NO"
        : "?";
  const variant =
    card.type === "attack"
      ? 2
      : card.type === "defense"
        ? 1
        : card.type === "strategy"
          ? 3
          : 0;
  if (back)
    return (
      <div className="playing-card card-back">
        <span className="card-back-orbit" />
        <div className="brand-symbol">
          p<span>↗</span>
        </div>
        <b>
          PERSONALITY
          <br />
          SHIFT
        </b>
        <small>你到底是哪一面？</small>
      </div>
    );
  return (
    <div
      className={`playing-card card-${card.type} ${hero ? "hero-card" : ""} ${compact ? "compact" : ""}`}
    >
      <div className="card-top">
        <span>
          <Icon size={12} />
          {TYPE_LABEL[card.type]}
        </span>
        <span>
          {card.rarity === "限定"
            ? "✦ ✦ ✦"
            : card.rarity === "稀有"
              ? "✦ ✦"
              : "✦"}
        </span>
      </div>
      <div className="card-art">
        {hero && card.id === "a9" ? (
          <img src="/art/midnight.webp" alt="深夜手机消息与漂浮的月亮" />
        ) : (
          <Artwork kind={card.art} variant={variant} />
        )}
        <span className="card-direction">
          {dir}
          <ArrowUpRight size={15} />
        </span>
      </div>
      <div className="card-copy">
        <h3>{card.name}</h3>
        <p>{card.flavor}</p>
        <div className="card-effect">{card.description}</div>
      </div>
      <div className="card-foot">
        <span>PERSONALITY SHIFT</span>
        <span>
          {card.id.toUpperCase().padStart(3, "0")} · {card.rarity}
        </span>
      </div>
    </div>
  );
}
export function FlyingCard({ id }: { id: string }) {
  return (
    <motion.div
      className="flying-card"
      initial={{ y: 300, x: -40, rotate: -20, scale: 0.8, opacity: 0 }}
      animate={{
        y: [300, -45, 0],
        x: [-40, 20, 0],
        rotate: [-20, 8, -5],
        scale: [0.8, 1.07, 1],
        opacity: [0, 1, 1],
      }}
      exit={{ y: -70, scale: 0.6, opacity: 0 }}
      transition={{ duration: 0.65, type: "tween" }}
      key={id}
    />
  );
}
