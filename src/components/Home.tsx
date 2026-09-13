import { motion } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  Users,
  Clock3,
  Sparkles,
  Plus,
  KeyRound,
  MousePointer2,
  EyeOff,
  Swords,
  ChevronDown,
} from "lucide-react";
import { CARD_MAP } from "../../shared/cards";
import { Card } from "./Card";
import { Avatar } from "./Avatar";
export function Home({
  onQuick,
  onCreate,
  onJoin,
  onRules,
  onCards,
}: {
  onQuick: () => void;
  onCreate: () => void;
  onJoin: () => void;
  onRules: () => void;
  onCards: () => void;
}) {
  return (
    <main className="home">
      <section className="hero-section">
        <div className="hero-copy">
          <motion.div
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="live-dot" /> 一场关于「你是谁」的心理博弈{" "}
            <span className="edition">VOL. 01</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            人格<span className="title-orbit">漂</span>移
            <span className="title-period">.</span>
            <span className="english-title">
              Personality <em>Shift</em>
              <span className="mini-spark">✳</span>
            </span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
          >
            <p className="hero-tagline">
              别让他们看出
              <br />
              <span>你真正想成为什么人。</span>
            </p>
            <p className="hero-description">
              上一秒还在做自己，下一秒就被朋友带偏。
              <br />
              藏好你的目标，打乱他们的人格。
            </p>
            <div className="hero-cta">
              <button
                className="button button-lime quick-button"
                onClick={onQuick}
              >
                <span>
                  <Sparkles size={20} />
                  快速开始
                </span>
                <ArrowUpRight size={25} />
              </button>
              <span className="quick-note">
                不用等人
                <br />
                <span>3 位 AI 牌搭子已就位</span>
              </span>
            </div>
            <div className="secondary-actions">
              <button onClick={onCreate}>
                <Plus size={18} />
                创建房间
              </button>
              <span />
              <button onClick={onJoin}>
                <KeyRound size={17} />
                加入房间
              </button>
              <button className="how-link" onClick={onRules}>
                怎么玩 <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="hero-meta">
              <span>
                <Users size={15} />
                2–6 人
              </span>
              <i />
              <span>
                <Clock3 size={15} />
                5–10 分钟
              </span>
              <i />
              <span>
                <MousePointer2 size={15} />
                30 秒上手
              </span>
            </div>
          </motion.div>
        </div>
        <div className="hero-visual" aria-label="人格漂移精美卡牌展示">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-cross cross-one">✳</div>
          <div className="visual-cross cross-two">+</div>
          <span className="visual-small-label">
            NOT A TEST.
            <br />
            IT'S A MIND GAME.
          </span>
          <motion.div
            className="showcase-card showcase-left"
            initial={{ opacity: 0, y: 60, rotate: -20 }}
            animate={{ opacity: 1, y: 0, rotate: -17 }}
            transition={{ delay: 0.2, type: "spring", damping: 22 }}
            onClick={onCards}
          >
            <Card card={CARD_MAP.s13} hero />
          </motion.div>
          <motion.div
            className="showcase-card showcase-right"
            initial={{ opacity: 0, y: 60, rotate: 20 }}
            animate={{ opacity: 1, y: 0, rotate: 15 }}
            transition={{ delay: 0.3, type: "spring", damping: 22 }}
            onClick={onCards}
          >
            <Card card={CARD_MAP.d2} hero />
          </motion.div>
          <motion.button
            className="showcase-card showcase-front"
            aria-label="查看凌晨两点老板发消息卡牌"
            initial={{ opacity: 0, y: 80, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: -5 }}
            transition={{ delay: 0.15, type: "spring", damping: 22 }}
            onClick={onCards}
          >
            <Card card={CARD_MAP.a9} hero />
          </motion.button>
          <div className="float-tag tag-secret">
            <EyeOff size={16} />
            <span>你的目标，只有你知道。</span>
          </div>
          <div className="float-tag tag-drift">
            <span className="live-dot" />
            INTJ <ArrowRight size={17} />
            <b>ENFP</b>
            <small>人格漂移中</small>
          </div>
          <div className="round-stamp">
            <span>没有标准答案</span>
            <Sparkles size={24} />
            <span>只有神级操作</span>
          </div>
          <div className="hero-visual-caption">
            <span>54 张生活切片 · 16 种可能的你</span>
            <span>↗</span>
          </div>
        </div>
      </section>
      <section className="intro-strip">
        <div className="strip-heading">
          <span className="tiny-caps">GOOD FRIENDS. BAD INFLUENCE.</span>
          <h2>
            朋友越熟，<span>下手越狠。</span>
          </h2>
        </div>
        <div className="intro-point">
          <span className="step-index">01</span>
          <div>
            <h3>
              藏好你的人格 <EyeOff size={16} />
            </h3>
            <p>秘密目标在手，演技全靠你。</p>
          </div>
        </div>
        <div className="intro-point">
          <span className="step-index">02</span>
          <div>
            <h3>
              把朋友带偏 <Swords size={16} />
            </h3>
            <p>一张强制团建，I 人当场变 E。</p>
          </div>
        </div>
        <div className="intro-point">
          <span className="step-index">03</span>
          <div>
            <h3>
              “我不装了！” <Sparkles size={16} />
            </h3>
            <p>亮出人格，撑过最后一波搞事。</p>
          </div>
        </div>
      </section>
      <section className="below-fold">
        <div className="below-title">
          <div>
            <span className="tiny-caps">LIFE HAPPENS. PERSONALITY SHIFTS.</span>
            <h2>每一张牌，都是你的日常。</h2>
          </div>
          <button className="text-button" onClick={onCards}>
            翻翻牌库 <ArrowUpRight size={19} />
          </button>
        </div>
        <div className="preview-card-row">
          {["s0", "s1", "s12", "s5"].map((id) => (
            <button key={id} onClick={onCards} className="preview-card">
              <Card card={CARD_MAP[id]} />
            </button>
          ))}
        </div>
        <div className="home-invite">
          <div className="avatar-stack">
            {[0, 1, 2, 3].map((i) => (
              <Avatar key={i} index={i} size={35} />
            ))}
          </div>
          <span>不用懂 MBTI。懂你的朋友就够了。</span>
          <button className="text-button" onClick={onCreate}>
            叫上你的牌搭子 <ArrowUpRight size={18} />
          </button>
        </div>
      </section>
      <footer className="home-footer">
        <span>人格漂移 © 2026</span>
        <span>人格不是标签，是一场流动的游戏。</span>
        <button onClick={onRules}>
          游戏规则 <ArrowUpRight size={13} />
        </button>
      </footer>
    </main>
  );
}
