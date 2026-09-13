export type Axis = 0 | 1 | 2 | 3;
export type Axes = [number, number, number, number];
export type CardType = "shift" | "attack" | "defense" | "strategy" | "special";
export type Effect =
  | { kind: "move"; axis: Axis; amount: number }
  | {
      kind:
        | "shield"
        | "reflect"
        | "peek"
        | "swap"
        | "trade"
        | "copy"
        | "draw"
        | "mask"
        | "hide"
        | "skip"
        | "reset"
        | "steal"
        | "wild"
        | "extra";
      axis?: Axis;
      amount?: number;
    };
export interface Card {
  id: string;
  name: string;
  flavor: string;
  description: string;
  type: CardType;
  target: "any" | "self" | "other";
  effects: Effect[];
  rarity: "日常" | "稀有" | "限定";
  tags: string[];
  art: string;
  animation: "drift" | "impact" | "guard" | "twist";
}
export interface WorldEvent {
  id: string;
  name: string;
  flavor: string;
  description: string;
  axis?: Axis;
  direction?: number;
  bonus: number;
}
export interface Ability {
  name: string;
  description: string;
}
export interface Stats {
  attacks: number;
  targeted: number;
  drifts: number;
  guesses: number;
  correct: number;
  failed: number;
}
export interface Player {
  id: string;
  name: string;
  avatar: number;
  bot: boolean;
  connected: boolean;
  ready: boolean;
  axes: Axes;
  goal: string;
  hand: string[];
  shield: number;
  reflect: boolean;
  hidden: boolean;
  masked: string | null;
  focus: number;
  skip: boolean;
  clues: string[];
  stats: Stats;
  history: string[];
}
export interface Log {
  id: number;
  text: string;
  kind: "normal" | "attack" | "drift" | "world" | "declare" | "guard";
}
export interface Pending {
  from: string;
  to: string;
  card: string;
  axis: Axis;
}
export interface Challenge {
  player: string;
  responded: string[];
  deadline: number;
}
export interface GameState {
  phase: "lobby" | "reveal" | "playing" | "reaction" | "challenge" | "finished";
  players: Player[];
  seed: number;
  deck: string[];
  discard: string[];
  turn: number;
  round: number;
  moves: number;
  abilityUsed: boolean;
  guessUsed: boolean;
  event: number;
  logs: Log[];
  seq: number;
  winner: string | null;
  pending: Pending | null;
  challenge: Challenge | null;
  lastEffect: Effect[] | null;
  lastCard: string | null;
  deadline: number;
  turnCount: number;
  animation: { id: number; from: string; to: string; card: string } | null;
}
export type Action =
  | {
      type: "PLAY";
      playerId: string;
      cardId: string;
      targetId: string;
      axis?: Axis;
    }
  | { type: "ABILITY"; playerId: string; targetId?: string; axis?: Axis }
  | { type: "GUESS"; playerId: string; targetId: string; guess: string }
  | { type: "DECLARE"; playerId: string }
  | { type: "END" | "PASS" | "REVEALED" | "TIMEOUT"; playerId: string }
  | { type: "REACT"; playerId: string; cardId?: string };
export type PublicPlayer = Omit<Player, "goal" | "hand" | "clues" | "axes"> & {
  goal?: string;
  hand?: string[];
  clues?: string[];
  axes: Axes | null;
  handCount: number;
  current: string;
};
export type ViewState = Omit<
  GameState,
  "players" | "seed" | "deck" | "discard" | "lastEffect"
> & {
  players: PublicPlayer[];
  deckCount: number;
  yourId: string;
  roomCode: string;
  hostId: string;
};
