import { random, shuffle, log, draw, move, giveCard } from "./runtime";
import { effects, applyCard } from "./effects";
import { newPlayer } from "./player";
export { newPlayer } from "./player";
import { CARDS, CARD_MAP, EVENTS, PERSONALITIES, AXIS_LETTERS } from "./cards";
import {
  activePersonality,
  direction,
  personality,
  progress,
} from "./personalities";
import type {
  Action,
  Axis,
  Axes,
  Effect,
  GameState,
  Player,
  ViewState,
} from "./types";
export function createGame(
  players: Player[],
  seed: number,
  now: number,
): GameState {
  if (players.length < 2 || players.length > 6)
    throw Error("需要 2–6 人才能开局");
  const s: GameState = {
    phase: "reveal",
    players: structuredClone(players),
    seed,
    deck: [],
    discard: [],
    turn: 0,
    round: 1,
    moves: 0,
    abilityUsed: false,
    guessUsed: false,
    event: 0,
    logs: [],
    seq: 0,
    winner: null,
    pending: null,
    challenge: null,
    lastEffect: null,
    lastCard: null,
    deadline: now + 8000,
    turnCount: 0,
    animation: null,
  };
  s.deck = shuffle(
    s,
    [...CARDS, ...CARDS, ...CARDS].map((c) => c.id),
  );
  const goals = shuffle(s, [...PERSONALITIES]);
  s.players = s.players.map((old, i) => {
    const p = newPlayer(old.id, old.name, old.avatar, old.bot);
    p.connected = old.connected;
    p.goal = goals[i];
    const aligned = Math.floor(random(s) * 4);
    p.axes = p.axes.map(
      (_, a) => direction(p.goal, a) * (a === aligned ? 2 : -2),
    ) as Axes;
    draw(s, p, 5);
    p.history = [personality(p.axes)];
    return p;
  });
  log(s, "秘密人格已发放。别让表情出卖你。", "world");
  return s;
}
function target(s: GameState, id?: string) {
  const p = s.players.find((p) => p.id === id);
  if (!p) throw Error("找不到这位玩家");
  return p;
}
function consume(s: GameState, p: Player, id: string) {
  const i = p.hand.indexOf(id);
  if (i < 0) throw Error("手里没有这张牌");
  p.hand.splice(i, 1);
  s.discard.push(id);
}
function finishChallenge(s: GameState, now: number) {
  if (!s.challenge) return;
  const p = target(s, s.challenge.player);
  if (progress(p) === 4) {
    s.winner = p.id;
    s.phase = "finished";
    s.pending = null;
    s.deadline = 0;
    log(s, `${p.name} 不装了！秘密人格 ${p.goal} 达成，赢下本局。`, "declare");
  } else {
    p.stats.failed++;
    p.focus = 0;
    log(s, `${p.name} 的宣言被打断！差一点，就差一点。`, "declare");
    s.challenge = null;
    s.phase = "playing";
    endTurn(s, now);
  }
}
function beginTurn(s: GameState, now: number) {
  const p = s.players[s.turn];
  p.hidden = false;
  p.masked = null;
  p.focus = Math.min(3, p.focus + 1);
  s.moves = 0;
  s.abilityUsed = p.skip;
  p.skip = false;
  s.guessUsed = false;
  s.deadline = now + 45000;
  draw(s, p);
  if (s.round >= 9 && progress(p) < 4) {
    const a = p.axes
      .map((v, i) => ({ a: i as Axis, v: v * direction(p.goal, i) }))
      .sort((a, b) => a.v - b.v)[0].a;
    move(s, p, a, direction(p.goal, a), false);
    log(s, `${p.name} 越来越藏不住了，一条轨道自动靠近目标。`, "world");
  }
  log(s, `轮到 ${p.name}，抽了一张牌。`);
}
function endTurn(s: GameState, now: number) {
  s.turn = (s.turn + 1) % s.players.length;
  s.turnCount++;
  if (s.turn === 0) {
    s.round++;
    if (s.round % 2 === 1) {
      s.event = (s.event + 1) % EVENTS.length;
      const ev = EVENTS[s.event];
      log(s, `世界事件 · ${ev.name}：${ev.description}`, "world");
      if (ev.id === "cancel") s.players.forEach((p) => move(s, p, 3, 1, false));
      if (ev.id === "gift") s.players.forEach((p) => draw(s, p));
    }
  }
  beginTurn(s, now);
}
function checkChallenge(s: GameState, now: number) {
  if (s.challenge && s.challenge.responded.length >= s.players.length - 1)
    finishChallenge(s, now);
}
function assertTurn(s: GameState, p: Player) {
  if (s.phase !== "playing" || s.players[s.turn].id !== p.id)
    throw Error("还没轮到你，先看看他们在装什么");
}
export function reduceGame(
  state: GameState,
  action: Action,
  now: number,
): GameState {
  const s = structuredClone(state);
  const p = target(s, action.playerId);
  const axis = "axis" in action ? (action.axis ?? 0) : 0;
  if (!Number.isInteger(axis) || axis < 0 || axis > 3)
    throw Error("请选择有效人格轴");
  if (action.type === "REVEALED") {
    if (s.phase !== "reveal") return state;
    s.phase = "playing";
    beginTurn(s, now);
    return s;
  }
  if (action.type === "TIMEOUT") {
    if (now < s.deadline) return state;
    if (s.phase === "reveal") {
      s.phase = "playing";
      beginTurn(s, now);
    } else if (s.phase === "reaction") {
      const a = s.pending!;
      applyCard(s, target(s, a.from), target(s, a.to), a.card, a.axis);
      s.pending = null;
      s.phase = s.challenge ? "challenge" : "playing";
      s.deadline = s.challenge ? s.challenge.deadline : now + 30000;
      checkChallenge(s, now);
    } else if (s.phase === "challenge") finishChallenge(s, now);
    else if (s.phase === "playing") endTurn(s, now);
    return s;
  }
  if (action.type === "REACT") {
    if (s.phase !== "reaction" || s.pending?.to !== p.id)
      throw Error("当前没有需要你回应的卡牌");
    const a = s.pending;
    const from = target(s, a.from);
    if (action.cardId) {
      const c = CARD_MAP[action.cardId];
      if (!c || c.type !== "defense") throw Error("请选择反制牌");
      consume(s, p, c.id);
      const reflect = c.effects.some((e) => e.kind === "reflect");
      s.animation = {
        id: s.seq + 1,
        from: p.id,
        to: reflect ? from.id : p.id,
        card: c.id,
      };
      log(
        s,
        `${p.name} 使用「${c.name}」${reflect ? "，原路奉还！" : "，挡住了！"}`,
        "guard",
      );
      if (reflect) applyCard(s, p, from, a.card, a.axis);
      effects(
        s,
        p,
        p,
        c.effects.filter((e) => !["shield", "reflect"].includes(e.kind)),
        a.axis,
      );
      const shield = c.effects.find((e) => e.kind === "shield");
      if (shield && (shield.amount ?? 1) > 1) p.shield++;
      if (c.id === "d1" && CARD_MAP[a.card].tags.includes("社交")) draw(s, p);
    } else applyCard(s, from, p, a.card, a.axis);
    s.pending = null;
    s.phase = s.challenge ? "challenge" : "playing";
    s.deadline = s.challenge ? s.challenge.deadline : now + 30000;
    checkChallenge(s, now);
    return s;
  }
  if (action.type === "PASS") {
    if (
      s.phase !== "challenge" ||
      !s.challenge ||
      s.challenge.player === p.id ||
      s.challenge.responded.includes(p.id)
    )
      throw Error("此刻不能跳过");
    s.challenge.responded.push(p.id);
    log(s, `${p.name} 放过了这次宣言。`);
    checkChallenge(s, now);
    return s;
  }
  if (action.type === "PLAY") {
    const isChallenge = s.phase === "challenge" && s.challenge;
    if (isChallenge) {
      if (
        s.challenge!.player === p.id ||
        s.challenge!.responded.includes(p.id) ||
        action.targetId !== s.challenge!.player
      )
        throw Error("挑战时只能对宣言者出一张牌");
    } else {
      assertTurn(s, p);
      if (s.moves >= 1) throw Error("本回合已经出过牌了，可以用能力或结束回合");
    }
    const c = CARD_MAP[action.cardId];
    if (!c || !p.hand.includes(c.id)) throw Error("手里没有这张牌");
    const to = target(s, action.targetId);
    if (c.target === "self" && to.id !== p.id)
      throw Error("这张牌只能对自己使用");
    if (c.target === "other" && to.id === p.id)
      throw Error("选一位对手，让他感受一下");
    consume(s, p, c.id);
    s.animation = { id: s.seq + 1, from: p.id, to: to.id, card: c.id };
    if (isChallenge) s.challenge!.responded.push(p.id);
    else s.moves++;
    log(
      s,
      `${p.name} 对${to.id === p.id ? "自己" : to.name}打出「${c.name}」`,
      to.id === p.id ? "normal" : "attack",
    );
    s.lastCard = c.id;
    if (to.id !== p.id) {
      p.stats.attacks++;
      to.stats.targeted++;
      if (to.reflect) {
        to.reflect = false;
        log(s, `${to.name} 把卡牌反弹了！`, "guard");
        applyCard(s, to, p, c.id, axis);
      } else if (to.shield > 0) {
        to.shield--;
        log(s, `${to.name} 的防护挡住了这张牌。`, "guard");
      } else if (to.hand.some((id) => CARD_MAP[id].type === "defense")) {
        s.pending = { from: p.id, to: to.id, card: c.id, axis };
        s.phase = "reaction";
        s.deadline = now + 8000;
        return s;
      } else applyCard(s, p, to, c.id, axis);
    } else applyCard(s, p, to, c.id, axis);
    checkChallenge(s, now);
    return s;
  }
  assertTurn(s, p);
  if (action.type === "END") {
    if (s.moves === 0) draw(s, p);
    endTurn(s, now);
    return s;
  }
  if (action.type === "GUESS") {
    if (s.guessUsed) throw Error("每回合只能猜一次");
    if (p.focus < 2) throw Error("需要 2 点洞察");
    const to = target(s, action.targetId);
    if (to.id === p.id || !PERSONALITIES.includes(action.guess))
      throw Error("请选择对手和有效人格");
    p.focus -= 2;
    s.guessUsed = true;
    p.stats.guesses++;
    if (to.goal === action.guess) {
      p.stats.correct++;
      draw(s, p, 2);
      p.clues.push(`猜中了！${to.name} 的目标是 ${action.guess}`);
      log(s, `${p.name} 看穿了 ${to.name}，奖励 2 张牌！`);
    } else {
      p.clues.push(`${to.name} 的目标不是 ${action.guess}`);
      const i = Math.floor(random(s) * 4);
      to.clues.push(
        `${p.name} 猜错的代价：对方第 ${i + 1} 轴目标是 ${p.goal[i]}`,
      );
      log(s, `${p.name} 猜错了，向对方泄露了一条线索。`);
    }
    return s;
  }
  if (action.type === "DECLARE") {
    if (progress(p) !== 4) {
      p.focus = 0;
      p.stats.failed++;
      if (p.hand.length) s.discard.push(p.hand.shift()!);
      log(
        s,
        `${p.name} 宣言失败：四条轴还没到位，弃 1 张牌并清空洞察。`,
        "declare",
      );
      endTurn(s, now);
      return s;
    }
    p.hidden = false;
    p.masked = null;
    s.phase = "challenge";
    s.challenge = { player: p.id, responded: [], deadline: now + 16000 };
    s.deadline = now + 16000;
    log(s, `${p.name}：我不装了，我是 ${p.goal}！最后的打断机会。`, "declare");
    return s;
  }
  if (action.type === "ABILITY") {
    if (s.abilityUsed) throw Error("本回合能力已经使用或被手机没电禁用");
    const kind = activePersonality(p.axes);
    const to = target(s, action.targetId ?? p.id);
    if (
      ["ENTP", "ENTJ", "ENFP", "ESTJ", "ESFJ", "ISTP", "ESFP", "INFJ"].includes(
        kind,
      ) &&
      to.id === p.id
    )
      throw Error("这个能力需要选择一位对手");
    if (["INFJ", "INFP"].includes(kind) && p.focus < 1)
      throw Error("需要 1 点洞察");
    if (kind === "ESTP" && !p.hand.length) throw Error("需要弃一张手牌才能赌");
    s.abilityUsed = true;
    log(s, `${p.name} 发动 ${kind} 人格能力。`);
    switch (kind) {
      case "INTJ": {
        if (s.deck.length < 2) draw(s, p);
        else {
          const top = s.deck.splice(-2);
          p.clues.push(
            `提前布局看到：${top.map((c) => CARD_MAP[c].name).join("、")}`,
          );
          top.sort((a, b) => cardValue(s, p, b) - cardValue(s, p, a));
          giveCard(s, p, top.shift()!);
          s.deck.unshift(...top);
        }
        break;
      }
      case "INTP":
        if (p.hand.length) s.discard.push(p.hand.shift()!);
        draw(s, p, 2);
        break;
      case "ENTJ":
        move(s, to, 3, -1);
        draw(s, p);
        break;
      case "ENTP":
        move(s, to, axis, -Math.sign(to.axes[axis]), false);
        break;
      case "INFJ":
        p.focus--;
        effects(s, p, to, [{ kind: "peek" }], axis);
        break;
      case "INFP":
        p.focus--;
        move(s, p, axis, direction(p.goal, axis), false);
        break;
      case "ENFJ":
        s.players.forEach((q) => move(s, q, 0, -1));
        p.shield = Math.min(3, p.shield + 1);
        break;
      case "ENFP":
        move(s, p, 1, 1);
        move(s, to, 2, 1);
        break;
      case "ISTJ":
        move(s, p, 3, -1);
        p.focus = Math.min(3, p.focus + 1);
        break;
      case "ISFJ":
        to.shield = Math.min(3, to.shield + 1);
        p.focus = Math.min(3, p.focus + 1);
        break;
      case "ESTJ":
        move(s, to, axis, -to.axes[axis], false);
        move(s, p, 3, -1);
        break;
      case "ESFJ":
        draw(s, p);
        draw(s, to);
        break;
      case "ISTP":
        if (to.shield || to.reflect) {
          to.shield = 0;
          to.reflect = false;
        } else draw(s, p);
        break;
      case "ISFP":
        effects(s, p, p, [{ kind: "reset" }], axis);
        break;
      case "ESTP":
        s.discard.push(p.hand.shift()!);
        move(s, p, axis, direction(p.goal, axis) * 2, false);
        break;
      case "ESFP":
        if (to.hand.length) giveCard(s, p, to.hand.shift()!);
        move(s, p, 0, -1);
        break;
    }
    return s;
  }
  return s;
}
export function cardValue(s: GameState, p: Player, id: string) {
  let value = 0;
  for (const e of CARD_MAP[id].effects) {
    if (e.kind === "move")
      value +=
        Math.max(-3, Math.min(3, p.axes[e.axis] + e.amount)) *
          direction(p.goal, e.axis) -
        p.axes[e.axis] * direction(p.goal, e.axis);
    if (e.kind === "wild") value += 3;
    if (e.kind === "draw") value += 1;
  }
  return value;
}
export function viewFor(
  s: GameState,
  id: string,
  roomCode: string,
  hostId: string,
): ViewState {
  const { seed, deck, discard, lastEffect, players, ...rest } = s;
  return {
    ...rest,
    roomCode,
    hostId,
    yourId: id,
    deckCount: deck.length,
    players: players.map((p) => {
      const { goal, hand, clues, ...safe } = p;
      const self = p.id === id,
        ended = s.phase === "finished",
        declared = s.challenge?.player === p.id;
      return {
        ...safe,
        axes: !self && !ended && (p.hidden || p.masked) ? null : p.axes,
        current:
          !self && !ended && p.masked
            ? p.masked
            : !self && !ended && p.hidden
              ? "????"
              : personality(p.axes),
        goal: self || ended || declared ? goal : undefined,
        hand: self || ended ? hand : undefined,
        clues: self ? clues : undefined,
        history: self || ended ? p.history : [],
        handCount: hand.length,
      };
    }),
  };
}
