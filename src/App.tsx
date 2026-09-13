import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Layers,
  Radio,
  Sparkles,
  Volume2,
  SlidersHorizontal,
  VolumeX,
  WifiOff,
  X,
} from "lucide-react";
import { CARDS, TYPE_LABEL, PERSONALITIES } from "../shared/cards";
import { ABILITIES } from "../shared/personalities";
import type { CardType } from "../shared/types";
import { useGame, socket } from "./hooks/useGame";
import { useSound } from "./hooks/useSound";
import { useGameAudio } from "./hooks/useGameAudio";
import { SoundSettings } from "./components/SoundSettings";
import { Home } from "./components/Home";
import { Lobby } from "./components/Lobby";
import { GameTable } from "./components/GameTable";
import { Results } from "./components/Results";
import { Modal } from "./components/Modal";
import { Rules } from "./components/Rules";
import { Card } from "./components/Card";
import { Avatar, AVATAR_NAMES } from "./components/Avatar";
type PageModal =
  | "rules"
  | "cards"
  | "types"
  | "create"
  | "join"
  | "profile"
  | "leave"
  | "sound"
  | null;
export default function App() {
  const { game, connected, notice, setNotice, send } = useGame();
  const sound = useSound();
  useGameAudio(game, connected, sound.play);
  const [modal, setModal] = useState<PageModal>(
      new URLSearchParams(location.search).has("room") ? "join" : null,
    ),
    [name, setName] = useState(localStorage.getItem("ps-name") || "今天不想装"),
    [avatar, setAvatar] = useState(
      Number(localStorage.getItem("ps-avatar") || 0),
    ),
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("room") || "",
    ),
    [filter, setFilter] = useState<CardType | "all">("all"),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (game) {
      setModal((v) => (["create", "join"].includes(v ?? "") ? null : v));
      setLoading(false);
    }
  }, [game?.roomCode, game?.phase]);
  useEffect(() => {
    if (notice) setLoading(false);
  }, [notice]);
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => {
        setLoading(false);
        setNotice("连接稍慢，请重试；检查网络是否正常");
      }, 9000);
      return () => clearTimeout(t);
    }
  }, [loading]);
  function save() {
    localStorage.setItem("ps-name", name.trim() || "今天不想装");
    localStorage.setItem("ps-avatar", String(avatar));
  }
  function create(quick = false) {
    if (!connected) {
      setNotice("正在连接牌桌，请稍等");
      return;
    }
    save();
    setLoading(true);
    socket.emit("create", { name, avatar, quick });
  }
  function join() {
    save();
    setLoading(true);
    socket.emit("join", { code, name, avatar });
  }
  const playing = game && game.phase !== "lobby" && game.phase !== "finished";
  return (
    <div className={`app ${game ? "in-room" : ""} ${playing ? "in-game" : ""}`}>
      <header className="site-header">
        <button
          className="brand"
          aria-label="人格漂移首页"
          onClick={() =>
            game
              ? setModal("leave")
              : window.scrollTo({ top: 0, behavior: "smooth" })
          }
        >
          <span className="brand-icon">
            p<span>↗</span>
          </span>
          <span className="brand-wordmark">
            人格漂移<small>PERSONALITY SHIFT</small>
          </span>
        </button>
        <nav className="main-nav">
          {game ? (
            <>
              <button className="nav-back" onClick={() => setModal("leave")}>
                <ArrowLeft size={15} />
                离开牌桌
              </button>
              <span className="nav-divider" />
            </>
          ) : null}
          <button onClick={() => setModal("rules")}>
            怎么玩 <ArrowUpRight size={13} />
          </button>
          <button onClick={() => setModal("cards")}>卡牌图鉴</button>
          <button onClick={() => setModal("types")}>16 种人格</button>
        </nav>
        <div className="header-actions">
          <button
            className={`sound-toggle ${sound.enabled ? "sound-on" : ""}`}
            onClick={sound.toggle}
            aria-label={sound.enabled ? "关闭音效" : "打开音效"}
            aria-pressed={sound.enabled}
          >
            {sound.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span>声音{sound.enabled ? "开" : "关"}</span>
          </button>
          <button
            className="sound-settings-button"
            aria-label="音效设置"
            title="音效设置与试听"
            onClick={() => setModal("sound")}
          >
            <SlidersHorizontal size={15} />
          </button>
          <span className="header-divider" />
          <button
            className="profile-button"
            onClick={() => setModal("profile")}
          >
            <Avatar index={avatar} size={30} />
            <span>{name}</span>
            <ChevronDown size={13} />
          </button>
          <button
            className="mobile-help icon-button"
            onClick={() => setModal("rules")}
            aria-label="游戏规则"
          >
            <CircleHelp size={21} />
          </button>
        </div>
      </header>
      {!connected && (
        <div className="connection-banner" role="status">
          <WifiOff size={15} />
          正在连接牌桌… 如果刚刚掉线，恢复后会自动回到原位。
        </div>
      )}
      {!game ? (
        <Home
          onQuick={() => create(true)}
          onCreate={() => setModal("create")}
          onJoin={() => setModal("join")}
          onRules={() => setModal("rules")}
          onCards={() => setModal("cards")}
        />
      ) : game.phase === "lobby" ? (
        <Lobby game={game} notify={setNotice} />
      ) : game.phase === "finished" ? (
        <Results game={game} notify={setNotice} />
      ) : (
        <GameTable
          key={game.roomCode}
          game={game}
          send={send}
          playSound={sound.play}
          notify={setNotice}
        />
      )}
      {loading && (
        <div className="loading-pill">
          <span className="spinner" />
          正在摆好牌桌…
        </div>
      )}
      <AnimatePresence>
        {notice && (
          <motion.div
            className="notification"
            role="status"
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Sparkles size={18} />
            <span>{notice}</span>
            <button
              className="icon-button"
              aria-label="关闭提示"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {modal && (
          <Modal
            title={
              {
                rules: "30 秒，学会这场心理战",
                cards: "每一张牌，都有点生活",
                types: "人格会变，玩法也是",
                create: "组一桌，开始互相带偏",
                join: "你的牌搭子在等你",
                profile: "今天，你想叫什么？",
                leave: "现在就退场吗？",
                sound: "听起来，就很想再来一局",
              }[modal]
            }
            wide={modal === "cards" || modal === "types"}
            onClose={() => setModal(null)}
          >
            {modal === "rules" && <Rules />}
            {modal === "sound" && <SoundSettings {...sound} />}
            {modal === "cards" && (
              <>
                <p className="modal-subtitle">
                  54 张真实生活切片。没一张是省油的灯。
                </p>
                <div className="card-filters">
                  {(
                    [
                      "all",
                      "shift",
                      "attack",
                      "defense",
                      "strategy",
                      "special",
                    ] as const
                  ).map((t) => (
                    <button
                      className={filter === t ? "active" : ""}
                      key={t}
                      onClick={() => setFilter(t)}
                    >
                      {t === "all" ? "全部卡牌" : TYPE_LABEL[t]}
                      <small>
                        {t === "all"
                          ? CARDS.length
                          : CARDS.filter((c) => c.type === t).length}
                      </small>
                    </button>
                  ))}
                </div>
                <div className="card-gallery">
                  {CARDS.filter(
                    (c) => filter === "all" || c.type === filter,
                  ).map((c) => (
                    <Card card={c} key={c.id} />
                  ))}
                </div>
              </>
            )}
            {modal === "types" && (
              <>
                <p className="modal-subtitle">
                  当前人格改变，能力跟着漂移。无需背诵，牌桌上随时可看。
                  <br />
                  每回合只能发动一次；轨道在中线时，能力按左侧字母计算。
                </p>
                <div className="type-gallery">
                  {PERSONALITIES.map((type, i) => (
                    <article key={type}>
                      <span
                        className={`type-label type-color-${Math.floor(i / 4)}`}
                      >
                        {type}
                      </span>
                      <h3>{ABILITIES[type].name}</h3>
                      <p>{ABILITIES[type].description}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
            {["create", "join", "profile"].includes(modal) && (
              <form
                className="room-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (modal === "create") create();
                  else if (modal === "join") join();
                  else {
                    save();
                    setModal(null);
                    setNotice("新的你，已上线。昵称和头像将在下一次入座生效。");
                  }
                }}
              >
                <p className="modal-subtitle">不用注册。取个名字，就能入座。</p>
                <div className="avatar-chooser">
                  {AVATAR_NAMES.map((n, i) => (
                    <button
                      type="button"
                      key={i}
                      aria-label={n}
                      className={avatar === i ? "active" : ""}
                      onClick={() => setAvatar(i)}
                    >
                      <Avatar index={i} size={47} />
                      {avatar === i && (
                        <span>
                          <Check size={11} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <label htmlFor="nickname">怎么称呼你</label>
                <input
                  id="nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={14}
                  placeholder="给自己起个不会露馅的名字"
                  required
                  autoComplete="nickname"
                />
                {modal === "join" && (
                  <>
                    <label htmlFor="roomcode">6 位房间码</label>
                    <input
                      className="room-code-input"
                      id="roomcode"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="例如 A1B2C3"
                      maxLength={6}
                      minLength={6}
                      required
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </>
                )}
                <button
                  className="button button-lime"
                  disabled={loading || !connected}
                  type="submit"
                >
                  {modal === "create"
                    ? "创建我的牌桌"
                    : modal === "join"
                      ? "入座，开始演"
                      : "就叫这个"}
                  <ArrowUpRight size={21} />
                </button>
                <small>
                  {modal === "create"
                    ? "房间支持 2–6 人，可随时添加机器人。"
                    : "你的身份仅保存在此浏览器，刷新不会丢失座位。"}
                </small>
              </form>
            )}
            {modal === "leave" && (
              <div className="leave-modal">
                <p>
                  正在进行的对局会由机器人接替你。
                  <br />
                  离开后无法用邀请链接中途加入这局。
                </p>
                <div>
                  <button
                    className="button button-outline"
                    onClick={() => setModal(null)}
                  >
                    再演一会儿
                  </button>
                  <button
                    className="button button-danger"
                    onClick={() => {
                      socket.emit("leave");
                      setModal(null);
                    }}
                  >
                    离开牌桌 <ArrowUpRight size={17} />
                  </button>
                </div>
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
