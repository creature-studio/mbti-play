import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Lightbulb,
  Megaphone,
  ScanEye,
  Shield,
  Sparkles,
  Target,
  X,
  Zap,
  Copy,
  Info,
} from "lucide-react";
import {
  ABILITIES,
  activePersonality,
  progress,
} from "../../shared/personalities";
import {
  AXIS_LETTERS,
  CARD_MAP,
  EVENTS,
  PERSONALITIES,
  TYPE_LABEL,
} from "../../shared/cards";
import type { Axis, PublicPlayer, ViewState } from "../../shared/types";
import type { Sound } from "../hooks/useSound";
import { Card } from "./Card";
import { Avatar } from "./Avatar";
import { Axes } from "./Axes";
import { Hand } from "./Hand";
import { GameEffects } from "./GameEffects";
import { Declaration } from "./Declaration";
import { Modal } from "./Modal";
type Send = (a: Record<string, unknown>) => void;
export function GameTable({
  game,
  send,
  playSound,
  notify,
}: {
  game: ViewState;
  send: Send;
  playSound: (s: Sound) => void;
  notify: (s: string) => void;
}) {
  const me = game.players.find((p) => p.id === game.yourId)!;
  const others = game.players.filter((p) => p.id !== game.yourId);
  const [selected, setSelected] = useState<number | null>(null),
    [target, setTarget] = useState(me.id),
    [axis, setAxis] = useState<Axis>(0),
    [skill, setSkill] = useState(false),
    [guess, setGuess] = useState(false),
    [guessLetters, setGuessLetters] = useState("ENTP"),
    [inspect, setInspect] = useState<PublicPlayer | null>(null),
    [secret, setSecret] = useState(false),
    [reveal, setReveal] = useState(true),
    [now, setNow] = useState(Date.now()),
    [drift, setDrift] = useState<{ from: string; to: string } | null>(null),
    [logsOpen, setLogsOpen] = useState(false),
    [declareConfirm, setDeclareConfirm] = useState(false);
  const oldCurrent = useRef(me.current),
    oldSeq = useRef(game.seq),
    oldCard = useRef(game.lastCard),
    [cardAnim, setCardAnim] = useState(0);
  const previousPhase = useRef(game.phase);
  const myTurn =
    game.phase === "playing" && game.players[game.turn].id === me.id;
  const challenge = game.challenge;
  const canChallenge =
    game.phase === "challenge" &&
    challenge?.player !== me.id &&
    !challenge?.responded.includes(me.id);
  const canPlay = !!((myTurn && !game.moves) || canChallenge);
  const current = activePersonality(me.axes!);
  const ability = ABILITIES[current];
  const completion = progress({ axes: me.axes!, goal: me.goal! });
  const card =
    selected !== null && me.hand?.[selected]
      ? CARD_MAP[me.hand[selected]]
      : null;
  const event = EVENTS[game.event];
  const seconds = Math.max(0, Math.ceil((game.deadline - now) / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (oldCurrent.current !== me.current) {
      setDrift({ from: oldCurrent.current, to: me.current });
      oldCurrent.current = me.current;
      const t = setTimeout(() => setDrift(null), 2600);
      return () => clearTimeout(t);
    }
  }, [me.current]);
  useEffect(() => {
    const recent = game.logs.filter((l) => l.id > oldSeq.current);
    oldSeq.current = game.seq;
    if (recent.some((l) => l.kind === "attack")) {
      if (navigator.vibrate) navigator.vibrate(25);
    }
    if (
      game.lastCard &&
      (game.lastCard !== oldCard.current ||
        recent.some((l) => l.text.includes("打出")))
    ) {
      setCardAnim((n) => n + 1);
      oldCard.current = game.lastCard;
    }
  }, [game.seq, game.lastCard, game.logs, playSound]);
  useEffect(() => {
    setSelected(null);
    setSkill(false);
  }, [game.turn, game.round]);
  useEffect(() => {
    if (
      game.phase === "challenge" &&
      previousPhase.current !== "challenge" &&
      previousPhase.current !== "reaction"
    ) {
      setSelected(null);
      setTarget(challenge!.player);
    }
    previousPhase.current = game.phase;
  }, [game.phase, challenge, playSound]);
  function select(i: number) {
    playSound("select");
    setSelected((v) => (v === i ? null : i));
    const c = CARD_MAP[me.hand![i]];
    setTarget(
      canChallenge
        ? challenge!.player
        : c.target === "other"
          ? others[0].id
          : me.id,
    );
  }
  function doPlay(i = selected, t = target) {
    if (i === null || !me.hand?.[i]) return;
    send({ type: "PLAY", cardId: me.hand[i], targetId: t, axis });
    setSelected(null);
  }
  function doAbility() {
    send({ type: "ABILITY", targetId: target, axis });
    setSkill(false);
  }
  const needsAxis =
    card?.effects.some(
      (e) =>
        ["peek", "swap", "reset", "wild"].includes(e.kind) && e.amount !== 2,
    ) || card?.effects.some((e) => e.kind === "wild");
  const axisPicker = (
    <div className="axis-picker">
      {AXIS_LETTERS.map((l, i) => (
        <button
          key={i}
          className={axis === i ? "active" : ""}
          onClick={() => setAxis(i as Axis)}
        >
          {l.join(" / ")}
        </button>
      ))}
    </div>
  );
  const targetPicker = (list: PublicPlayer[]) => (
    <div className="target-picker">
      {list.map((p) => (
        <button
          className={target === p.id ? "active" : ""}
          key={p.id}
          onClick={() => setTarget(p.id)}
        >
          <Avatar index={p.avatar} size={32} />
          <span>{p.id === me.id ? "自己" : p.name}</span>
          {target === p.id && <Check size={12} />}
        </button>
      ))}
    </div>
  );
  const logList = (
    <div className="game-log">
      {[...game.logs]
        .reverse()
        .slice(0, 18)
        .map((l) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`log-entry log-${l.kind}`}
          >
            <span className="log-bullet" />
            <p>{l.text}</p>
          </motion.div>
        ))}
    </div>
  );
  return (
    <main className="game-page">
      <GameEffects event={game.animation} />
      <Declaration challenge={game.challenge} players={game.players} />
      <div className="game-topline">
        <div>
          <span className="live-dot" />
          <span>房间 {game.roomCode}</span>
          <button
            className="icon-button tiny"
            aria-label="复制房间码"
            onClick={() => {
              navigator.clipboard
                ?.writeText(game.roomCode)
                .then(() => notify("房间码已复制"))
                .catch(() => notify(game.roomCode));
            }}
          >
            <Copy size={13} />
          </button>
          <span className="topline-separator" />
          <span>
            ROUND <b>{String(game.round).padStart(2, "0")}</b>
          </span>
        </div>
        <button
          className="text-button mobile-log-button"
          onClick={() => setLogsOpen(true)}
        >
          桌边动态 <ChevronRight size={14} />
        </button>
        <span className="game-top-note">别急，他们可能也在演。</span>
      </div>
      <div className="game-layout">
        <section className="table-main">
          <div className="table-surface" />
          <div className={`opponents opponents-${others.length}`}>
            {others.map((p) => (
              <button
                className={`opponent ${game.players[game.turn].id === p.id ? "opponent-turn" : ""} ${card && target === p.id ? "opponent-target" : ""}`}
                key={p.id}
                data-drop-target={p.id}
                onClick={() => (card ? setTarget(p.id) : setInspect(p))}
              >
                <div className="opponent-top">
                  <div className="opponent-avatar">
                    <Avatar index={p.avatar} size={47} />
                    {game.players[game.turn].id === p.id && (
                      <span className="turn-avatar-dot" />
                    )}
                  </div>
                  <div className="opponent-identity">
                    <h3>{p.name}</h3>
                    <span>
                      {p.bot ? "BOT" : p.connected ? "在线" : "重连中"} ·{" "}
                      <Layers size={11} />
                      {p.handCount}
                    </span>
                  </div>
                  {p.shield > 0 || p.reflect ? (
                    <span className="player-shield">
                      <Shield size={13} />
                      {p.reflect ? "↩" : p.shield}
                    </span>
                  ) : null}
                </div>
                <div className="opponent-bottom">
                  <b>{p.current}</b>
                  <span>
                    {game.players[game.turn].id === p.id
                      ? "思考中…"
                      : p.masked || p.hidden
                        ? "看不透"
                        : "当前人格"}
                  </span>
                </div>
                <Axes axes={p.axes} small />
                {card && target === p.id && (
                  <div className="target-badge">
                    <Target size={13} />
                    选中目标
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="center-table">
            {game.round >= 9 && (
              <span className="acceleration-label">
                ✦ 人格加速 · 每回合自动靠近目标
              </span>
            )}
            <div className="table-brand">
              <span>p↗</span>
              <p>PERSONALITY SHIFT</p>
              <small>藏好目标 · 随时漂移</small>
            </div>
            <div className="deck-group">
              <div className="draw-pile">
                <div className="deck-layer" />
                <div className="deck-layer layer-two" />
                <Card card={CARD_MAP.s0} back />
                <span className="deck-count">
                  <Layers size={12} />
                  {game.deckCount}
                </span>
              </div>
              <div className="discard-pile">
                <AnimatePresence mode="popLayout">
                  {game.lastCard ? (
                    <motion.div
                      key={cardAnim}
                      className="last-card"
                      initial={{
                        y: 160,
                        x: -80,
                        rotate: -22,
                        scale: 0.6,
                        opacity: 0,
                      }}
                      animate={{ y: 0, x: 0, rotate: 8, scale: 1, opacity: 1 }}
                      exit={{ scale: 0.88, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                      }}
                    >
                      <Card card={CARD_MAP[game.lastCard]} compact />
                    </motion.div>
                  ) : (
                    <div className="empty-discard">
                      <Sparkles size={23} />
                      <span>好戏还没开始</span>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <span className="table-note">
              {game.lastCard
                ? `上一张 · ${CARD_MAP[game.lastCard].name}`
                : "下一张，会让谁破防？"}
            </span>
          </div>
          <div
            className={`turn-banner ${myTurn ? "your-turn" : ""} ${challenge ? "challenge-turn" : ""}`}
            role="status"
          >
            {game.phase === "reveal" ? (
              <>
                <EyeOff size={17} />
                <b>藏好秘密人格，准备开演</b>
                <span>{seconds}s</span>
              </>
            ) : game.phase === "reaction" ? (
              <>
                <Shield size={17} />
                <b>
                  等待{" "}
                  {game.players.find((p) => p.id === game.pending?.to)?.name}{" "}
                  反制
                </b>
                <span>{seconds}s</span>
              </>
            ) : challenge ? (
              <>
                <Megaphone size={19} />
                <b>
                  {game.players.find((p) => p.id === challenge.player)?.name}
                  ：我是{" "}
                  {game.players.find((p) => p.id === challenge.player)?.goal}！
                </b>
                <span>{seconds}s</span>
              </>
            ) : (
              <>
                <span className="live-dot" />
                <b>
                  {myTurn
                    ? "轮到你了，演一下？"
                    : `${game.players[game.turn].name} 的回合`}
                </b>
                <span>
                  <Clock3 size={13} />
                  {seconds}s
                </span>
              </>
            )}
          </div>
          {challenge && (
            <div className="challenge-actions">
              <span>
                {challenge.player === me.id
                  ? "撑住这一波，你就赢了。"
                  : canChallenge
                    ? "最后一次机会！打一张牌，把 TA 拉回来。"
                    : "你已回应，等待其他人。"}
              </span>
              {canChallenge && (
                <button onClick={() => send({ type: "PASS" })}>
                  这次放过 <ChevronRight size={14} />
                </button>
              )}
            </div>
          )}
          <div
            className={`self-zone ${target === me.id && card ? "self-target" : ""}`}
            data-drop-target={me.id}
          >
            <div
              className="self-heading"
              onClick={() => card && setTarget(me.id)}
            >
              <Avatar index={me.avatar} size={44} />
              <div className="self-name">
                <h3>
                  {me.name}
                  <small>你</small>
                </h3>
                <span>
                  当前人格 <b>{me.current}</b>
                </span>
              </div>
              <button className="secret-chip" onClick={() => setSecret(true)}>
                <EyeOff size={14} />
                <span>秘密目标</span>
                <b>{me.goal}</b>
                <Eye size={12} />
              </button>
            </div>
            <div className="self-content">
              <div className="self-axes">
                <Axes axes={me.axes} goal={me.goal} />
              </div>
              <div className="self-build">
                <div className="build-heading">
                  <span>
                    <Sparkles size={14} />
                    {current} · 当前能力
                  </span>
                  {(me.shield > 0 || me.reflect) && (
                    <span>
                      <Shield size={13} />
                      {me.reflect ? "反弹" : `×${me.shield}`}
                    </span>
                  )}
                </div>
                <h3>{ability.name}</h3>
                <p>{ability.description}</p>
                <div className="build-bottom">
                  <span
                    className="focus-points"
                    title="洞察每回合回复1点，用于猜人格"
                  >
                    <Eye size={14} />
                    {[0, 1, 2].map((i) => (
                      <i key={i} className={i < me.focus ? "filled" : ""} />
                    ))}
                    <small>洞察</small>
                  </span>
                  <button
                    className="skill-button"
                    disabled={!myTurn || game.abilityUsed}
                    onClick={() => {
                      setTarget(
                        [
                          "INFP",
                          "INTJ",
                          "INTP",
                          "ISTJ",
                          "ISFP",
                          "ESTP",
                          "ENFJ",
                          "ISFJ",
                        ].includes(current)
                          ? me.id
                          : others[0].id,
                      );
                      setSkill(true);
                    }}
                  >
                    {" "}
                    {game.abilityUsed ? "本轮已使用" : "使用能力"}
                    <Zap size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="hand-topline">
            <span>
              <Layers size={14} />
              你的手牌 <b>{me.handCount}</b>
              <small>
                {myTurn
                  ? game.moves
                    ? "出牌完成，还可以用能力"
                    : "点选出牌 · 拖向玩家也可以"
                  : "看看牌，想想下一步"}
              </small>
            </span>
            <div className="hand-browse">
              <button
                aria-label="上一张手牌"
                onClick={() =>
                  select(
                    selected === null
                      ? 0
                      : (selected - 1 + me.handCount) % me.handCount,
                  )
                }
              >
                ‹
              </button>
              <button
                aria-label="下一张手牌"
                onClick={() =>
                  select(selected === null ? 0 : (selected + 1) % me.handCount)
                }
              >
                ›
              </button>
            </div>
            <button
              className="guess-button"
              disabled={!myTurn || game.guessUsed || me.focus < 2}
              onClick={() => {
                setTarget(others[0].id);
                setGuess(true);
              }}
            >
              <ScanEye size={16} />
              猜人格<small>−2 洞察</small>
            </button>
          </div>
          <Hand
            cards={me.hand ?? []}
            selected={selected}
            onSelect={select}
            onDrop={(i, t) => doPlay(i, t)}
            enabled={canPlay}
          />
          <div className="bottom-action-bar">
            <span className="goal-progress">
              <i>
                {completion}
                <small>/4</small>
              </i>
              <span>
                目标就位
                <small>
                  {completion === 4
                    ? "现在，就是揭晓的时刻"
                    : "绿色区域是你的秘密方向"}
                </small>
              </span>
            </span>
            <button
              className={`button declare-button ${completion === 4 ? "declare-ready" : ""}`}
              disabled={!myTurn}
              onClick={() => setDeclareConfirm(true)}
            >
              <Megaphone size={18} />
              我不装了
              <ArrowUpRight size={17} />
            </button>
            <button
              className="end-turn-button"
              disabled={!myTurn}
              onClick={() => {
                send({ type: "END" });
                setSelected(null);
              }}
            >
              {game.moves ? "结束回合" : "补牌并结束"}
              <ChevronRight size={17} />
            </button>
          </div>
          {game.round === 1 && myTurn && !game.moves && !card && (
            <div className="tutorial-hint">
              <Lightbulb size={15} />
              <span>
                点一张手牌，让轨道滑向绿色区域。也可以给朋友“帮倒忙”。
              </span>
            </div>
          )}
          <AnimatePresence>
            {drift && (
              <motion.div
                className="drift-toast"
                key={`${drift.from}-${drift.to}`}
                initial={{ scale: 0.65, y: 20, opacity: 0, rotate: -5 }}
                animate={{ scale: 1, y: 0, opacity: 1, rotate: -2 }}
                exit={{ scale: 1.1, y: -25, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
              >
                <Sparkles size={25} />
                <div>
                  <span>人格漂移！</span>
                  <b>
                    {drift.from}
                    <ArrowRight size={22} />
                    {drift.to}
                  </b>
                </div>
                <span className="drift-star">✳</span>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        <aside className="game-sidebar">
          <section className="world-event">
            <div className="section-top">
              <span>
                <OrbitIcon />
                世界事件
              </span>
              <small>每 2 轮更换</small>
            </div>
            <div className="event-art">
              <span>
                {["✳", "◷", "✈", "♡", "☾", "✧", "▥", "↗", "◎", "✦"][game.event]}
              </span>
              <i />
              <i />
            </div>
            <span className="event-round">
              ROUND {String(game.round).padStart(2, "0")}
            </span>
            <h3>{event.name}</h3>
            <p>{event.flavor}</p>
            <div className="event-effect">
              <Zap size={14} />
              {event.description}
            </div>
          </section>
          <section className="log-panel">
            <div className="section-top">
              <h3>桌边动态</h3>
              <span className="live-label">
                <span className="live-dot" />
                LIVE
              </span>
            </div>
            {logList}
          </section>
          <button className="clue-button" onClick={() => setSecret(true)}>
            <ScanEye size={17} />
            <span>我的秘密笔记</span>
            <b>{me.clues?.length ?? 0}</b>
            <ChevronRight size={15} />
          </button>
        </aside>
      </div>
      <AnimatePresence>
        {card && (
          <motion.div
            className="card-inspector"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
          >
            <div className="inspector-head">
              <span>
                {TYPE_LABEL[card.type]} · {card.rarity}
              </span>
              <button
                className="icon-button"
                aria-label="取消选牌"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </div>
            <h3>{card.name}</h3>
            <p className="inspector-flavor">{card.flavor}</p>
            <p className="inspector-effect">{card.description}</p>
            {needsAxis && (
              <>
                <span className="field-label">选择人格轴</span>
                {axisPicker}
              </>
            )}
            <span className="field-label">
              {canChallenge ? "只能对宣言者出牌" : "把这张牌打给谁？"}
            </span>
            {targetPicker(
              canChallenge
                ? game.players.filter((p) => p.id === challenge!.player)
                : game.players.filter((p) =>
                    card.target === "self"
                      ? p.id === me.id
                      : card.target === "other"
                        ? p.id !== me.id
                        : true,
                  ),
            )}
            <button
              className="button button-lime"
              disabled={!canPlay}
              onClick={() => doPlay()}
            >
              <ArrowUpRight size={18} />
              {canPlay
                ? `打给${target === me.id ? "自己" : game.players.find((p) => p.id === target)?.name}`
                : myTurn
                  ? "本回合已经出过牌了"
                  : "先藏好牌，等轮到你"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {(skill || guess || inspect || secret || declareConfirm || logsOpen) && (
        <Modal
          title={
            skill
              ? `${current} · ${ability.name}`
              : guess
                ? "我猜你是…"
                : inspect
                  ? inspect.name
                  : secret
                    ? "只有你知道"
                    : declareConfirm
                      ? "准备好不装了吗？"
                      : "桌边动态"
          }
          onClose={() => {
            setSkill(false);
            setGuess(false);
            setInspect(null);
            setSecret(false);
            setDeclareConfirm(false);
            setLogsOpen(false);
          }}
        >
          {skill && (
            <div className="action-modal">
              <p>{ability.description}</p>
              <span className="field-label">选择人格轴</span>
              {axisPicker}
              <span className="field-label">
                选择目标（不需目标的能力只影响自己）
              </span>
              {targetPicker(game.players)}
              <button className="button button-lime" onClick={doAbility}>
                发动能力 <Zap size={17} />
              </button>
              <small>人格跨越中线后，能力随之变化；每回合仍只能用一次。</small>
            </div>
          )}
          {guess && (
            <div className="action-modal">
              <p>花 2 点洞察。猜对抽 2 张；猜错泄露自己的一个目标字母。</p>
              {targetPicker(others)}
              <div className="guess-letters">
                {AXIS_LETTERS.map((letters, i) => (
                  <div key={i}>
                    {letters.map((l) => (
                      <button
                        key={l}
                        className={guessLetters[i] === l ? "active" : ""}
                        onClick={() =>
                          setGuessLetters(
                            (v) => v.slice(0, i) + l + v.slice(i + 1),
                          )
                        }
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <button
                className="button button-lime"
                onClick={() => {
                  send({
                    type: "GUESS",
                    targetId: target,
                    guess: guessLetters,
                  });
                  setGuess(false);
                }}
              >
                下注：{guessLetters}
                <ScanEye size={18} />
              </button>
              {me.clues?.length ? (
                <div className="clue-list">
                  <h4>已知线索</h4>
                  {me.clues.map((c, i) => (
                    <p key={i}>{c}</p>
                  ))}
                </div>
              ) : (
                <small>看过的线索会记在“秘密笔记”里。</small>
              )}
            </div>
          )}
          {inspect && (
            <div className="inspect-player">
              <Avatar index={inspect.avatar} size={66} />
              <h2>{inspect.current}</h2>
              <p>看得见的是状态，猜不到的是目标。</p>
              <Axes axes={inspect.axes} />
              {inspect.axes && (
                <div className="inspect-ability">
                  <h3>{ABILITIES[activePersonality(inspect.axes)].name}</h3>
                  <p>
                    {ABILITIES[activePersonality(inspect.axes)].description}
                  </p>
                </div>
              )}
              <button
                className="button button-outline"
                disabled={!myTurn || me.focus < 2 || game.guessUsed}
                onClick={() => {
                  setTarget(inspect.id);
                  setInspect(null);
                  setGuess(true);
                }}
              >
                <ScanEye size={17} />猜 TA 的秘密人格
              </button>
            </div>
          )}
          {secret && (
            <div className="secret-notes">
              <span className="tiny-caps">KEEP IT TO YOURSELF</span>
              <h2>{me.goal}</h2>
              <p>让四条轨道落在对应字母的一侧，然后宣言。</p>
              <Axes axes={me.axes} goal={me.goal} />
              <div className="clue-list">
                <h3>
                  <ScanEye size={17} />
                  你的秘密笔记
                </h3>
                {me.clues?.length ? (
                  me.clues.map((c, i) => <p key={i}>{c}</p>)
                ) : (
                  <p>暂时没有线索。偷看牌和猜人格会把答案记在这里。</p>
                )}
              </div>
            </div>
          )}
          {declareConfirm && (
            <div className="declare-confirm">
              <div className="declare-icon">
                <Megaphone size={40} />
              </div>
              <p>
                “我不装了，我是 <b>{me.goal}</b>！”
              </p>
              <span>
                {completion === 4
                  ? "目标已就位。但对手还有 16 秒、每人一次打断机会。"
                  : "你还没满足四条目标！强行宣言会弃 1 张牌、清空洞察并结束回合。"}
              </span>
              <button
                className={`button ${completion === 4 ? "button-lime" : "button-danger"}`}
                onClick={() => {
                  send({ type: "DECLARE" });
                  setDeclareConfirm(false);
                  setSelected(null);
                }}
              >
                公开我的人格 <ArrowUpRight size={20} />
              </button>
            </div>
          )}
          {logsOpen && (
            <>
              <div className="mobile-event">
                <b>世界事件 · {event.name}</b>
                <p>{event.description}</p>
              </div>
              {logList}
            </>
          )}
        </Modal>
      )}
      {game.phase === "reaction" && game.pending?.to === me.id && (
        <Modal title="有人来带偏你了！" onClose={() => send({ type: "REACT" })}>
          <div className="reaction-panel">
            <p>
              {game.players.find((p) => p.id === game.pending!.from)?.name}{" "}
              对你打出
            </p>
            <h3>「{CARD_MAP[game.pending.card].name}」</h3>
            <p>{CARD_MAP[game.pending.card].description}</p>
            <div className="reaction-timer">
              <Shield size={18} />
              你有 {seconds} 秒做出回应
            </div>
            <div className="reaction-options">
              {me.hand
                ?.filter((id) => CARD_MAP[id].type === "defense")
                .map((id, i) => (
                  <button
                    key={`${id}-${i}`}
                    onClick={() => send({ type: "REACT", cardId: id })}
                  >
                    <Shield size={21} />
                    <span>
                      <b>{CARD_MAP[id].name}</b>
                      <small>{CARD_MAP[id].description}</small>
                    </span>
                    <ArrowUpRight size={19} />
                  </button>
                ))}
            </div>
            <button
              className="button button-outline"
              onClick={() => send({ type: "REACT" })}
            >
              这次我接了
            </button>
          </div>
        </Modal>
      )}
      <AnimatePresence>
        {reveal && game.phase === "reveal" && (
          <motion.div
            className="reveal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="reveal-heading">
              <span className="eyebrow">
                <EyeOff size={16} /> 你的秘密，别被看见
              </span>
              <h2>这一局，你想成为…</h2>
            </div>
            <motion.div
              className="secret-reveal-card"
              initial={{ rotateY: 180, scale: 0.8 }}
              animate={{ rotateY: 0, scale: 1 }}
              transition={{ delay: 0.45, duration: 0.85, type: "spring" }}
            >
              <div className="card-top">
                <span>TOP SECRET</span>
                <EyeOff size={15} />
              </div>
              <div className="secret-art">
                <span>✳</span>
                <div className="secret-art-orbit" />
              </div>
              <span className="tiny-caps">YOUR HIDDEN PERSONALITY</span>
              <h1>{me.goal}</h1>
              <p>
                {me.goal?.split("").map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </p>
              <div className="secret-card-bottom">
                他们看到的是你现在的样子。
                <br />
                只有你知道，自己想去哪里。
              </div>
            </motion.div>
            <button
              className="button button-lime"
              onClick={() => setReveal(false)}
            >
              记住了，开始演 <ArrowRight size={20} />
            </button>
            <p className="reveal-count">
              {seconds} 秒后自动盖回 · 之后可点“秘密目标”查看
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
function OrbitIcon() {
  return <span className="orbit-icon">◎</span>;
}
