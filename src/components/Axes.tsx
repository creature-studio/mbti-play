import { AXIS_LETTERS, AXIS_NAMES } from "../../shared/cards";
import type { Axes as AxesType, Axis } from "../../shared/types";
export function Axes({
  axes,
  goal,
  small = false,
  onAxis,
  chosen,
}: {
  axes: AxesType | null;
  goal?: string;
  small?: boolean;
  onAxis?: (a: Axis) => void;
  chosen?: Axis;
}) {
  return (
    <div
      className={`personality-axes ${small ? "axes-small" : ""} ${!axes ? "axes-hidden" : ""}`}
    >
      {AXIS_LETTERS.map((letters, i) => (
        <div
          className={`axis-row axis-${i} ${chosen === i ? "chosen" : ""}`}
          key={i}
        >
          <span
            className={`axis-letter ${(axes?.[i] ?? 0) < 0 ? "dominant" : ""} ${goal?.[i] === letters[0] ? "is-goal" : ""}`}
          >
            {letters[0]}
          </span>
          <div className="axis-core">
            {!small && (
              <div className="axis-labels">
                <span>{AXIS_NAMES[i][0]}</span>
                <span>{AXIS_NAMES[i][1]}</span>
              </div>
            )}
            <button
              className="axis-track"
              onClick={() => onAxis?.(i as Axis)}
              disabled={!onAxis}
              aria-label={`${letters.join("/")} 轴：${axes ? (axes[i] === 0 ? "中线" : `偏 ${letters[axes[i] < 0 ? 0 : 1]}`) : "已隐藏"}`}
            >
              <span className="axis-line" />
              <span
                className="axis-goal-zone"
                style={{
                  left: goal?.[i] === letters[0] ? "0" : "50%",
                  opacity: goal ? 1 : 0,
                }}
              />
              {Array.from({ length: 7 }, (_, n) => (
                <i
                  key={n}
                  style={{ left: `${(n / 6) * 100}%` }}
                  className={n === 3 ? "axis-center" : ""}
                />
              ))}
              <span
                className="axis-knob"
                style={{
                  left: `${(((axes?.[i] ?? 0) + 3) / 6) * 100}%`,
                  opacity: axes ? 1 : 0.2,
                }}
              />
              <span className="axis-hidden-symbol">?</span>
            </button>
          </div>
          <span
            className={`axis-letter ${(axes?.[i] ?? 0) > 0 ? "dominant" : ""} ${goal?.[i] === letters[1] ? "is-goal" : ""}`}
          >
            {letters[1]}
          </span>
        </div>
      ))}
    </div>
  );
}
