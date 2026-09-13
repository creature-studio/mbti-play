import { useId } from "react";
export function Artwork({
  kind = "planet",
  variant = 0,
}: {
  kind?: string;
  variant?: number;
}) {
  const uid = useId().replaceAll(":", "");
  const color = ["#d1f38a", "#c6b7ed", "#f4bf95", "#edc88e"][variant % 4];
  const phone = ["phone", "chat", "battery", "laptop"].includes(kind),
    heart = ["heart", "butterfly"].includes(kind),
    moon = ["moon", "door"].includes(kind),
    planet = ["planet", "cloud", "brain"].includes(kind),
    paper = ["map", "check", "chart", "cards", "eye"].includes(kind);
  return (
    <svg
      viewBox="0 0 240 180"
      className={`artwork art-${kind}`}
      role="img"
      aria-label={`${kind} 卡牌插画`}
    >
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={color} />
          <stop offset="1" stopColor={variant % 2 ? "#7a70ad" : "#6a9466"} />
        </linearGradient>
        <radialGradient id={`h${uid}`}>
          <stop stopColor={color} stopOpacity=".3" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter id={`s${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="10"
            stdDeviation="8"
            floodColor="#000"
            floodOpacity=".25"
          />
        </filter>
      </defs>
      <ellipse cx="120" cy="94" rx="114" ry="84" fill={`url(#h${uid})`} />
      <g fill="none" stroke={color} opacity=".22">
        <ellipse
          cx="120"
          cy="105"
          rx="98"
          ry="34"
          transform="rotate(-23 120 105)"
        />
        <circle cx="120" cy="90" r="64" strokeDasharray="2 9" />
      </g>
      <g fill={color}>
        <path d="m36 46 3-9 3 9 9 3-9 3-3 9-3-9-9-3z" />
        <path d="m198 128 2-7 2 7 7 2-7 2-2 7-2-7-7-2z" />
        <circle cx="197" cy="38" r="3" />
        <circle cx="50" cy="139" r="2" />
      </g>
      <g
        filter={`url(#s${uid})`}
        transform={`rotate(${variant % 2 ? 12 : -13} 120 90)`}
      >
        {phone ? (
          <>
            <rect
              x="81"
              y="26"
              width="81"
              height="133"
              rx="15"
              fill={`url(#g${uid})`}
              stroke="#e9e4f2"
              strokeWidth="2"
            />
            <rect x="89" y="35" width="65" height="112" rx="9" fill="#263e34" />
            <rect x="105" y="39" width="33" height="5" rx="3" fill={color} />
            {kind === "battery" ? (
              <>
                <rect
                  x="103"
                  y="68"
                  width="38"
                  height="57"
                  rx="6"
                  stroke={color}
                  strokeWidth="3"
                  fill="none"
                />
                <path d="M115 78h12l-8 16h10l-14 23 4-18h-9z" fill="#ef997d" />
              </>
            ) : (
              <>
                <rect
                  x="97"
                  y="61"
                  width="46"
                  height="19"
                  rx="6"
                  fill="#b9e391"
                />
                <rect
                  x="102"
                  y="91"
                  width="42"
                  height="16"
                  rx="5"
                  fill="#b8a1d9"
                />
                <rect
                  x="97"
                  y="117"
                  width="29"
                  height="7"
                  rx="3"
                  fill="#b9e391"
                  opacity=".6"
                />
                <circle cx="154" cy="56" r="13" fill="#eb9a7d" />
                <path
                  d="M154 48v9m0 4v1"
                  stroke="#553f36"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </>
            )}
          </>
        ) : heart ? (
          <>
            <path
              d="M120 142 67 94C23 46 89 15 120 59c32-44 97-12 52 35z"
              fill={`url(#g${uid})`}
              stroke={color}
              strokeWidth="2"
            />
            <path
              d="M76 65q14-22 31-4"
              fill="none"
              stroke="#fff"
              strokeWidth="7"
              opacity=".4"
              strokeLinecap="round"
            />
            <path d="m171 122 15-8-3 18-7-6-9 1z" fill="#bdabe5" />
          </>
        ) : moon ? (
          <>
            <path
              d="M147 29a64 64 0 1 0 33 103A65 65 0 0 1 147 29"
              fill={`url(#g${uid})`}
              stroke={color}
              strokeWidth="2"
            />
            <circle cx="102" cy="120" r="7" fill="#fff" opacity=".15" />
            <circle cx="81" cy="98" r="4" fill="#fff" opacity=".2" />
            <path
              d="m164 51 5 13 14 1-11 9 3 14-12-7-12 7 3-14-11-9 14-1z"
              fill="#c7b5e5"
            />
          </>
        ) : planet ? (
          <>
            <circle cx="123" cy="89" r="49" fill={`url(#g${uid})`} />
            <path
              d="M88 56q49 4 67 46M81 80q44 4 63 41"
              fill="none"
              stroke="#fff"
              strokeWidth="12"
              opacity=".12"
            />
            <ellipse
              cx="120"
              cy="92"
              rx="87"
              ry="21"
              transform="rotate(-28 120 92)"
              fill="none"
              stroke="#cbb8e7"
              strokeWidth="11"
            />
            <path
              d="M94 51a47 47 0 0 1 73 48"
              fill="none"
              stroke={color}
              strokeWidth="9"
            />
            <circle cx="177" cy="42" r="10" fill="#e7bf93" />
          </>
        ) : paper ? (
          <>
            <rect
              x="68"
              y="35"
              width="97"
              height="120"
              rx="8"
              fill="#a893c5"
              transform="rotate(10 120 90)"
            />
            <rect
              x="75"
              y="26"
              width="94"
              height="121"
              rx="8"
              fill={`url(#g${uid})`}
              stroke={color}
              strokeWidth="2"
            />
            <path
              d="M91 52h32M91 63h54"
              stroke="#263c30"
              opacity=".7"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {kind === "chart" ? (
              <>
                <path
                  d="M94 125V102h10v23m9 0V86h11v39m9 0V75h11v50"
                  fill="#334d39"
                />
              </>
            ) : (
              <>
                <path
                  d="m91 87 5 5 10-11m-15 27 5 5 10-11m-15 27 5 5 10-11"
                  fill="none"
                  stroke="#34472e"
                  strokeWidth="3"
                />
                <path
                  d="M116 88h29m-29 21h29m-29 21h21"
                  stroke="#40533c"
                  opacity=".55"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </>
            )}
          </>
        ) : ["shield", "hand", "stone", "mask", "mirror"].includes(kind) ? (
          <>
            <path
              d="m121 26 52 21v44q-2 41-52 65-50-24-52-65V47z"
              fill={`url(#g${uid})`}
              stroke={color}
              strokeWidth="2"
            />
            <path
              d="m91 88 21 21 38-41"
              fill="none"
              stroke="#2f4a3e"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="m80 55 38-16"
              stroke="#fff"
              strokeWidth="5"
              opacity=".25"
              strokeLinecap="round"
            />
          </>
        ) : ["dice", "reverse"].includes(kind) ? (
          <>
            <rect
              x="69"
              y="39"
              width="105"
              height="105"
              rx="24"
              fill={`url(#g${uid})`}
              stroke={color}
              strokeWidth="2"
            />
            {[
              [94, 64],
              [148, 64],
              [121, 91],
              [94, 118],
              [148, 118],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="7" fill="#2b4437" />
            ))}
            <path
              d="M79 48h42"
              stroke="#fff"
              opacity=".25"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </>
        ) : ["party", "mic"].includes(kind) ? (
          <>
            <path
              d="m79 139 23-99 66 75z"
              fill={`url(#g${uid})`}
              stroke={color}
              strokeWidth="2"
            />
            <path
              d="m91 86 39 42m-46-14 16 18m2-72 47 49"
              stroke="#59754f"
              strokeWidth="8"
            />
            <path
              d="M141 42q-13 25 15 26t8-27m25 39q-12 2-8 13M123 27l4-9"
              fill="none"
              stroke="#c6ade7"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <rect
              x="53"
              y="55"
              width="8"
              height="16"
              rx="2"
              fill="#e5b891"
              transform="rotate(-20 55 60)"
            />
          </>
        ) : kind === "food" ? (
          <>
            <path
              d="M62 92h116q-2 54-58 54T62 92"
              fill={`url(#g${uid})`}
              stroke={color}
              strokeWidth="2"
            />
            <ellipse cx="120" cy="90" rx="59" ry="17" fill="#e7eed6" />
            <ellipse cx="120" cy="92" rx="45" ry="9" fill="#a0b77a" />
            <path
              d="M102 70q-15-12 0-24m20 21q-15-12 0-24"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              opacity=".7"
            />
            <path
              d="m143 91 33-61m-21 63 33-58"
              stroke="#cbb8e7"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M79 111q8 19 29 23"
              stroke="#fff"
              strokeWidth="5"
              strokeLinecap="round"
              opacity=".3"
              fill="none"
            />
          </>
        ) : kind === "coffee" ? (
          <>
            <ellipse cx="120" cy="146" rx="65" ry="10" fill="#c4a9db" />
            <path
              d="M161 75h15q31 0 16 34-10 17-34 13"
              stroke={color}
              strokeWidth="12"
              fill="none"
            />
            <path
              d="M73 66h95l-6 58q-3 23-41 23-36 0-42-23z"
              fill={`url(#g${uid})`}
              stroke={color}
              strokeWidth="2"
            />
            <ellipse cx="120" cy="66" rx="47" ry="13" fill="#e4efd0" />
            <ellipse cx="120" cy="66" rx="37" ry="8" fill="#4b4537" />
            <path
              d="M104 43q-10-10 1-23m22 26q-10-10 1-23"
              stroke={color}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M89 83v24"
              stroke="#fff"
              strokeWidth="5"
              opacity=".3"
              strokeLinecap="round"
            />
          </>
        ) : kind === "plane" ? (
          <>
            <path
              d="m47 84 147-45-48 113-27-43-45 13 13-29z"
              fill={`url(#g${uid})`}
              stroke={color}
              strokeWidth="2"
            />
            <path
              d="m86 93 108-54-75 70"
              fill="none"
              stroke="#57714c"
              strokeWidth="3"
            />
          </>
        ) : (
          <>
            <path
              d="m121 27 17 36 39 6-28 28 6 42-34-20-36 20 7-42-31-28 42-6z"
              fill={`url(#g${uid})`}
              stroke={color}
              strokeWidth="2"
            />
            <path
              d="m111 61 8-17 9 19"
              fill="none"
              stroke="#fff"
              strokeWidth="5"
              opacity=".3"
              strokeLinecap="round"
            />
          </>
        )}
      </g>
    </svg>
  );
}
