export function EmptyState({ icon = "🗂️", title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <div className="icon" aria-hidden="true">
        {icon}
      </div>
      <p>{title}</p>
      {hint && (
        <p className="section-hint" style={{ marginTop: 4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
