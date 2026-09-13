import { ArrowRight, EyeOff, Layers, Megaphone, Shield } from "lucide-react";
export function Rules() {
  return (
    <div className="rules-content">
      <p className="modal-subtitle">
        不懂 MBTI？正好。这里不测试你，只考验演技。
      </p>
      <div className="rule-steps">
        {[
          [
            EyeOff,
            "01",
            "藏住目标",
            "开局秘密拿到 4 个字母。四条轨道要移向对应的一侧，中线不算。",
          ],
          [
            Layers,
            "02",
            "每回合，打一张",
            "回合开始自动抽牌。点手牌，再点自己或对手出牌；也可以拖过去。每回合还能用一次当前人格能力。",
          ],
          [
            Megaphone,
            "03",
            "到位了？我不装了！",
            "四条轴满足目标就宣言。其他人有 16 秒，每人最多出一张牌打断你；撑住就赢！",
          ],
        ].map(([Icon, n, title, text]) => {
          const I = Icon as typeof EyeOff;
          return (
            <div className="rule-step" key={String(n)}>
              <span className="rule-number">{String(n)}</span>
              <div>
                <h3>
                  <I size={18} />
                  {String(title)}
                </h3>
                <p>{String(text)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rule-extra">
        <h3>
          <Shield size={17} /> 再知道这几件事，就能搞事了
        </h3>
        <p>
          <b>被攻击时：</b>有反制牌会弹出 8
          秒回应，也能提前出牌获得防护。反制只挡卡牌，不挡人格能力或世界事件。
        </p>
        <p>
          <b>猜人格：</b>花 2 点洞察下注。猜对抽 2
          张；猜错向对方泄露自己的一个目标字母。洞察每回合恢复 1 点，最多 3 点。
        </p>
        <p>
          <b>宣言失败：</b>没对齐就喊，弃 1
          张、清空洞察并结束回合。被打断则清空洞察、结束回合。
        </p>
        <p>
          <b>轮到你：</b>有 45 秒。未出牌就结束，会额外抽一张。手牌最多 8
          张，超出时自动弃掉最左边的旧牌；每两轮换一个世界事件。
        </p>
        <p>
          <b>第 9 轮起：</b>
          人格加速！每次回合开始，最远离目标的一条轨道自动向目标移动 1
          格，避免僵局。
        </p>
        <p>
          <b>伪装：</b>隐藏轨道 /
          伪装人格到自己下回合开始。目标不会改变，宣言时必须揭开。
        </p>
        <p>
          <b>网络：</b>刷新自动回到对局；掉线 30 秒后由 Bot
          接管，重连交还。房间保存在当前服务器内存，重启会清空。
        </p>
      </div>
      <div className="axis-rule">
        <span>
          E 外向 <ArrowRight size={13} /> I 独处
        </span>
        <span>
          S 现实 <ArrowRight size={13} /> N 脑洞
        </span>
        <span>
          T 理性 <ArrowRight size={13} /> F 感受
        </span>
        <span>
          J 计划 <ArrowRight size={13} /> P 随性
        </span>
      </div>
      <p className="rules-note">
        只是社交游戏，不是心理诊断。别给自己贴标签，给朋友出张牌就好。
      </p>
    </div>
  );
}
