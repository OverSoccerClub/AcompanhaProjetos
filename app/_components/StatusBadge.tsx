import type { Tone } from "./status-maps";

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className="badge" data-tone={tone}>
      {label}
    </span>
  );
}
