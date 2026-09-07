// Korean name first, English in parens - see data/README.md for why entity names are
// verified per-item rather than auto-translated.
export default function DispName({ x, as: Tag = "span" }) {
  if (!x.nameKo) return <Tag>{x.name}</Tag>;
  return (
    <Tag>
      {x.nameKo}{" "}
      <span className="mono" style={{ color: "var(--text-faint)", fontWeight: 400 }}>
        ({x.name})
      </span>
    </Tag>
  );
}
