import { Volume2, VolumeX, Play, Headphones } from "lucide-react";
import { SOUND_SAMPLES, type Sound } from "../audio/cues";
interface Props {
  enabled: boolean;
  volume: number;
  toggle: () => void;
  setVolume: (value: number) => void;
  preview: (kind: Sound) => void;
}
export function SoundSettings({
  enabled,
  volume,
  toggle,
  setVolume,
  preview,
}: Props) {
  return (
    <div className="sound-settings">
      <p className="modal-subtitle">
        纸牌划过桌面，护盾清脆回响。给每次搞事加一点声音。
      </p>
      <div className="sound-master">
        <span>
          <Headphones size={20} />
          <span>
            游戏音效<small>无背景音乐 · 默认关闭</small>
          </span>
        </span>
        <button
          className={`sound-switch ${enabled ? "active" : ""}`}
          role="switch"
          aria-checked={enabled}
          aria-label="游戏音效"
          onClick={toggle}
        >
          <i />
          {enabled ? "已开启" : "已静音"}
        </button>
      </div>
      <div className="sound-volume">
        <div>
          <label htmlFor="sound-volume">音量</label>
          <output htmlFor="sound-volume">{Math.round(volume * 100)}%</output>
        </div>
        <div>
          {volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          <input
            id="sound-volume"
            type="range"
            min="0"
            max="100"
            step="5"
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            onPointerUp={() => enabled && preview("select")}
            onKeyUp={(e) => {
              if (enabled && e.key.startsWith("Arrow")) preview("select");
            }}
            aria-valuetext={`${Math.round(volume * 100)}%`}
          />
        </div>
      </div>
      <div className="sound-sample-heading">
        <span>点一下，听听看</span>
        <small>
          {!enabled
            ? "请先开启音效"
            : volume === 0
              ? "音量为 0，调高后即可试听"
              : "试听使用当前音量"}
        </small>
      </div>
      <div className="sound-samples">
        {SOUND_SAMPLES.map((s) => (
          <button
            key={s.kind}
            disabled={!enabled || volume === 0}
            onClick={() => preview(s.kind)}
            aria-label={`试听${s.name}`}
          >
            <span>
              <b>{s.name}</b>
              <small>{s.detail}</small>
            </span>
            <Play size={14} />
          </button>
        ))}
      </div>
      <p className="sound-settings-note">
        设置会自动记住。切到其他标签页时自动静音，回来后不会补播错过的声音。
      </p>
    </div>
  );
}
