import { CARD_MAP, PERSONALITIES, AXIS_LETTERS } from "./cards";
import { direction } from "./personalities";
import { move, draw, random, giveCard } from "./runtime";
import type { GameState, Player, Effect, Axis } from "./types";
export function effects(
  s: GameState,
  from: Player,
  to: Player,
  list: Effect[],
  axis: Axis,
) {
  for (const e of list) {
    switch (e.kind) {
      case "move":
        move(s, to, e.axis, e.amount);
        break;
      case "shield":
        to.shield = Math.min(3, to.shield + (e.amount ?? 1));
        break;
      case "reflect":
        to.reflect = true;
        break;
      case "draw":
        draw(s, to, e.amount ?? 1);
        break;
      case "extra":
        s.moves = Math.max(0, s.moves - 1);
        break;
      case "wild":
        move(s, to, axis, direction(to.goal, axis) * (e.amount ?? 1), false);
        break;
      case "skip":
        to.skip = true;
        break;
      case "hide":
        to.hidden = true;
        break;
      case "mask":
        to.hidden = true;
        to.masked = PERSONALITIES[Math.floor(random(s) * 16)];
        break;
      case "peek": {
        const clue =
          e.amount === 2
            ? `${to.name} 的手牌：${
                to.hand
                  .slice(0, 2)
                  .map((c) => CARD_MAP[c].name)
                  .join("、") || "空空如也"
              }`
            : `${to.name} 的 ${AXIS_LETTERS[axis].join("/")} 目标是 ${to.goal[axis]}`;
        from.clues.push(clue);
        break;
      }
      case "swap": {
        const av = from.axes[axis],
          bv = to.axes[axis];
        move(s, from, axis, bv - av, false);
        move(s, to, axis, av - bv, false);
        break;
      }
      case "trade": {
        const a = from.hand.shift(),
          b = to.hand.shift();
        if (a) to.hand.push(a);
        if (b) from.hand.push(b);
        break;
      }
      case "steal": {
        if (to.hand.length)
          giveCard(
            s,
            from,
            to.hand.splice(Math.floor(random(s) * to.hand.length), 1)[0],
          );
        break;
      }
      case "reset":
        move(
          s,
          to,
          axis,
          to.axes[axis] === 0 ? direction(to.goal, axis) : to.axes[axis] * -2,
          false,
        );
        break;
      case "copy":
        if (s.lastEffect) effects(s, from, to, s.lastEffect, axis);
        else draw(s, from, 2);
        break;
    }
  }
}
export function applyCard(
  s: GameState,
  from: Player,
  to: Player,
  cardId: string,
  axis: Axis,
) {
  const c = CARD_MAP[cardId];
  effects(s, from, to, c.effects, axis);
  if (c.effects.some((e) => e.kind === "move"))
    s.lastEffect = c.effects.filter((e) => e.kind === "move");
  s.lastCard = cardId;
}
