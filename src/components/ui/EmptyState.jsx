export default function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl bg-paper px-6 py-10 text-center shadow-soft ${className}`}
    >
      {Icon && (
        <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-ember-500/10">
          <Icon aria-hidden="true" className="h-8 w-8 text-ember-700" />
        </span>
      )}
      <h3 className="text-xl">{title}</h3>
      {message && <p className="mt-1 max-w-xs text-ink-600">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
