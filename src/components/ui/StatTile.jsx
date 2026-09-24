// One headline number. `value` of null means "nothing to show yet": the tile
// shows a dash and the note says why, so a tile never reads NaN or 0% by accident.
export default function StatTile({ label, value, note, icon: Icon, accent = 'text-sky-500' }) {
  const empty = value === null || value === undefined

  return (
    <div className="rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-ink-900/5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-600">
        {Icon && <Icon aria-hidden="true" className={`h-4 w-4 ${accent}`} />}
        {label}
      </p>
      <p className="mt-1 font-heading text-3xl font-semibold text-ink-900">
        {empty ? <span aria-label="No data yet">–</span> : value}
      </p>
      {note && <p className="mt-0.5 text-sm">{note}</p>}
    </div>
  )
}
