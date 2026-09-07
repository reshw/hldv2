export default function StatRow({ label, value }) {
  return (
    <div className="bp-stat">
      <span>{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}
