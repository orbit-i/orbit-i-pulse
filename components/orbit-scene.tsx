// components/orbit-scene.tsx
// The signature visual motif: a slow-spinning orbit ring + starfield,
// echoing the ORBIT-I mark. Used as ambient background art on the
// auth pages. Pure CSS/SVG, no images, so it's crisp at any size and
// costs nothing to load.
export function OrbitScene() {
  const stars: Array<[number, number, number, number]> = [
    [8, 12, 1.6, 0], [22, 28, 1.1, 0.6], [38, 9, 1.3, 1.2], [55, 18, 1.7, 0.3],
    [70, 7, 1.1, 1.6], [85, 15, 1.4, 0.9], [92, 32, 1.2, 0.2], [12, 42, 1.1, 1.8],
    [30, 55, 1.5, 0.5], [48, 48, 1.1, 1.1], [65, 58, 1.3, 1.9], [80, 50, 1.6, 0.7],
    [6, 70, 1.2, 1.4], [25, 82, 1.4, 0.4], [44, 75, 1.1, 1.7], [60, 85, 1.6, 1.0],
    [78, 78, 1.2, 0.2], [90, 88, 1.4, 1.3], [15, 92, 1.1, 0.8], [95, 65, 1.3, 1.5],
  ];

  return (
    <div className="orbit-deco" aria-hidden="true">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {stars.map((s, i) => {
          const x = s[0], y = s[1], r = s[2], delay = s[3];
          const dur = 3 + (i % 4);
          const styleStr = "animation: orbit-twinkle " + dur + "s ease-in-out " + delay + "s infinite";
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r * 0.18}
              fill="#fff"
              opacity={0.5}
              style={{ animationName: "orbit-twinkle", animationDuration: dur + "s", animationDelay: delay + "s", animationIterationCount: "infinite", animationTimingFunction: "ease-in-out" }}
            />
          );
        })}
        <g className="orbit-ring-spin" style={{ transformOrigin: "70px 35px" }}>
          <ellipse cx="70" cy="35" rx="46" ry="17" fill="none" stroke="var(--accent-cyan)" strokeOpacity="0.35" strokeWidth="0.35" />
          <circle cx="108" cy="30" r="2.2" fill="var(--accent-cyan)" opacity="0.8" />
        </g>
        <g style={{ transformOrigin: "18px 78px" }} className="orbit-ring-spin">
          <ellipse cx="18" cy="78" rx="30" ry="11" fill="none" stroke="var(--accent-periwinkle)" strokeOpacity="0.22" strokeWidth="0.3" />
        </g>
        <circle cx="70" cy="35" r="13" fill="none" stroke="var(--accent-cyan)" strokeOpacity="0.18" strokeWidth="0.4" />
      </svg>
    </div>
  );
}
