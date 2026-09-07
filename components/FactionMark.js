export default function FactionMark({ kind, color }) {
  if (kind === "bug") {
    return (
      <svg viewBox="0 0 64 64" className="mark">
        <ellipse cx="32" cy="34" rx="14" ry="20" fill="none" stroke={color} strokeWidth="3" />
        <circle cx="32" cy="14" r="7" fill="none" stroke={color} strokeWidth="3" />
        <path
          d="M20 24 L6 16 M20 34 L4 34 M20 44 L6 52 M44 24 L58 16 M44 34 L60 34 M44 44 L58 52"
          stroke={color}
          strokeWidth="2.5"
          fill="none"
        />
      </svg>
    );
  }
  if (kind === "bot") {
    return (
      <svg viewBox="0 0 64 64" className="mark">
        <rect x="16" y="14" width="32" height="26" rx="2" fill="none" stroke={color} strokeWidth="3" />
        <circle cx="26" cy="27" r="3.5" fill={color} />
        <circle cx="38" cy="27" r="3.5" fill={color} />
        <path d="M32 40 L32 52 M20 52 L44 52 M22 40 L14 50 M42 40 L50 50" stroke={color} strokeWidth="3" fill="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="mark">
      <path d="M6 32 C 18 14, 46 14, 58 32 C 46 50, 18 50, 6 32 Z" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="32" cy="32" r="9" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="32" cy="32" r="2.5" fill={color} />
    </svg>
  );
}
