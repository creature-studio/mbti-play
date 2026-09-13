import type { Player } from "./types";
export function newPlayer(
  id: string,
  name: string,
  avatar: number,
  bot = false,
): Player {
  return {
    id,
    name: name.slice(0, 14),
    avatar,
    bot,
    connected: true,
    ready: bot,
    axes: [-1, -1, -1, -1],
    goal: "",
    hand: [],
    shield: 0,
    reflect: false,
    hidden: false,
    masked: null,
    focus: 2,
    skip: false,
    clues: [],
    stats: {
      attacks: 0,
      targeted: 0,
      drifts: 0,
      guesses: 0,
      correct: 0,
      failed: 0,
    },
    history: [],
  };
}
