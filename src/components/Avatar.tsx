export const AVATAR_NAMES = [
  "薄荷怪",
  "小幽灵",
  "橘子头",
  "小蘑菇",
  "夜猫子",
  "云朵",
];
export function Avatar({
  index = 0,
  size = 46,
}: {
  index?: number;
  size?: number;
}) {
  const colors = [
    "#c9ed9c",
    "#c0ade7",
    "#efb38e",
    "#e4cc82",
    "#95c8ca",
    "#dbafc6",
  ];
  return (
    <div
      className={`avatar avatar-${index % 6}`}
      style={{ width: size, height: size, background: colors[index % 6] }}
    >
      <svg viewBox="0 0 60 60" aria-hidden="true">
        {index % 6 === 1 ? (
          <path
            d="M14 48V26a16 16 0 0 1 32 0v22l-8-5-8 5-8-5z"
            fill="#f2eafb"
          />
        ) : index % 6 === 3 ? (
          <>
            <path d="M25 27h11v22H25z" fill="#fff0d1" />
            <path d="M9 30a21 21 0 0 1 42 0z" fill="#8c664c" />
            <circle cx="22" cy="19" r="4" fill="#e4cc82" />
          </>
        ) : index % 6 === 4 ? (
          <path d="m13 17 12 7h10l12-7v24Q30 56 13 41z" fill="#3b6268" />
        ) : (
          <path
            d="M13 36q-7-18 8-22 9-11 17 1 17-2 11 16 8 21-16 19-19 5-20-14"
            fill={
              index % 6 === 0
                ? "#3c5b37"
                : index % 6 === 2
                  ? "#ba663b"
                  : "#f6d7e5"
            }
          />
        )}
        <g fill={index % 6 === 0 || index % 6 === 4 ? "#e1f4bb" : "#382e3c"}>
          <ellipse cx="24" cy="31" rx="2.3" ry="3.5" />
          <ellipse cx="37" cy="31" rx="2.3" ry="3.5" />
          <path
            d="M27 39q4 4 8-1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
