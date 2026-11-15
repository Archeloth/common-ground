// One need bar (label, track, percentage), shared by the neighbourhood panel
// and the Town overview. Styles live in NeighborhoodPanel.css (.need-bar).
export default function NeedBar({ label, value }: { label: string; value: number }) {
  const percent = Math.round(value * 100)
  return (
    <div className="need-bar">
      <span className="need-label">{label}</span>
      <div className="need-track">
        <div className="need-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="need-value">{percent}%</span>
    </div>
  )
}
